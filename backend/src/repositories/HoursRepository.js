/**
 * =============================================================================
 * REPOSITORIO DE HORAS/ASISTENCIA - CAPA DE PERSISTENCIA
 * =============================================================================
 * 
 * @module repositories/HoursRepository
 * @layer Persistence
 */

import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const TABLE_NAME = 'registro_horas';

/**
 * Crear registro de horas
 */
export const create = async (hoursData) => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(hoursData)
      .select(`
        *,
        miembro:miembroId (nombre, email),
        proyecto:proyectoId (nombre, estado),
        comite:comiteId (nombre)
      `)
      .maybeSingle();

    if (error) {
      logger.error('Error al crear registro de horas', { error, hoursData });
    }

    return { data, error };
  } catch (error) {
    logger.error('Excepción en HoursRepository.create', { error });
    return { data: null, error };
  }
};

/**
 * Buscar registro por ID
 */
export const findById = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(`
        *,
        miembro:miembroId (nombre, email),
        proyecto:proyectoId (nombre, estado),
        comite:comiteId (nombre)
      `)
      .eq('id', id)
      .maybeSingle();

    return { data, error };
  } catch (error) {
    logger.error('Excepción en HoursRepository.findById', { error });
    return { data: null, error };
  }
};

/**
 * Buscar todos los registros con filtros
 */
export const findAll = async (options = {}) => {
  try {
    const {
      miembroId,
      proyectoId,
      comiteId,
      estado,
      fechaDesde,
      fechaHasta,
      limit = 10,
      offset = 0,
    } = options;

    let query = supabase.from(TABLE_NAME).select(`
      *,
      miembro:miembroId (nombre, email),
      proyecto:proyectoId (nombre, estado),
      comite:comiteId (nombre)
    `, { count: 'exact' });

    if (miembroId) {
      query = query.eq('miembroId', miembroId);
    }

    if (proyectoId) {
      query = query.eq('proyectoId', proyectoId);
    }

    if (comiteId) {
      query = query.eq('comiteId', comiteId);
    }

    if (estado) {
      query = query.eq('estado', estado);
    }

    if (fechaDesde) {
      query = query.gte('fecha', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fecha', fechaHasta);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('fecha', { ascending: false });

    return { data: data || [], error, count: count || 0 };
  } catch (error) {
    logger.error('Excepción en HoursRepository.findAll', { error });
    return { data: [], error, count: 0 };
  }
};

/**
 * Actualizar registro de horas
 */
export const update = async (id, updateData) => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        ...updateData,
        fechaEdicion: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    return { data, error };
  } catch (error) {
    logger.error('Error al actualizar registro de horas', { error });
    return { data: null, error };
  }
};

/**
 * Obtener total de horas por miembro
 */
export const getTotalHoursByMember = async (miembroId) => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('cantidadHoras')
      .eq('miembroId', miembroId)
      .eq('estado', 'validada');

    if (error) {
      return { total: 0, error };
    }

    const total = data?.reduce((sum, h) => sum + (parseFloat(h.cantidadHoras) || 0), 0) || 0;

    return { total, error: null };
  } catch (error) {
    logger.error('Error al calcular total de horas', { error });
    return { total: 0, error };
  }
};

/**
 * Obtener horas por proyecto
 */
export const getHoursByProject = async (proyectoId) => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(`
        cantidadHoras,
        miembro:miembroId (nombre)
      `)
      .eq('proyectoId', proyectoId)
      .eq('estado', 'validada');

    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
};

/**
 * Verificar si ya existe registro para miembro/proyecto/fecha
 */
export const existsForDate = async (miembroId, proyectoId, fecha) => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .eq('miembroId', miembroId)
      .eq('proyectoId', proyectoId)
      .eq('fecha', fecha)
      .maybeSingle();

    return { exists: !!data, error };
  } catch (error) {
    return { exists: false, error };
  }
};

export default {
  create,
  findById,
  findAll,
  update,
  getTotalHoursByMember,
  getHoursByProject,
  existsForDate,
};