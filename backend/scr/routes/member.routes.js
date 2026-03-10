import { Router } from 'express';
import * as memberController from '../controllers/member.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  registerMemberValidator,
  deactivateMemberValidator,
} from '../validators/member.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', memberController.getAll);
router.get('/:id', memberController.getById);
router.post(
  '/',
  requireRole('ADMIN', 'COORDINADOR'),
  registerMemberValidator,
  validate,
  memberController.register
);
router.patch(
  '/:id/deactivate',
  requireRole('ADMIN', 'COORDINADOR'),
  deactivateMemberValidator,
  validate,
  memberController.deactivate
);

export default router;
