import { Router } from 'express';
import profileController from '../controllers/profile.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { USER_ROLES as ROLES } from '../models/User.js';
import { uploadAvatar } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
	updateProfileSchema,
	changePasswordSchema,
} from '../validators/profile.validator.js';

const router = Router();

const canAccessProfile = [
	authenticate,
	requireRole([
		ROLES.SUPER_ADMIN,
		ROLES.ADMIN,
		ROLES.LIDER_ORGANIZACION,
		ROLES.LIDER_COMITE,
		ROLES.MIEMBRO,
	]),
];

router.get('/', canAccessProfile, profileController.getProfile);

router.put(
	'/',
	canAccessProfile,
	validate(updateProfileSchema),
	profileController.updateProfile
);

router.post(
	'/avatar',
	canAccessProfile,
	uploadAvatar.single('avatar'),
	profileController.uploadAvatar
);

router.delete('/avatar', canAccessProfile, profileController.deleteAvatar);

router.put(
	'/change-password',
	canAccessProfile,
	validate(changePasswordSchema),
	profileController.changePassword
);

router.get(
	'/users',
	authenticate,
	requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
	profileController.listUsers
);

router.post(
	'/users',
	authenticate,
	requireRole([ROLES.SUPER_ADMIN]),
	profileController.createUser
);

router.put(
	'/users/:id',
	authenticate,
	requireRole([ROLES.SUPER_ADMIN]),
	profileController.updateUser
);

router.delete(
	'/users/:id',
	authenticate,
	requireRole([ROLES.SUPER_ADMIN]),
	profileController.deleteUser
);

export default router;