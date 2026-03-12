import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

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

// Error handler básico
app.use((err, req, res, next) => {
  logger.error('Error no manejado', {
    message: err.message,
    stack: err.stack,
  });
  
  res.status(500).json({
    success: false,
    error: {
      message: 'Error interno del servidor',
    },
  });
});

export default app;