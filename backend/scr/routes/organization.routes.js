import { Router } from 'express';
import * as orgController from '../controllers/organization.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  createOrganizationValidator,
  updateOrganizationValidator,
} from '../validators/organization.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', orgController.getAll);
router.get('/:id', orgController.getById);
router.post(
  '/',
  requireRole('ADMIN'),
  upload.single('logo'),
  createOrganizationValidator,
  validate,
  orgController.create
);
router.put(
  '/:id',
  requireRole('ADMIN', 'COORDINADOR'),
  upload.single('logo'),
  updateOrganizationValidator,
  validate,
  orgController.update
);
router.delete('/:id', requireRole('ADMIN'), orgController.remove);

export default router;
