/**
 * =============================================================================
 * MIDDLEWARE DE MANEJO DE ERRORES GLOBAL - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Centralizar el manejo de errores en toda la aplicación backend
 * - Garantizar respuestas consistentes y seguras para el cliente
 * - Registrar errores para monitoreo, debugging y auditoría
 * - Prevenir fuga de información sensible en producción
 * - Implementar patrón de manejo de errores estratificado por tipo
 * 
 * Arquitectura:
 * - Capa: Presentación (Middleware de Express)
 * - Patrón: Global Error Handler + Error Classification
 * - Integración: ApiError, logger, env
 * 
 * Librerías utilizadas:
 * - http-status-codes: Constantes de códigos de estado HTTP
 * 
 * @module middleware/errorHandler.middleware
 * @layer Presentation
 */

import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { env, isDevelopment, isProduction, isTest } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiResponse } from '../utils/apiResponse.js';

// =============================================================================
// CLASES DE ERROR PERSONALIZADAS
// =============================================================================

/**
 * Error de Validación (Zod/Joi/Express Validator)
 * 
 * Se lanza cuando los datos de entrada no cumplen con el esquema esperado
 * o las reglas de validación del dominio.
 * 
 * @extends Error
 * @example
 * throw new ValidationError('Email inválido', [{ field: 'email', message: 'Formato incorrecto' }]);
 */
export class ValidationError extends Error {
  /**
   * @param {string} message - Mensaje descriptivo del error
   * @param {Array} [details] - Array de detalles de validación fallida
   */
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = StatusCodes.BAD_REQUEST;
    this.details = details;
    this.isOperational = true;
    this.code = 'VALIDATION_ERROR';
  }
}

/**
 * Error de Base de Datos
 * 
 * Se lanza cuando hay problemas con operaciones de persistencia
 * (Supabase/PostgreSQL).
 * 
 * @extends Error
 * @example
 * throw new DatabaseError('Error al guardar usuario', originalError);
 */
export class DatabaseError extends Error {
  /**
   * @param {string} message - Mensaje descriptivo del error
   * @param {Object} [originalError] - Error original de la base de datos
   */
  constructor(message, originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    this.originalError = originalError;
    this.isOperational = false;
    this.code = 'DATABASE_ERROR';
  }
}

/**
 * Error de Autorización
 * 
 * Se lanza cuando el usuario autenticado no tiene permisos para una acción.
 * 
 * @extends Error
 * @example
 * throw new AuthorizationError('No tienes permisos para eliminar esta organización');
 */
export class AuthorizationError extends Error {
  /**
   * @param {string} [message] - Mensaje descriptivo del error
   */
  constructor(message = 'No tienes permisos para realizar esta acción') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = StatusCodes.FORBIDDEN;
    this.isOperational = true;
    this.code = 'AUTHORIZATION_ERROR';
  }
}

/**
 * Error de Recurso No Encontrado
 * 
 * Se lanza cuando un recurso solicitado no existe en la base de datos.
 * 
 * @extends Error
 * @example
 * throw new NotFoundError('Usuario');
 */
