import { supabaseAdmin } from '../config/supabase.js';
import { getRequestSupabaseClient } from '../utils/requestContext.js';

const TABLE = 'comite';
const getDb = () => getRequestSupabaseClient() || supabaseAdmin;

const normalizeCommitteeCreatePayload = (payload = {}) => {
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.slice(0, 10);

  return {
    nombre: payload.nombre,
    arearesponsabilidad: payload.areaResponsabilidad ?? payload.arearesponsabilidad ?? null,
    descripcion: payload.descripcion ?? null,
    estado: payload.estado ?? null,
    presupuestoasignado: payload.presupuestoAsignado ?? payload.presupuestoasignado ?? 0,
    organizacionid: payload.organizacionId ?? payload.organizacionid ?? null,
    lidercomiteid: payload.liderComiteId ?? payload.lidercomiteid ?? null,
    creado_por: payload.creadoPor ?? payload.creado_por ?? null,
    fecha_creacion: payload.fechaCreacion ?? payload.fecha_creacion ?? nowIso,
    fechacreacion: payload.fechacreacion ?? todayDate,
  };
};

const normalizeCommitteeUpdatePayload = (payload = {}) => {
  const mapped = {};

  if (payload.nombre !== undefined) mapped.nombre = payload.nombre;
  if (payload.areaResponsabilidad !== undefined || payload.arearesponsabilidad !== undefined) {
    mapped.arearesponsabilidad = payload.areaResponsabilidad ?? payload.arearesponsabilidad;
  }
  if (payload.descripcion !== undefined) mapped.descripcion = payload.descripcion;
  if (payload.estado !== undefined) mapped.estado = payload.estado;
  if (payload.presupuestoAsignado !== undefined || payload.presupuestoasignado !== undefined) {
    mapped.presupuestoasignado = payload.presupuestoAsignado ?? payload.presupuestoasignado;
  }
  if (payload.organizacionId !== undefined || payload.organizacionid !== undefined) {
    mapped.organizacionid = payload.organizacionId ?? payload.organizacionid;
  }
  if (payload.liderComiteId !== undefined || payload.lidercomiteid !== undefined) {
    mapped.lidercomiteid = payload.liderComiteId ?? payload.lidercomiteid;
  }
  if (payload.modificadoPor !== undefined || payload.modificado_por !== undefined) {
    mapped.modificado_por = payload.modificadoPor ?? payload.modificado_por;
  }

  mapped.fecha_edicion = payload.fechaEdicion ?? payload.fecha_edicion ?? new Date().toISOString();

  return mapped;
};

const wrapEntity = (row) => (row ? { ...row, data: row, error: null } : null);

const hasPagination = (filters = {}) => Number.isFinite(filters.limit) || Number.isFinite(filters.offset);

const withPagination = (query, filters = {}) => {
  const limit = Number.isFinite(filters.limit) ? Number(filters.limit) : null;
  const offset = Number.isFinite(filters.offset) ? Number(filters.offset) : 0;

  if (!Number.isFinite(limit) || limit <= 0) {
    return query;
  }

  return query.range(offset, offset + limit - 1);
};

export const CommitteeRepository = {
  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    return wrapEntity(data);
  },

  async findByNameAndOrganization(nombre, organizacionId) {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('*')
      .eq('nombre', nombre)
      .eq('organizacionid', organizacionId)
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    return wrapEntity(data);
  },

  async create(payload) {
    const dataToInsert = normalizeCommitteeCreatePayload(payload);
    let { data, error } = await getDb()
      .from(TABLE)
      .insert(dataToInsert)
      .select('*')
      .single();

    // Fallback para entornos con políticas RLS que bloquean el insert con el cliente del request.
    if (error) {
      const fallback = await supabaseAdmin
        .from(TABLE)
        .insert(dataToInsert)
        .select('*')
        .single();

      data = fallback.data;
      error = fallback.error;
    }

    return { data, error };
  },

  async update(id, payload) {
    const dataToUpdate = normalizeCommitteeUpdatePayload(payload);
    const { data, error } = await getDb()
      .from(TABLE)
      .update(dataToUpdate)
      .eq('id', id)
      .select('*')
      .single();

    return { data, error };
  },

  async findAll(filters = {}) {
    let query = supabaseAdmin.from(TABLE).select('*', { count: 'exact' });

    if (filters.organizacionId) query = query.eq('organizacionid', filters.organizacionId);
    if (filters.liderComiteId) query = query.eq('lidercomiteid', filters.liderComiteId);
    if (filters.estado) query = query.eq('estado', filters.estado);
    if (filters.areaResponsabilidad) query = query.eq('arearesponsabilidad', filters.areaResponsabilidad);
    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
    }

    query = withPagination(query, filters).order('fecha_creacion', { ascending: false });

    const { data, error, count } = await query;
    return { data: data || [], error, count: count || 0 };
  },

  async getCommitteeMembers(committeeId, filters = {}) {
    const memberLinkQuery = supabaseAdmin
      .from('miembro_comite')
      .select('miembroid')
      .eq('comiteid', committeeId);

    const { data: links, error: linkError } = await memberLinkQuery;

    if (linkError) {
      return hasPagination(filters) ? { data: [], error: linkError, count: 0 } : [];
    }

    const memberIds = [...new Set((links || []).map((x) => x.miembroid).filter(Boolean))];
    if (memberIds.length === 0) {
      return hasPagination(filters) ? { data: [], error: null, count: 0 } : [];
    }

    let query = supabaseAdmin
      .from('miembro')
      .select('*', { count: 'exact' })
      .in('id', memberIds)
      .order('fecha_creacion', { ascending: false });

    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    query = withPagination(query, filters);

    const { data, error, count } = await query;

    if (hasPagination(filters)) {
      return { data: data || [], error, count: count || 0 };
    }

    return data || [];
  },

  async getCommitteeProjects(committeeId, filters = {}) {
    let query = getDb()
      .from('proyecto')
      .select('*', { count: 'exact' })
      .eq('comiteid', committeeId)
      .order('fecha_creacion', { ascending: false });

    if (filters.estado) query = query.eq('estado', filters.estado);
    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
    }

    query = withPagination(query, filters);

    const { data, error, count } = await query;

    if (hasPagination(filters)) {
      return { data: data || [], error, count: count || 0 };
    }

    return data || [];
  },

  async getCommitteeHours(committeeId) {
    const { data: projects } = await getDb()
      .from('proyecto')
      .select('id')
      .eq('comiteid', committeeId);

    const projectIds = (projects || []).map((item) => item.id).filter(Boolean);

    if (!projectIds.length) {
      return [];
    }

    const { data } = await getDb()
      .from('registro_horas')
      .select('*')
      .in('proyectoid', projectIds)
      .order('fecha', { ascending: false });

    return data || [];
  },
};

