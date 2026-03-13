/**
 * =============================================================================
 * CONFIGURACIÓN DE JSON WEB TOKENS (JWT)
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Centralizar la configuración de tokens JWT para autenticación y autorización
 * - Definir parámetros de firma, expiración y validación de tokens
 * - Proveer utilidades para generar y verificar tokens personalizados
 * - Integrarse con Supabase Auth para tokens adicionales si son requeridos
 * 
 * Arquitectura:
 * - Capa: Configuración / Infraestructura
 * - Patrón: Configuration Object + Utility Functions
 * 
 * Librerías utilizadas:
 * - jsonwebtoken: Implementación de JWT para Node.js
 * 
 * @note Este módulo es COMPLEMENTARIO a Supabase Auth.
 *       Supabase maneja los tokens principales de autenticación.
 *       Este módulo se usa para tokens personalizados del backend si son necesarios.
 * 
 * @module config/jwt
 * @layer Infrastructure
 */

import jwt from 'jsonwebtoken';
import { env } from './env.js';

// =============================================================================
// CONFIGURACIÓN BASE DE JWT
// =============================================================================

/**
 * Configuración principal para la firma y verificación de tokens JWT
 * 
 * @constant {Object}
 */
export const jwtConfig = {
  /**
   * Secreto para firmar tokens (HMAC SHA256)
   * 
   * @note Debe tener al menos 32 caracteres para seguridad con HS256
   * @see env.JWT_SECRET - Validada en config/env.js
   */
  secret: env.JWT_SECRET,

  /**
   * Algoritmo de firma utilizado
   * 
   * Opciones comunes:
   * - 'HS256': HMAC con SHA-256 (simétrico, más simple)
   * - 'RS256': RSA con SHA-256 (asimétrico, más seguro para microservicios)
   * 
   * @note Para el MVP usamos HS256 por simplicidad
   */
  algorithm: 'HS256',

  /**
   * Tiempo de expiración por defecto para tokens
   * 
   * Formatos válidos (librería `ms`):
   * - '1h' = 1 hora
   * - '24h' = 24 horas
   * - '7d' = 7 días
   * - '30d' = 30 días
   * 
   * @see env.JWT_EXPIRES_IN - Configurada en variables de entorno
   */
  expiresIn: env.JWT_EXPIRES_IN,

  /**
   * Emisor del token (issuer)
   * 
   * Identifica quién generó el token para validación posterior
   */
  issuer: 'OSFLSystem',

  /**
   * Audiencia del token (audience)
   * 
   * Identifica para quién está destinado el token
   * Útil para prevenir uso de tokens en sistemas diferentes
   */
  audience: 'osfl-users',

  /**
   * Tipo de token
   * 
   * Convención estándar para identificar el tipo de JWT
   */
  tokenType: 'Bearer',
};

// =============================================================================
// FUNCIONES DE UTILIDAD PARA JWT
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * GENERAR TOKEN JWT
 * -----------------------------------------------------------------------------
 * 
 * Crea un token JWT firmado con la configuración definida.
 * 
 * @param {Object} payload - Datos a incluir en el token (claims)
 * @param {Object} [options] - Opciones adicionales para sobrescribir config por defecto
 * @param {string} [options.expiresIn] - Tiempo de expiración personalizado
 * @param {string} [options.issuer] - Emisor personalizado
 * @param {string} [options.audience] - Audiencia personalizada
 * 
 * @returns {string} Token JWT firmado
 * 
 * @throws {Error} Si hay error al firmar el token
 * 
 * @example
 * // Token básico de usuario
 * const token = generateToken({
 *   sub: user.id,
 *   email: user.email,
 *   role: user.role
 * });
 * 
 * @example
 * // Token con expiración personalizada
 * const refresh_token = generateToken(
 *   { sub: user.id, type: 'refresh' },
 *   { expiresIn: '7d' }
 * );
 */
