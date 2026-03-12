/**
 * =============================================================================
 * CLASE DE ERROR PERSONALIZADA PARA API
 * =============================================================================
 * 
 * Propósito:
 * - Proporcionar una clase de error estandarizada para toda la API
 * - Facilitar el manejo consistente de errores en la Capa de Presentación
 * - Permitir la propagación de errores con información estructurada
 * - Integrarse con el middleware errorHandler.middleware.js
 * 
 * Arquitectura:
 * - Capa: Utilidades (usada en Presentación y Aplicación)
 * - Patrón: Custom Error Class
 * 
 * Casos de Uso relacionados:
 * - Todos los endpoints de la API
 * - Manejo de errores en controllers y services
 * 
 * @module utils/apiError
 * @layer Utilities
 */

import { StatusCodes, getReasonPhrase } from 'http-status-codes';

/**
 * =============================================================================
 * CLASE ApiError
 * =============================================================================
 * 
 * Clase base para todos los errores personalizados de la API.
 * Extiende la clase Error nativa de JavaScript para mantener compatibilidad
 * con el manejo de errores estándar de Node.js/Express.
 * 
 * @extends Error
 */
class ApiError extends Error {
    /**
     * ---------------------------------------------------------------------------
     * CONSTRUCTOR
     * ---------------------------------------------------------------------------
     * 
     * @param {number} statusCode - Código de estado HTTP (ej: 400, 401, 404, 500)
     * @param {string} message - Mensaje descriptivo del error
     * @param {Object} [options] - Opciones adicionales
     * @param {string} [options.code] - Código de error interno (ej: 'VALIDATION_ERROR')
     * @param {Object} [options.details] - Detalles adicionales del error
     * @param {boolean} [options.isOperational] - Si es un error operacional (conocido)
     * @param {string} [options.stack] - Stack trace personalizado
     * 
     * @example
     * throw new ApiError(400, 'Email inválido', { code: 'INVALID_EMAIL' });
     * 
     * @example
     * throw new ApiError(404, 'Usuario no encontrado', {
     *   code: 'USER_NOT_FOUND',
     *   details: { userId: '123' }
     * });
     */

