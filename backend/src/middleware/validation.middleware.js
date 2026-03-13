/**
 * =============================================================================
 * MIDDLEWARE DE VALIDACIÓN DE DATOS - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Validar datos de entrada en las peticiones HTTP antes de llegar a los controllers
 * - Centralizar la lógica de validación usando esquemas Zod
 * - Proporcionar respuestas de error consistentes y descriptivas
 * - Prevenir datos inválidos de llegar a la capa de servicio
 * 
 * Arquitectura:
 * - Capa: Presentación (Middleware de Express)
 * - Patrón: Middleware Chain + Validation Strategy
 * - Integración: Zod para validación de esquemas
 * 
 * Librerías utilizadas:
 * - zod: Validación de esquemas con TypeScript-like safety
 * - zod-validation-error: Formateo de errores de Zod para respuestas amigables
 * 
 * @module middleware/validation.middleware
 * @layer Presentation
 */

import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// FUNCIÓN PRINCIPAL DE VALIDACIÓN
// =============================================================================

/**
 * Middleware factory para validar datos de petición usando esquemas Zod
 * 
 * Este middleware:
 * 1. Recibe un esquema de validación Zod
 * 2. Valida los datos de la petición (body, query, params, o combinación)
 * 3. Si es válido, adjunta los datos validados a req.validated
 * 4. Si es inválido, lanza un ApiError con detalles descriptivos
 * 
 * @function validate
 * @param {Object} schema - Esquema de validación Zod
 * @param {Object} [options] - Opciones de configuración
 * @param {string} [options.source='body'] - Fuente de datos a validar ('body', 'query', 'params', 'headers')
 * @param {boolean} [options.partial=false] - Si true, permite campos opcionales
 * @param {boolean} [options.stripUnknown=true] - Si true, elimina campos no definidos en el esquema
 * @returns {Function} Middleware de Express
 * 
 * @throws {ApiError} 400 - Si los datos no pasan la validación
 * 
 * @example
 * // Validar body de petición
 * import { validate } from './middleware/validation.middleware.js';
 * import { loginSchema } from './validators/auth.validator.js';
 * 
 * router.post('/login', validate(loginSchema), authController.login);
 * 
 * @example
 * // Validar múltiples fuentes
 * router.put('/users/:id', 
 *   validate(updateUserSchema, { source: 'body' }),
 *   validate(idParamSchema, { source: 'params' }),
 *   userController.update
 * );
 * 
 * @example
 * // Validar query parameters
 * router.get('/users', 
 *   validate(listUsersSchema, { source: 'query' }),
 *   userController.getAll
 * );
 */
