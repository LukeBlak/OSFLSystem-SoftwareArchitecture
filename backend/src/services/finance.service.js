/**
 * =============================================================================
 * SERVICIO DE FINANZAS - CAPA DE APLICACIÓN
 * =============================================================================
 * 
 * @module services/finance.service
 * @layer Application
 */

import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import {
  validateRegisterIncome,
  validateRegisterExpense,
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
} from '../models/Finance.js';
import { USER_ROLES } from '../models/User.js';

const BASE_TABLE = 'transaccion_financiera';
const INCOME_TABLE = 'ingreso';
const EXPENSE_TABLE = 'egreso';

const toIsoDateTime = (value) => {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const normalized = String(value).trim();
  if (normalized.length === 10) {
    return `${normalized}T00:00:00.000Z`;
  }
  return normalized;
};

const normalizeTransactionRow = (baseRow, detailRow) => {
  if (!baseRow) return null;

  return {
    id: baseRow.id,
    type: baseRow.tipo,
    description: baseRow.concepto || detailRow?.descripcion || '',
    amount: Number(baseRow.monto || 0),
    date: baseRow.fecha || baseRow.fecha_creacion || null,
    category: detailRow?.categoria || baseRow.categoria || 'Sin categoría',
    project: detailRow?.proyectoid || null,
    organizationId: detailRow?.organizacionid || null,
    receipt: detailRow?.comprobante || null,
    source: detailRow?.fuente || null,
    registeredBy: detailRow?.registradopor || null,
    raw: {
      base: baseRow,
      detail: detailRow || null,
    },
  };
};