    constructor(
        statusCode,
        message,
        {
            code = 'INTERNAL_ERROR',
            details = null,
            isOperational = true,
            stack = '',
        } = {}
    ) {
        // Llamar al constructor de Error con el mensaje
        super(message);

        /**
         * Código de estado HTTP
         * @type {number}
         * @public
         * @example 400, 401, 403, 404, 500
         */
        this.statusCode = statusCode;

        /**
         * Mensaje del error
         * @type {string}
         * @public
         */
        this.message = message;

        /**
         * Código de error interno para identificación programática
         * @type {string}
         * @public
         * @example 'VALIDATION_ERROR', 'UNAUTHORIZED', 'NOT_FOUND'
         */
        this.code = code;

        /**
         * Detalles adicionales del error (opcional)
         * @type {Object|null}
         * @public
         * @example { field: 'email', reason: 'already_exists' }
         */
        this.details = details;

        /**
         * Indica si es un error operacional (conocido/manejable)
         * Los errores operacionales son esperados y tienen mensaje seguro para el cliente
         * Los errores no operacionales son fallos del sistema (bug, BD caída, etc.)
         * 
         * @type {boolean}
         * @public
         */
        this.isOperational = isOperational;

        /**
         * Nombre del error para identificación en logs
         * @type {string}
         * @public
         */
        this.name = this.constructor.name;

        /**
         * Timestamp del error en formato ISO 8601
         * @type {string}
         * @public
         */
        this.timestamp = new Date().toISOString();

        /**
         * Path de la petición donde ocurrió el error (se setea en middleware)
         * @type {string|null}
         * @public
         */
        this.path = null;

        /**
         * Método HTTP de la petición donde ocurrió el error (se setea en middleware)
         * @type {string|null}
         * @public
         */
        this.method = null;

        // Capturar stack trace
        if (stack) {
            this.stack = stack;
        } else if (Error.captureStackTrace) {
            // Capturar stack trace optimizado (excluye este constructor)
            Error.captureStackTrace(this, this.constructor);
        } else {
            // Fallback para entornos sin captureStackTrace
            this.stack = new Error(message).stack;
        }
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO toJSON
     * ---------------------------------------------------------------------------
     * 
     * Serializa el error a formato JSON para respuestas API.
     * Se usa automáticamente cuando se hace JSON.stringify() del error.
     * 
     * @returns {Object} Objeto JSON con información del error
     * 
     * @example
     * const error = new ApiError(400, 'Email inválido');
     * console.log(JSON.stringify(error));
     * // {"statusCode":400,"message":"Email inválido","code":"INTERNAL_ERROR",...}
     */
    toJSON() {
        return {
            statusCode: this.statusCode,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            path: this.path,
            method: this.method,
            name: this.name,
        };
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO toResponse
     * ---------------------------------------------------------------------------
     * 
     * Genera un objeto de respuesta estandarizado para Express.
     * Útil para enviar directamente en res.json().
     * 
     * @param {boolean} isDevelopment - Si estamos en entorno de desarrollo
     * @returns {Object} Objeto de respuesta para Express
     * 
     * @example
     * const error = new ApiError(400, 'Email inválido');
     * res.status(error.statusCode).json(error.toResponse(true));
     */
    toResponse(isDevelopment = false) {
        const response = {
            success: false,
            error: {
                code: this.code,
                message: this.message,
                statusCode: this.statusCode,
                timestamp: this.timestamp,
            },
        };

        // Incluir detalles solo si existen
        if (this.details) {
            response.error.details = this.details;
        }

        // Incluir path y method si están disponibles
        if (this.path) {
            response.error.path = this.path;
        }

        if (this.method) {
            response.error.method = this.method;
        }

        // Incluir stack trace solo en desarrollo (nunca en producción)
        if (isDevelopment && this.stack) {
            response.error.stack = this.stack.split('\n').slice(0, 10);
        }

        return response;
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO estático badRequest
     * ---------------------------------------------------------------------------
     * 
     * Factory method para crear errores 400 Bad Request.
     * 
     * @param {string} message - Mensaje del error
     * @param {Object} [details] - Detalles adicionales
     * @returns {ApiError} Error ApiError con statusCode 400
     * 
     * @example
     * throw ApiError.badRequest('Email es requerido');
     * throw ApiError.badRequest('Datos inválidos', { field: 'email' });
     */

    static badRequest(message, details = null) {
        return new ApiError(StatusCodes.BAD_REQUEST, message, {
            code: 'BAD_REQUEST',
            details,
        });
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO estático unauthorized
     * ---------------------------------------------------------------------------
     * 
     * Factory method para crear errores 401 Unauthorized.
     * 
     * @param {string} message - Mensaje del error
     * @param {Object} [details] - Detalles adicionales
     * @returns {ApiError} Error ApiError con statusCode 401
     * 
     * @example
     * throw ApiError.unauthorized('Token inválido');
     * throw ApiError.unauthorized('Credenciales incorrectas');
     */

    static unauthorized(message, details = null) {
        return new ApiError(StatusCodes.UNAUTHORIZED, message, {
            code: 'UNAUTHORIZED',
            details,
        });
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO estático forbidden
     * ---------------------------------------------------------------------------
     * 
     * Factory method para crear errores 403 Forbidden.
     * 
     * @param {string} message - Mensaje del error
     * @param {Object} [details] - Detalles adicionales
     * @returns {ApiError} Error ApiError con statusCode 403
     * 
     * @example
     * throw ApiError.forbidden('No tienes permisos para esta acción');
     * throw ApiError.forbidden('Acceso denegado a este recurso');
     */

    static forbidden(message, details = null) {
        return new ApiError(StatusCodes.FORBIDDEN, message, {
            code: 'FORBIDDEN',
            details,
        });
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO estático notFound
     * ---------------------------------------------------------------------------
     * 
     * Factory method para crear errores 404 Not Found.
     * 
     * @param {string} message - Mensaje del error
     * @param {Object} [details] - Detalles adicionales
     * @returns {ApiError} Error ApiError con statusCode 404
     * 
     * @example
     * throw ApiError.notFound('Usuario no encontrado');
     * throw ApiError.notFound('Recurso no existe', { resourceId: '123' });
     */
    static notFound(message, details = null) {
        return new ApiError(StatusCodes.NOT_FOUND, message, {
            code: 'NOT_FOUND',
            details,
        });
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO estático conflict
     * ---------------------------------------------------------------------------
     * 
     * Factory method para crear errores 409 Conflict.
     * 
     * @param {string} message - Mensaje del error
     * @param {Object} [details] - Detalles adicionales
     * @returns {ApiError} Error ApiError con statusCode 409
     * 
     * @example
     * throw ApiError.conflict('El email ya está registrado');
     * throw ApiError.conflict('Recurso ya existe');
     */
    static conflict(message, details = null) {
        return new ApiError(StatusCodes.CONFLICT, message, {
            code: 'CONFLICT',
            details,
        });
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO estático tooManyRequests
     * ---------------------------------------------------------------------------
     * 
     * Factory method para crear errores 429 Too Many Requests.
     * 
     * @param {string} message - Mensaje del error
     * @param {Object} [details] - Detalles adicionales
     * @returns {ApiError} Error ApiError con statusCode 429
     * 
     * @example
     * throw ApiError.tooManyRequests('Demasiadas peticiones');
     */

    static tooManyRequests(message, details = null) {
        return new ApiError(StatusCodes.TOO_MANY_REQUESTS, message, {
            code: 'RATE_LIMIT_EXCEEDED',
            details,
        });
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO estático internal
     * ---------------------------------------------------------------------------
     * 
     * Factory method para crear errores 500 Internal Server Error.
     * Por defecto isOperational = false (error no operacional = fallo del sistema)
     * 
     * @param {string} message - Mensaje del error
     * @param {Object} [options] - Opciones adicionales
     * @param {boolean} [options.isOperational] - Si es operacional (default: false)
     * @param {Object} [options.details] - Detalles adicionales
     * @returns {ApiError} Error ApiError con statusCode 500
     * 
     * @example
     * throw ApiError.internal('Error en la base de datos');
     * throw ApiError.internal('Servicio externo no disponible', { isOperational: true });
     */

    static internal(message, { isOperational = false, details = null } = {}) {
        return new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, message, {
            code: 'INTERNAL_ERROR',
            isOperational,
            details,
        });
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO estático serviceUnavailable
     * ---------------------------------------------------------------------------
     * 
     * Factory method para crear errores 503 Service Unavailable.
     * 
     * @param {string} message - Mensaje del error
     * @param {Object} [details] - Detalles adicionales
     * @returns {ApiError} Error ApiError con statusCode 503
     * 
     * @example
     * throw ApiError.serviceUnavailable('Servicio temporalmente no disponible');
     */

    static serviceUnavailable(message, details = null) {
        return new ApiError(StatusCodes.SERVICE_UNAVAILABLE, message, {
            code: 'SERVICE_UNAVAILABLE',
            details,
        });
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO estático validation
     * ---------------------------------------------------------------------------
     * 
     * Factory method específico para errores de validación (Zod, Joi, etc.).
     * 
     * @param {string} message - Mensaje del error
     * @param {Array} [errors] - Array de errores de validación detallados
     * @returns {ApiError} Error ApiError con statusCode 400
     * 
     * @example
     * throw ApiError.validation('Datos inválidos', [
     *   { field: 'email', message: 'Email inválido' },
     *   { field: 'password', message: 'Mínimo 8 caracteres' }
     * ]);
     */

    static validation(message, errors = null) {
        return new ApiError(StatusCodes.BAD_REQUEST, message, {
            code: 'VALIDATION_ERROR',
            details: errors ? { errors } : null,
        });
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO estático database
     * ---------------------------------------------------------------------------
     * 
     * Factory method específico para errores de base de datos.
     * Por defecto isOperational = false (error de sistema)
     * 
     * @param {string} message - Mensaje del error
     * @param {Object} [originalError] - Error original de la BD
     * @returns {ApiError} Error ApiError con statusCode 500
     * 
     * @example
     * throw ApiError.database('Error al guardar usuario', originalError);
     */
    
    static database(message, originalError = null) {
        return new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, message, {
            code: 'DATABASE_ERROR',
            isOperational: false,
            details: originalError ? { originalError: originalError.message } : null,
        });
    }

    /**
     * ---------------------------------------------------------------------------
     * MÉTODO estático externalService
     * ---------------------------------------------------------------------------
     * 
     * Factory method para errores de servicios externos (Cloudinary, Email, etc.).
     * 
     * @param {string} serviceName - Nombre del servicio externo
     * @param {string} message - Mensaje del error
     * @param {Object} [originalError] - Error original del servicio
     * @returns {ApiError} Error ApiError con statusCode 503
     * 
     * @example
     * throw ApiError.externalService('Cloudinary', 'Error al subir imagen', error);
     * throw ApiError.externalService('SendGrid', 'Error al enviar email', error);
     */
    static externalService(serviceName, message, originalError = null) {
        return new ApiError(StatusCodes.SERVICE_UNAVAILABLE, message, {
            code: 'EXTERNAL_SERVICE_ERROR',
            isOperational: true,
            details: {
                serviceName,
                originalError: originalError ? originalError.message : null,
            },
        });
    }
}

/**
 * =============================================================================
 * CLASES DE ERROR ESPECIALIZADAS (OPCIONAL)
 * =============================================================================
 * 
 * Clases que extienden ApiError para tipos específicos de errores.
 * Útil para identificar rápidamente el tipo de error en catch blocks.
 */

/**
 * Error de Validación
 * @extends ApiError
 */
class ValidationError extends ApiError {
    constructor(message, details = null) {
        super(StatusCodes.BAD_REQUEST, message, {
            code: 'VALIDATION_ERROR',
            details,
            isOperational: true,
        });
        this.name = 'ValidationError';
    }
}

/**
 * Error de Autenticación
 * @extends ApiError
 */
class AuthenticationError extends ApiError {
    constructor(message, details = null) {
        super(StatusCodes.UNAUTHORIZED, message, {
            code: 'AUTHENTICATION_ERROR',
            details,
            isOperational: true,
        });
        this.name = 'AuthenticationError';
    }
}

/**
 * Error de Autorización
 * @extends ApiError
 */
class AuthorizationError extends ApiError {
    constructor(message, details = null) {
        super(StatusCodes.FORBIDDEN, message, {
            code: 'AUTHORIZATION_ERROR',
            details,
            isOperational: true,
        });
        this.name = 'AuthorizationError';
    }
}

/**
 * Error de Recurso No Encontrado
 * @extends ApiError
 */
class NotFoundError extends ApiError {
    constructor(message, details = null) {
        super(StatusCodes.NOT_FOUND, message, {
            code: 'NOT_FOUND_ERROR',
            details,
            isOperational: true,
        });
        this.name = 'NotFoundError';
    }
}

/**
 * Error de Conflicto
 * @extends ApiError
 */
class ConflictError extends ApiError {
    constructor(message, details = null) {
        super(StatusCodes.CONFLICT, message, {
            code: 'CONFLICT_ERROR',
            details,
            isOperational: true,
        });
        this.name = 'ConflictError';
    }
}

/**
 * =============================================================================
 * EXPORTACIÓN
 * =============================================================================
 * 
 * Exporta la clase principal y las clases especializadas
 */
export {
    ApiError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
};

// Exportación por defecto (clase principal)
export default ApiError;