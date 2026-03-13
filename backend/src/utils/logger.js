/**
 * =============================================================================
 * SERVICIO DE LOGGING - UTILIDAD GLOBAL
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Centralizar todo el logging de la aplicación en un solo módulo
 * - Proporcionar diferentes niveles de log para diferentes contextos
 * - Formatear logs consistentemente para facilitar lectura y debugging
 * - Adaptar el formato de logs según el entorno (dev vs production)
 * - Facilitar la integración con servicios externos de logging (Winston, Pino, etc.)
 * 
 * Arquitectura:
 * - Capa: Utilidades (usada en todas las capas)
 * - Patrón: Singleton + Strategy Pattern (por nivel de log)
 * - Integración: Consola en desarrollo, potencialmente archivos/servicios en producción
 * 
 * Niveles de Log (de mayor a menor severidad):
 * - error: Errores críticos que requieren atención inmediata
 * - warn: Advertencias que pueden requerir atención
 * - info: Información general sobre el funcionamiento del sistema
 * - http: Peticiones HTTP entrantes
 * - debug: Información detallada para debugging
 * 
 * @module utils/logger
 * @layer Utilities
 */

import { env, isDevelopment, isProduction, isTest } from '../config/env.js';

// =============================================================================
// CONFIGURACIÓN DE COLORES PARA CONSOLA
// =============================================================================

/**
 * Códigos de colores ANSI para terminal
 * 
 * Se usan solo en desarrollo para mejorar la legibilidad de los logs.
 * En producción se omiten para compatibilidad con sistemas de logging externos.
 * 
 * @constant {Object}
 */
const colors = {
  // Colores de texto
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Colores de fondo
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  
  // Estilos
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};

/**
 * Mapeo de niveles de log a sus configuraciones visuales
 * 
 * @constant {Object}
 */
const levelConfig = {
  error: {
    color: colors.red,
    bg: colors.bgRed,
    label: 'ERROR',
    emoji: '❌',
  },
  warn: {
    color: colors.yellow,
    bg: colors.bgYellow,
    label: 'WARN',
    emoji: '⚠️ ',
  },
  info: {
    color: colors.cyan,
    label: 'INFO',
    emoji: 'ℹ️ ',
  },
  http: {
    color: colors.green,
    label: 'HTTP',
    emoji: '🌐 ',
  },
  debug: {
    color: colors.magenta,
    label: 'DEBUG',
    emoji: '🐛 ',
  },
};

// =============================================================================
// FORMATEADORES DE LOG
// =============================================================================

/**
 * Formatea un timestamp en formato ISO 8601 legible
 * 
 * @param {Date} [date] - Fecha a formatear (default: ahora)
 * @returns {string} Timestamp formateado
 * 
 * @example
 * formatTimestamp() // "2026-02-03T10:30:00.000Z"
 */
const formatTimestamp = (date = new Date()) => {
  return date.toISOString();
};

/**
 * Formatea el nivel de log con colores (solo en desarrollo)
 * 
 * @param {string} level - Nivel de log
 * @param {boolean} useColors - Si se deben usar colores
 * @returns {string} Nivel formateado
 */
const formatLevel = (level, useColors) => {
  const config = levelConfig[level] || levelConfig.info;
  
  if (useColors) {
    return `${config.color}${config.bright}[${config.label}]${colors.reset}`;
  }
  
  return `[${config.label}]`;
};

/**
 * Formatea el mensaje principal del log
 * 
 * @param {string} message - Mensaje a formatear
 * @param {string} level - Nivel de log
 * @param {boolean} useColors - Si se deben usar colores
 * @returns {string} Mensaje formateado
 */
const formatMessage = (message, level, useColors) => {
  const config = levelConfig[level] || levelConfig.info;
  
  if (useColors) {
    return `${config.emoji}${colors.bright}${message}${colors.reset}`;
  }
  
  return `${config.emoji}${message}`;
};

/**
 * Formatea metadata adicional para el log
 * 
 * @param {Object} meta - Metadata a formatear
 * @param {boolean} useColors - Si se deben usar colores
 * @returns {string} Metadata formateada
 */
