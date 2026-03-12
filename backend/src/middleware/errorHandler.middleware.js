/**
 * =============================================================================
 * MIDDLEWARE DE MANEJO DE ERRORES GLOBAL
 * =============================================================================
 * 
 * Propósito:
 * - Centralizar el manejo de errores en toda la aplicación
 * - Garantizar respuestas consistentes y seguras para el cliente
 * - Registrar errores para monitoreo y debugging
 * - Prevenir fuga de información sensible en producción
 * 
 * Capa: Presentación (Middleware de Express)
 * 
 * Casos de Uso relacionados:
 * - Todos los endpoints de la API
 * 
 * @module middleware/errorHandler.middleware
 * @layer Presentation
 */

import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { ApiResponse } from '../utils/apiResponse.js';
import { env, isDevelopment, isProduction } from '../config/env.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// CLASES DE ERROR PERSONALIZADAS
// =============================================================================

/**
 * Error de Validación (Zod/Joi)
 * Se lanza cuando los datos de entrada no cumplen con el esquema esperado
 */
export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = StatusCodes.BAD_REQUEST;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * Error de Base de Datos
 * Se lanza cuando hay problemas con operaciones de persistencia
 */
export class DatabaseError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'DatabaseError';
  this.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    this.originalError = originalError;
    this.isOperational = false;
  }
}

/**
 * Error de Autorización
 * Se lanza cuando el usuario no tiene permisos para una acción
 */
export class AuthorizationError extends Error {
  constructor(message = 'No tienes permisos para realizar esta acción') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = StatusCodes.FORBIDDEN;
    this.isOperational = true;
  }
}

/**
 * Error de Recurso No Encontrado
 * Se lanza cuando un recurso solicitado no existe
 */
