import { Router } from 'express';
import organizationRoutes from './organization.routes.js';
import memberRoutes from './member.routes.js';
import committeeRoutes from './committee.routes.js';
import profileRoutes from './profile.routes.js';
import projectRoutes from './project.routes.js';
import postulationRoutes from './postulation.routes.js';
import hoursRoutes from './hours.routes.js';
import financeRoutes from './finance.routes.js';
import { authenticate } from '../middleware/auth.middleware.js';
import * as postulationController from '../controllers/postulation.controller.js';

const router = Router();

router.use('/organizations', organizationRoutes);
router.use('/members', memberRoutes);
router.use('/committees', committeeRoutes);
router.use('/profile', profileRoutes);
router.use('/projects', projectRoutes);
router.use('/hours', hoursRoutes);
router.use('/finance', financeRoutes);
router.get('/postulations/me', authenticate, postulationController.getMyPostulations);
router.use('/projects/:proyectoId/postulations', postulationRoutes);
router.use('/members/:memberId/horas', hoursRoutes);

export default router;