export const validate = (schema, options = {}) => {
  // ===========================================================================
  // CONFIGURACIÓN POR DEFECTO
  // ===========================================================================
  const {
    /**
     * Fuente de datos a validar
     * - 'body': req.body (para POST, PUT, PATCH)
     * - 'query': req.query (para GET con filtros)
     * - 'params': req.params (para IDs en URL)
     * - 'headers': req.headers (para validación de headers)
     */
    source = 'body',
    
    /**
     * Si true, los campos no definidos en el esquema se eliminan
     * Esto previene que datos inesperados lleguen al controller
     */
    stripUnknown = true,
    
    /**
     * Si true, permite validación parcial (útil para updates)
     */
    partial = false,
  } = options;

  /**
   * Middleware retornado que ejecuta la validación
   * 
   * @param {Object} req - Objeto de petición de Express
   * @param {Object} res - Objeto de respuesta de Express
   * @param {Function} next - Función next de Express
   */
  return (req, res, next) => {
    try {
      // =========================================================================
      // 1. OBTENER DATOS DE LA FUENTE ESPECIFICADA
      // =========================================================================
      let dataToValidate;
      
      switch (source) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'headers':
          dataToValidate = req.headers;
          break;
        default:
          dataToValidate = req.body;
      }

      // =========================================================================
      // 2. VALIDAR DATOS CON ZOD
      // =========================================================================
      /**
       * Ejecutar la validación del esquema
       * 
       * safeParse() retorna:
       * - success: true/false
       * - data: datos validados (si success=true)
       * - error: error de validación (si success=false)
       */
      let validationSchema = schema;
      
      // Aplicar transformaciones según opciones
      if (partial) {
        validationSchema = schema.partial();
      }
      
      if (stripUnknown) {
        validationSchema = schema.strip();
      }

      const result = validationSchema.safeParse(dataToValidate);

      // =========================================================================
      // 3. MANEJAR RESULTADO DE VALIDACIÓN
      // =========================================================================
      if (!result.success) {
        // -----------------------------------------------------------------------
        // 3.1. FORMATEAR ERROR DE ZOD
        // -----------------------------------------------------------------------
        /**
         * Convertir el error de Zod a un mensaje legible
         * 
         * zod-validation-error convierte los errores técnicos de Zod
         * en mensajes amigables para el cliente
         */
        const zodError = new ZodError(result.error.errors);
        const validationError = fromZodError(zodError, {
          prefix: 'Validación fallida',
          prefixSeparator: ': ',
          unionSeparator: ' o ',
          includePath: true,
          maxIssuesInMessage: 10,
        });

        // -----------------------------------------------------------------------
        // 3.2. LOGUEAR ERROR DE VALIDACIÓN
        // -----------------------------------------------------------------------
        logger.warn('Error de validación de datos', {
          source,
          path: req.path,
          method: req.method,
          errors: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
          userId: req.user?.id || 'anonymous',
        });

        // -----------------------------------------------------------------------
        // 3.3. LANZAR ERROR API
        // -----------------------------------------------------------------------
        /**
         * Crear un ApiError con información detallada de validación
         * 
         * Esto permite que el errorHandler.middleware.js formatee
         * la respuesta consistentemente
         */
        const apiError = ApiError.validation(
          validationError.message,
          result.error.errors.map(err => ({
            field: err.path.join('.') || 'root',
            message: err.message,
            code: err.code,
            expected: err.expected,
            received: err.received,
          }))
        );

        return next(apiError);
      }

      // =========================================================================
      // 4. DATOS VÁLIDOS - ADJUNTAR AL REQUEST
      // =========================================================================
      /**
       * Adjuntar los datos validados y transformados al request
       * 
       * Esto permite que los controllers usen datos ya validados
       * en lugar de los datos crudos de la petición
       * 
       * @type {Object}
       */
      req.validated = {
        [source]: result.data,
      };

      // También adjuntar directamente para conveniencia
      switch (source) {
        case 'body':
          req.validatedBody = result.data;
          break;
        case 'query':
          req.validatedQuery = result.data;
          break;
        case 'params':
          req.validatedParams = result.data;
          break;
        case 'headers':
          req.validatedHeaders = result.data;
          break;
      }

      // =========================================================================
      // 5. CONTINUAR CON LA CADENA DE MIDDLEWARE
      // =========================================================================
      next();

    } catch (error) {
      // =========================================================================
      // 6. MANEJAR ERRORES INESPERADOS
      // =========================================================================
      /**
       * Si ocurre un error inesperado durante la validación
       * (no un error de validación de Zod), loggearlo y pasar al errorHandler
       */
      logger.error('Error inesperado en validación', {
        source,
        path: req.path,
        method: req.method,
        error: error.message,
        stack: error.stack,
      });

      next(
        ApiError.internal(
          'Error durante la validación de datos',
          { isOperational: false }
        )
      );
    }
  };
};

// =============================================================================
// MIDDLEWARE DE VALIDACIÓN COMPUESTA
// =============================================================================

/**
 * Middleware para validar múltiples fuentes simultáneamente
 * 
 * Útil cuando necesitas validar body + params + query en una sola petición
 * 
 * @function validateMultiple
 * @param {Array<Object>} validations - Array de configuraciones de validación
 * @param {Object} validations[].schema - Esquema Zod para esta validación
 * @param {string} [validations[].source='body'] - Fuente de datos
 * @returns {Function} Middleware de Express
 * 
 * @example
 * // Validar body y params simultáneamente
 * router.put('/organizations/:id',
 *   validateMultiple([
 *     { schema: updateOrganizationSchema, source: 'body' },
 *     { schema: idParamSchema, source: 'params' }
 *   ]),
 *   organizationController.update
 * );
 */
export const validateMultiple = (validations) => {
  if (!Array.isArray(validations) || validations.length === 0) {
    throw new Error(
      'validateMultiple: requiere un array no vacío de configuraciones de validación'
    );
  }

  /**
   * Crear middlewares individuales para cada validación
   * y ejecutarlos en secuencia
   */
  return (req, res, next) => {
    // Ejecutar cada validación en secuencia
    const middlewares = validations.map(({ schema, source = 'body' }) =>
      validate(schema, { source })
    );

    // Ejecutar middlewares en secuencia
    let index = 0;

    const runNext = (err) => {
      if (err) {
        return next(err);
      }

      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    };

    runNext();
  };
};

// =============================================================================
// MIDDLEWARE DE SANITIZACIÓN DE DATOS
// =============================================================================

/**
 * Middleware para sanitizar datos de entrada antes de la validación
 * 
 * Elimina caracteres peligrosos, trim de strings, normalización de datos
 * 
 * @function sanitize
 * @param {Object} [options] - Opciones de sanitización
 * @param {boolean} [options.trimStrings=true] - Trim de strings
 * @param {boolean} [options.removeEmpty=true] - Eliminar campos vacíos
 * @param {boolean} [options.lowercaseEmail=true] - Email a minúsculas
 * @returns {Function} Middleware de Express
 * 
 * @example
 * router.post('/register',
 *   sanitize({ trimStrings: true, lowercaseEmail: true }),
 *   validate(registerSchema),
 *   authController.register
 * );
 */
