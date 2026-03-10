import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { logger } from './utils/logger.js';
import router from './routes/index.js';

const app = express();

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes, intenta más tarde' },
});
app.use('/api/', limiter);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', router);

// ── Error handling ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info(`Servidor corriendo en puerto ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;
