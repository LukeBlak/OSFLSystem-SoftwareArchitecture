import { supabase, supabaseAdmin } from '../config/supabase.js';
import { getRequestSupabaseClient } from '../utils/requestContext.js';

const TABLE = 'organizacion';
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

export const OrganizationRepository = {
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

  async findByName(nombre) {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('*')
      .ilike('nombre', nombre)
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
    const buildListQuery = (effectiveFilters = {}) => {
      let query = supabaseAdmin.from(TABLE).select('*', { count: 'exact' });

      if (effectiveFilters.tipo) query = query.eq('tipo', effectiveFilters.tipo);
      if (effectiveFilters.estado) query = query.eq('estado', effectiveFilters.estado);
      if (effectiveFilters.search) {
        query = query.or(`nombre.ilike.%${effectiveFilters.search}%,descripcion.ilike.%${effectiveFilters.search}%`);
      }

      return withPagination(query, effectiveFilters).order('fecha_creacion', { ascending: false });
    };

    const executeListQuery = async (effectiveFilters = {}) => {
      const { data, error, count } = await buildListQuery(effectiveFilters);
      return { data: data || [], error, count: count || 0 };
    };

    const firstAttempt = await executeListQuery(filters);

    if (!firstAttempt.error) {
      return firstAttempt;
    }

    const isUndefinedColumn = String(firstAttempt.error?.code || '') === '42703';
    const referencesEstado = String(firstAttempt.error?.message || '').toLowerCase().includes('estado');

    if (filters.estado && isUndefinedColumn && referencesEstado) {
      const { estado, ...filtersWithoutEstado } = filters;
      return executeListQuery(filtersWithoutEstado);
    }

    return firstAttempt;
  },

  async getOrganizationMembers(organizationId, filters = {}) {
    let query = getDb()
      .from('miembro')
      .select('*', { count: 'exact' })
      .eq('organizacionId', organizationId);

    if (typeof filters.estadoActivo === 'boolean') {
      query = query.eq('estadoActivo', filters.estadoActivo);
    }

    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,email.ilike.%${filters.search}%,dui.ilike.%${filters.search}%`);
    }

    query = withPagination(query, filters).order('fecha_creacion', { ascending: false });

    const { data, error, count } = await query;

    if (hasPagination(filters)) {
      return { data: data || [], error, count: count || 0 };
    }

    return data || [];
  },

  async getOrganizationCommittees(organizationId, filters = {}) {
    let query = getDb()
      .from('comite')
      .select('*', { count: 'exact' })
      .eq('organizacionId', organizationId);

    if (filters.estado) query = query.eq('estado', filters.estado);
    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
    }

    query = withPagination(query, filters).order('fecha_creacion', { ascending: false });

    const { data, error, count } = await query;

    if (hasPagination(filters)) {
      return { data: data || [], error, count: count || 0 };
    }

    return data || [];
  },

  async getOrganizationProjects(organizationId, filters = {}) {
    let query = getDb()
      .from('proyecto')
      .select('*', { count: 'exact' })
      .eq('organizacionId', organizationId);

    if (filters.estado) query = query.eq('estado', filters.estado);
    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
    }

    query = withPagination(query, filters).order('fecha_creacion', { ascending: false });

    const { data, error, count } = await query;

    if (hasPagination(filters)) {
      return { data: data || [], error, count: count || 0 };
    }

    return data || [];
  },

  async getOrganizationFinances(organizationId, filters = {}) {
    let ingresosQuery = getDb()
      .from('ingreso')
      .select('*')
      .eq('organizacionId', organizationId)
      .order('fecha', { ascending: false });

    let egresosQuery = getDb()
      .from('egreso')
      .select('*')
      .eq('organizacionId', organizationId)
      .order('fecha', { ascending: false });

    if (filters.desde) {
      ingresosQuery = ingresosQuery.gte('fecha', filters.desde);
      egresosQuery = egresosQuery.gte('fecha', filters.desde);
    }

    if (filters.hasta) {
      ingresosQuery = ingresosQuery.lte('fecha', filters.hasta);
      egresosQuery = egresosQuery.lte('fecha', filters.hasta);
    }

    const [{ data: ingresos, error: ingresoError }, { data: egresos, error: egresoError }] = await Promise.all([
      ingresosQuery,
      egresosQuery,
    ]);

    if (ingresoError || egresoError) {
      return null;
    }

    const totalIngresos = (ingresos || []).reduce((sum, i) => sum + (parseFloat(i.monto) || 0), 0);
    const totalEgresos = (egresos || []).reduce((sum, e) => sum + (parseFloat(e.monto) || 0), 0);

    return {
      ingresos: ingresos || [],
      egresos: egresos || [],
      totalIngresos,
      totalEgresos,
    };
  },
};
