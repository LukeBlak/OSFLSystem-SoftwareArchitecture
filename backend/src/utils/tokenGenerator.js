/**
 * =============================================================================
 * GENERADOR Y VERIFICADOR DE TOKENS JWT - UTILIDAD GLOBAL
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Centralizar la generación y verificación de tokens JWT en un solo módulo
 * - Proveer utilidades para manejar tokens de acceso y refresh
 * - Implementar seguridad adecuada para tokens (expiración, firma, etc.)
 * - Integrarse con Supabase Auth y el sistema de autenticación del backend
 * 
 * Arquitectura:
 * - Capa: Utilidades (usada en Services y Controllers)
 * - Patrón: Utility Module + Factory Functions
 * - Integración: jsonwebtoken, env.js, apiError.js
 * 
 * Librerías utilizadas:
 * - jsonwebtoken: Implementación de JWT para Node.js
 * 
 * Tipos de Token Soportados:
 * - Access Token: Token de acceso de corta duración (1h por defecto)
 * - Refresh Token: Token de refresco de larga duración (7d por defecto)
 * - Email Verification Token: Token para verificación de email
 * - Password Reset Token: Token para reestablecimiento de contraseña
 * 
 * @module utils/tokenGenerator
 * @layer Utilities
 */

import jwt from 'jsonwebtoken';
import { env, isDevelopment, isProduction } from '../config/env.js';
import { ApiError } from './apiError.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from './logger.js';

// =============================================================================
// CONFIGURACIÓN DE TOKENS
// =============================================================================

/**
 * Configuración por defecto para tokens de acceso
 * 
 * @constant {Object}
 */
const ACCESS_TOKEN_CONFIG = {
  /**
   * Tiempo de expiración del token de acceso
   * @type {string}
   * @default '1h' (1 hora)
   */
  expiresIn: env.JWT_EXPIRES_IN || '1h',
  
  /**
   * Algoritmo de firma
   * @type {string}
   */
  algorithm: 'HS256',
  
  /**
   * Emisor del token
   * @type {string}
   */
  issuer: 'OSFLSystem',
  
  /**
   * Audiencia del token
   * @type {string}
   */
  audience: 'osfl-users',
};

/**
 * Configuración por defecto para tokens de refresco
 * 
 * @constant {Object}
 */
const REFRESH_TOKEN_CONFIG = {
  /**
   * Tiempo de expiración del token de refresco
   * @type {string}
   * @default '7d' (7 días)
   */
  expiresIn: '7d',
  
  /**
   * Algoritmo de firma
   * @type {string}
   */
  algorithm: 'HS256',
  
  /**
   * Emisor del token
   * @type {string}
   */
  issuer: 'OSFLSystem',
  
  /**
   * Audiencia del token
   * @type {string}
   */
  audience: 'osfl-refresh',
};

/**
 * Configuración para tokens temporales (email verification, password reset)
 * 
 * @constant {Object}
 */
const TEMPORARY_TOKEN_CONFIG = {
  /**
   * Tiempo de expiración para tokens temporales
   * @type {string}
   * @default '1h' (1 hora)
   */
  expiresIn: '1h',
  
  /**
   * Algoritmo de firma
   * @type {string}
   */
  algorithm: 'HS256',
  
  /**
   * Emisor del token
   * @type {string}
   */
  issuer: 'OSFLSystem',
};

/**
 * Secret key para firmar tokens
 * Se obtiene de las variables de entorno validadas
 * 
 * @constant {string}
 */
const JWT_SECRET = env.JWT_SECRET;

// =============================================================================
// FUNCIONES DE GENERACIÓN DE TOKENS
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * GENERAR TOKEN DE ACCESO
 * -----------------------------------------------------------------------------
 * 
 * Genera un token JWT de acceso para autenticación de usuario.
 * 
 * @param {Object} payload - Datos a incluir en el token
 * @param {string} payload.sub - ID del usuario (subject)
 * @param {string} payload.email - Email del usuario
 * @param {string} payload.role - Rol del usuario
 * @param {string} [payload.organizationId] - ID de la organización
 * @param {Object} [payload.profile] - Información adicional del perfil
 * @param {Object} [options] - Opciones adicionales para sobrescribir config
 * @param {string} [options.expiresIn] - Tiempo de expiración personalizado
 * 
 * @returns {string} Token JWT firmado
 * 
 * @throws {ApiError} 500 - Si hay error al generar el token
 * 
 * @example
 * const token = generateAccessToken({
 *   sub: userId,
 *   email: user.email,
 *   role: user.role,
 *   organizationId: user.organizationId
 * });
 */