const fetchDetailRows = async (tableName, organizationId) => {
  const selectFields = tableName === INCOME_TABLE
    ? 'id, categoria, fuente, comprobante, descripcion, proyectoid, organizacionid, registradopor, creado_por, modificado_por, fecha_creacion, fecha_edicion'
    : 'id, categoria, proyectoid, comiteid, comprobante, descripcion, autorizadopor, solicitadopor, creado_por, modificado_por, fecha_creacion, fecha_edicion';

  let query = supabaseAdmin
    .from(tableName)
    .select(selectFields);

  if (organizationId) {
    query = query.eq('organizacionid', organizationId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

const fetchBaseRowsByIds = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from(BASE_TABLE)
    .select('id, monto, fecha, tipo, concepto, creado_por, modificado_por, fecha_creacion, fecha_edicion')
    .in('id', ids);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

const loadFinancialEntries = async ({ organizationId = null, tipo = null, categoria = null } = {}) => {
  const includeIncome = !tipo || String(tipo).toLowerCase() === TRANSACTION_TYPE.INGRESO;
  const includeExpense = !tipo || String(tipo).toLowerCase() === TRANSACTION_TYPE.EGRESO;

  const detailQueries = [];

  if (includeIncome) {
    detailQueries.push(fetchDetailRows(INCOME_TABLE, organizationId));
  }

  if (includeExpense) {
    detailQueries.push(fetchDetailRows(EXPENSE_TABLE, organizationId));
  }

  const detailSets = await Promise.all(detailQueries);
  const details = detailSets.flat();

  const filteredDetails = categoria
    ? details.filter((row) => String(row.categoria || '').toLowerCase() === String(categoria).toLowerCase())
    : details;

  const baseRows = await fetchBaseRowsByIds(filteredDetails.map((row) => row.id));
  const baseMap = new Map(baseRows.map((row) => [row.id, row]));

  return filteredDetails
    .map((detailRow) => normalizeTransactionRow(baseMap.get(detailRow.id), detailRow))
    .filter(Boolean);
};

/**
 * =============================================================================
 * REGISTRAR ENTRADA DE FONDOS (CU-20)
 * =============================================================================
 * 
 * @param {Object} incomeData - Datos del ingreso
 * @param {Object} currentUser - Usuario que registra
 * @param {Object} supabaseClient - Cliente de Supabase con token del usuario
 * 
 * @returns {Promise<Object>} Transacción creada
 */
export const registerIncome = async (incomeData, currentUser, supabaseClient) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS DE ENTRADA
    // =========================================================================
    const validData = validateRegisterIncome(incomeData);

    // =========================================================================
    // 2. VERIFICAR PERMISOS DEL USUARIO
    // =========================================================================
    const allowedRoles = [
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.LIDER_ORGANIZACION,
      USER_ROLES.LIDER_COMITE,
    ];

    if (!allowedRoles.includes(currentUser.role)) {
      throw ApiError.forbidden('No tienes permisos para registrar ingresos');
    }

    // =========================================================================
    // 3. VERIFICAR QUE LA ORGANIZACIÓN EXISTE
    // =========================================================================
    const { data: organizacion, error: orgError } = await supabaseAdmin
      .from('organizacion')
      .select('id, nombre, estado, saldoactual')
      .eq('id', validData.organizacionId)
      .maybeSingle();

    if (orgError || !organizacion) {
      throw ApiError.notFound('Organización no encontrada');
    }

    // =========================================================================
    // 4. VERIFICAR QUE EL USUARIO TIENE ACCESO A LA ORGANIZACIÓN
    // =========================================================================
    if (currentUser.role === USER_ROLES.LIDER_ORGANIZACION) {
      if (currentUser.organizationId !== validData.organizacionId) {
        throw ApiError.forbidden('Solo puedes registrar ingresos para tu organización');
      }
    }

    // =========================================================================
    // 5. PREPARAR DATOS PARA CREACIÓN
    // =========================================================================
    const now = new Date().toISOString();
    const transactionData = {
      monto: validData.monto,
      fecha: toIsoDateTime(validData.fecha),
      tipo: TRANSACTION_TYPE.INGRESO,
      concepto: validData.concepto,
      creado_por: currentUser.id,
      modificado_por: currentUser.id,
      fecha_creacion: now,
      fecha_edicion: now,
    };

    // =========================================================================
    // 6. CREAR TRANSACCIÓN EN LA BASE DE DATOS
    // =========================================================================
    const { data: transaccion, error } = await supabaseAdmin
      .from(BASE_TABLE)
      .insert(transactionData)
      .select('id, monto, fecha, tipo, concepto')
      .single();

    if (error || !transaccion) {
      logger.error('Error al crear ingreso', { error, transactionData });
      throw ApiError.internal('Error al registrar el ingreso');
    }

    const { error: incomeDetailError } = await supabaseAdmin
      .from(INCOME_TABLE)
      .insert({
        id: transaccion.id,
        categoria: validData.categoria,
        fuente: validData.metodoPago,
        comprobante: validData.comprobanteUrl || validData.numeroComprobante || null,
        descripcion: validData.concepto,
        proyectoid: null,
        organizacionid: validData.organizacionId,
        registradopor: currentUser.id,
        creado_por: currentUser.id,
        modificado_por: currentUser.id,
        fecha_creacion: now,
        fecha_edicion: now,
      });

    if (incomeDetailError) {
      logger.error('Error al crear detalle de ingreso', {
        error: incomeDetailError,
        transactionId: transaccion.id,
      });
      throw ApiError.internal('Error al registrar el ingreso');
    }

    // =========================================================================
    // 7. ACTUALIZAR SALDO DE LA ORGANIZACIÓN
    // =========================================================================
    const nuevoSaldo = (parseFloat(organizacion.saldoactual) || 0) + validData.monto;

    const { error: updateError } = await supabaseAdmin
      .from('organizacion')
      .update({
        saldoactual: nuevoSaldo,
        fecha_edicion: now,
      })
      .eq('id', validData.organizacionId);

    if (updateError) {
      logger.warn('Error al actualizar saldo de organización', {
        error: updateError,
        organizacionId: validData.organizacionId,
      });
      // No lanzar error, el ingreso ya se registró
    }

    // =========================================================================
    // 8. LOGUEAR ÉXITO
    // =========================================================================
    logger.info('Ingreso registrado exitosamente', {
      transaccionId: transaccion.id,
      organizacionId: validData.organizacionId,
      monto: validData.monto,
      registradoPor: currentUser.id,
    });

    // =========================================================================
    // 9. RETORNAR TRANSACCIÓN
    // =========================================================================
    return {
      ...transaccion,
      nuevoSaldo,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en registerIncome', {
      error: error.message,
      stack: error.stack,
    });

    throw ApiError.internal('Error al registrar el ingreso');
  }
};

