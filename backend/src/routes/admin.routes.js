import express from 'express';
import { getGlobalStats } from '../controllers/admin.controller.js';
import { adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/global-stats', adminOnly, getGlobalStats);

export default router;