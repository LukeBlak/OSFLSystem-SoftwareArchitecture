import { Router } from 'express';
import authRoutes from './auth.routes.js';
import organizationRoutes from './organization.routes.js';
import memberRoutes from './member.routes.js';
import committeeRoutes from './committee.routes.js';
import profileRoutes from './profile.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/members', memberRoutes);
router.use('/committees', committeeRoutes);
router.use('/profile', profileRoutes);

export default router;
