/**
 * =============================================================================
 * CLASE DE RESPUESTA ESTANDARIZADA PARA API - UTILIDAD GLOBAL
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Proporcionar una estructura de respuesta consistente para toda la API
 * - Facilitar el manejo de respuestas exitosas en la Capa de Presentación
 * - Incluir metadata útil para el frontend (paginación, timestamps, etc.)
 * - Estandarizar el formato de respuestas para todos los endpoints
 * 
 * Arquitectura:
 * - Capa: Utilidades (usada en Presentación)
 * - Patrón: Response Object + Builder Pattern
 * - Integración: http-status-codes, errorHandler.middleware.js
 * 
 * Librerías utilizadas:
 * - http-status-codes: Constantes de códigos de estado HTTP
 * 
 * @module utils/apiResponse
 * @layer Utilities
 */

import { StatusCodes, getReasonPhrase } from 'http-status-codes';

// =============================================================================
// CLASE PRINCIPAL ApiResponse
// =============================================================================

/**
 * Clase base para todas las respuestas exitosas de la API
 * 
 * Proporciona una estructura consistente para todas las respuestas HTTP exitosas.
 * Esto facilita el trabajo del frontend al tener un formato predecible.
 * 
 * Estructura de respuesta:
 * ```json
 * {
 *   "success": true,
 *   "data": { ... },
 *   "message": "Operación exitosa",
 *   "timestamp": "2026-02-03T10:30:00.000Z",
 *   "path": "/api/users",
 *   "method": "GET"
 * }
 * ```
 * 
 * @example
 * // Respuesta básica
 * return res.status(200).json(
 *   new ApiResponse(200, { user }, 'Usuario obtenido exitosamente')
 * );
 * 
 * @example
 * // Respuesta con paginación
 * return res.status(200).json(
 *   new ApiResponse(200, { users }, 'Usuarios obtenidos', { pagination })
 * );
 */