export const generateToken = (payload, options = {}) => {
  try {
    const config = {
      algorithm: jwtConfig.algorithm,
      expiresIn: options.expiresIn || jwtConfig.expiresIn,
      issuer: options.issuer || jwtConfig.issuer,
      audience: options.audience || jwtConfig.audience,
      jwtid: options.jwtid, // ID único del token (opcional)
      subject: payload.sub, // Subject del payload (opcional)
    };

    return jwt.sign(payload, jwtConfig.secret, config);
  } catch (error) {
    throw new Error(`Error al generar token JWT: ${error.message}`);
  }
};

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR TOKEN JWT
 * -----------------------------------------------------------------------------
 * 
 * Valida y decodifica un token JWT.
 * 
 * @param {string} token - Token JWT a verificar
 * @param {Object} [options] - Opciones adicionales para la verificación
 * @param {boolean} [options.ignoreExpiration] - Si true, no valida expiración
 * @param {string} [options.issuer] - Emisor esperado (sobrescribe config)
 * @param {string} [options.audience] - Audiencia esperada (sobrescribe config)
 * 
 * @returns {Object} Payload decodificado del token
 * 
 * @throws {jwt.JsonWebTokenError} Si el token es inválido
 * @throws {jwt.TokenExpiredError} Si el token ha expirado
 * @throws {jwt.NotBeforeError} Si el token aún no es válido (nbf)
 * 
 * @example
 * try {
 *   const payload = verifyToken(token);
 *   console.log('Usuario ID:', payload.sub);
 * } catch (error) {
 *   if (error.name === 'TokenExpiredError') {
 *     console.log('Token expirado');
 *   }
 * }
 */
export const verifyToken = (token, options = {}) => {
  try {
    const config = {
      algorithms: [jwtConfig.algorithm],
      issuer: options.issuer || jwtConfig.issuer,
      audience: options.audience || jwtConfig.audience,
      ignoreExpiration: options.ignoreExpiration || false,
    };

    return jwt.verify(token, jwtConfig.secret, config);
  } catch (error) {
    // Re-lanzar errores de JWT para manejo específico en middleware
    if (error instanceof jwt.JsonWebTokenError) {
      throw error;
    }
    throw new Error(`Error al verificar token JWT: ${error.message}`);
  }
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
    return jwt.decode(token);
  } catch (error) {
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
 * Formato esperado: "Bearer <token>"
 * 
 * @param {string} authHeader - Valor del header Authorization
 * 
 * @returns {string|null} Token extraído o null si no está presente o tiene formato inválido
 * 
 * @example
 * // En un middleware de Express
 * const token = extractTokenFromHeader(req.headers.authorization);
 * if (!token) {
 *   return res.status(401).json({ error: 'Token requerido' });
 * }
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  // Formato esperado: "Bearer <token>"
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== jwtConfig.tokenType) {
    return null;
  }

  return parts[1];
};

/**
 * -----------------------------------------------------------------------------
 * GENERAR PAYLOAD BASE PARA USUARIO
 * -----------------------------------------------------------------------------
 * 
 * Crea un payload estándar para tokens de usuario con los claims mínimos requeridos.
 * 
 * @param {Object} user - Objeto de usuario con propiedades mínimas
 * @param {string} user.id - ID único del usuario (UUID)
 * @param {string} user.email - Email del usuario
 * @param {string} user.role - Rol del usuario
 * @param {Object} [metadata] - Datos adicionales opcionales para incluir en el token
 * 
 * @returns {Object} Payload listo para ser firmado como token JWT
 * 
 * @example
 * const payload = generateUserPayload({
 *   id: 'abc123',
 *   email: 'user@example.com',
 *   role: 'admin'
 * }, { organizationId: 'org456' });
 * 
 * // Resultado:
 * // {
 * //   sub: 'abc123',
 * //   email: 'user@example.com',
 * //   role: 'admin',
 * //   organizationId: 'org456',
 * //   iat: 1234567890
 * // }
 */