const formatMeta = (meta, useColors) => {
  if (!meta || Object.keys(meta).length === 0) {
    return '';
  }
  
  if (useColors) {
    return `${colors.gray}${JSON.stringify(meta, null, 2)}${colors.reset}`;
  }
  
  return JSON.stringify(meta, null, 2);
};

/**
 * Formatea un objeto de error para logging
 * 
 * @param {Error} error - Error a formatear
 * @param {boolean} useColors - Si se deben usar colores
 * @returns {Object} Error formateado para log
 */
const formatError = (error, useColors) => {
  if (!error) return null;
  
  const formatted = {
    name: error.name || 'Error',
    message: error.message,
    stack: error.stack,
    code: error.code || null,
    statusCode: error.statusCode || null,
  };
  
  // En desarrollo, incluir stack trace completo
  if (isDevelopment) {
    formatted.stack = error.stack?.split('\n').slice(0, 20);
  }
  
  return formatted;
};

// =============================================================================
// CLASE PRINCIPAL DEL LOGGER
// =============================================================================

/**
 * Clase Logger - Servicio centralizado de logging
 * 
 * Proporciona métodos para cada nivel de log con formateo consistente.
 * Implementa el patrón Singleton para asegurar una única instancia.
 * 
 * @class
 */
class Logger {
  /**
   * Constructor del Logger
   * 
   * @param {Object} options - Opciones de configuración
   * @param {string} [options.serviceName] - Nombre del servicio para identificar logs
   * @param {boolean} [options.useColors] - Forzar uso de colores (default: auto-detect)
   * @param {string} [options.level] - Nivel mínimo de log (default: info)
   */
  constructor(options = {}) {
    /**
     * Nombre del servicio para identificar en logs
     * @type {string}
     */
    this.serviceName = options.serviceName || 'OSFLSystem';
    
    /**
     * Si se deben usar colores en la salida
     * @type {boolean}
     */
    this.useColors = options.useColors !== undefined 
      ? options.useColors 
      : isDevelopment && process.stdout.isTTY;
    
    /**
     * Nivel mínimo de log a mostrar
     * @type {string}
     */
    this.level = options.level || 'info';
    
    /**
     * Niveles de log en orden de severidad
     * @type {Array<string>}
     */
    this.levels = ['error', 'warn', 'info', 'http', 'debug'];
    
    /**
     * Callbacks personalizados para interceptar logs
     * @type {Array<Function>}
     */
    this.hooks = [];
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO shouldLog
   * ---------------------------------------------------------------------------
   * 
   * Determina si un mensaje de cierto nivel debe ser loggeado
   * basado en el nivel mínimo configurado.
   * 
   * @param {string} level - Nivel del mensaje a loggear
   * @returns {boolean} True si debe ser loggeado
   * 
   * @private
   */
  shouldLog(level) {
    const levelIndex = this.levels.indexOf(level);
    const minLevelIndex = this.levels.indexOf(this.level);
    
    return levelIndex <= minLevelIndex;
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO log
   * ---------------------------------------------------------------------------
   * 
   * Método base para todos los logs.
   * Formatea y escribe el mensaje en la salida apropiada.
   * 
   * @param {string} level - Nivel de log
   * @param {string} message - Mensaje a loggear
   * @param {Object} [meta] - Metadata adicional
   * 
   * @private
   */
  log(level, message, meta = {}) {
    // Verificar si este nivel debe ser loggeado
    if (!this.shouldLog(level)) {
      return;
    }

    // Preparar metadata
    const logMeta = {
      service: this.serviceName,
      environment: env.NODE_ENV,
      timestamp: formatTimestamp(),
      ...meta,
    };

    // Formatear salida según entorno
    if (this.useColors) {
      // Salida con colores para desarrollo
      const levelStr = formatLevel(level, true);
      const messageStr = formatMessage(message, level, true);
      const metaStr = formatMeta(logMeta, true);
      
      console.log(`${levelStr} ${messageStr}`, metaStr || '');
    } else {
      // Salida JSON para producción (más fácil de parsear por sistemas externos)
      const logEntry = {
        level,
        message,
        ...logMeta,
      };
      
      // Usar el método apropiado según el nivel
      if (level === 'error') {
        console.error(JSON.stringify(logEntry));
      } else if (level === 'warn') {
        console.warn(JSON.stringify(logEntry));
      } else {
        console.log(JSON.stringify(logEntry));
      }
    }

    // Ejecutar hooks personalizados
    this.hooks.forEach(hook => {
      try {
        hook(level, message, logMeta);
      } catch (error) {
        // No permitir que un hook falle afecte el logging principal
        console.error('Error en hook de logger:', error.message);
      }
    });
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO error
   * ---------------------------------------------------------------------------
   * 
   * Loggea un mensaje de nivel ERROR.
   * 
   * Usar para:
   * - Errores críticos que requieren atención inmediata
   * - Excepciones no capturadas
   * - Fallos de servicios externos
   * - Errores de base de datos
   * 
   * @param {string} message - Mensaje descriptivo del error
   * @param {Object} [meta] - Metadata adicional (ej: error stack, userId, etc.)
   * 
   * @example
   * logger.error('Error al conectar a la base de datos', {
   *   error: error.message,
   *   stack: error.stack,
   *   userId: req.user?.id
   * });
   */
  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO warn
   * ---------------------------------------------------------------------------
   * 
   * Loggea un mensaje de nivel WARN.
   * 
   * Usar para:
   * - Advertencias que pueden requerir atención
   * - Deprecaciones
   * - Intentos de acceso no autorizado
   * - Validaciones fallidas importantes
   * 
   * @param {string} message - Mensaje descriptivo de la advertencia
   * @param {Object} [meta] - Metadata adicional
   * 
   * @example
   * logger.warn('Intento de acceso no autorizado', {
   *   userId: req.user?.id,
   *   path: req.path,
   *   role: req.user?.role
   * });
   */
  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO info
   * ---------------------------------------------------------------------------
   * 
   * Loggea un mensaje de nivel INFO.
   * 
   * Usar para:
   * - Información general del funcionamiento del sistema
   * - Inicio/parada del servidor
   * - Conexiones establecidas
   * - Operaciones exitosas importantes
   * 
   * @param {string} message - Mensaje informativo
   * @param {Object} [meta] - Metadata adicional
   * 
   * @example
   * logger.info('Servidor iniciado', {
   *   port: env.PORT,
   *   environment: env.NODE_ENV
   * });
   */
  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO http
   * ---------------------------------------------------------------------------
   * 
   * Loggea información sobre peticiones HTTP.
   * 
   * Usar para:
   * - Peticiones HTTP entrantes
   * - Métodos, paths, status codes
   * - Tiempos de respuesta
   * 
   * @param {string} message - Mensaje sobre la petición HTTP
   * @param {Object} [meta] - Metadata adicional (method, path, statusCode, etc.)
   * 
   * @example
   * logger.http('Petición recibida', {
   *   method: req.method,
   *   path: req.path,
   *   statusCode: res.statusCode,
   *   responseTime: responseTime + 'ms'
   * });
   */
  http(message, meta = {}) {
    this.log('http', message, meta);
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO debug
   * ---------------------------------------------------------------------------
   * 
   * Loggea un mensaje de nivel DEBUG.
   * 
   * Usar para:
   * - Información detallada para debugging
   * - Variables internas
   * - Flujo de ejecución
   * - Solo visible en desarrollo
   * 
   * @param {string} message - Mensaje de debug
   * @param {Object} [meta] - Metadata adicional
   * 
   * @example
   * logger.debug('Datos recibidos del cliente', {
   *   body: req.body,
   *   query: req.query,
   *   params: req.params
   * });
   */
  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO addHook
   * ---------------------------------------------------------------------------
   * 
   * Agrega un callback que se ejecutará para cada log.
   * Útil para integrar con servicios externos de logging.
   * 
   * @param {Function} hook - Callback que recibe (level, message, meta)
   * @returns {Function} Función para remover el hook
   * 
   * @example
   * // Agregar hook para enviar logs a servicio externo
   * const removeHook = logger.addHook((level, message, meta) => {
   *   externalLoggingService.send({ level, message, meta });
   * });
   * 
   * // Remover hook cuando ya no se necesita
   * removeHook();
   */
  addHook(hook) {
    this.hooks.push(hook);
    
    // Retornar función para remover el hook
    return () => {
      const index = this.hooks.indexOf(hook);
      if (index > -1) {
        this.hooks.splice(index, 1);
      }
    };
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO setLevel
   * ---------------------------------------------------------------------------
   * 
   * Cambia el nivel mínimo de log dinámicamente.
   * 
   * @param {string} level - Nuevo nivel mínimo
   * 
   * @example
   * // Mostrar solo errores en producción
   * logger.setLevel('error');
   * 
   * // Mostrar todos los logs en desarrollo
   * logger.setLevel('debug');
   */
  setLevel(level) {
    if (this.levels.includes(level)) {
      this.level = level;
      this.info('Nivel de log cambiado', { newLevel: level });
    } else {
      this.warn('Nivel de log inválido', { provided: level, valid: this.levels });
    }
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO child
   * ---------------------------------------------------------------------------
   * 
   * Crea una instancia hija del logger con configuración modificada.
   * Útil para módulos específicos que necesitan su propio contexto.
   * 
   * @param {Object} options - Opciones a modificar
   * @returns {Logger} Nueva instancia de Logger
   * 
   * @example
   * const dbLogger = logger.child({ serviceName: 'Database' });
   * dbLogger.info('Conexión establecida');
   */
  child(options = {}) {
    const childLogger = new Logger({
      serviceName: options.serviceName || this.serviceName,
      useColors: options.useColors !== undefined ? options.useColors : this.useColors,
      level: options.level || this.level,
    });
    
    // Copiar hooks del padre
    this.hooks.forEach(hook => childLogger.addHook(hook));
    
    return childLogger;
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO profile
   * ---------------------------------------------------------------------------
   * 
   * Inicia un perfil de tiempo para medir duración de operaciones.
   * 
   * @param {string} id - Identificador del perfil
   * 
   * @example
   * logger.profile('db-query');
   * // ... operación ...
   * logger.profileEnd('db-query');
   */
  profile(id) {
    if (this.shouldLog('debug')) {
      this._profiles = this._profiles || new Map();
      this._profiles.set(id, Date.now());
    }
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO profileEnd
   * ---------------------------------------------------------------------------
   * 
   * Finaliza un perfil y loggea la duración.
   * 
   * @param {string} id - Identificador del perfil
   * @param {string} [message] - Mensaje opcional
   * 
   * @example
   * logger.profileEnd('db-query', 'Consulta completada');
   */
  profileEnd(id, message = 'Perfil completado') {
    if (!this._profiles || !this._profiles.has(id)) {
      return;
    }
    
    const start = this._profiles.get(id);
    const duration = Date.now() - start;
    this._profiles.delete(id);
    
    this.debug(message, { profile: id, duration: `${duration}ms` });
  }

  /**
   * ---------------------------------------------------------------------------
   * MÉTODO table
   * ---------------------------------------------------------------------------
   * 
   * Loggea datos en formato de tabla (solo en desarrollo).
   * 
   * @param {Array|Object} data - Datos a mostrar en tabla
   * 
   * @example
   * logger.table(users);
   */
  table(data) {
    if (isDevelopment && console.table) {
      console.table(data);
    } else {
      this.debug('Datos en tabla', { data });
    }
  }
}

// =============================================================================
// INSTANCIA GLOBAL DEL LOGGER
// =============================================================================

/**
 * Instancia singleton del logger para uso en toda la aplicación
 * 
 * @type {Logger}
 */
const logger = new Logger({
  serviceName: 'OSFLSystem',
  level: isTest ? 'error' : isDevelopment ? 'debug' : 'info',
});

/**
 * Logger específico para errores de base de datos
 * 
 * @type {Logger}
 */
export const dbLogger = logger.child({ serviceName: 'Database' });

/**
 * Logger específico para autenticación
 * 
 * @type {Logger}
 */
export const authLogger = logger.child({ serviceName: 'Auth' });

/**
 * Logger específico para HTTP
 * 
 * @type {Logger}
 */
export const httpLogger = logger.child({ serviceName: 'HTTP' });

/**
 * Logger específico para servicios externos
 * 
 * @type {Logger}
 */
export const externalLogger = logger.child({ serviceName: 'ExternalServices' });

// =============================================================================
// MIDDLEWARE DE LOGGING PARA EXPRESS
// =============================================================================

/**
 * Middleware para loggear peticiones HTTP con Express
 * 
 * @param {Object} options - Opciones del middleware
 * @param {boolean} [options.skipStatic] - Si se deben omitir archivos estáticos
 * @returns {Function} Middleware de Express
 * 
 * @example
 * app.use(httpLoggerMiddleware({ skipStatic: true }));
 */
export const httpLoggerMiddleware = (options = {}) => {
  const { skipStatic = true } = options;
  
  return (req, res, next) => {
    // Skip archivos estáticos si se configura
    if (skipStatic && (req.path.startsWith('/public') || req.path.startsWith('/static'))) {
      return next();
    }
    
    const start = Date.now();
    
    // Escuchar cuando la respuesta termine
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      httpLogger.http(`${req.method} ${req.path}`, {
        statusCode: res.statusCode,
        responseTime: `${duration}ms`,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.id,
      });
    });
    
    next();
  };
};

// =============================================================================
// INTEGRACIÓN CON SERVICIOS EXTERNOS (OPCIONAL)
// =============================================================================

/**
 * Hook para enviar logs a un servicio externo (ej: Datadog, Sentry, etc.)
 * 
 * @param {Object} config - Configuración del servicio externo
 * @param {string} config.service - Nombre del servicio (datadog, sentry, etc.)
 * @param {string} config.apiKey - API key del servicio
 * 
 * @example
 * // Integrar con Sentry para errores
 * logger.addExternalService({
 *   service: 'sentry',
 *   dsn: process.env.SENTRY_DSN
 * });
 */
export const addExternalService = (config) => {
  const { service, apiKey } = config;
  
  switch (service) {
    case 'sentry':
      // Ejemplo de integración con Sentry
      logger.addHook((level, message, meta) => {
        if (level === 'error' && global.Sentry) {
          global.Sentry.captureException(new Error(message), {
            extra: meta,
            level: 'error',
          });
        }
      });
      logger.info('Sentry integrado para logging de errores');
      break;
      
    case 'datadog':
      // Ejemplo de integración con Datadog
      logger.addHook((level, message, meta) => {
        // Enviar a Datadog Logs API
        // Implementación específica según SDK de Datadog
      });
      logger.info('Datadog integrado para logging');
      break;
      
    default:
      logger.warn('Servicio de logging externo no soportado', { service });
  }
};

// =============================================================================
// LOG DE INICIALIZACIÓN
// =============================================================================

/**
 * Log de inicialización del logger (solo en desarrollo)
 */
if (isDevelopment) {
  logger.info('Logger inicializado', {
    serviceName: logger.serviceName,
    level: logger.level,
    useColors: logger.useColors,
    environment: env.NODE_ENV,
  });
}

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta la instancia principal del logger y utilidades relacionadas
 * 
 * @example
 * // Importación named (recomendado)
 * import logger, { 
 *   dbLogger, 
 *   authLogger, 
 *   httpLoggerMiddleware 
 * } from './utils/logger.js';
 * 
 * logger.info('Mensaje de log');
 * 
 * @example
 * // Importación por defecto
 * import logger from './utils/logger.js';
 * logger.error('Error ocurrido');
 */
export {
  logger,
  dbLogger,
  authLogger,
  httpLogger,
  externalLogger,
  httpLoggerMiddleware,
  addExternalService,
  Logger,
};

export default logger;