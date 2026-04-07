/**
 * =============================================================================
 * RUTAS DE HORAS/ASISTENCIA
 * =============================================================================
 * 
 * @module routes/hours.routes
 * @layer Presentation
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { USER_ROLES as ROLES } from '../models/User.js';
import hoursController from '../controllers/hours.controller.js';
import { registerHoursSchema, listHoursSchema } from '../models/Hours.js';

const router = Router();

// Middleware de roles para registro de horas
const canRegisterHours = [
  authenticate,
  requireRole([ROLES.LIDER_COMITE]),
];

// Middleware para ver horas (todos los autenticados)
const canViewHours = [
  authenticate,
  requireRole([ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE, ROLES.MIEMBRO]),
];

/**
 * POST /api/hours - Registrar asistencia (CU-16)
 */
router.post(
  '/',
  canRegisterHours,
  validate(registerHoursSchema),
  hoursController.registerHours
);

/**
 * GET /api/hours/my-history - Mi historial de horas (CU-18)
 */
router.get(
  '/my-history',
  canViewHours,
  hoursController.getMyHoursHistory
);

/**
 * GET /api/hours/member/:miembroId/history - Historial de un miembro (CU-18)
 */
router.get(
  '/member/:miembroId/history',
  canViewHours,
  hoursController.getMemberHoursHistory
);

/**
 * GET /api/hours - Listar registros
 */
router.get(
  '/',
  canViewHours,
  validate(listHoursSchema, { source: 'query' }),
  hoursController.listHours
);

/**
 * GET /api/hours/:id - Obtener registro por ID
 */
router.get(
  '/:id',
  canViewHours,
  hoursController.getHoursById
);

/**
 * PUT /api/hours/:id/validate - Validar horas
 */
router.put(
  '/:id/validate',
  canRegisterHours,
  hoursController.validateHours
);

/**
 * GET /api/hours/member/:miembroId/total - Total de horas por miembro
 */
router.get(
  '/member/:miembroId/total',
  canViewHours,
  hoursController.getMemberTotalHours
);

export default router;
export { router as hoursRouter };