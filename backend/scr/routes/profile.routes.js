import { Router } from 'express';
import * as profileController from '../controllers/profile.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  updateProfileValidator,
  updatePasswordValidator,
} from '../validators/profile.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', profileController.getProfile);
router.put('/', updateProfileValidator, validate, profileController.updateProfile);
router.put('/avatar', upload.single('avatar'), profileController.updateAvatar);
router.put('/password', updatePasswordValidator, validate, profileController.updatePassword);

export default router;
