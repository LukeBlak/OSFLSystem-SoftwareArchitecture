import { Router } from 'express';
import * as committeeController from '../controllers/committee.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  createCommitteeValidator,
  updateCommitteeValidator,
} from '../validators/committee.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', committeeController.getAll);
router.get('/:id', committeeController.getById);
router.post(
  '/',
  requireRole('ADMIN', 'COORDINADOR'),
  createCommitteeValidator,
  validate,
  committeeController.create
);
router.put(
  '/:id',
  requireRole('ADMIN', 'COORDINADOR'),
  updateCommitteeValidator,
  validate,
  committeeController.update
);
router.delete('/:id', requireRole('ADMIN'), committeeController.remove);

export default router;
