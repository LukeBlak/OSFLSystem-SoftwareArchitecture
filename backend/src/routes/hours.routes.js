import { Router } from 'express';
import * as hoursController from '../controllers/hours.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

// Base URL design: /api/members/:memberId/horas
const router = Router({ mergeParams: true });

router.use(authenticate);

// PATCH /api/members/:memberId/horas/:id/validate  — CU-17
router.patch(
  '/:id/validate',
  requireRole(['admin', 'lider_organizacion']),
  hoursController.validateHours
);

// GET /api/members/:memberId/horas/report       — CU-19
router.get(
  '/report',
  // Puede requerir acceso propio o privilegios, delegamos chequeo básico
  hoursController.getHoursReport
);

export default router;