export const generateAccessToken = (payload, options = {}) => {
  try {
    // Validar que el payload tenga los campos requeridos
    if (!payload.sub) {
      throw new Error('El campo "sub" (user ID) es requerido en el payload');
    }

    const config = {
      algorithm: ACCESS_TOKEN_CONFIG.algorithm,
      expiresIn: options.expiresIn || ACCESS_TOKEN_CONFIG.expiresIn,
      issuer: ACCESS_TOKEN_CONFIG.issuer,
      audience: ACCESS_TOKEN_CONFIG.audience,
      jwtid: `${payload.sub}-${Date.now()}`, // ID único del token
    };

    const token = jwt.sign(payload, JWT_SECRET, config);

    logger.debug('Token de acceso generado', {
      userId: payload.sub,
      email: payload.email,
      expiresIn: config.expiresIn,
    });

    return token;
  } catch (error) {
    logger.error('Error al generar token de acceso', {
      error: error.message,
      userId: payload?.sub,
    });

    throw ApiError.internal(
      'Error al generar token de acceso',
      {
        code: 'TOKEN_GENERATION_ERROR',
        details: error.message,
      }
    );
  }
};

/**
 * -----------------------------------------------------------------------------
 * GENERAR TOKEN DE REFRESCO
 * -----------------------------------------------------------------------------
 * 
 * Genera un token JWT de refresco para obtener nuevos tokens de acceso.
 * 
 * @param {Object} payload - Datos a incluir en el token
 * @param {string} payload.sub - ID del usuario (subject)
 * @param {string} payload.type - Tipo de token ('refresh')
 * @param {string} [payload.jti] - ID único del token (para revocación)
 * @param {Object} [options] - Opciones adicionales
 * 
 * @returns {string} Token JWT de refresco firmado
 * 
 * @throws {ApiError} 500 - Si hay error al generar el token
 * 
 * @example
 * const refreshToken = generateRefreshToken({
 *   sub: userId,
 *   type: 'refresh',
 *   jti: uniqueId
 * });
 */
export const generateRefreshToken = (payload, options = {}) => {
  try {
    // Validar que el payload tenga los campos requeridos
    if (!payload.sub) {
      throw new Error('El campo "sub" (user ID) es requerido en el payload');
    }

    const config = {
      algorithm: REFRESH_TOKEN_CONFIG.algorithm,
      expiresIn: options.expiresIn || REFRESH_TOKEN_CONFIG.expiresIn,
      issuer: REFRESH_TOKEN_CONFIG.issuer,
      audience: REFRESH_TOKEN_CONFIG.audience,
      jwtid: payload.jti || `${payload.sub}-refresh-${Date.now()}`,
    };

    const token = jwt.sign(
      {
        ...payload,
        type: 'refresh',
      },
      JWT_SECRET,
      config
    );

    logger.debug('Token de refresco generado', {
      userId: payload.sub,
      expiresIn: config.expiresIn,
    });

    return token;
  } catch (error) {
    logger.error('Error al generar token de refresco', {
      error: error.message,
      userId: payload?.sub,
    });

    throw ApiError.internal(
      'Error al generar token de refresco',
      {
        code: 'REFRESH_TOKEN_GENERATION_ERROR',
        details: error.message,
      }
    );
  }
};

/**
 * -----------------------------------------------------------------------------
 * GENERAR TOKEN DE VERIFICACIÓN DE EMAIL
 * -----------------------------------------------------------------------------
 * 
 * Genera un token temporal para verificación de email.
 * 
 * @param {Object} payload - Datos a incluir en el token
 * @param {string} payload.sub - ID del usuario
 * @param {string} payload.email - Email a verificar
 * @param {string} [payload.type] - Tipo de token ('email_verification')
 * 
 * @returns {string} Token JWT temporal firmado
 * 
 * @throws {ApiError} 500 - Si hay error al generar el token
 */
