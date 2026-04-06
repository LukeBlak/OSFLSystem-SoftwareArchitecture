/**
 * =============================================================================
 * CLASE DE ERROR PERSONALIZADA PARA API - UTILIDAD GLOBAL
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Proporcionar una clase de error estandarizada para toda la API
 * - Facilitar el manejo consistente de errores en la Capa de Presentación
 * - Permitir la propagación de errores con información estructurada
 * - Integrarse con el middleware errorHandler.middleware.js
 * - Implementar patrón de errores operacionales vs no operacionales
 * - Proporcionar mensajes amigables para el usuario final
 * 
 * Arquitectura:
 * - Capa: Utilidades (usada en Presentación y Aplicación)
 * - Patrón: Custom Error Class + Factory Methods + i18n-ready
 * - Integración: http-status-codes, errorHandler.middleware.js
 * 
 * @module utils/apiError
 * @layer Utilities
 */

import { StatusCodes, getReasonPhrase } from 'http-status-codes';

// =============================================================================
// MAPA DE MENSAJES AMIGABLES POR CÓDIGO DE ERROR
// =============================================================================

/**
 * Mensajes predeterminados para cada código de error.
 * Estos mensajes son seguros para mostrar al usuario final.
 * 
 * @constant {Object<string, string>}
 */
const FRIENDLY_MESSAGES = {
  // Autenticación
  'UNAUTHORIZED': 'Email o contraseña incorrectos',
  'AUTHENTICATION_ERROR': 'No pudimos verificar tu identidad',
  
  // Autorización
  'FORBIDDEN': 'No tienes permisos para realizar esta acción',
  'ACCOUNT_DEACTIVATED': 'Tu cuenta ha sido desactivada. Contacta al administrador',
  'ACCOUNT_NOT_VERIFIED': 'Por favor verifica tu email antes de continuar',
  'AUTHORIZATION_ERROR': 'Acceso denegado',
  
  // Validación
  'BAD_REQUEST': 'Los datos enviados no son válidos',
  'VALIDATION_ERROR': 'Verifica la información ingresada',
  'INVALID_EMAIL': 'El formato del email no es válido',
  'INVALID_PASSWORD': 'La contraseña no cumple con los requisitos',
  'MISSING_FIELD': 'Falta un campo requerido',
  
  // Recursos
  'NOT_FOUND': 'El recurso solicitado no existe',
  'USER_NOT_FOUND': 'No existe una cuenta con este email',
  'RESOURCE_NOT_FOUND': 'El elemento que buscas no fue encontrado',
  'NOT_FOUND_ERROR': 'No encontrado',
  
  // Conflictos
  'CONFLICT': 'Esta acción no puede completarse debido a un conflicto',
  'EMAIL_EXISTS': 'Este email ya está registrado',
  'CONFLICT_ERROR': 'Conflicto de datos',
  
  // Rate limiting
  'RATE_LIMIT_EXCEEDED': 'Demasiados intentos. Por favor espera unos minutos',
  'TOO_MANY_REQUESTS': 'Has excedido el límite de peticiones',
  
  // Archivos
  'PAYLOAD_TOO_LARGE': 'El archivo es demasiado grande',
  'UNSUPPORTED_MEDIA_TYPE': 'Formato de archivo no soportado',
  
  // Tiempo
  'REQUEST_TIMEOUT': 'La petición tardó demasiado. Intenta de nuevo',
  
  // Servicios externos
  'EXTERNAL_SERVICE_ERROR': 'Un servicio externo no está disponible',
  'SERVICE_UNAVAILABLE': 'El servicio no está disponible temporalmente',
  
  // Base de datos
  'DATABASE_ERROR': 'Ocurrió un error al procesar tu solicitud',
  
  // Errores internos
  'INTERNAL_ERROR': 'Ocurrió un error inesperado. Por favor intenta de nuevo',
};

// =============================================================================
// CLASE PRINCIPAL ApiError
// =============================================================================

/**
 * Clase base para todos los errores personalizados de la API
 * 
 * Proporciona:
 * - Código de estado HTTP para respuestas
 * - Código de error interno para identificación programática
 * - Mensaje técnico (para logs) y mensaje amigable (para usuario)
 * - Distinción entre errores operacionales y no operacionales
 * - Información detallada para debugging
 * - Serialización JSON para respuestas API
 * 
 * @extends Error
 */
