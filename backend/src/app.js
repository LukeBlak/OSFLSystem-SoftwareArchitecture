import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestContextMiddleware } from './utils/requestContext.js';
import authRoutes from './routes/auth.routes.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware.js';

const app = express();

// Seguridad
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Contexto por petición para propagar cliente Supabase autenticado
app.use(requestContextMiddleware);

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    message: 'Servidor saludable',
  });
});

// Rutas principales del dominio (projects, finance, hours, committees, etc.)
app.use('/api', apiRoutes);

// Rutas de autenticación con alias de compatibilidad.
app.use('/api', authRoutes);
app.use('/api/auth', authRoutes);

// Manejo consistente de rutas no encontradas y errores en formato JSON.
app.use(notFoundHandler);
app.use(errorHandler);


export default app;