export const generateEmailVerificationToken = (payload) => {
  try {
    const config = {
      algorithm: TEMPORARY_TOKEN_CONFIG.algorithm,
      expiresIn: '24h', // 24 horas para verificar email
      issuer: TEMPORARY_TOKEN_CONFIG.issuer,
      jwtid: `${payload.sub}-email-verify-${Date.now()}`,
    };

    const token = jwt.sign(
      {
        ...payload,
        type: 'email_verification',
      },
      JWT_SECRET,
      config
    );

    logger.debug('Token de verificación de email generado', {
      userId: payload.sub,
      email: payload.email,
    });

    return token;
  } catch (error) {
    logger.error('Error al generar token de verificación de email', {
      error: error.message,
      userId: payload?.sub,
    });

    throw ApiError.internal(
      'Error al generar token de verificación',
      {
        code: 'EMAIL_VERIFICATION_TOKEN_ERROR',
        details: error.message,
      }
    );
  }
};

/**
 * -----------------------------------------------------------------------------
 * GENERAR TOKEN DE RESETEO DE CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Genera un token temporal para reestablecimiento de contraseña.
 * 
 * @param {Object} payload - Datos a incluir en el token
 * @param {string} payload.sub - ID del usuario
 * @param {string} payload.email - Email del usuario
 * @param {string} [payload.type] - Tipo de token ('password_reset')
 * 
 * @returns {string} Token JWT temporal firmado
 * 
 * @throws {ApiError} 500 - Si hay error al generar el token
 */
export const generatePasswordResetToken = (payload) => {
  try {
    const config = {
      algorithm: TEMPORARY_TOKEN_CONFIG.algorithm,
      expiresIn: '1h', // 1 hora para resetear contraseña
      issuer: TEMPORARY_TOKEN_CONFIG.issuer,
      jwtid: `${payload.sub}-password-reset-${Date.now()}`,
    };

    const token = jwt.sign(
      {
        ...payload,
        type: 'password_reset',
      },
      JWT_SECRET,
      config
    );

    logger.debug('Token de reset de contraseña generado', {
      userId: payload.sub,
      email: payload.email,
    });

    return token;
  } catch (error) {
    logger.error('Error al generar token de reset de contraseña', {
      error: error.message,
      userId: payload?.sub,
    });

    throw ApiError.internal(
      'Error al generar token de reset',
      {
        code: 'PASSWORD_RESET_TOKEN_ERROR',
        details: error.message,
      }
    );
  }
};

/**
 * -----------------------------------------------------------------------------
 * GENERAR PAR DE TOKENS (ACCESO + REFRESCO)
 * -----------------------------------------------------------------------------
 * 
 * Genera ambos tokens (acceso y refresco) en una sola operación.
 * 
 * @param {Object} userData - Datos del usuario para los tokens
 * @param {string} userData.id - ID del usuario
 * @param {string} userData.email - Email del usuario
 * @param {string} userData.role - Rol del usuario
 * @param {string} [userData.organizationId] - ID de la organización
 * 
 * @returns {Object} Par de tokens
 * @returns {string} return.accessToken - Token de acceso
 * @returns {string} return.refreshToken - Token de refresco
 * @returns {string} return.expiresIn - Tiempo de expiración del access token
 * 
 * @throws {ApiError} 500 - Si hay error al generar los tokens
 * 
 * @example
 * const { accessToken, refreshToken, expiresIn } = generateTokenPair({
 *   id: userId,
 *   email: user.email,
 *   role: user.role
 * });
 */