class ApiError extends Error {
  /**
   * Constructor de ApiError
   * 
   * @param {number} statusCode - Código de estado HTTP (400, 401, 403, 404, 500, etc.)
   * @param {string} message - Mensaje técnico del error (para logs y debugging)
   * @param {Object} [options] - Opciones adicionales
   * @param {string} [options.code] - Código de error interno para identificación
   * @param {string} [options.userMessage] - Mensaje amigable para el usuario final
   * @param {Object} [options.details] - Detalles adicionales del error
   * @param {boolean} [options.isOperational] - Si es un error operacional (conocido)
   * @param {string} [options.stack] - Stack trace personalizado
   * @param {string} [options.field] - Campo específico que causó el error (para validaciones)
   */
  constructor(
    statusCode,
    message,
    {
      code = 'INTERNAL_ERROR',
      userMessage = null,
      details = null,
      isOperational = true,
      stack = '',
      field = null,
    } = {}
  ) {
    super(message);

    this.statusCode = statusCode;
    this.message = message; // Mensaje técnico
    this.code = code;
    
    // Mensaje amigable: usar el proporcionado o buscar en el mapa por código
    this.userMessage = userMessage || FRIENDLY_MESSAGES[code] || message;
    
    this.details = details;
    this.isOperational = isOperational;
    this.field = field; // Útil para destacar el campo con error en el frontend
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.path = null;
    this.method = null;
    this.requestId = null;

    if (stack) {
      this.stack = stack;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }

  /**
   * Serializa el error a formato JSON para respuestas API
   * @returns {Object} Objeto JSON con información del error
   */
  toJSON() {
    return {
      statusCode: this.statusCode,
      message: this.message,
      userMessage: this.userMessage,
      code: this.code,
      field: this.field,
      details: this.details,
      timestamp: this.timestamp,
      path: this.path,
      method: this.method,
      requestId: this.requestId,
      name: this.name,
    };
  }

  /**
   * Genera un objeto de respuesta estandarizado para Express
   * @param {boolean} isDevelopment - Si estamos en entorno de desarrollo
   * @returns {Object} Objeto de respuesta para Express
   */
  toResponse(isDevelopment = false) {
    const response = {
      success: false,
      error: {
        code: this.code,
        message: this.message,           // Mensaje técnico (para logs)
        userMessage: this.userMessage,   // Mensaje amigable (para el usuario)
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(this.field && { field: this.field }), // Campo con error, si aplica
      },
    };

    // Incluir detalles solo si existen
    if (this.details) {
      response.error.details = this.details;
    }

    // Incluir contexto de la petición
    if (this.path) response.error.path = this.path;
    if (this.method) response.error.method = this.method;
    if (this.requestId) response.error.requestId = this.requestId;

    // Incluir stack trace solo en desarrollo (nunca en producción)
    if (isDevelopment && this.stack) {
      response.error.stack = this.stack.split('\n').slice(0, 15);
    }

    return response;
  }

  // =============================================================================
  // FACTORY METHODS - MÉTODOS ESTÁTICOS PARA CREAR ERRORES
  // =============================================================================

  /**
   * Error 400 Bad Request - Datos inválidos o faltantes
   */
  static badRequest(message, { code = 'BAD_REQUEST', userMessage = null, details = null, field = null } = {}) {
    return new ApiError(StatusCodes.BAD_REQUEST, message, {
      code, userMessage, details, field,
    });
  }

  /**
   * Error 401 Unauthorized - Credenciales inválidas o faltantes
   */
  static unauthorized(message, { code = 'UNAUTHORIZED', userMessage = null, details = null } = {}) {
    return new ApiError(StatusCodes.UNAUTHORIZED, message, {
      code, userMessage, details,
    });
  }

  /**
   * Error 403 Forbidden - Usuario autenticado sin permisos
   */
  static forbidden(message, { code = 'FORBIDDEN', userMessage = null, details = null } = {}) {
    return new ApiError(StatusCodes.FORBIDDEN, message, {
      code, userMessage, details,
    });
  }

  /**
   * Error 404 Not Found - Recurso no existe
   */
  static notFound(message, { code = 'NOT_FOUND', userMessage = null, details = null } = {}) {
    return new ApiError(StatusCodes.NOT_FOUND, message, {
      code, userMessage, details,
    });
  }

  /**
   * Error 409 Conflict - Conflicto con estado actual del recurso
   */
  static conflict(message, { code = 'CONFLICT', userMessage = null, details = null } = {}) {
    return new ApiError(StatusCodes.CONFLICT, message, {
      code, userMessage, details,
    });
  }

  /**
   * Error 429 Too Many Requests - Rate limiting
   */
  static tooManyRequests(message, { code = 'RATE_LIMIT_EXCEEDED', userMessage = null, details = null } = {}) {
    return new ApiError(StatusCodes.TOO_MANY_REQUESTS, message, {
      code, userMessage, details,
    });
  }

  /**
   * Error 500 Internal Server Error - Fallo del sistema
   */
  static internal(message, { code = 'INTERNAL_ERROR', userMessage = null, details = null, isOperational = false } = {}) {
    return new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, message, {
      code, userMessage, details, isOperational,
    });
  }

