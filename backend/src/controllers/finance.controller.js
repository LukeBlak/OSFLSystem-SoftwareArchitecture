/**
 * =============================================================================
 * CONTROLADOR DE FINANZAS - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * @module controllers/finance.controller
 * @layer Presentation
 */

import { StatusCodes } from 'http-status-codes';
import { ApiResponse } from '../utils/apiResponse.js';
import financeService from '../services/finance.service.js';

/**
 * -----------------------------------------------------------------------------
 * REGISTRAR ENTRADA DE FONDOS (CU-20)
 * -----------------------------------------------------------------------------
 * 
 * @route POST /api/finance/income
 * @access Privado (Admin, Líder Org)
 */
export const registerIncome = async (req, res, next) => {
  try {
    const transaccion = await financeService.registerIncome(
      req.body,
      req.user,
      req.supabase
    );

    return res.status(StatusCodes.CREATED).json(
      new ApiResponse(
        StatusCodes.CREATED,
        { transaccion },
        'Ingreso registrado exitosamente'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * REGISTRAR SALIDA DE FONDOS (CU-21)
 * -----------------------------------------------------------------------------
 * 
 * @route POST /api/finance/expense
 * @access Privado (Admin, Líder Org)
 */
export const registerExpense = async (req, res, next) => {
  try {
    const transaccion = await financeService.registerExpense(
      req.body,
      req.user,
      req.supabase
    );

    return res.status(StatusCodes.CREATED).json(
      new ApiResponse(
        StatusCodes.CREATED,
        { transaccion },
        'Egreso registrado exitosamente'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * CONSULTAR DISPONIBILIDAD EN CAJA (CU-22)
 * -----------------------------------------------------------------------------
 * 
 * @route GET /api/finance/balance/:organizacionId
 * @access Privado (Admin, Líder Org)
 */
export const getBalance = async (req, res, next) => {
  try {
    const { organizacionId } = req.params;
    const { fechaCorte } = req.query;
    const balance = await financeService.getBalance(organizacionId, req.user, { fechaCorte });

    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        { balance },
        'Saldo obtenido exitosamente'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * LISTAR TRANSACCIONES
 * -----------------------------------------------------------------------------
 * 
 * @route GET /api/finance/transactions
 * @access Privado (Admin, Líder Org)
 */
export const listTransactions = async (req, res, next) => {
  try {
    const result = await financeService.listTransactions(req.query, req.user);

    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        { transacciones: result.data },
        'Transacciones obtenidas exitosamente',
        { pagination: result.pagination }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER RESUMEN FINANCIERO
 * -----------------------------------------------------------------------------
 * 
 * @route GET /api/finance/summary
 * @access Privado (Admin, Líder Org)
 */
export const getFinancialSummary = async (req, res, next) => {
  try {
    const { organizacionId, fechaDesde, fechaHasta } = req.query;
    const summary = await financeService.getFinancialSummary(
      organizacionId,
      fechaDesde,
      fechaHasta,
      req.user
    );

    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        { summary },
        'Resumen financiero obtenido exitosamente'
      )
    );
  } catch (error) {
    next(error);
  }
};

export default {
  registerIncome,
  registerExpense,
  getBalance,
  listTransactions,
  getFinancialSummary,
};