/**
 * =============================================================================
 * REGISTRAR SALIDA DE FONDOS (CU-21)
 * =============================================================================
 */
export const registerExpense = async (expenseData, currentUser, supabaseClient) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS DE ENTRADA
    // =========================================================================
    const validData = validateRegisterExpense(expenseData);

    // =========================================================================
    // 2. VERIFICAR PERMISOS DEL USUARIO
    // =========================================================================
    const allowedRoles = [
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.LIDER_ORGANIZACION,
      USER_ROLES.LIDER_COMITE,
    ];

    if (!allowedRoles.includes(currentUser.role)) {
      throw ApiError.forbidden('No tienes permisos para registrar egresos');
    }

    // =========================================================================
    // 3. VERIFICAR QUE LA ORGANIZACIÓN EXISTE
    // =========================================================================
    const { data: organizacion, error: orgError } = await supabaseAdmin
      .from('organizacion')
      .select('id, nombre, estado, saldoactual')
      .eq('id', validData.organizacionId)
      .maybeSingle();

    if (orgError || !organizacion) {
      throw ApiError.notFound('Organización no encontrada');
    }

    // =========================================================================
    // 4. VERIFICAR QUE HAY SALDO SUFICIENTE
    // =========================================================================
    const saldoActual = parseFloat(organizacion.saldoactual) || 0;
    
    if (saldoActual < validData.monto) {
      throw ApiError.badRequest(
        `Saldo insuficiente. Saldo actual: $${saldoActual}, Monto requerido: $${validData.monto}`,
        {
          code: 'INSUFFICIENT_BALANCE',
          details: {
            saldoActual,
            montoRequerido: validData.monto,
            diferencia: validData.monto - saldoActual,
          },
        }
      );
    }

    // =========================================================================
    // 5. VERIFICAR ACCESO A LA ORGANIZACIÓN
    // =========================================================================
    if (currentUser.role === USER_ROLES.LIDER_ORGANIZACION) {
      if (currentUser.organizationId !== validData.organizacionId) {
        throw ApiError.forbidden('Solo puedes registrar egresos para tu organización');
      }
    }

    // =========================================================================
    // 6. PREPARAR DATOS PARA CREACIÓN
    // =========================================================================
    const now = new Date().toISOString();
    const transactionData = {
      monto: validData.monto,
      fecha: toIsoDateTime(validData.fecha),
      tipo: TRANSACTION_TYPE.EGRESO,
      concepto: validData.concepto,
      creado_por: currentUser.id,
      modificado_por: currentUser.id,
      fecha_creacion: now,
      fecha_edicion: now,
    };

    // =========================================================================
    // 7. CREAR TRANSACCIÓN
    // =========================================================================
    const { data: transaccion, error } = await supabaseAdmin
      .from(BASE_TABLE)
      .insert(transactionData)
      .select('id, monto, fecha, tipo, concepto')
      .single();

    if (error || !transaccion) {
      logger.error('Error al crear egreso', { error, transactionData });
      throw ApiError.internal('Error al registrar el egreso');
    }

    const { error: expenseDetailError } = await supabaseAdmin
      .from(EXPENSE_TABLE)
      .insert({
        id: transaccion.id,
        categoria: validData.categoria,
        proyectoid: validData.proyectoId || null,
        comiteid: null,
        comprobante: validData.comprobanteUrl || validData.numeroComprobante || null,
        descripcion: validData.concepto,
        autorizadopor: currentUser.role === USER_ROLES.LIDER_ORGANIZACION ? currentUser.id : null,
        solicitadopor: currentUser.role === USER_ROLES.LIDER_COMITE ? currentUser.id : null,
        creado_por: currentUser.id,
        modificado_por: currentUser.id,
        fecha_creacion: now,
        fecha_edicion: now,
      });

    if (expenseDetailError) {
      logger.error('Error al crear detalle de egreso', {
        error: expenseDetailError,
        transactionId: transaccion.id,
      });
      throw ApiError.internal('Error al registrar el egreso');
    }

    // =========================================================================
    // 8. ACTUALIZAR SALDO DE LA ORGANIZACIÓN
    // =========================================================================
    const nuevoSaldo = saldoActual - validData.monto;

    const { error: updateError } = await supabaseClient
      .from('organizacion')
      .update({
        saldoactual: nuevoSaldo,
        fecha_edicion: now,
      })
      .eq('id', validData.organizacionId);

    if (updateError) {
      logger.warn('Error al actualizar saldo de organización', {
        error: updateError,
        organizacionId: validData.organizacionId,
      });
    }

    // =========================================================================
    // 9. LOGUEAR ÉXITO
    // =========================================================================
    logger.info('Egreso registrado exitosamente', {
      transaccionId: transaccion.id,
      organizacionId: validData.organizacionId,
      monto: validData.monto,
      registradoPor: currentUser.id,
    });

    // =========================================================================
    // 10. RETORNAR TRANSACCIÓN
    // =========================================================================
    return {
      ...transaccion,
      nuevoSaldo,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en registerExpense', {
      error: error.message,
      stack: error.stack,
    });

    throw ApiError.internal('Error al registrar el egreso');
  }
};