  /**
   * Error 503 Service Unavailable - Servicio externo no disponible
   */
  static serviceUnavailable(message, { code = 'SERVICE_UNAVAILABLE', userMessage = null, details = null } = {}) {
    return new ApiError(StatusCodes.SERVICE_UNAVAILABLE, message, {
      code, userMessage, details,
    });
  }

  /**
   * Error de validación específico (Zod, Joi, etc.)
   */
  static validation(message, { errors = null, userMessage = null, field = null } = {}) {
    return new ApiError(StatusCodes.BAD_REQUEST, message, {
      code: 'VALIDATION_ERROR',
      userMessage: userMessage || 'Verifica la información ingresada',
      details: errors ? { errors } : null,
      field,
    });
  }

  /**
   * Error específico de base de datos
   */
  static database(message, { originalError = null, userMessage = null } = {}) {
    return new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, message, {
      code: 'DATABASE_ERROR',
      userMessage: userMessage || 'Ocurrió un error al procesar tu solicitud',
      isOperational: false,
      details: originalError ? { originalError: originalError.message } : null,
    });
  }

  /**
   * Error de servicio externo (Cloudinary, Email, etc.)
   */
  static externalService(serviceName, message, { originalError = null, userMessage = null } = {}) {
    return new ApiError(StatusCodes.SERVICE_UNAVAILABLE, message, {
      code: 'EXTERNAL_SERVICE_ERROR',
      userMessage: userMessage || 'Un servicio externo no está disponible',
      isOperational: true,
      details: {
        serviceName,
        originalError: originalError ? originalError.message : null,
      },
    });
  }

  /**
   * Error 415 Unsupported Media Type
   */
  static unsupportedMediaType(message, { userMessage = null, details = null } = {}) {
    return new ApiError(StatusCodes.UNSUPPORTED_MEDIA_TYPE, message, {
      code: 'UNSUPPORTED_MEDIA_TYPE',
      userMessage,
      details,
    });
  }

  /**
   * Error 413 Payload Too Large
   */
  static payloadTooLarge(message, { userMessage = null, details = null } = {}) {
    return new ApiError(StatusCodes.PAYLOAD_TOO_LARGE, message, {
      code: 'PAYLOAD_TOO_LARGE',
      userMessage,
      details,
    });
  }

  /**
   * Error 408 Request Timeout
   */
  static requestTimeout(message, { userMessage = null, details = null } = {}) {
    return new ApiError(StatusCodes.REQUEST_TIMEOUT, message, {
      code: 'REQUEST_TIMEOUT',
      userMessage,
      details,
    });
  }

  // =============================================================================
  // MÉTODOS DE CONVENIENCIA PARA CASOS COMUNES
  // =============================================================================

  /**
   * Error específico para cuenta desactivada
   */
  static accountDeactivated(message = 'Tu cuenta ha sido desactivada', { details = null } = {}) {
    return new ApiError(StatusCodes.FORBIDDEN, message, {
      code: 'ACCOUNT_DEACTIVATED',
      userMessage: 'Tu cuenta ha sido desactivada. Contacta al administrador',
      details,
    });
  }

  /**
   * Error específico para email no verificado
   */
  static emailNotVerified(message = 'Email no verificado', { details = null } = {}) {
    return new ApiError(StatusCodes.FORBIDDEN, message, {
      code: 'ACCOUNT_NOT_VERIFIED',
      userMessage: 'Por favor verifica tu email antes de continuar',
      details,
    });
  }

  /**
   * Error específico para credenciales inválidas
   */
  static invalidCredentials(message = 'Credenciales inválidas', { details = null } = {}) {
    return new ApiError(StatusCodes.UNAUTHORIZED, message, {
      code: 'CREDENTIALS_INVALID',
      userMessage: 'Email o contraseña incorrectos',
      details,
    });
  }

  /**
   * Error específico para recurso no encontrado (usuario)
   */
  static userNotFound(message = 'Usuario no encontrado', { details = null } = {}) {
    return new ApiError(StatusCodes.NOT_FOUND, message, {
      code: 'USER_NOT_FOUND',
      userMessage: 'No existe una cuenta con este email',
      details,
    });
  }

  /**
   * Error específico para email duplicado
   */
  static emailExists(message = 'El email ya está registrado', { details = null } = {}) {
    return new ApiError(StatusCodes.CONFLICT, message, {
      code: 'EMAIL_EXISTS',
      userMessage: 'Este email ya está registrado',
      details,
    });
  }
}

