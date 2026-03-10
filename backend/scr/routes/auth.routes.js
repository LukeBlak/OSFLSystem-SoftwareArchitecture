import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  updatePasswordValidator,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginValidator, validate, authController.login);
router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);
router.put('/update-password', authenticate, updatePasswordValidator, validate, authController.updatePassword);
router.get('/me', authenticate, authController.me);

export default router;