export const sanitize = (options = {}) => {
  const {
    trimStrings = true,
    removeEmpty = true,
    lowercaseEmail = true,
  } = options;

  return (req, res, next) => {
    try {
      // Solo sanitizar body (no query o params)
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, {
          trimStrings,
          removeEmpty,
          lowercaseEmail,
        });
      }

      next();
    } catch (error) {
      logger.warn('Error en sanitización de datos', {
        error: error.message,
        path: req.path,
      });
      next(); // Continuar incluso si hay error en sanitización
    }
  };
};

/**
 * Función helper para sanitizar objetos recursivamente
 * 
 * @param {Object} obj - Objeto a sanitizar
 * @param {Object} options - Opciones de sanitización
 * @returns {Object} Objeto sanitizado
 */
const sanitizeObject = (obj, options) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    // Saltar campos undefined o null si removeEmpty es true
    if (options.removeEmpty && (value === undefined || value === null)) {
      continue;
    }

    // Saltar campos string vacíos si removeEmpty es true
    if (options.removeEmpty && value === '') {
      continue;
    }

    // Trim de strings
    if (options.trimStrings && typeof value === 'string') {
      sanitized[key] = value.trim();
      
      // Email a minúsculas
      if (options.lowercaseEmail && key.toLowerCase().includes('email')) {
        sanitized[key] = sanitized[key].toLowerCase();
      }
    }
    // Recursión para objetos anidados
    else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    }
    // Otros valores se copian tal cual
    else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

// =============================================================================
// MIDDLEWARE DE VALIDACIÓN DE TIPO DE CONTENIDO
// =============================================================================

/**
 * Middleware para verificar el Content-Type de la petición
 * 
 * Asegura que las peticiones que envían body usen el Content-Type correcto
 * 
 * @function validateContentType
 * @param {Array<string>} allowedTypes - Tipos de contenido permitidos
 * @returns {Function} Middleware de Express
 * 
 * @example
 * // Solo permitir JSON
 * router.post('/users',
 *   validateContentType(['application/json']),
 *   validate(createUserSchema),
 *   userController.create
 * );
 * 
 * @example
 * // Permitir JSON o multipart (para uploads)
 * router.post('/upload',
 *   validateContentType(['application/json', 'multipart/form-data']),
 *   uploadController.upload
 * );
 */
export const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    // Para métodos que no envían body, saltar validación
    if (['GET', 'HEAD', 'DELETE'].includes(req.method)) {
      return next();
    }

    const contentType = req.headers['content-type'];

    if (!contentType) {
      return next(
        ApiError.badRequest(
          'Content-Type header es requerido',
          {
            code: 'MISSING_CONTENT_TYPE',
            details: {
              allowedTypes,
              hint: `Incluir header: Content-Type: ${allowedTypes[0]}`,
            },
          }
        )
      );
    }

    // Verificar si el Content-Type está en la lista de permitidos
    const isAllowed = allowedTypes.some(type =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      logger.warn('Content-Type no permitido', {
        provided: contentType,
        allowed: allowedTypes,
        path: req.path,
      });

      return next(
        ApiError.unsupportedMediaType(
          `Content-Type no soportado. Tipos permitidos: ${allowedTypes.join(', ')}`,
          {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            details: {
              provided: contentType,
              allowed: allowedTypes,
            },
          }
        )
      );
    }

    next();
  };
};

// =============================================================================
// MIDDLEWARE DE VALIDACIÓN DE PAGINACIÓN
// =============================================================================

/**
 * Middleware específico para validar parámetros de paginación
 * 
 * Valida y normaliza page, limit, sort, etc. en query parameters
 * 
 * @function validatePagination
 * @param {Object} [options] - Opciones de paginación
 * @param {number} [options.defaultPage=1] - Página por defecto
 * @param {number} [options.defaultLimit=10] - Límite por defecto
 * @param {number} [options.maxLimit=100] - Límite máximo permitido
 * @returns {Function} Middleware de Express
 * 
 * @example
 * router.get('/users',
 *   validatePagination({ defaultLimit: 10, maxLimit: 50 }),
 *   userController.getAll
 * );
 */