/**
 * =============================================================================
 * CONSULTAR DISPONIBILIDAD EN CAJA (CU-22)
 * =============================================================================
 */
export const getBalance = async (organizacionId, currentUser, supabaseClient, options = {}) => {
  try {
    const { fechaCorte = null } = options;

    // =========================================================================
    // 1. VERIFICAR PERMISOS
    // =========================================================================
    const allowedRoles = [
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.LIDER_ORGANIZACION,
      USER_ROLES.LIDER_COMITE,
    ];

    if (!allowedRoles.includes(currentUser.role)) {
      throw ApiError.forbidden('No tienes permisos para consultar el saldo');
    }

    // =========================================================================
    // 2. VERIFICAR ACCESO A LA ORGANIZACIÓN
    // =========================================================================
    if (currentUser.role === USER_ROLES.LIDER_ORGANIZACION) {
      if (currentUser.organizationId !== organizacionId) {
        throw ApiError.forbidden('Solo puedes consultar el saldo de tu organización');
      }
    }

    // =========================================================================
    // 3. OBTENER INFORMACIÓN DE LA ORGANIZACIÓN
    // =========================================================================
    const { data: organizacion, error: organizationError } = await supabaseAdmin
      .from('organizacion')
      .select('id, nombre, estado, saldoactual')
      .eq('id', organizacionId)
      .maybeSingle();

    if (organizationError) {
      logger.error('Error al consultar organización para balance', {
        error: organizationError,
        organizacionId,
      });
      throw ApiError.internal('Error al consultar la organización');
    }

    if (!organizacion) {
      throw ApiError.notFound('Organización no encontrada');
    }

    // =========================================================================
    // 4. OBTENER SALDO
    // =========================================================================
    const entries = await loadFinancialEntries({ organizationId: organizacionId });
    const scopedEntries = fechaCorte
      ? entries.filter((entry) => {
          if (!entry.date) return false;
          return new Date(entry.date).getTime() <= new Date(fechaCorte).getTime();
        })
      : entries;

    const ingresos = scopedEntries
      .filter((entry) => entry.type === TRANSACTION_TYPE.INGRESO)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    const egresos = scopedEntries
      .filter((entry) => entry.type === TRANSACTION_TYPE.EGRESO)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    const saldo = ingresos - egresos;

    // =========================================================================
    // 5. RETORNAR RESULTADO
    // =========================================================================
    return {
      organizacionId,
      organizacion: organizacion.nombre,
      saldo,
      ingresos,
      egresos,
      saldoActualOrganizacion: parseFloat(organizacion.saldoactual) || 0,
      fechaCorte,
      fechaConsulta: new Date().toISOString(),
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en getBalance', { error: error.message });
    throw ApiError.internal('Error al consultar el saldo');
  }
};

/**
 * =============================================================================
 * LISTAR TRANSACCIONES
 * =============================================================================
 */
export const listTransactions = async (filters, currentUser) => {
  try {
    // Verificar permisos
    const allowedRoles = [
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.LIDER_ORGANIZACION,
    ];

    if (!allowedRoles.includes(currentUser.role)) {
      throw ApiError.forbidden('No tienes permisos para ver transacciones');
    }

    const page = Number.parseInt(filters.page || 1, 10);
    const limit = Number.parseInt(filters.limit || 10, 10);
    const offset = Math.max(0, (Number.isFinite(page) ? page : 1) - 1) * Math.max(1, Number.isFinite(limit) ? limit : 10);

    const organizationId = currentUser.role === USER_ROLES.LIDER_ORGANIZACION
      ? currentUser.organizationId
      : filters.organizacionId || null;

    const entries = await loadFinancialEntries({
      organizationId,
      tipo: filters.tipo || null,
      categoria: filters.categoria || null,
    });

    const filteredEntries = entries.filter((entry) => {
      const fecha = entry.date ? new Date(entry.date).toISOString() : '';
      if (filters.fechaDesde && fecha && fecha < new Date(filters.fechaDesde).toISOString()) return false;
      if (filters.fechaHasta && fecha && fecha > new Date(`${filters.fechaHasta}T23:59:59.999Z`).toISOString()) return false;
      if (filters.montoMin !== undefined && entry.amount < Number(filters.montoMin)) return false;
      if (filters.montoMax !== undefined && entry.amount > Number(filters.montoMax)) return false;
      return true;
    });

    const total = filteredEntries.length;
    const data = filteredEntries
      .sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0))
      .slice(offset, offset + Math.max(1, Number.isFinite(limit) ? limit : 10));

    return {
      data,
      pagination: {
        page: Number.isFinite(page) ? page : 1,
        limit: Number.isFinite(limit) ? limit : 10,
        total,
        totalPages: Math.max(1, Math.ceil(total / (Number.isFinite(limit) ? limit : 10))),
        hasNext: offset + (Number.isFinite(limit) ? limit : 10) < total,
        hasPrev: (Number.isFinite(page) ? page : 1) > 1,
      },
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en listTransactions', { error: error.message });
    throw ApiError.internal('Error al obtener transacciones');
  }
};