class ApiResponse {
  /**
   * ---------------------------------------------------------------------------
   * CONSTRUCTOR
   * ---------------------------------------------------------------------------
   * 
   * @param {number} statusCode - Código de estado HTTP (ej: 200, 201, 204)
   * @param {Object} data - Datos de la respuesta (el contenido principal)
   * @param {string} [message] - Mensaje descriptivo opcional
   * @param {Object} [metadata] - Metadata adicional (paginación, counts, etc.)
   * 
   * @example
   * new ApiResponse(200, { user }, 'Usuario obtenido')
   * 
   * @example
   * new ApiResponse(201, { user }, 'Usuario creado', { 
   *   pagination: { page: 1, limit: 10 } 
   * })
   */
  constructor(statusCode, data, message = null, metadata = null) {
    /**
     * Indicador de éxito de la operación
     * 
     * Siempre true para respuestas exitosas.
     * Las respuestas de error usan success: false (manejado por errorHandler)
     * 
     * @type {boolean}
     * @public
     */
    this.success = true;

    /**
     * Código de estado HTTP
     * 
     * Define el código HTTP que se enviará en la respuesta.
     * 
     * Categorías:
     * - 2xx: Éxito (200 OK, 201 Created, 204 No Content)
     * 
     * @type {number}
     * @public
     * @example 200, 201, 204
     */
    this.statusCode = statusCode;

    /**
     * Datos principales de la respuesta
     * 
     * Contiene la información solicitada por el cliente.
     * Puede ser un objeto, array, o null para operaciones sin retorno.
     * 
     * @type {Object|Array|null}
     * @public
     */
    this.data = data;

    /**
     * Mensaje descriptivo opcional
     * 
     * Proporciona contexto adicional sobre la operación realizada.
     * Útil para mensajes de confirmación o información adicional.
     * 
     * @type {string|null}
     * @public
     * @example 'Usuario creado exitosamente'
     */
    this.message = message || this.getDefaultMessage(statusCode);

    /**
     * Metadata adicional de la respuesta
     * 
     * Información complementaria como paginación, counts, timestamps, etc.
     * 
     * @type {Object|null}
     * @public
     * @example { pagination: {...}, counts: {...} }
     */
    this.metadata = metadata;

    /**
     * Timestamp de la respuesta en formato ISO 8601
     * 
     * Útil para correlacionar respuestas con logs y debugging.
     * 
     * @type {string}
     * @public
     */
    this.timestamp = new Date().toISOString();

    /**
     * Path de la petición (se setea en el middleware)
     * 
     * @type {string|null}
     * @public
     */
    this.path = null;

    /**
     * Método HTTP de la petición (se setea en el middleware)
     * 
     * @type {string|null}
     * @public
     */
    this.method = null;

    /**
     * ID único de la petición (se setea en el middleware)
     * 
     * Permite correlacionar respuestas con logs específicos.
     * 
     * @type {string|null}
     * @public
     */
    this.requestId = null;
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO getDefaultMessage
   * ---------------------------------------------------------------------------
   * 
   * Obtiene un mensaje por defecto basado en el código de estado HTTP.
   * 
   * @param {number} statusCode - Código de estado HTTP
   * @returns {string} Mensaje por defecto para ese código
   * 
   * @private
   */
  getDefaultMessage(statusCode) {
    const defaultMessages = {
      [StatusCodes.OK]: 'Operación exitosa',
      [StatusCodes.CREATED]: 'Recurso creado exitosamente',
      [StatusCodes.ACCEPTED]: 'Solicitud aceptada para procesamiento',
      [StatusCodes.NO_CONTENT]: 'Operación completada sin contenido',
      [StatusCodes.RESET_CONTENT]: 'Contenido reseteado exitosamente',
    };

    return defaultMessages[statusCode] || getReasonPhrase(statusCode);
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO toJSON
   * ---------------------------------------------------------------------------
   * 
   * Serializa la respuesta a formato JSON.
   * Se usa automáticamente cuando se hace JSON.stringify() o res.json().
   * 
   * @returns {Object} Objeto JSON con la respuesta estandarizada
   * 
   * @example
   * const response = new ApiResponse(200, { user });
   * console.log(JSON.stringify(response));
   */
  toJSON() {
    const response = {
      success: this.success,
      statusCode: this.statusCode,
      data: this.data,
      message: this.message,
      timestamp: this.timestamp,
    };

    // Incluir metadata solo si existe
    if (this.metadata) {
      response.metadata = this.metadata;
    }

    // Incluir path si está disponible
    if (this.path) {
      response.path = this.path;
    }

    // Incluir method si está disponible
    if (this.method) {
      response.method = this.method;
    }

    // Incluir requestId si está disponible
    if (this.requestId) {
      response.requestId = this.requestId;
    }

    return response;
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO setRequestInfo
   * ---------------------------------------------------------------------------
   * 
   * Establece información de la petición en la respuesta.
   * Se usa internamente por el middleware para agregar contexto.
   * 
   * @param {Object} req - Objeto de petición de Express
   * @returns {ApiResponse} Esta instancia para method chaining
   * 
   * @example
   * response.setRequestInfo(req);
   */
  setRequestInfo(req) {
    if (req) {
      this.path = req.path;
      this.method = req.method;
      this.requestId = req.id || null;
    }
    return this;
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO addMetadata
   * ---------------------------------------------------------------------------
   * 
   * Agrega metadata adicional a la respuesta.
   * Útil para agregar información de paginación, counts, etc.
   * 
   * @param {Object} metadata - Metadata a agregar
   * @returns {ApiResponse} Esta instancia para method chaining
   * 
   * @example
   * response.addMetadata({ pagination: { page: 1, limit: 10 } });
   */
  addMetadata(metadata) {
    this.metadata = {
      ...this.metadata,
      ...metadata,
    };
    return this;
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO addPagination
   * ---------------------------------------------------------------------------
   * 
   * Agrega información de paginación a la respuesta.
   * Método conveniente para respuestas listadas.
   * 
   * @param {Object} pagination - Información de paginación
   * @param {number} pagination.page - Página actual
   * @param {number} pagination.limit - Límite por página
   * @param {number} pagination.total - Total de registros
   * @param {number} pagination.totalPages - Total de páginas
   * @returns {ApiResponse} Esta instancia para method chaining
   * 
   * @example
   * response.addPagination({ page: 1, limit: 10, total: 100, totalPages: 10 });
   */
  addPagination({ page, limit, total, totalPages }) {
    return this.addMetadata({
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO addCount
   * ---------------------------------------------------------------------------
   * 
   * Agrega un count simple a la metadata.
   * 
   * @param {number} count - Número de registros
   * @param {string} [label='total'] - Etiqueta para el count
   * @returns {ApiResponse} Esta instancia para method chaining
   * 
   * @example
   * response.addCount(50, 'users');
   */
  addCount(count, label = 'total') {
    return this.addMetadata({
      counts: {
        [label]: count,
      },
    });
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO toExpressResponse
   * ---------------------------------------------------------------------------
   * 
   * Envía la respuesta directamente a través de Express.
   * Método conveniente para controllers.
   * 
   * @param {Object} res - Objeto de respuesta de Express
   * @returns {Object} La respuesta de Express
   * 
   * @example
   * return response.toExpressResponse(res);
   * 
   * @example
   * // Equivalente a:
   * return res.status(response.statusCode).json(response);
   */
  toExpressResponse(res) {
    // Agregar información de la petición si está disponible en res.locals
    if (res.locals?.req) {
      this.setRequestInfo(res.locals.req);
    }

    return res.status(this.statusCode).json(this);
  }
}

// =============================================================================
// MÉTODOS ESTÁTICOS - FACTORY METHODS
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * MÉTODO estático success
 * -----------------------------------------------------------------------------
 * 
 * Factory method genérico para respuestas exitosas.
 * 
 * @param {number} statusCode - Código de estado HTTP
 * @param {Object} data - Datos de la respuesta
 * @param {string} [message] - Mensaje opcional
 * @param {Object} [metadata] - Metadata adicional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 * 
 * @example
 * return ApiResponse.success(200, { user }, 'Usuario obtenido');
 */
ApiResponse.success = (statusCode, data, message, metadata) => {
  return new ApiResponse(statusCode, data, message, metadata);
};

/**
 * -----------------------------------------------------------------------------
 * MÉTODO estático ok
 * -----------------------------------------------------------------------------
 * 
 * Factory method para respuesta 200 OK.
 * 
 * @param {Object} data - Datos de la respuesta
 * @param {string} [message] - Mensaje opcional
 * @param {Object} [metadata] - Metadata adicional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 * 
 * @example
 * return ApiResponse.ok({ user }, 'Usuario obtenido');
 */
ApiResponse.ok = (data, message, metadata) => {
  return new ApiResponse(StatusCodes.OK, data, message, metadata);
};

/**
 * -----------------------------------------------------------------------------
 * MÉTODO estático created
 * -----------------------------------------------------------------------------
 * 
 * Factory method para respuesta 201 Created.
 * 
 * @param {Object} data - Datos del recurso creado
 * @param {string} [message] - Mensaje opcional
 * @param {Object} [metadata] - Metadata adicional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 * 
 * @example
 * return ApiResponse.created({ user }, 'Usuario creado');
 */
ApiResponse.created = (data, message, metadata) => {
  return new ApiResponse(StatusCodes.CREATED, data, message || 'Recurso creado exitosamente', metadata);
};

/**
 * -----------------------------------------------------------------------------
 * MÉTODO estático accepted
 * -----------------------------------------------------------------------------
 * 
 * Factory method para respuesta 202 Accepted.
 * 
 * @param {Object} data - Datos de la respuesta
 * @param {string} [message] - Mensaje opcional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 * 
 * @example
 * return ApiResponse.accepted({ jobId }, 'Solicitud aceptada para procesamiento');
 */
ApiResponse.accepted = (data, message) => {
  return new ApiResponse(StatusCodes.ACCEPTED, data, message || 'Solicitud aceptada para procesamiento');
};

/**
 * -----------------------------------------------------------------------------
 * MÉTODO estático noContent
 * -----------------------------------------------------------------------------
 * 
 * Factory method para respuesta 204 No Content.
 * 
 * @param {string} [message] - Mensaje opcional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 * 
 * @example
 * return ApiResponse.noContent('Recurso eliminado');
 */
ApiResponse.noContent = (message) => {
  return new ApiResponse(StatusCodes.NO_CONTENT, null, message || 'Operación completada sin contenido');
};

/**
 * -----------------------------------------------------------------------------
 * MÉTODO estático paginated
 * -----------------------------------------------------------------------------
 * 
 * Factory method para respuestas paginadas.
 * 
 * @param {Array} data - Array de datos
 * @param {Object} pagination - Información de paginación
 * @param {string} [message] - Mensaje opcional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 * 
 * @example
 * return ApiResponse.paginated(users, { page: 1, limit: 10, total: 100, totalPages: 10 });
 */
ApiResponse.paginated = (data, pagination, message) => {
  const response = new ApiResponse(StatusCodes.OK, data, message || 'Datos obtenidos exitosamente');
  return response.addPagination(pagination);
};

/**
 * -----------------------------------------------------------------------------
 * MÉTODO estático withCount
 * -----------------------------------------------------------------------------
 * 
 * Factory method para respuestas con count.
 * 
 * @param {Object|Array} data - Datos de la respuesta
 * @param {number} count - Número de registros
 * @param {string} [label] - Etiqueta para el count
 * @param {string} [message] - Mensaje opcional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 * 
 * @example
 * return ApiResponse.withCount(users, 50, 'users');
 */
ApiResponse.withCount = (data, count, label, message) => {
  const response = new ApiResponse(StatusCodes.OK, data, message);
  return response.addCount(count, label);
};

/**
 * -----------------------------------------------------------------------------
 * MÉTODO estático deleted
 * -----------------------------------------------------------------------------
 * 
 * Factory method para respuesta de eliminación exitosa.
 * 
 * @param {string} [message] - Mensaje opcional
 * @param {Object} [metadata] - Metadata adicional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 * 
 * @example
 * return ApiResponse.deleted('Usuario eliminado exitosamente');
 */
ApiResponse.deleted = (message, metadata) => {
  return new ApiResponse(StatusCodes.OK, null, message || 'Recurso eliminado exitosamente', metadata);
};

/**
 * -----------------------------------------------------------------------------
 * MÉTODO estático updated
 * -----------------------------------------------------------------------------
 * 
 * Factory method para respuesta de actualización exitosa.
 * 
 * @param {Object} data - Datos del recurso actualizado
 * @param {string} [message] - Mensaje opcional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 * 
 * @example
 * return ApiResponse.updated({ user }, 'Usuario actualizado');
 */
ApiResponse.updated = (data, message) => {
  return new ApiResponse(StatusCodes.OK, data, message || 'Recurso actualizado exitosamente');
};

/**
 * -----------------------------------------------------------------------------
 * MÉTODO estático list
 * -----------------------------------------------------------------------------
 * 
 * Factory method para respuestas de lista.
 * Similar a paginated pero sin requerir toda la información de paginación.
 * 
 * @param {Array} data - Array de datos
 * @param {Object} [metadata] - Metadata adicional
 * @param {string} [message] - Mensaje opcional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 * 
 * @example
 * return ApiResponse.list(users, { count: 50 });
 */
ApiResponse.list = (data, metadata, message) => {
  const response = new ApiResponse(StatusCodes.OK, data, message || 'Lista obtenida exitosamente');
  if (metadata) {
    response.addMetadata(metadata);
  }
  return response;
};

// =============================================================================
// FUNCIONES DE UTILIDAD
// =============================================================================

/**
 * Determina si una respuesta es una instancia de ApiResponse
 * 
 * @param {Object} response - Objeto a verificar
 * @returns {boolean} True si es una ApiResponse
 * 
 * @example
 * if (isApiResponse(response)) {
 *   // Manejar como ApiResponse
 * }
 */
export const isApiResponse = (response) => {
  return response instanceof ApiResponse;
};

/**
 * Convierte cualquier objeto a ApiResponse
 * 
 * @param {Object} data - Datos a convertir
 * @param {number} [statusCode=200] - Código de estado
 * @param {string} [message] - Mensaje opcional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 */
export const toApiResponse = (data, statusCode = StatusCodes.OK, message) => {
  if (data instanceof ApiResponse) {
    return data;
  }
  return new ApiResponse(statusCode, data, message);
};

/**
 * Crea una respuesta vacía exitosa
 * 
 * @param {number} [statusCode=200] - Código de estado
 * @param {string} [message] - Mensaje opcional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 */
export const emptyResponse = (statusCode = StatusCodes.OK, message) => {
  return new ApiResponse(statusCode, null, message);
};

/**
 * Crea una respuesta con solo metadata
 * 
 * @param {Object} metadata - Metadata de la respuesta
 * @param {number} [statusCode=200] - Código de estado
 * @param {string} [message] - Mensaje opcional
 * @returns {ApiResponse} Nueva instancia de ApiResponse
 */
export const metadataResponse = (metadata, statusCode = StatusCodes.OK, message) => {
  const response = new ApiResponse(statusCode, null, message);
  response.addMetadata(metadata);
  return response;
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta la clase principal y las funciones de utilidad
 * 
 * @example
 * // Importación named (recomendado)
 * import { 
 *   ApiResponse, 
 *   isApiResponse, 
 *   toApiResponse 
 * } from './utils/apiResponse.js';
 * 
 * @example
 * // Importación por defecto
 * import ApiResponse from './utils/apiResponse.js';
 * new ApiResponse(200, data);
 */
export {
  ApiResponse,
  isApiResponse,
  toApiResponse,
  emptyResponse,
  metadataResponse,
};

// Exportación por defecto (clase principal)
export default ApiResponse;