import { Router } from 'express';
import * as postulationController from '../controllers/postulation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/apiError.js';

const router = Router({ mergeParams: true });

const validateRequest = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  return next(
    ApiError.validation('Validacion fallida', {
      errors: result.array().map((item) => ({
        field: item.path,
        message: item.msg,
      })),
    })
  );
};

router.use(authenticate);

// POST /api/projects/:proyectoId/postulations  — CU-14
router.post('/', postulationController.createPostulation);

// GET  /api/projects/:proyectoId/postulations  — lista para coordinador
router.get(
  '/',
  requireRole(['lider_organizacion', 'lider_comite']),
  postulationController.getPostulationsByProject
);

// GET  /api/postulations/me  — mis postulaciones
// (registrado en index.js como ruta separada)

// PATCH /api/projects/:proyectoId/postulations/:id  — CU-15
router.patch(
  '/:id',
  requireRole(['lider_organizacion', 'lider_comite']),
  [
    body('estado')
      .isIn(['Aceptada', 'Rechazada'])
      .withMessage('estado debe ser Aceptada o Rechazada'),
    body('observaciones').optional().trim(),
  ],
  validateRequest,
  postulationController.updatePostulationStatus
);

export default router;