export const validatePagination = (options = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100,
  } = options;

  return (req, res, next) => {
    try {
      // =========================================================================
      // 1. NORMALIZAR PARÁMETROS DE PAGINACIÓN
      // =========================================================================
      let page = parseInt(req.query.page, 10);
      let limit = parseInt(req.query.limit, 10);

      // =========================================================================
      // 2. APLICAR VALORES POR DEFECTO
      // =========================================================================
      if (isNaN(page) || page < 1) {
        page = defaultPage;
      }

      if (isNaN(limit) || limit < 1) {
        limit = defaultLimit;
      }

      // =========================================================================
      // 3. LIMITAR VALOR MÁXIMO
      // =========================================================================
      if (limit > maxLimit) {
        limit = maxLimit;
      }

      // =========================================================================
      // 4. ADJUNTAR PARÁMETROS NORMALIZADOS AL REQUEST
      // =========================================================================
      req.pagination = {
        page,
        limit,
        offset: (page - 1) * limit,
      };

      // Actualizar query params para que los controllers los usen
      req.query.page = page.toString();
      req.query.limit = limit.toString();

      next();
    } catch (error) {
      logger.warn('Error en validación de paginación', {
        error: error.message,
        path: req.path,
      });
      next(); // Continuar con valores por defecto
    }
  };
};

// =============================================================================
// MIDDLEWARE DE VALIDACIÓN DE ORDENAMIENTO
// =============================================================================

/**
 * Middleware para validar parámetros de ordenamiento (sort)
 * 
 * Previene SQL injection y valida campos permitidos para ordenar
 * 
 * @function validateSort
 * @param {Array<string>} allowedFields - Campos permitidos para ordenar
 * @param {string} [defaultField='createdAt'] - Campo por defecto
 * @param {string} [defaultOrder='DESC'] - Orden por defecto (ASC o DESC)
 * @returns {Function} Middleware de Express
 * 
 * @example
 * router.get('/users',
 *   validateSort(['createdAt', 'nombre', 'email']),
 *   userController.getAll
 * );
 */
export const validateSort = (allowedFields = [], options = {}) => {
  const {
    defaultField = 'createdAt',
    defaultOrder = 'DESC',
  } = options;

  return (req, res, next) => {
    try {
      // =========================================================================
      // 1. OBTENER PARÁMETROS DE ORDENAMIENTO
      // =========================================================================
      let sortBy = req.query.sortBy || req.query.sort || defaultField;
      let sortOrder = req.query.sortOrder || req.query.order || defaultOrder;

      // =========================================================================
      // 2. VALIDAR CAMPO DE ORDENAMIENTO
      // =========================================================================
      // Prevenir SQL injection validando contra whitelist
      if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
        sortBy = defaultField;
      }

      // =========================================================================
      // 3. VALIDAR DIRECCIÓN DE ORDENAMIENTO
      // =========================================================================
      sortOrder = sortOrder.toUpperCase();
      if (!['ASC', 'DESC'].includes(sortOrder)) {
        sortOrder = defaultOrder;
      }

      // =========================================================================
      // 4. ADJUNTAR PARÁMETROS NORMALIZADOS AL REQUEST
      // =========================================================================
      req.sort = {
        sortBy,
        sortOrder,
      };

      next();
    } catch (error) {
      logger.warn('Error en validación de ordenamiento', {
        error: error.message,
        path: req.path,
      });
      next(); // Continuar con valores por defecto
    }
  };
};

// =============================================================================
// COMBINACIONES PREDEFINIDAS DE VALIDACIÓN
// =============================================================================

/**
 * Validación estándar para listados con paginación y ordenamiento
 * 
 * Combina validatePagination + validateSort en un solo middleware
 * 
 * @param {Object} options - Opciones combinadas
 * @returns {Function} Middleware de Express
 * 
 * @example
 * router.get('/users',
 *   validateList({ allowedSortFields: ['createdAt', 'nombre'] }),
 *   userController.getAll
 * );
 */
export const validateList = (options = {}) => {
  const {
    allowedSortFields = [],
    defaultSortField = 'createdAt',
    defaultSortOrder = 'DESC',
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100,
  } = options;

  return (req, res, next) => {
    // Ejecutar validación de paginación
    validatePagination({ defaultPage, defaultLimit, maxLimit })(req, res, (err) => {
      if (err) return next(err);

      // Ejecutar validación de ordenamiento
      validateSort(allowedSortFields, {
        defaultField: defaultSortField,
        defaultOrder: defaultSortOrder,
      })(req, res, next);
    });
  };
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta todas las funciones del módulo
 * 
 * @example
 * // Importación named (recomendado)
 * import { 
 *   validate, 
 *   validateMultiple, 
 *   sanitize,
 *   validatePagination 
 * } from './middleware/validation.middleware.js';
 * 
 * @example
 * // Importación por defecto
 * import validationMiddleware from './middleware/validation.middleware.js';
 * validationMiddleware.validate(schema);
 */
export default {
  // Validación principal
  validate,
  validateMultiple,
  
  // Sanitización
  sanitize,
  
  // Validaciones específicas
  validateContentType,
  validatePagination,
  validateSort,
  validateList,
};