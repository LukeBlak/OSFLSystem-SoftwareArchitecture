import { supabase } from '../config/supabase.js';
import { getRequestSupabaseClient } from '../utils/requestContext.js';

const TABLE = 'comite';
const getDb = () => getRequestSupabaseClient() || supabase;

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
    const { data, error } = await getDb()
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
      .eq('organizacionId', organizacionId)
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    return wrapEntity(data);
  },

  async create(payload) {
    const { data, error } = await getDb()
      .from(TABLE)
      .insert(payload)
      .select('*')
      .single();

    return { data, error };
  },

  async update(id, payload) {
    const { data, error } = await getDb()
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    return { data, error };
  },

  async findAll(filters = {}) {
    let query = getDb().from(TABLE).select('*', { count: 'exact' });

    if (filters.organizacionId) query = query.eq('organizacionId', filters.organizacionId);
    if (filters.estado) query = query.eq('estado', filters.estado);
    if (filters.areaResponsabilidad) query = query.eq('areaResponsabilidad', filters.areaResponsabilidad);
    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
    }

    query = withPagination(query, filters).order('fecha_creacion', { ascending: false });

    const { data, error, count } = await query;
    return { data: data || [], error, count: count || 0 };
  },

  async getCommitteeMembers(committeeId, filters = {}) {
    const memberLinkQuery = getDb()
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

    let query = getDb()
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
      .eq('comiteId', committeeId)
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
      .eq('comiteId', committeeId);

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
