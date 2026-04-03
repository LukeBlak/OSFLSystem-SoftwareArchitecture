import { supabase } from '../config/supabase.js';
import { getRequestSupabaseClient } from '../utils/requestContext.js';

const TABLE = 'miembro';
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

export const MemberRepository = {
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

  async findByDuiOrEmail(dui, email) {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('*')
      .or(`dui.eq.${dui},email.eq.${email}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    return wrapEntity(data);
  },

  async findByDui(dui) {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('*')
      .eq('dui', dui)
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    return wrapEntity(data);
  },

  async findByEmail(email) {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('*')
      .eq('email', email?.toLowerCase())
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
    if (typeof filters.estadoActivo === 'boolean') query = query.eq('estadoActivo', filters.estadoActivo);
    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,email.ilike.%${filters.search}%,dui.ilike.%${filters.search}%`);
    }

    query = withPagination(query, filters).order('fecha_creacion', { ascending: false });

    const { data, error, count } = await query;
    return { data: data || [], error, count: count || 0 };
  },

  async getMemberHours(memberId, filters = {}) {
    let query = getDb()
      .from('registro_horas')
      .select('*', { count: 'exact' })
      .eq('miembroid', memberId)
      .order('fecha', { ascending: false });

    if (typeof filters.validado === 'boolean') query = query.eq('validado', filters.validado);
    if (typeof filters.aprobado === 'boolean') query = query.eq('aprobado', filters.aprobado);

    query = withPagination(query, filters);

    const { data, error, count } = await query;

    if (hasPagination(filters)) {
      return { data: data || [], error, count: count || 0 };
    }

    return data || [];
  },

  async getMemberApplications(memberId, filters = {}) {
    let query = getDb()
      .from('postulacion')
      .select('*', { count: 'exact' })
      .eq('miembroid', memberId)
      .order('fecha_creacion', { ascending: false });

    if (filters.estado) query = query.eq('estado', filters.estado);
    query = withPagination(query, filters);

    const { data, error, count } = await query;

    if (hasPagination(filters)) {
      return { data: data || [], error, count: count || 0 };
    }

    return { data: data || [] };
  },

  async getMemberProjects(memberId, filters = {}) {
    const { data: applications, error } = await getDb()
      .from('postulacion')
      .select('proyectoid')
      .eq('miembroid', memberId);

    if (error) {
      return { data: [], error, count: 0 };
    }

    const projectIds = [...new Set((applications || []).map((item) => item.proyectoid).filter(Boolean))];

    if (projectIds.length === 0) {
      return { data: [], error: null, count: 0 };
    }

    let query = getDb()
      .from('proyecto')
      .select('*', { count: 'exact' })
      .in('id', projectIds)
      .order('fecha_creacion', { ascending: false });

    if (filters.estado) query = query.eq('estado', filters.estado);
    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
    }

    query = withPagination(query, filters);

    const { data, error: projectError, count } = await query;
    return { data: data || [], error: projectError, count: count || 0 };
  },

  async getMemberActiveProjects(memberId) {
    const { data, error } = await this.getMemberProjects(memberId, { estado: 'activo', limit: 1000, offset: 0 });
    if (error) {
      return [];
    }

    return data || [];
  },

  async createHoursRecord(payload) {
    const { data, error } = await getDb()
      .from('registro_horas')
      .insert(payload)
      .select('*')
      .single();

    return { data, error };
  },

  async updateHoursRecord(recordId, payload) {
    const { data, error } = await getDb()
      .from('registro_horas')
      .update(payload)
      .eq('id', recordId)
      .select('*')
      .single();

    return { data, error };
  },

  async updateTotalHours(memberId) {
    const { data: hours } = await getDb()
      .from('registro_horas')
      .select('cantidadHoras')
      .eq('miembroid', memberId)
      .eq('validado', true)
      .eq('aprobado', true);

    const total = (hours || []).reduce((sum, item) => sum + (parseFloat(item.cantidadHoras) || 0), 0);

    return getDb()
      .from(TABLE)
      .update({ horasTotales: total })
      .eq('id', memberId);
  },
};