/**
 * Obtener miembros de un comité
 * 
 * @param {string} comiteId - ID del comité
 * @param {Object} options - Opciones de consulta
 * @returns {Promise<{data: Array, error: Object|null, count: number}>}
 */
export const getCommitteeMembers = async (comiteId, options = {}) => {
  try {
    const {
      estadoActivo,
      search,
      limit = 10,
      offset = 0,
    } = options;

    // Opción 1: Si existe tabla intermedia miembro_comite
    let query = supabase
      .from('miembro_comite')
      .select(`
        *,
        miembro:miembroId (
          id,
          nombre,
          email,
          dui,
          telefono,
          estadoActivo,
          horasTotales,
          organizacion:organizacionId (nombre)
        )
      `, { count: 'exact' })
      .eq('comiteId', comiteId);

    if (estadoActivo !== undefined) {
      query = query.eq('miembro.estadoActivo', estadoActivo);
    }

    if (search) {
      query = query.or(`miembro.nombre.ilike.%${search}%,miembro.email.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('miembro.nombre', { ascending: true });

    return { data: data || [], error, count: count || 0 };

  } catch (error) {
    logger.error('Error al obtener miembros del comité', { error, comiteId });
    return { data: [], error, count: 0 };
  }
};

/**
 * Obtener un miembro específico de un comité
 * 
 * @param {string} comiteId - ID del comité
 * @param {string} miembroId - ID del miembro
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export const getCommitteeMember = async (comiteId, miembroId) => {
  try {
    const { data, error } = await supabase
      .from('miembro_comite')
      .select(`
        *,
        miembro:miembroId (
          id,
          nombre,
          email,
          dui,
          telefono,
          estadoActivo,
          horasTotales,
          direccion,
          fechanacimiento
        ),
        comite:comiteId (
          id,
          nombre,
          areaResponsabilidad
        )
      `)
      .eq('comiteId', comiteId)
      .eq('miembroId', miembroId)
      .maybeSingle();

    return { data, error };
  } catch (error) {
    logger.error('Error al obtener miembro del comité', { error, comiteId, miembroId });
    return { data: null, error };
  }
};

/**
 * Contar miembros de un comité
 * 
 * @param {string} comiteId - ID del comité
 * @returns {Promise<number>}
 */
export const countCommitteeMembers = async (comiteId) => {
  try {
    const { count, error } = await supabase
      .from('miembro_comite')
      .select('*', { count: 'exact', head: true })
      .eq('comiteId', comiteId);

    if (error) {
      logger.error('Error al contar miembros del comité', { error, comiteId });
      return 0;
    }

    return count || 0;
  } catch (error) {
    logger.error('Excepción en countCommitteeMembers', { error });
    return 0;
  }
};

/**
 * Obtener estadísticas de miembros del comité
 * 
 * @param {string} comiteId - ID del comité
 * @returns {Promise<Object>}
 */
export const getCommitteeMembersStats = async (comiteId) => {
  try {
    const { data, error } = await supabase
      .from('miembro_comite')
      .select(`
        miembro:miembroId (
          estadoActivo,
          horasTotales
        )
      `)
      .eq('comiteId', comiteId);

    if (error) {
      return { stats: null, error };
    }

    const totalMiembros = data?.length || 0;
    const miembrosActivos = data?.filter(m => m.miembro?.estadoActivo === true).length || 0;
    const miembrosInactivos = totalMiembros - miembrosActivos;
    const horasTotales = data?.reduce((sum, m) => sum + (parseFloat(m.miembro?.horasTotales) || 0), 0) || 0;
    const promedioHoras = totalMiembros > 0 ? horasTotales / totalMiembros : 0;

    return {
      stats: {
        totalMiembros,
        miembrosActivos,
        miembrosInactivos,
        horasTotales,
        promedioHoras: Math.round(promedioHoras * 100) / 100,
      },
      error: null,
    };
  } catch (error) {
    logger.error('Error al obtener estadísticas de miembros', { error, comiteId });
    return { stats: null, error };
  }
};


export default {
  // ... existentes ...
  getCommitteeMembers,
  getCommitteeMember,
  countCommitteeMembers,
  getCommitteeMembersStats,
};