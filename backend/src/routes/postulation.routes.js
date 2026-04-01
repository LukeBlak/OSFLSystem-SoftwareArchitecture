import { Router } from 'express';
import * as postulationController from '../controllers/postulation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// POST /api/projects/:proyectoId/postulations  — CU-14
router.post('/', postulationController.createPostulation);

// GET  /api/projects/:proyectoId/postulations  — lista para coordinador
router.get(
  '/',
  requireRole(['admin', 'lider_organizacion']),
  postulationController.getPostulationsByProject
);

// GET  /api/postulations/me  — mis postulaciones
// (registrado en index.js como ruta separada)

// PATCH /api/projects/:proyectoId/postulations/:id  — CU-15
router.patch(
  '/:id',
  requireRole(['admin', 'lider_organizacion']),
  [
    body('estado')
      .isIn(['Aceptada', 'Rechazada'])
      .withMessage('estado debe ser Aceptada o Rechazada'),
    body('observaciones').optional().trim(),
  ],
  validate,
  postulationController.updatePostulationStatus
);

export default router;