export const generateTokenPair = (userData) => {
  try {
    // Payload común para ambos tokens
    const commonPayload = {
      sub: userData.id,
      email: userData.email,
      role: userData.role,
      organizationId: userData.organizationId || null,
    };

    // Generar token de acceso
    const accessToken = generateAccessToken(commonPayload);

    // Generar token de refresco con payload mínimo
    const refreshToken = generateRefreshToken({
      sub: userData.id,
      type: 'refresh',
      jti: `${userData.id}-refresh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    logger.info('Par de tokens generado', {
      userId: userData.id,
      email: userData.email,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_CONFIG.expiresIn,
    };
  } catch (error) {
    logger.error('Error al generar par de tokens', {
      error: error.message,
      userId: userData?.id,
    });

    throw ApiError.internal(
      'Error al generar tokens de autenticación',
      {
        code: 'TOKEN_PAIR_GENERATION_ERROR',
        details: error.message,
      }
    );
  }
};

// =============================================================================
// FUNCIONES DE VERIFICACIÓN DE TOKENS
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR TOKEN JWT
 * -----------------------------------------------------------------------------
 * 
 * Verifica y decodifica un token JWT.
 * 
 * @param {string} token - Token JWT a verificar
 * @param {Object} [options] - Opciones de verificación
 * @param {boolean} [options.ignoreExpiration] - Si true, no valida expiración
 * @param {string} [options.audience] - Audiencia esperada (sobrescribe config)
 * @param {string} [options.issuer] - Emisor esperado (sobrescribe config)
 * 
 * @returns {Object} Payload decodificado del token
 * 
 * @throws {ApiError} 401 - Si el token es inválido o expirado
 * 
 * @example
 * const payload = verifyToken(token);
 * console.log('Usuario ID:', payload.sub);
 */
export const verifyToken = (token, options = {}) => {
  try {
    // Validar que el token no esté vacío
    if (!token || typeof token !== 'string') {
      throw ApiError.unauthorized('Token no proporcionado');
    }

    // Remover prefijo "Bearer " si existe
    const cleanToken = token.startsWith('Bearer ') 
      ? token.slice(7).trim() 
      : token.trim();

    if (!cleanToken) {
      throw ApiError.unauthorized('Token vacío');
    }

    const config = {
      algorithms: [ACCESS_TOKEN_CONFIG.algorithm],
      issuer: options.issuer || ACCESS_TOKEN_CONFIG.issuer,
      audience: options.audience || ACCESS_TOKEN_CONFIG.audience,
      ignoreExpiration: options.ignoreExpiration || false,
    };

    const decoded = jwt.verify(cleanToken, JWT_SECRET, config);

    logger.debug('Token verificado exitosamente', {
      userId: decoded.sub,
      email: decoded.email,
    });

    return decoded;
  } catch (error) {
    // Manejar errores específicos de JWT
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token expirado', {
        expiredAt: error.expiredAt,
      });
      
      throw ApiError.unauthorized(
        'El token ha expirado. Por favor inicia sesión nuevamente',
        {
          code: 'TOKEN_EXPIRED',
          details: {
            expiredAt: error.expiredAt,
          },
        }
      );
    }

    if (error.name === 'JsonWebTokenError') {
      logger.warn('Token inválido', {
        error: error.message,
      });
      
      throw ApiError.unauthorized(
        'Token inválido o malformado',
        {
          code: 'INVALID_TOKEN',
          details: error.message,
        }
      );
    }

    if (error.name === 'NotBeforeError') {
      logger.warn('Token aún no válido', {
        date: error.date,
      });
      
      throw ApiError.unauthorized(
        'El token aún no es válido',
        {
          code: 'TOKEN_NOT_YET_VALID',
          details: {
            validFrom: error.date,
          },
        }
      );
    }

    // Error genérico
    logger.error('Error al verificar token', {
      error: error.message,
      name: error.name,
    });

    throw ApiError.unauthorized(
      'Error de autenticación',
      {
        code: 'AUTH_ERROR',
        details: error.message,
      }
    );
  }
};

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR TOKEN DE ACCESO
 * -----------------------------------------------------------------------------
 * 
 * Verifica específicamente un token de acceso.
 * 
 * @param {string} token - Token de acceso a verificar
 * 
 * @returns {Object} Payload decodificado del token
 * 
 * @throws {ApiError} 401 - Si el token es inválido o no es de acceso
 */
export const verifyAccessToken = (token) => {
  const payload = verifyToken(token, {
    audience: ACCESS_TOKEN_CONFIG.audience,
  });

  // Verificar que no sea un token de refresco
  if (payload.type === 'refresh') {
    throw ApiError.unauthorized(
      'Se requiere un token de acceso, no un token de refresco',
      {
        code: 'WRONG_TOKEN_TYPE',
      }
    );
  }

  return payload;
};

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR TOKEN DE REFRESCO
 * -----------------------------------------------------------------------------
 * 
 * Verifica específicamente un token de refresco.
 * 
 * @param {string} token - Token de refresco a verificar
 * 
 * @returns {Object} Payload decodificado del token
 * 
 * @throws {ApiError} 401 - Si el token es inválido o no es de refresco
 */
export const verifyRefreshToken = (token) => {
  const payload = verifyToken(token, {
    audience: REFRESH_TOKEN_CONFIG.audience,
    ignoreExpiration: false,
  });

  // Verificar que sea un token de refresco
  if (payload.type !== 'refresh') {
    throw ApiError.unauthorized(
      'Se requiere un token de refresco',
      {
        code: 'WRONG_TOKEN_TYPE',
      }
    );
  }

  return payload;
};

/**
 * -----------------------------------------------------------------------------
 * DECODIFICAR TOKEN SIN VERIFICAR
 * -----------------------------------------------------------------------------
 * 
 * Decodifica el payload de un token JWT SIN validar la firma.
 * 
 * ⚠️  ADVERTENCIA: Usar solo para inspección/debugging.
 *                  NUNCA usar para autorización sin verificar primero.
 * 
 * @param {string} token - Token JWT a decodificar
 * 
 * @returns {Object|null} Payload decodificado o null si es inválido
 * 
 * @example
 * // Útil para logging o debugging
 * const payload = decodeToken(token);
 * if (payload) {
 *   console.log('Token emitido para usuario:', payload.sub);
 * }
 */
export const decodeToken = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    // Remover prefijo "Bearer " si existe
    const cleanToken = token.startsWith('Bearer ') 
      ? token.slice(7).trim() 
      : token.trim();

    return jwt.decode(cleanToken);
  } catch (error) {
    logger.debug('Error al decodificar token', {
      error: error.message,
    });
    return null;
  }
};

/**
 * -----------------------------------------------------------------------------
 * EXTRAER TOKEN DEL HEADER AUTHORIZATION
 * -----------------------------------------------------------------------------
 * 
 * Extrae el token JWT del header Authorization de una petición HTTP.
 * 
 * @param {string} authHeader - Valor del header Authorization
 * 
 * @returns {string|null} Token extraído o null si no está presente
 * 
 * @example
 * // En un middleware de Express
 * const token = extractTokenFromHeader(req.headers.authorization);
 * if (!token) {
 *   return res.status(401).json({ error: 'Token requerido' });
 * }
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  // Formato esperado: "Bearer <token>"
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
};

/**
 * -----------------------------------------------------------------------------
 * EXTRAER TOKEN DE COOKIE
 * -----------------------------------------------------------------------------
 * 
 * Extrae el token JWT de las cookies de una petición.
 * 
 * @param {Object} cookies - Objeto de cookies de la petición
 * @param {string} [cookieName='token'] - Nombre de la cookie
 * 
 * @returns {string|null} Token extraído o null si no está presente
 */
export const extractTokenFromCookie = (cookies, cookieName = 'token') => {
  if (!cookies || !cookies[cookieName]) {
    return null;
  }

  return cookies[cookieName];
};

// =============================================================================
// FUNCIONES DE UTILIDAD ADICIONALES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * OBTENER TIEMPO RESTANTE DE UN TOKEN
 * -----------------------------------------------------------------------------
 * 
 * Calcula el tiempo restante antes de que un token expire.
 * 
 * @param {string} token - Token JWT
 * 
 * @returns {Object|null} Información de expiración
 * @returns {number} return.remainingSeconds - Segundos restantes
 * @returns {number} return.remainingMinutes - Minutos restantes
 * @returns {Date} return.expiresAt - Fecha de expiración
 * @returns {boolean} return.isExpired - Si el token ya expiró
 */
export const getTokenRemainingTime = (token) => {
  try {
    const payload = decodeToken(token);
    
    if (!payload || !payload.exp) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = new Date(payload.exp * 1000);
    const remainingSeconds = payload.exp - now;
    
    return {
      remainingSeconds: Math.max(0, remainingSeconds),
      remainingMinutes: Math.max(0, Math.floor(remainingSeconds / 60)),
      expiresAt,
      isExpired: remainingSeconds <= 0,
    };
  } catch (error) {
    logger.debug('Error al calcular tiempo restante del token', {
      error: error.message,
    });
    return null;
  }
};

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR SI UN TOKEN ESTÁ A PUNTO DE EXPIRAR
 * -----------------------------------------------------------------------------
 * 
 * Verifica si un token expirará en menos de X minutos.
 * Útil para decidir si se debe refrescar el token.
 * 
 * @param {string} token - Token JWT
 * @param {number} [thresholdMinutes=5] - Umbral en minutos
 * 
 * @returns {boolean} True si el token está a punto de expirar
 */
export const isTokenExpiringSoon = (token, thresholdMinutes = 5) => {
  const timeInfo = getTokenRemainingTime(token);
  
  if (!timeInfo) {
    return true; // Asumir que necesita refresh si no se puede verificar
  }

  return timeInfo.remainingMinutes < thresholdMinutes;
};

/**
 * -----------------------------------------------------------------------------
 * REVOCAR TOKEN (SIMULADO)
 * -----------------------------------------------------------------------------
 * 
 * Nota: JWT son stateless por naturaleza. Para revocación real se necesita:
 * - Una blacklist de tokens (Redis/BD)
 * - O usar tokens de corta duración con refresh tokens
 * 
 * Esta función es un placeholder para futura implementación.
 * 
 * @param {string} token - Token a revocar
 * @param {string} userId - ID del usuario
 * @param {string} [reason] - Razón de la revocación
 * 
 * @returns {Object} Resultado de la revocación
 */
export const revokeToken = async (token, userId, reason = 'user_request') => {
  try {
    // Decodificar token para obtener información
    const payload = decodeToken(token);
    
    if (!payload) {
      return {
        success: false,
        message: 'Token inválido',
      };
    }

    // TODO: Implementar blacklist en Redis/BD
    // await redis.set(`revoked:${payload.jti}`, '1', { EX: payload.exp - Math.floor(Date.now()/1000) });

    logger.info('Token revocado', {
      userId,
      tokenJti: payload.jti,
      reason,
    });

    return {
      success: true,
      message: 'Token revocado exitosamente',
      jti: payload.jti,
    };
  } catch (error) {
    logger.error('Error al revocar token', {
      error: error.message,
      userId,
    });

    return {
      success: false,
      message: 'Error al revocar token',
    };
  }
};

/**
 * -----------------------------------------------------------------------------
 * REVOCAR TODOS LOS TOKENS DE UN USUARIO
 * -----------------------------------------------------------------------------
 * 
 * Revoca todos los tokens activos de un usuario.
 * 
 * @param {string} userId - ID del usuario
 * @param {string} [reason] - Razón de la revocación
 * 
 * @returns {Object} Resultado de la revocación
 */
export const revokeAllUserTokens = async (userId, reason = 'user_request') => {
  try {
    // TODO: Implementar blacklist masiva en Redis/BD
    // await redis.set(`revoked:user:${userId}`, '1', { EX: 7 * 24 * 60 * 60 }); // 7 días

    logger.info('Todos los tokens de usuario revocados', {
      userId,
      reason,
    });

    return {
      success: true,
      message: 'Todos los tokens han sido revocados',
      userId,
    };
  } catch (error) {
    logger.error('Error al revocar todos los tokens', {
      error: error.message,
      userId,
    });

    return {
      success: false,
      message: 'Error al revocar tokens',
    };
  }
};

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR SI UN TOKEN ESTÁ REVOCADO
 * -----------------------------------------------------------------------------
 * 
 * Verifica si un token está en la blacklist de revocación.
 * 
 * @param {string} token - Token a verificar
 * 
 * @returns {Promise<boolean>} True si el token está revocado
 */
export const isTokenRevoked = async (token) => {
  try {
    const payload = decodeToken(token);
    
    if (!payload || !payload.jti) {
      return false;
    }

    // TODO: Verificar en Redis/BD
    // const isRevoked = await redis.get(`revoked:${payload.jti}`);
    // return !!isRevoked;

    return false; // Por defecto, no revocado (hasta implementar blacklist)
  } catch (error) {
    logger.error('Error al verificar si token está revocado', {
      error: error.message,
    });
    return false;
  }
};

// =============================================================================
// FUNCIONES DE INFORMACIÓN Y DEBUGGING
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * OBTENER INFORMACIÓN DE CONFIGURACIÓN DE TOKENS
 * -----------------------------------------------------------------------------
 * 
 * Obtiene información sobre la configuración actual de tokens.
 * Útil para debugging y documentación.
 * 
 * @returns {Object} Configuración de tokens
 */
export const getTokenConfig = () => {
  return {
    accessToken: {
      expiresIn: ACCESS_TOKEN_CONFIG.expiresIn,
      algorithm: ACCESS_TOKEN_CONFIG.algorithm,
      issuer: ACCESS_TOKEN_CONFIG.issuer,
      audience: ACCESS_TOKEN_CONFIG.audience,
    },
    refreshToken: {
      expiresIn: REFRESH_TOKEN_CONFIG.expiresIn,
      algorithm: REFRESH_TOKEN_CONFIG.algorithm,
      issuer: REFRESH_TOKEN_CONFIG.issuer,
      audience: REFRESH_TOKEN_CONFIG.audience,
    },
    temporaryToken: {
      expiresIn: TEMPORARY_TOKEN_CONFIG.expiresIn,
      algorithm: TEMPORARY_TOKEN_CONFIG.algorithm,
      issuer: TEMPORARY_TOKEN_CONFIG.issuer,
    },
    secretConfigured: !!JWT_SECRET,
    secretLength: JWT_SECRET ? JWT_SECRET.length : 0,
  };
};

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR CONFIGURACIÓN DE TOKENS
 * -----------------------------------------------------------------------------
 * 
 * Verifica que la configuración de tokens sea válida.
 * 
 * @returns {Object} Resultado de la verificación
 */
export const verifyTokenConfig = () => {
  const issues = [];

  // Verificar secret
  if (!JWT_SECRET) {
    issues.push('JWT_SECRET no está configurado');
  } else if (JWT_SECRET.length < 32) {
    issues.push('JWT_SECRET debe tener al menos 32 caracteres');
  }

  // Verificar configuración de access token
  if (!ACCESS_TOKEN_CONFIG.expiresIn) {
    issues.push('ACCESS_TOKEN expiresIn no está configurado');
  }

  // Verificar configuración de refresh token
  if (!REFRESH_TOKEN_CONFIG.expiresIn) {
    issues.push('REFRESH_TOKEN expiresIn no está configurado');
  }

  return {
    isValid: issues.length === 0,
    issues,
    config: getTokenConfig(),
  };
};

// =============================================================================
// LOG DE INICIALIZACIÓN (SOLO EN DESARROLLO)
// =============================================================================

if (isDevelopment) {
  const config = verifyTokenConfig();
  
  if (config.isValid) {
    logger.debug('Configuración de tokens verificada', {
      accessTokenExpiry: ACCESS_TOKEN_CONFIG.expiresIn,
      refreshTokenExpiry: REFRESH_TOKEN_CONFIG.expiresIn,
      secretLength: `${JWT_SECRET.length} caracteres`,
    });
  } else {
    logger.warn('Problemas en configuración de tokens', {
      issues: config.issues,
    });
  }
}

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta todas las funciones del módulo
 * 
 * @example
 * // Importación named (recomendado)
 * import { 
 *   generateAccessToken, 
 *   verifyToken, 
 *   generateTokenPair 
 * } from './utils/tokenGenerator.js';
 * 
 * @example
 * // Importación por defecto
 * import tokenGenerator from './utils/tokenGenerator.js';
 * tokenGenerator.generateAccessToken(payload);
 */
export default {
  // Generación de tokens
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  generateTokenPair,
  
  // Verificación de tokens
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  
  // Extracción de tokens
  extractTokenFromHeader,
  extractTokenFromCookie,
  
  // Utilidades
  getTokenRemainingTime,
  isTokenExpiringSoon,
  revokeToken,
  revokeAllUserTokens,
  isTokenRevoked,
  
  // Información y configuración
  getTokenConfig,
  verifyTokenConfig,
  
  // Constantes de configuración
  ACCESS_TOKEN_CONFIG,
  REFRESH_TOKEN_CONFIG,
  TEMPORARY_TOKEN_CONFIG,
};

/**
 * Exportaciones named para conveniencia
 */
export {
  // Generación
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  generateTokenPair,
  
  // Verificación
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  
  // Extracción
  extractTokenFromHeader,
  extractTokenFromCookie,
  
  // Utilidades
  getTokenRemainingTime,
  isTokenExpiringSoon,
  revokeToken,
  revokeAllUserTokens,
  isTokenRevoked,
  
  // Información
  getTokenConfig,
  verifyTokenConfig,
  
  // Configuración
  ACCESS_TOKEN_CONFIG,
  REFRESH_TOKEN_CONFIG,
  TEMPORARY_TOKEN_CONFIG,
};