export class NotFoundError extends Error {
  /**
   * @param {string} [resource] - Tipo de recurso no encontrado
   */
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`);
    this.name = 'NotFoundError';
    this.statusCode = StatusCodes.NOT_FOUND;
    this.isOperational = true;
    this.code = 'NOT_FOUND_ERROR';
  }
}

/**
 * Error de Conflicto
 * 
 * Se lanza cuando hay un conflicto con el estado actual del recurso
 * (ej: email duplicado, violación de unicidad).
 * 
 * @extends Error
 * @example
 * throw new ConflictError('El email ya está registrado');
 */
export class ConflictError extends Error {
  /**
   * @param {string} [message] - Mensaje descriptivo del conflicto
   */
  constructor(message = 'Conflicto con el estado actual del recurso') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = StatusCodes.CONFLICT;
    this.isOperational = true;
    this.code = 'CONFLICT_ERROR';
  }
}

/**
 * Error de Servicio Externo
 * 
 * Se lanza cuando un servicio externo (Cloudinary, Email, etc.) falla.
 * 
 * @extends Error
 * @example
 * throw new ExternalServiceError('Cloudinary', 'Error al subir imagen', error);
 */
export class ExternalServiceError extends Error {
  /**
   * @param {string} serviceName - Nombre del servicio externo
   * @param {string} [message] - Mensaje descriptivo del error
   * @param {Object} [originalError] - Error original del servicio
   */
  constructor(serviceName, message = 'Error en servicio externo', originalError = null) {
    super(message);
    this.name = 'ExternalServiceError';
    this.statusCode = StatusCodes.SERVICE_UNAVAILABLE;
    this.serviceName = serviceName;
    this.originalError = originalError;
    this.isOperational = true;
    this.code = 'EXTERNAL_SERVICE_ERROR';
  }
}

// =============================================================================
// FUNCIONES DE UTILIDAD PARA MANEJO DE ERRORES
// =============================================================================

/**
 * Determina si un error es operacional (conocido/manejable)
 * 
 * Los errores operacionales tienen un código de estado HTTP definido
 * y no indican fallos críticos en el sistema. Se pueden mostrar
 * mensajes específicos al usuario.
 * 
 * Los errores no operacionales son fallos del sistema (bug, BD caída, etc.)
 * y requieren mensajes genéricos para no exponer información interna.
 * 
 * @param {Error} error - Error a evaluar
 * @returns {boolean} True si es operacional
 * 
 * @example
 * if (isOperationalError(error)) {
 *   // Mostrar mensaje específico al usuario
 * } else {
 *   // Loggear error y mostrar mensaje genérico
 * }
 */
const isOperationalError = (error) => {
  return error.isOperational === true || 
         error.statusCode !== undefined ||
         ['ValidationError', 'AuthorizationError', 'NotFoundError', 'ConflictError'].includes(error.name);
};

/**
 * Extrae el código de estado HTTP del error
 * 
 * Prioriza statusCode personalizado, luego usa códigos por tipo de error.
 * 
 * @param {Error} error - Error del cual extraer el código
 * @returns {number} Código de estado HTTP
 * 
 * @example
 * const statusCode = getStatusCode(error); // 400, 401, 403, 404, 500, etc.
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
    'AuthenticationError': StatusCodes.UNAUTHORIZED,
    'ExternalServiceError': StatusCodes.SERVICE_UNAVAILABLE,
    'CastError': StatusCodes.BAD_REQUEST, // Errores de tipo en BD
    'JsonWebTokenError': StatusCodes.UNAUTHORIZED,
    'TokenExpiredError': StatusCodes.UNAUTHORIZED,
    'ZodError': StatusCodes.BAD_REQUEST,
  };

  return statusCodeMap[error.name] || StatusCodes.INTERNAL_SERVER_ERROR;
};

/**
 * Genera mensaje de error seguro para el cliente
 * 
 * En producción, oculta detalles técnicos sensibles para prevenir
 * que atacantes obtengan información sobre la infraestructura interna.
 * 
 * @param {Error} error - Error original
 * @param {boolean} isProd - Si estamos en producción
 * @returns {string} Mensaje seguro para el cliente
 * 
 * @example
 * const safeMessage = getSafeErrorMessage(error, isProduction);
 */
const getSafeErrorMessage = (error, isProd) => {
  // En desarrollo/testing, mostrar mensaje completo para debugging
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
 * 
 * @example
 * const formattedErrors = formatZodErrors(error);
 * // [{ field: 'email', message: 'Email inválido', code: 'invalid_string' }]
 */
const formatZodErrors = (zodError) => {
  if (!zodError?.errors) return [];

  return zodError.errors.map(err => ({
    field: err.path?.join('.') || 'unknown',
    message: err.message,
    code: err.code,
    expected: err.expected,
    received: err.received,
  }));
};

/**
 * Formatea errores de Supabase para respuesta al cliente
 * 
 * Mapea códigos de error de PostgreSQL a mensajes comprensibles.
 * 
 * @param {Object} supabaseError - Error de Supabase
 * @returns {Object} Error formateado con código y mensaje
 * 
 * @example
 * const formatted = formatSupabaseError(error);
 */
const formatSupabaseError = (supabaseError) => {
  // Mapeo de códigos de error de PostgreSQL a mensajes amigables
  const errorMap = {
    // Violaciones de unicidad
    '23505': { 
      message: 'El recurso ya existe (violación de unicidad)', 
      statusCode: StatusCodes.CONFLICT 
    },
    // Violaciones de clave foránea
    '23503': { 
      message: 'Referencia inválida (clave foránea no existe)', 
      statusCode: StatusCodes.BAD_REQUEST 
    },
    // Violaciones de restricción de chequeo
    '23514': { 
      message: 'Datos no cumplen con las restricciones', 
      statusCode: StatusCodes.BAD_REQUEST 
    },
    // Violaciones de restricción de no nulo
    '23502': { 
      message: 'Campo requerido no puede ser nulo', 
      statusCode: StatusCodes.BAD_REQUEST 
    },
    // Tabla no encontrada
    '42P01': { 
      message: 'Tabla no encontrada', 
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR 
    },
    // Columna no encontrada
    '42703': { 
      message: 'Columna no encontrada', 
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR 
    },
    // Errores de PostgREST
    'PGRST301': { 
      message: 'Recurso no encontrado', 
      statusCode: StatusCodes.NOT_FOUND 
    },
    'PGRST204': { 
      message: 'Datos insuficientes', 
      statusCode: StatusCodes.BAD_REQUEST 
    },
  };

  const code = supabaseError?.code;
  const mapped = errorMap[code];

  if (mapped) {
    return {
      message: mapped.message,
      statusCode: mapped.statusCode,
      details: isDevelopment ? supabaseError.details || supabaseError.hint : null,
      code: code,
    };
  }

  // Error no mapeado - retornar genérico
  return {
    message: 'Error en la base de datos',
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    details: isDevelopment ? supabaseError.details : null,
    code: code || 'UNKNOWN_DB_ERROR',
  };
};

/**
 * Clasifica el tipo de error para logging y manejo apropiado
 * 
 * @param {Error} error - Error a clasificar
 * @returns {Object} Clasificación del error
 * 
 * @example
 * const classification = classifyError(error);
 * // { level: 'error', category: 'database', isOperational: false }
 */
const classifyError = (error) => {
  const errorName = error.name || 'Error';
  
  // Errores de validación - WARNING level
  if (['ValidationError', 'ZodError'].includes(errorName)) {
    return {
      level: 'warn',
      category: 'validation',
      isOperational: true,
    };
  }

  // Errores de autenticación/autorización - WARNING level
  if (['AuthenticationError', 'AuthorizationError', 'JsonWebTokenError', 'TokenExpiredError'].includes(errorName)) {
    return {
      level: 'warn',
      category: 'security',
      isOperational: true,
    };
  }

  // Errores de base de datos - ERROR level
  if (['DatabaseError'].includes(errorName) || error?.code?.startsWith('23') || error?.code?.startsWith('42')) {
    return {
      level: 'error',
      category: 'database',
      isOperational: false,
    };
  }

  // Errores de servicios externos - ERROR level
  if (['ExternalServiceError'].includes(errorName)) {
    return {
      level: 'error',
      category: 'external_service',
      isOperational: true,
    };
  }

  // Errores no encontrados - INFO level (comunes)
  if (['NotFoundError'].includes(errorName)) {
    return {
      level: 'info',
      category: 'not_found',
      isOperational: true,
    };
  }

  // Errores genéricos - ERROR level
  return {
    level: 'error',
    category: 'unknown',
    isOperational: isOperationalError(error),
  };
};

// =============================================================================
// FUNCIÓN PRINCIPAL DEL MIDDLEWARE
// =============================================================================

/**
 * Middleware de manejo de errores global para Express
 * 
 * Esta función DEBE ser la última middleware registrada en app.js.
 * Captura todos los errores no manejados y los formatea consistentemente
 * para respuesta al cliente, mientras registra los detalles para debugging.
 * 
 * @function errorHandler
 * @param {Error} error - Error capturado (puede ser de cualquier tipo)
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.id - ID único de la petición (si está disponible)
 * @param {Object} req.user - Usuario autenticado (si está disponible)
 * @param {string} req.path - Path de la petición
 * @param {string} req.method - Método HTTP de la petición
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express (no se usa aquí)
 * 
 * @returns {Object} Respuesta JSON estandarizada con ApiResponse
 * 
 * @throws {Never} Este middleware no llama a next(), siempre termina la petición
 * 
 * @example
 * // En app.js (DEBE ser el último middleware)
 * app.use(errorHandler);
 * 
 * @example
 * // Respuesta en desarrollo:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Email inválido",
 *     "path": "/api/users",
 *     "method": "POST",
 *     "timestamp": "2026-02-03T10:30:00.000Z",
 *     "details": [{ "field": "email", "message": "Formato incorrecto" }],
 *     "stack": ["Error: Email inválido", "    at ..."]
 *   }
 * }
 * 
 * @example
 * // Respuesta en producción:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Email inválido",
 *     "path": "/api/users",
 *     "method": "POST",
 *     "timestamp": "2026-02-03T10:30:00.000Z"
 *   }
 * }
 */
export const errorHandler = async (error, req, res, next) => {
  // ===========================================================================
  // 1. CLASIFICACIÓN Y LOG DEL ERROR
  // ===========================================================================
  
  /**
   * Clasificar el error para determinar nivel de logging y categoría
   */
  const classification = classifyError(error);
  
  /**
   * Contexto completo del error para logging y auditoría
   */
  const errorContext = {
    /**
     * Timestamp del error en formato ISO 8601
     * @type {string}
     */
    timestamp: new Date().toISOString(),
    
    /**
     * ID único de la petición para trazabilidad
     * @type {string|null}
     */
    requestId: req.id || null,
    
    /**
     * Path de la petición donde ocurrió el error
     * @type {string}
     */
    path: req.path,
    
    /**
     * Método HTTP de la petición
     * @type {string}
     */
    method: req.method,
    
    /**
     * ID del usuario autenticado (si aplica)
     * @type {string|null}
     */
    userId: req.user?.id || null,
    
    /**
     * Rol del usuario (si aplica)
     * @type {string|null}
     */
    userRole: req.user?.role || null,
    
    /**
     * Nombre del error (clase)
     * @type {string}
     */
    errorName: error.name || 'Error',
    
    /**
     * Mensaje del error
     * @type {string}
     */
    errorMessage: error.message,
    
    /**
     * Stack trace completo (solo en desarrollo)
     * @type {string|null}
     */
    stack: isDevelopment ? error.stack : null,
    
    /**
     * Si el error es operacional (conocido/manejable)
     * @type {boolean}
     */
    isOperational: classification.isOperational,
    
    /**
     * Categoría del error para filtrado en logs
     * @type {string}
     */
    category: classification.category,
    
    /**
     * Código de error interno
     * @type {string}
     */
    code: error.code || 'INTERNAL_ERROR',
  };

  /**
   * Loggear error según nivel de severidad
   * 
   * - WARNING: Errores operacionales (validación, auth, etc.)
   * - ERROR: Errores no operacionales (BD, servicios externos, bugs)
   */
  if (classification.level === 'warn') {
    logger.warn('Error operacional capturado', errorContext);
  } else if (classification.level === 'info') {
    logger.info('Error informativo capturado', errorContext);
  } else {
    logger.error('Error no operacional capturado', errorContext);
  }

  // ===========================================================================
  // 2. PROCESAMIENTO DEL ERROR
  // ===========================================================================

  /**
   * Determinar código de estado HTTP
   */
  let statusCode = getStatusCode(error);
  
  /**
   * Mensaje seguro para el cliente (sin información sensible en producción)
   */
  let message = getSafeErrorMessage(error, isProduction);
  
  /**
   * Detalles adicionales del error (solo en desarrollo o errores operacionales)
   */
  let details = null;
  
  /**
   * Código de error interno para identificación programática
   */
  let errorCode = error.code || 'INTERNAL_ERROR';

  // ---------------------------------------------------------------------------
  // Manejo específico para errores de Zod (validación)
  // ---------------------------------------------------------------------------
  if (error.name === 'ZodError') {
    statusCode = StatusCodes.BAD_REQUEST;
    message = 'Error de validación de datos';
    details = formatZodErrors(error);
    errorCode = 'VALIDATION_ERROR';
  }

  // ---------------------------------------------------------------------------
  // Manejo específico para errores de Supabase/PostgreSQL
  // ---------------------------------------------------------------------------
  if (error?.code?.startsWith('PGRST') || 
      error?.code?.length === 5 || 
      error?.message?.includes('Supabase')) {
    const supabaseError = formatSupabaseError(error);
    statusCode = supabaseError.statusCode;
    message = supabaseError.message;
    details = supabaseError.details;
    errorCode = 'DATABASE_ERROR';
  }

  // ---------------------------------------------------------------------------
  // Manejo específico para errores de JWT
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Manejo específico para errores de Multer (upload de archivos)
  // ---------------------------------------------------------------------------
  if (error instanceof multer.MulterError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = `Error en la subida del archivo: ${error.message}`;
    errorCode = 'UPLOAD_ERROR';
  }

  // ===========================================================================
  // 3. CONSTRUCCIÓN DE RESPUESTA
  // ===========================================================================

  /**
   * Objeto de respuesta estandarizado
   * 
   * Sigue el formato definido en ApiResponse para consistencia
   */
  const responseData = {
    /**
     * Indicador de éxito (siempre false para errores)
     */
    success: false,
    
    /**
     * Objeto de error con información detallada
     */
    error: {
      /**
       * Código de error interno para identificación programática
       */
      code: errorCode,
      
      /**
       * Mensaje legible para humanos (seguro para producción)
       */
      message,
      
      /**
       * Path de la petición donde ocurrió el error
       */
      path: req.path,
      
      /**
       * Método HTTP de la petición
       */
      method: req.method,
      
      /**
       * Timestamp del error
       */
      timestamp: errorContext.timestamp,
    },
  };

  /**
   * Incluir detalles solo en desarrollo o si es error operacional
   * 
   * En producción, los detalles de errores no operacionales se ocultan
   * para prevenir fuga de información sobre la infraestructura interna.
   */
  if (isDevelopment || isTest || isOperationalError(error)) {
    responseData.error.details = details;
    
    /**
     * Incluir stack trace solo en desarrollo (nunca en producción)
     * 
     * El stack trace es invaluable para debugging pero revela
     * información sobre la estructura del código que no debe
     * exponerse en producción.
     */
    if (isDevelopment && error.stack) {
      responseData.error.stack = error.stack.split('\n').slice(0, 15);
    }
  }

  /**
   * Incluir ID de la petición para trazabilidad
   * 
   * El frontend puede usar este ID para reportar errores al soporte
   * y el equipo puede buscar el log específico en el servidor.
   */
  if (req.id) {
    responseData.error.requestId = req.id;
  }

  // ===========================================================================
  // 4. ENVÍO DE RESPUESTA
  // ===========================================================================

  /**
   * Enviar respuesta con código de estado HTTP apropiado
   * 
   * El código de estado debe reflejar la naturaleza del error:
   * - 4xx: Errores del cliente (validación, auth, permisos, etc.)
   * - 5xx: Errores del servidor (BD, bugs, servicios externos, etc.)
   */
  return res.status(statusCode).json(responseData);
};

// =============================================================================
// MIDDLEWARE DE ERRORES ASÍNCRONOS (WRAPPER)
// =============================================================================

/**
 * Wrapper para manejar errores en funciones asíncronas
 * 
 * Express NO captura automáticamente errores en funciones async/await.
 * Este wrapper asegura que los errores sean pasados al errorHandler
 * correctamente.
 * 
 * @param {Function} fn - Función asíncrona del controller
 * @returns {Function} Middleware de Express con manejo de errores
 * 
 * @example
 * // Sin wrapper (error no se captura):
 * router.get('/users', async (req, res) => {
 *   const users = await userService.getAll(); // Si falla, error se pierde
 *   res.json(users);
 * });
 * 
 * @example
 * // Con wrapper (error se captura correctamente):
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userService.getAll(); // Si falla, va al errorHandler
 *   res.json(users);
 * }));
 * 
 * @see https://expressjs.com/en/guide/error-handling.html
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    /**
     * Ejecutar la función asíncrona y capturar cualquier error
     * 
     * Promise.resolve() convierte el resultado a Promise para manejar
     * tanto funciones que retornan Promises como las que no.
     * 
     * .catch(next) pasa cualquier error al siguiente middleware,
     * que eventualmente llegará al errorHandler.
     */
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// =============================================================================
// MIDDLEWARE DE RUTA NO ENCONTRADA (404)
// =============================================================================

/**
 * Middleware para manejar rutas no encontradas (404)
 * 
 * Debe registrarse DESPUÉS de todas las rutas definidas.
 * Captura peticiones a endpoints que no existen en la API.
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @example
 * // En app.js (después de todas las rutas)
 * app.use('/api', routes);
 * app.use(notFoundHandler); // ← Debe ir después
 * app.use(errorHandler);    // ← Debe ir último
 */
export const notFoundHandler = (req, res, next) => {
  /**
   * Crear error de tipo NotFoundError con información de la ruta
   * 
   * Esto permite que el errorHandler procese el 404 consistentemente
   * con todos los demás errores.
   */
  const error = new NotFoundError(`Endpoint ${req.method} ${req.path}`);
  
  /**
   * Agregar información adicional para debugging
   */
  error.details = {
    path: req.path,
    method: req.method,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    hint: 'Verifica que la URL sea correcta y que el endpoint exista',
  };
  
  /**
   * Pasar el error al errorHandler
   */
  next(error);
};

// =============================================================================
// MIDDLEWARE DE TIMEOUT DE PETICIÓN
// =============================================================================

/**
 * Middleware para manejar timeouts de peticiones
 * 
 * Previene que peticiones lentas o colgadas consuman recursos
 * indefinidamente.
 * 
 * @param {number} [timeout=30000] - Timeout en milisegundos (default: 30s)
 * @returns {Function} Middleware de Express
 * 
 * @example
 * // Aplicar timeout de 30 segundos a todas las rutas
 * app.use(requestTimeout(30000));
 * 
 * @example
 * // Aplicar timeout específico a una ruta
 * router.post('/upload', requestTimeout(60000), uploadController.upload);
 */
export const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    /**
     * Configurar timeout para la respuesta
     */
    res.setTimeout(timeout, () => {
      /**
       * Crear error de timeout
       */
      const error = new ExternalServiceError(
        'Request',
        `La petición excedió el tiempo límite de ${timeout/1000} segundos`,
        { timeout }
      );
      
      error.statusCode = StatusCodes.REQUEST_TIMEOUT;
      error.code = 'REQUEST_TIMEOUT';
      
      /**
       * Loggear el timeout
       */
      logger.warn('Request timeout', {
        path: req.path,
        method: req.method,
        timeout,
        userId: req.user?.id,
      });
      
      /**
       * Pasar al errorHandler
       */
      next(error);
    });
    
    next();
  };
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta todas las funciones y clases del módulo
 * 
 * @example
 * // Importación named (recomendado)
 * import { 
 *   errorHandler, 
 *   asyncHandler, 
 *   notFoundHandler,
 *   ValidationError,
 *   DatabaseError
 * } from './middleware/errorHandler.middleware.js';
 * 
 * @example
 * // Importación por defecto
 * import errorMiddleware from './middleware/errorHandler.middleware.js';
 * errorMiddleware.errorHandler;
 * errorMiddleware.asyncHandler;
 */
export default {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  requestTimeout,
  // Clases de error
  ValidationError,
  DatabaseError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
  // Utilidades
  isOperationalError,
  getStatusCode,
  classifyError,
};