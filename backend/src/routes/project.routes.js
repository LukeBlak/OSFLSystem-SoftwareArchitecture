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
  requireRole(['lider_organizacion']),
  validateProject,
  validate,
  projectController.createProject
);
router.put(
  '/:id',
  requireRole(['lider_organizacion']),
  validateProject,
  validate,
  projectController.updateProject
);
router.patch(
  '/:id/committee',
  requireRole(['lider_organizacion']),
  assignCommitteeValidator,
  validate,
  projectController.assignCommittee
);

export default router;