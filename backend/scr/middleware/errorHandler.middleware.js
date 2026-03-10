import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
  });
};