export const generateUserPayload = (user, metadata = {}) => {
  return {
    // Claims estándar de JWT
    sub: user.id,           // Subject: ID único del usuario
    email: user.email,      // Email del usuario
    role: user.role,        // Rol para autorización básica
    
    // Claims personalizados del dominio OSFL
    ...metadata,            // Datos adicionales (organizationId, permissions, etc.)
    
    // Claims automáticos (se agregan al firmar)
    // iat: issued at (timestamp)
    // exp: expiration (timestamp)
  };
};

// =============================================================================
// CLASES DE ERROR PERSONALIZADAS PARA JWT
// =============================================================================

/**
 * Error base para operaciones JWT
 * @extends Error
 */
export class JwtError extends Error {
  constructor(message, code = 'JWT_ERROR', details = null) {
    super(message);
    this.name = 'JwtError';
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * Error para tokens expirados
 */
export class TokenExpiredError extends JwtError {
  constructor(expiredAt) {
    super('El token ha expirado', 'TOKEN_EXPIRED', { expiredAt });
    this.name = 'TokenExpiredError';
  }
}

/**
 * Error para tokens inválidos
 */
export class InvalidTokenError extends JwtError {
  constructor(reason = 'Formato o firma inválida') {
    super('Token inválido', 'INVALID_TOKEN', { reason });
    this.name = 'InvalidTokenError';
  }
}

/**
 * Error para tokens faltantes
 */
export class MissingTokenError extends JwtError {
  constructor() {
    super('Token de autenticación no proporcionado', 'MISSING_TOKEN');
    this.name = 'MissingTokenError';
  }
}

// =============================================================================
// INTEGRACIÓN CON SUPABASE AUTH (OPCIONAL)
// =============================================================================

/**
 * Verificar si un token es compatible con Supabase Auth
 * 
 * Supabase usa JWT con claims específicos. Esta función ayuda
 * a identificar si un token proviene de Supabase para manejo diferenciado.
 * 
 * @param {Object} payload - Payload decodificado del token
 * @returns {boolean} True si el token tiene estructura de Supabase
 * 
 * @example
 * const payload = decodeToken(token);
 * if (isSupabaseToken(payload)) {
 *   // Manejar con lógica de Supabase
 * }
 */
export const isSupabaseToken = (payload) => {
  if (!payload) return false;
  
  // Supabase incluye estos claims en sus tokens
  return (
    payload.aud === 'authenticated' ||
    payload.role !== undefined ||
    payload['user_metadata'] !== undefined ||
    payload['app_metadata'] !== undefined
  );
};

/**
 * Extraer ID de usuario de un token de Supabase
 * 
 * @param {Object} payload - Payload de token de Supabase
 * @returns {string|null} ID del usuario o null si no está presente
 */
export const extractUserIdFromSupabaseToken = (payload) => {
  if (!payload || !isSupabaseToken(payload)) {
    return null;
  }
  
  // Supabase usa 'sub' para el ID del usuario en auth.users
  return payload.sub || null;
};

// =============================================================================
// LOG DE CONFIGURACIÓN (Solo en desarrollo)
// =============================================================================

if (env.NODE_ENV === 'development') {
  console.log('🔐 JWT configurado:');
  console.log(`   • Algoritmo: ${jwtConfig.algorithm}`);
  console.log(`   • Expiración: ${jwtConfig.expiresIn}`);
  console.log(`   • Emisor: ${jwtConfig.issuer}`);
  console.log(`   • Audiencia: ${jwtConfig.audience}`);
  console.log(`   • ⚠️  Secret: [OCULTO] (${jwtConfig.secret.length} caracteres)`);
}

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta la configuración base para uso directo
 */
export default jwtConfig;

/**
 * Exporta todas las utilidades para importación named
 */
export const jwtUtils = {
  generateToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
  generateUserPayload,
  isSupabaseToken,
  extractUserIdFromSupabaseToken,
};

/**
 * Exporta las clases de error para manejo específico
 */
export const jwtErrors = {
  JwtError,
  TokenExpiredError,
  InvalidTokenError,
  MissingTokenError,
};