/**
 * =============================================================================
 * REPOSITORIO DE FINANZAS - CAPA DE PERSISTENCIA
 * =============================================================================
 * 
 * @module repositories/FinanceRepository
 * @layer Persistence
 */

import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const TABLE_NAME = 'transaccion_financiera';

/**
 * Crear transacción financiera
 */
export const create = async (transactionData) => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(transactionData)
      .select(`
        *,
        organizacion:organizacionId (nombre),
        proyecto:proyectoId (nombre),
        creadoPor:creadoPor (email)
      `)
      .maybeSingle();

    if (error) {
      logger.error('Error al crear transacción financiera', { error, transactionData });
    }

    return { data, error };
  } catch (error) {
    logger.error('Excepción en FinanceRepository.create', { error });
    return { data: null, error };
  }
};

/**
 * Buscar transacción por ID
 */
export const findById = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(`
        *,
        organizacion:organizacionId (nombre),
        proyecto:proyectoId (nombre),
        creadoPor:creadoPor (email),
        aprobadoPor:aprobadoPor (email)
      `)
      .eq('id', id)
      .maybeSingle();

    return { data, error };
  } catch (error) {
    logger.error('Excepción en FinanceRepository.findById', { error });
    return { data: null, error };
  }
};

/**
 * Buscar todas las transacciones con filtros
 */
export const findAll = async (options = {}) => {
  try {
    const {
      organizacionId,
      tipo,
      categoria,
      estado,
      fechaDesde,
      fechaHasta,
      montoMin,
      montoMax,
      limit = 10,
      offset = 0,
    } = options;

    let query = supabase.from(TABLE_NAME).select(`
      *,
      organizacion:organizacionId (nombre),
      proyecto:proyectoId (nombre)
    `, { count: 'exact' });

    if (organizacionId) {
      query = query.eq('organizacionId', organizacionId);
    }

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    if (categoria) {
      query = query.eq('categoria', categoria);
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

    if (montoMin !== undefined) {
      query = query.gte('monto', montoMin);
    }

    if (montoMax !== undefined) {
      query = query.lte('monto', montoMax);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('fecha', { ascending: false });

    return { data: data || [], error, count: count || 0 };
  } catch (error) {
    logger.error('Excepción en FinanceRepository.findAll', { error });
    return { data: [], error, count: 0 };
  }
};

/**
 * Actualizar transacción
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
    logger.error('Error al actualizar transacción', { error });
    return { data: null, error };
  }
};

/**
 * Obtener saldo de una organización
 */
export const getBalance = async (organizacionId, fechaCorte = null) => {
  try {
    let query = supabase
      .from(TABLE_NAME)
      .select('monto, tipo')
      .eq('organizacionId', organizacionId)
      .eq('estado', 'aprobada');

    if (fechaCorte) {
      query = query.lte('fecha', fechaCorte);
    }

    const { data, error } = await query;

    if (error) {
      return { saldo: 0, error };
    }

    const ingresos = data
      ?.filter(t => t.tipo === 'ingreso')
      .reduce((sum, t) => sum + (parseFloat(t.monto) || 0), 0) || 0;

    const egresos = data
      ?.filter(t => t.tipo === 'egreso')
      .reduce((sum, t) => sum + (parseFloat(t.monto) || 0), 0) || 0;

    const saldo = ingresos - egresos;

    return {
      saldo,
      ingresos,
      egresos,
      error: null,
    };
  } catch (error) {
    logger.error('Error al calcular saldo', { error });
    return { saldo: 0, ingresos: 0, egresos: 0, error };
  }
};

/**
 * Obtener resumen financiero por período
 */
export const getFinancialSummary = async (organizacionId, fechaDesde, fechaHasta) => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('monto, tipo, categoria, fecha')
      .eq('organizacionId', organizacionId)
      .eq('estado', 'aprobada')
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta);

    if (error) {
      return { summary: null, error };
    }

    const ingresos = data
      ?.filter(t => t.tipo === 'ingreso')
      .reduce((sum, t) => sum + (parseFloat(t.monto) || 0), 0) || 0;

    const egresos = data
      ?.filter(t => t.tipo === 'egreso')
      .reduce((sum, t) => sum + (parseFloat(t.monto) || 0), 0) || 0;

    // Agrupar por categoría
    const porCategoria = data?.reduce((acc, t) => {
      if (!acc[t.categoria]) {
        acc[t.categoria] = {
          categoria: t.categoria,
          ingresos: 0,
          egresos: 0,
        };
      }
      if (t.tipo === 'ingreso') {
        acc[t.categoria].ingresos += parseFloat(t.monto) || 0;
      } else {
        acc[t.categoria].egresos += parseFloat(t.monto) || 0;
      }
      return acc;
    }, {}) || {};

    return {
      summary: {
        fechaDesde,
        fechaHasta,
        ingresos,
        egresos,
        balance: ingresos - egresos,
        porCategoria: Object.values(porCategoria),
        totalTransacciones: data?.length || 0,
      },
      error: null,
    };
  } catch (error) {
    logger.error('Error al obtener resumen financiero', { error });
    return { summary: null, error };
  }
};

/**
 * Verificar si hay saldo suficiente para un egreso
 */
export const hasSufficientBalance = async (organizacionId, monto) => {
  try {
    const { saldo } = await getBalance(organizacionId);
    return { sufficient: saldo >= monto, saldo, error: null };
  } catch (error) {
    return { sufficient: false, saldo: 0, error };
  }
};

export default {
  create,
  findById,
  findAll,
  update,
  getBalance,
  getFinancialSummary,
  hasSufficientBalance,
};