export class NotFoundError extends Error {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`);
    this.name = 'NotFoundError';
    this.statusCode = StatusCodes.NOT_FOUND;
    this.isOperational = true;
  }
}

/**
 * Error de Conflicto
 * Se lanza cuando hay un conflicto con el estado actual del recurso
 */
export class ConflictError extends Error {
  constructor(message = 'Conflicto con el estado actual del recurso') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = StatusCodes.CONFLICT;
    this.isOperational = true;
  }
}

// =============================================================================
// FUNCIONES DE UTILIDAD PARA MANEJO DE ERRORES
// =============================================================================

/**
 * Determina si un error es operacional (conocido/manejable)
 * Los errores operacionales tienen un código de estado HTTP definido
 * y no indican fallos en el sistema
 * 
 * @param {Error} error - Error a evaluar
 * @returns {boolean} True si es operacional
 */
const isOperationalError = (error) => {
  return error.isOperational === true || 
         error.statusCode !== undefined;
};

/**
 * Extrae el código de estado HTTP del error
 * Prioriza statusCode personalizado, luego usa códigos por tipo de error
 * 
 * @param {Error} error - Error del cual extraer el código
 * @returns {number} Código de estado HTTP
 */
const getStatusCode = (error) => {
  // Si el error tiene statusCode explícito, usarlo
  if (error.statusCode) {
    return error.statusCode;
  }

  // Mapeo de nombres de error a códigos HTTP
  const statusCodeMap = {
    'ValidationError': StatusCodes.BAD_REQUEST,
    'DatabaseError': StatusCodes.INTERNAL_SERVER_ERROR,
    'AuthorizationError': StatusCodes.FORBIDDEN,
    'NotFoundError': StatusCodes.NOT_FOUND,
    'ConflictError': StatusCodes.CONFLICT,
    'CastError': StatusCodes.BAD_REQUEST, // Errores de tipo en BD
    'JsonWebTokenError': StatusCodes.UNAUTHORIZED,
    'TokenExpiredError': StatusCodes.UNAUTHORIZED,
  };

  return statusCodeMap[error.name] || StatusCodes.INTERNAL_SERVER_ERROR;
};

/**
 * Genera mensaje de error seguro para el cliente
 * En producción, oculta detalles técnicos sensibles
 * 
 * @param {Error} error - Error original
 * @param {boolean} isProd - Si estamos en producción
 * @returns {string} Mensaje seguro para el cliente
 */
const getSafeErrorMessage = (error, isProd) => {
  // En desarrollo, mostrar mensaje completo para debugging
  if (!isProd) {
    return error.message || 'Error en el servidor';
  }

  // En producción, solo mostrar mensajes de errores operacionales
  if (isOperationalError(error)) {
    return error.message || 'Error en la solicitud';
  }

  // Para errores no operacionales, mensaje genérico
  return 'Ocurrió un error interno. Por favor intenta nuevamente.';
};

/**
 * Formatea errores de validación de Zod para respuesta al cliente
 * 
 * @param {Object} zodError - Error de validación de Zod
 * @returns {Array} Array de errores formateados
 */
const formatZodErrors = (zodError) => {
  if (!zodError?.errors) return [];

  return zodError.errors.map(err => ({
    field: err.path?.join('.') || 'unknown',
    message: err.message,
    code: err.code,
  }));
};

/**
 * Formatea errores de Supabase para respuesta al cliente
 * 
 * @param {Object} supabaseError - Error de Supabase
 * @returns {Object} Error formateado
 */
const formatSupabaseError = (supabaseError) => {
  const errorMap = {
    '23505': { message: 'El recurso ya existe', statusCode: StatusCodes.CONFLICT },
    '23503': { message: 'Referencia inválida', statusCode: StatusCodes.BAD_REQUEST },
    '42P01': { message: 'Tabla no encontrada', statusCode: StatusCodes.INTERNAL_SERVER_ERROR },
    'PGRST301': { message: 'Recurso no encontrado', statusCode: StatusCodes.NOT_FOUND },
  };

  const code = supabaseError?.code;
  const mapped = errorMap[code];

  if (mapped) {
    return {
      message: mapped.message,
      statusCode: mapped.statusCode,
      details: supabaseError.details || null,
    };
  }

  return {
    message: 'Error en la base de datos',
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    details: supabaseError.details || null,
  };
};

// =============================================================================
// FUNCIÓN PRINCIPAL DEL MIDDLEWARE
// =============================================================================

/**
 * Middleware de manejo de errores global para Express
 * 
 * Esta función debe ser la última middleware registrada en app.js
 * Captura todos los errores no manejados y los formatea consistentemente
 * 
 * @function errorHandler
 * @param {Error} error - Error capturado
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta JSON estandarizada con ApiResponse
 */
export const errorHandler = async (error, req, res, next) => {
  // ===========================================================================
  // 1. LOG DEL ERROR (Para monitoreo y debugging)
  // ===========================================================================
  
  const errorContext = {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    userId: req.user?.id || 'anonymous',
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
    isOperational: isOperationalError(error),
  };

  // Loggear error según severidad
  if (isOperationalError(error)) {
    logger.warn('Error operacional capturado', errorContext);
  } else {
    logger.error('Error no operacional capturado', errorContext);
  }

  // ===========================================================================
  // 2. PROCESAMIENTO DEL ERROR
  // ===========================================================================

  let statusCode = getStatusCode(error);
  let message = getSafeErrorMessage(error, isProduction);
  let details = null;
  let errorCode = error.code || 'INTERNAL_ERROR';

  // Manejo específico para errores de Zod (validación)
  if (error.name === 'ZodError') {
    statusCode = StatusCodes.BAD_REQUEST;
    message = 'Error de validación de datos';
    details = formatZodErrors(error);
    errorCode = 'VALIDATION_ERROR';
  }

  // Manejo específico para errores de Supabase
  if (error?.code?.startsWith('PGRST') || error?.code?.length === 5) {
    const supabaseError = formatSupabaseError(error);
    statusCode = supabaseError.statusCode;
    message = supabaseError.message;
    details = isDevelopment ? supabaseError.details : null;
    errorCode = 'DATABASE_ERROR';
  }

  // Manejo específico para errores de JWT
  if (error.name === 'JsonWebTokenError') {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = 'Token de autenticación inválido';
    errorCode = 'INVALID_TOKEN';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = 'Token de autenticación expirado. Por favor inicia sesión nuevamente';
    errorCode = 'TOKEN_EXPIRED';
  }

  // ===========================================================================
  // 3. CONSTRUCCIÓN DE RESPUESTA
  // ===========================================================================

  const responseData = {
    success: false,
    error: {
      code: errorCode,
      message,
      path: req.path,
      method: req.method,
      timestamp: errorContext.timestamp,
    },
  };

  // Incluir detalles solo en desarrollo o si es error operacional
  if (isDevelopment || isOperationalError(error)) {
    responseData.error.details = details;
    
    // Incluir stack trace solo en desarrollo (nunca en producción)
    if (isDevelopment && error.stack) {
      responseData.error.stack = error.stack.split('\n').slice(0, 10);
    }
  }

  // ===========================================================================
  // 4. ENVÍO DE RESPUESTA
  // ===========================================================================

  return res.status(statusCode).json(responseData);
};

// =============================================================================
// MIDDLEWARE DE ERRORES ASÍNCRONOS (WRAPPER)
// =============================================================================

/**
 * Wrapper para manejar errores en funciones asíncronas
 * 
 * Express no captura automáticamente errores en funciones async/await
 * Este wrapper asegura que los errores sean pasados al errorHandler
 * 
 * @param {Function} fn - Función asíncrona del controller
 * @returns {Function} Middleware de Express con manejo de errores
 * 
 * @example
 * router.get('/ruta', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// =============================================================================
// MIDDLEWARE DE RUTA NO ENCONTRADA (404)
// =============================================================================

/**
 * Middleware para manejar rutas no encontradas (404)
 * 
 * Debe registrarse después de todas las rutas definidas
 * Captura peticiones a endpoints que no existen
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 */
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Endpoint ${req.method} ${req.path}`);
  next(error);
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

export default {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  ValidationError,
  DatabaseError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
};