/**
 * =============================================================================
 * OBTENER RESUMEN FINANCIERO
 * =============================================================================
 */
export const getFinancialSummary = async (organizacionId, fechaDesde, fechaHasta, currentUser) => {
  try {
    const allowedRoles = [
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.LIDER_ORGANIZACION,
    ];

    if (!allowedRoles.includes(currentUser.role)) {
      throw ApiError.forbidden('No tienes permisos para consultar el resumen financiero');
    }

    const organizationId = currentUser.role === USER_ROLES.LIDER_ORGANIZACION
      ? currentUser.organizationId
      : organizacionId || null;

    const entries = await loadFinancialEntries({ organizationId });

    const from = fechaDesde ? new Date(fechaDesde).getTime() : null;
    const to = fechaHasta ? new Date(`${fechaHasta}T23:59:59.999Z`).getTime() : null;

    const scopedEntries = entries.filter((entry) => {
      const dateValue = entry.date ? new Date(entry.date).getTime() : null;
      if (from !== null && (dateValue === null || dateValue < from)) return false;
      if (to !== null && (dateValue === null || dateValue > to)) return false;
      return true;
    });

    const ingresos = scopedEntries
      .filter((entry) => entry.type === TRANSACTION_TYPE.INGRESO)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    const egresos = scopedEntries
      .filter((entry) => entry.type === TRANSACTION_TYPE.EGRESO)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

    const porCategoria = scopedEntries.reduce((accumulator, entry) => {
      const key = entry.category || 'Sin categoría';
      if (!accumulator[key]) {
        accumulator[key] = { categoria: key, ingresos: 0, egresos: 0 };
      }

      if (entry.type === TRANSACTION_TYPE.INGRESO) {
        accumulator[key].ingresos += Number(entry.amount || 0);
      } else {
        accumulator[key].egresos += Number(entry.amount || 0);
      }

      return accumulator;
    }, {});

    return {
      fechaDesde,
      fechaHasta,
      ingresos,
      egresos,
      balance: ingresos - egresos,
      porCategoria: Object.values(porCategoria),
      totalTransacciones: scopedEntries.length,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en getFinancialSummary', { error: error.message });
    throw ApiError.internal('Error al obtener resumen financiero');
  }
};

export default {
  registerIncome,
  registerExpense,
  getBalance,
  listTransactions,
  getFinancialSummary,
};