import { Router } from 'express';
import { validationResult } from 'express-validator';
import * as projectController from '../controllers/project.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { ApiError } from '../utils/apiError.js';
import {
  validateProject,
  assignCommitteeValidator,
} from '../validators/project.validator.js';

const router = Router();

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

router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.post(
  '/',
  requireRole(['lider_organizacion']),
  validateProject,
  validateRequest,
  projectController.createProject
);
router.put(
  '/:id',
  requireRole(['lider_organizacion']),
  validateProject,
  validateRequest,
  projectController.updateProject
);
router.patch(
  '/:id/committee',
  requireRole(['lider_organizacion']),
  assignCommitteeValidator,
  validateRequest,
  projectController.assignCommittee
);

export default router;