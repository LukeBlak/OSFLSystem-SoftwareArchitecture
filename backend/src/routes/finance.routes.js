/**
 * =============================================================================
 * RUTAS DE FINANZAS
 * =============================================================================
 * 
 * @module routes/finance.routes
 * @layer Presentation
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { USER_ROLES as ROLES } from '../models/User.js';
import financeController from '../controllers/finance.controller.js';
import {
  registerIncomeSchema,
  registerExpenseSchema,
  listTransactionsSchema,
  getBalanceParamsSchema,
  getBalanceQuerySchema,
} from '../models/Finance.js';

const router = Router();

// Middleware de roles para finanzas
const canManageFinance = [
  authenticate,
  requireRole([
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.LIDER_ORGANIZACION,
    ROLES.LIDER_COMITE,
  ]),
];

const canViewFinance = [
  authenticate,
  requireRole([
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.LIDER_ORGANIZACION,
    ROLES.LIDER_COMITE,
  ]),
];

/**
 * POST /api/finance/income - Registrar entrada de fondos (CU-20)
 */
router.post(
  '/income',
  canManageFinance,
  validate(registerIncomeSchema),
  financeController.registerIncome
);

/**
 * POST /api/finance/expense - Registrar salida de fondos (CU-21)
 */
router.post(
  '/expense',
  canManageFinance,
  validate(registerExpenseSchema),
  financeController.registerExpense
);

/**
 * GET /api/finance/balance - Consultar disponibilidad en caja por usuario autenticado
 */
router.get(
  '/balance',
  canViewFinance,
  validate(getBalanceQuerySchema, { source: 'query' }),
  financeController.getMyBalance
);

/**
 * GET /api/finance/balance/:organizacionId - Consultar disponibilidad en caja (CU-22)
 */
router.get(
  '/balance/:organizacionId',
  canViewFinance,
  validate(getBalanceParamsSchema, { source: 'params' }),
  validate(getBalanceQuerySchema, { source: 'query' }),
  financeController.getBalance
);

/**
 * GET /api/finance/transactions - Listar transacciones
 */
router.get(
  '/transactions',
  canViewFinance,
  validate(listTransactionsSchema, { source: 'query' }),
  financeController.listTransactions
);

/**
 * GET /api/finance/summary - Resumen financiero
 */
router.get(
  '/summary',
  canViewFinance,
  financeController.getFinancialSummary
);

export default router;
export { router as financeRouter };