// =============================================================================
// CLASES DE ERROR ESPECIALIZADAS (OPCIONAL)
// =============================================================================

class ValidationError extends ApiError {
  constructor(message, { details = null, userMessage = null, field = null } = {}) {
    super(StatusCodes.BAD_REQUEST, message, {
      code: 'VALIDATION_ERROR',
      details,
      userMessage: userMessage || 'Verifica la información ingresada',
      isOperational: true,
      field,
    });
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends ApiError {
  constructor(message, { details = null, userMessage = null } = {}) {
    super(StatusCodes.UNAUTHORIZED, message, {
      code: 'AUTHENTICATION_ERROR',
      details,
      userMessage: userMessage || 'No pudimos verificar tu identidad',
      isOperational: true,
    });
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends ApiError {
  constructor(message, { details = null, userMessage = null } = {}) {
    super(StatusCodes.FORBIDDEN, message, {
      code: 'AUTHORIZATION_ERROR',
      details,
      userMessage: userMessage || 'No tienes permisos para realizar esta acción',
      isOperational: true,
    });
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends ApiError {
  constructor(message, { details = null, userMessage = null } = {}) {
    super(StatusCodes.NOT_FOUND, message, {
      code: 'NOT_FOUND_ERROR',
      details,
      userMessage: userMessage || 'El recurso solicitado no existe',
      isOperational: true,
    });
    this.name = 'NotFoundError';
  }
}

class ConflictError extends ApiError {
  constructor(message, { details = null, userMessage = null } = {}) {
    super(StatusCodes.CONFLICT, message, {
      code: 'CONFLICT_ERROR',
      details,
      userMessage: userMessage || 'Esta acción no puede completarse debido a un conflicto',
      isOperational: true,
    });
    this.name = 'ConflictError';
  }
}

class DatabaseError extends ApiError {
  constructor(message, { originalError = null, userMessage = null } = {}) {
    super(StatusCodes.INTERNAL_SERVER_ERROR, message, {
      code: 'DATABASE_ERROR',
      isOperational: false,
      userMessage: userMessage || 'Ocurrió un error al procesar tu solicitud',
      details: originalError ? { originalError: originalError.message } : null,
    });
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

class ExternalServiceError extends ApiError {
  constructor(serviceName, message, { originalError = null, userMessage = null } = {}) {
    super(StatusCodes.SERVICE_UNAVAILABLE, message, {
      code: 'EXTERNAL_SERVICE_ERROR',
      isOperational: true,
      userMessage: userMessage || 'Un servicio externo no está disponible',
      details: {
        serviceName,
        originalError: originalError ? originalError.message : null,
      },
    });
    this.name = 'ExternalServiceError';
    this.serviceName = serviceName;
  }
}

// =============================================================================
// FUNCIONES DE UTILIDAD
// =============================================================================

const isApiError = (error) => error instanceof ApiError;

const isOperationalError = (error) => error instanceof ApiError && error.isOperational === true;

const getStatusCode = (error) => error instanceof ApiError ? error.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;

const toApiError = (error, defaultMessage = 'Error interno del servidor') => {
  if (error instanceof ApiError) return error;
  return ApiError.internal(error.message || defaultMessage, {
    details: error.stack ? { stack: error.stack.split('\n').slice(0, 5) } : null,
  });
};

// =============================================================================
// EXPORTACIÓN
// =============================================================================

export {
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  FRIENDLY_MESSAGES, // Exportar para que el frontend pueda usar los mismos mensajes
  isApiError,
  isOperationalError,
  getStatusCode,
  toApiError,
};

export default ApiError;