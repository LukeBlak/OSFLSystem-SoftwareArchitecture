/**
 * =============================================================================
 * SERVICIO DE FINANZAS - CAPA DE APLICACIÓN
 * =============================================================================
 * 
 * @module services/finance.service
 * @layer Application
 */

import { supabase } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import FinanceRepository from '../repositories/FinanceRepository.js';
import {
  validateRegisterIncome,
  validateRegisterExpense,
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
} from '../models/Finance.js';
import { USER_ROLES } from '../models/User.js';

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
    ];

    if (!allowedRoles.includes(currentUser.role)) {
      throw ApiError.forbidden('No tienes permisos para registrar ingresos');
    }

    // =========================================================================
    // 3. VERIFICAR QUE LA ORGANIZACIÓN EXISTE
    // =========================================================================
    const { data: organizacion, error: orgError } = await supabaseClient
      .from('organizacion')
      .select('id, nombre, estado, saldoActual')
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
    const transactionData = {
      organizacionId: validData.organizacionId,
      tipo: TRANSACTION_TYPE.INGRESO,
      monto: validData.monto,
      concepto: validData.concepto,
      categoria: validData.categoria,
      fecha: validData.fecha,
      metodoPago: validData.metodoPago,
      numeroComprobante: validData.numeroComprobante || null,
      comprobanteUrl: validData.comprobanteUrl || null,
      notas: validData.notas || null,
      estado: TRANSACTION_STATUS.APROBADA, // Los ingresos se aprueban automáticamente
      validado: true,
      creadoPor: currentUser.id,
    };

    // =========================================================================
    // 6. CREAR TRANSACCIÓN EN LA BASE DE DATOS
    // =========================================================================
    const { data: transaccion, error } = await FinanceRepository.create(transactionData);

    if (error || !transaccion) {
      logger.error('Error al crear ingreso', { error, transactionData });
      throw ApiError.internal('Error al registrar el ingreso');
    }

    // =========================================================================
    // 7. ACTUALIZAR SALDO DE LA ORGANIZACIÓN
    // =========================================================================
    const nuevoSaldo = (parseFloat(organizacion.saldoActual) || 0) + validData.monto;

    const { error: updateError } = await supabaseClient
      .from('organizacion')
      .update({
        saldoActual: nuevoSaldo,
        fechaEdicion: new Date().toISOString(),
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
    ];

    if (!allowedRoles.includes(currentUser.role)) {
      throw ApiError.forbidden('No tienes permisos para registrar egresos');
    }

    // =========================================================================
    // 3. VERIFICAR QUE LA ORGANIZACIÓN EXISTE
    // =========================================================================
    const { data: organizacion, error: orgError } = await supabaseClient
      .from('organizacion')
      .select('id, nombre, estado, saldoActual')
      .eq('id', validData.organizacionId)
      .maybeSingle();

    if (orgError || !organizacion) {
      throw ApiError.notFound('Organización no encontrada');
    }

    // =========================================================================
    // 4. VERIFICAR QUE HAY SALDO SUFICIENTE
    // =========================================================================
    const saldoActual = parseFloat(organizacion.saldoActual) || 0;
    
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
    const transactionData = {
      organizacionId: validData.organizacionId,
      tipo: TRANSACTION_TYPE.EGRESO,
      monto: validData.monto,
      concepto: validData.concepto,
      categoria: validData.categoria,
      fecha: validData.fecha,
      metodoPago: validData.metodoPago,
      numeroComprobante: validData.numeroComprobante || null,
      comprobanteUrl: validData.comprobanteUrl || null,
      proyectoId: validData.proyectoId || null,
      notas: validData.notas || null,
      estado: TRANSACTION_STATUS.APROBADA,
      validado: true,
      creadoPor: currentUser.id,
    };

    // =========================================================================
    // 7. CREAR TRANSACCIÓN
    // =========================================================================
    const { data: transaccion, error } = await FinanceRepository.create(transactionData);

    if (error || !transaccion) {
      logger.error('Error al crear egreso', { error, transactionData });
      throw ApiError.internal('Error al registrar el egreso');
    }

    // =========================================================================
    // 8. ACTUALIZAR SALDO DE LA ORGANIZACIÓN
    // =========================================================================
    const nuevoSaldo = saldoActual - validData.monto;

    const { error: updateError } = await supabaseClient
      .from('organizacion')
      .update({
        saldoActual: nuevoSaldo,
        fechaEdicion: new Date().toISOString(),
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
export const getBalance = async (organizacionId, currentUser, options = {}) => {
  try {
    const { fechaCorte = null } = options;

    // =========================================================================
    // 1. VERIFICAR PERMISOS
    // =========================================================================
    const allowedRoles = [
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.LIDER_ORGANIZACION,
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
    const { data: organizacion, error: organizationError } = await supabase
      .from('organizacion')
      .select('id, nombre, estado, saldoActual')
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
    const { saldo, ingresos, egresos, error } = await FinanceRepository.getBalance(
      organizacionId,
      fechaCorte
    );

    if (error) {
      throw ApiError.internal('Error al consultar el saldo');
    }

    // =========================================================================
    // 5. RETORNAR RESULTADO
    // =========================================================================
    return {
      organizacionId,
      organizacion: organizacion.nombre,
      saldo,
      ingresos,
      egresos,
      saldoActualOrganizacion: parseFloat(organizacion.saldoActual) || 0,
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

    // Si es líder de organización, forzar filtro por su organización
    if (currentUser.role === USER_ROLES.LIDER_ORGANIZACION) {
      filters.organizacionId = currentUser.organizationId;
    }

    const { page = 1, limit = 10, ...restFilters } = filters;
    const offset = (page - 1) * limit;

    const { data, error, count } = await FinanceRepository.findAll({
      ...restFilters,
      limit,
      offset,
    });

    if (error) {
      throw ApiError.internal('Error al obtener transacciones');
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1,
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
    // Verificar permisos (similar a getBalance)
    // ... implementación de permisos ...

    const { summary, error } = await FinanceRepository.getFinancialSummary(
      organizacionId,
      fechaDesde,
      fechaHasta
    );

    if (error) {
      throw ApiError.internal('Error al obtener resumen financiero');
    }

    return summary;

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