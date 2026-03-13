import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  validateProject,
  assignCommitteeValidator,
} from '../validators/project.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.post(
  '/',
  requireRole('ADMIN', 'COORDINADOR'),
  validateProject,
  validate,
  projectController.createProject
);
router.put(
  '/:id',
  requireRole('ADMIN', 'COORDINADOR'),
  validateProject,
  validate,
  projectController.updateProject
);
router.patch(
  '/:id/committee',
  requireRole('ADMIN', 'COORDINADOR'),
  assignCommitteeValidator,
  validate,
  projectController.assignCommittee
);

export default router;