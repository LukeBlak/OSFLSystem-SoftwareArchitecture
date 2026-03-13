/**
 * =============================================================================
 * SERVICIO DE AUTENTICACIÓN - CAPA DE APLICACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Implementar la lógica de negocio de los casos de uso de autenticación
 * - Coordinar entre controllers y repositories
 * - Integrar con Supabase Auth para gestión de usuarios y tokens
 * - Manejar flujo de restablecimiento de contraseña
 * - Gestionar sesiones y verificación de tokens
 * 
 * Arquitectura:
 * - Capa: Aplicación (Services)
 * - Patrón: Service Layer + Repository Pattern
 * - Integración: Supabase Auth (BaaS) + Supabase PostgreSQL
 * 
 * Casos de Uso que implementa:
 * - CU-03: Iniciar sesión multi-rol
 * - CU-04: Cerrar sesión
 * - Registro de usuario
 * - Reestablecer contraseña
 * - Verificar sesión activa
 * - Actualizar contraseña
 * 
 * @module services/auth.service
 * @layer Application
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { PasswordResetRepository } from '../repositories/PasswordResetRepository.js';
import {
  USER_ROLES,
  validateRegisterUser,
  validateLoginUser,
  validateChangePassword,
  formatUserForResponse,
} from '../models/User.js';
import {
  DEFAULT_TOKEN_EXPIRY_MS,
  TOKEN_BYTE_LENGTH,
  BCRYPT_SALT_ROUNDS,
  isTokenUsable,
} from '../models/PasswordReset.js';

import crypto from 'crypto';

// =============================================================================
// CONSTANTES Y CONFIGURACIÓN
// =============================================================================

/**
 * Roles válidos en el sistema según el Modelo de Dominio
 * @constant {Array<string>}
 */
const VALID_ROLES = Object.values(USER_ROLES);

/**
 * Tiempo de expiración para tokens de reset de contraseña (1 hora)
 * @constant {number}
 */
const RESET_TOKEN_EXPIRY_MS = DEFAULT_TOKEN_EXPIRY_MS;

/**
 * Número de rondas para el hashing de contraseñas y tokens
 * @constant {number}
 */
const SALT_ROUNDS = BCRYPT_SALT_ROUNDS;

/**
 * Longitud del token de reset en bytes
 * @constant {number}
 */
const TOKEN_LENGTH = TOKEN_BYTE_LENGTH;

// =============================================================================
// FUNCIONES DEL SERVICIO
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * REGISTRAR NUEVO USUARIO
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Registro de usuarios en el sistema
 * 
 * Nota: Con Supabase Auth, el registro real ocurre en el frontend.
 * Este método es para registro administrativo o casos especiales desde el backend.
 * 
 * @param {Object} userData - Datos del usuario
 * @param {string} userData.email - Email único
 * @param {string} userData.password - Contraseña en texto plano
 * @param {string} userData.role - Rol del usuario
 * @param {Object} [userData.profile] - Información adicional del perfil
 * @param {string} [userData.organizationId] - ID de la organización asociada
 * 
 * @returns {Promise<Object>} Usuario creado (sin contraseña)
 * 
 * @throws {ApiError} 400 - Rol inválido o datos inválidos
 * @throws {ApiError} 409 - Email ya registrado
 * 
 * @example
 * const user = await authService.register({
 *   email: 'usuario@ejemplo.com',
 *   password: 'Contraseña123',
 *   role: 'miembro',
 *   profile: { nombre: 'Juan', apellido: 'Pérez' }
 * });
 */
export const register = async ({ email, password, role, profile, organizationId }) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS DE ENTRADA
    // =========================================================================
    const validData = validateRegisterUser({
      email,
      password,
      role,
      profile,
      organizationId,
    });

    // =========================================================================
    // 2. VALIDAR QUE EL ROL SEA PERMITIDO
    // =========================================================================
    if (!VALID_ROLES.includes(role)) {
      throw ApiError.badRequest(
        `Rol '${role}' no válido. Roles permitidos: ${VALID_ROLES.join(', ')}`
      );
    }

    // =========================================================================
    // 3. VERIFICAR SI EL EMAIL YA EXISTE
    // =========================================================================
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw ApiError.conflict('El email ya está registrado');
    }

    // =========================================================================
    // 4. REGISTRAR USUARIO EN SUPABASE AUTH
    // =========================================================================
    /**
     * Usamos supabaseAdmin para registrar usuarios desde el backend
     * Esto permite bypass de ciertas restricciones de RLS
     */
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente para registro admin
      user_metadata: {
        role,
        organization_id: organizationId,
        profile: profile || {},
      },
    });

    if (authError || !authUser?.user) {
      logger.error('Error al crear usuario en Supabase Auth', {
        error: authError,
        email,
      });
      throw ApiError.internal(
        'Error al registrar usuario',
        { details: authError?.message }
      );
    }

    // =========================================================================
    // 5. CREAR REGISTRO EN TABLA PÚBLICA.USUARIO
    // =========================================================================
    /**
     * El trigger on_auth_user_created debería crear el registro automáticamente
     * Pero verificamos por si acaso
     */
    const userProfile = {
      id: authUser.user.id,
      email: authUser.user.email,
      role,
      profile: profile || {},
      organizationId: organizationId || null,
      isActive: true,
    };

    const { data: publicUser, error: publicError } = await UserRepository.create(userProfile);

    if (publicError) {
      logger.error('Error al crear perfil público de usuario', {
        error: publicError,
        userId: authUser.user.id,
      });
      
      // Intentar limpiar el usuario de auth si falla la tabla pública
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      
      throw ApiError.internal('Error al completar el registro del usuario');
    }

    // =========================================================================
    // 6. RETORNAR USUARIO SIN DATOS SENSIBLES
    // =========================================================================
    logger.info('Usuario registrado exitosamente', {
      userId: authUser.user.id,
      email: authUser.user.email,
      role,
    });

    return formatUserForResponse({
      ...publicUser,
      ...authUser.user,
    });

  } catch (error) {
    // Si ya es ApiError, propagarlo
    if (error instanceof ApiError) {
      throw error;
    }

    // Loggear error inesperado
    logger.error('Error inesperado en registro de usuario', {
      error: error.message,
      stack: error.stack,
      email,
    });

    throw ApiError.internal('Error al registrar usuario');
  }
};

/**
 * -----------------------------------------------------------------------------
 * INICIAR SESIÓN (CU-03)
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Autenticación multi-rol
 * 
 * Nota: Con Supabase Auth, el login principal ocurre en el frontend.
 * Este método es para validar credenciales en backend si es necesario.
 * 
 * @param {Object} credentials - Credenciales del usuario
 * @param {string} credentials.email - Email del usuario
 * @param {string} credentials.password - Contraseña en texto plano
 * 
 * @returns {Promise<{user: Object, token: string}>} Usuario y token JWT
 * 
 * @throws {ApiError} 401 - Credenciales inválidas
 * @throws {ApiError} 403 - Cuenta desactivada
 * 
 * @example
 * const { user, token } = await authService.login({
 *   email: 'usuario@ejemplo.com',
 *   password: 'Contraseña123'
 * });
 */
export const login = async ({ email, password }) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS DE ENTRADA
    // =========================================================================
    validateLoginUser({ email, password });

    // =========================================================================
    // 2. AUTENTICAR CON SUPABASE AUTH
    // =========================================================================
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.user) {
      // No revelar si el email existe o no por seguridad
      logger.warn('Intento de login fallido', {
        email,
        error: authError?.message,
      });
      throw ApiError.unauthorized('Credenciales inválidas');
    }

    const authUser = authData.user;
    const session = authData.session;

    // =========================================================================
    // 3. VERIFICAR ESTADO DE LA CUENTA
    // =========================================================================
    const publicUser = await UserRepository.findById(authUser.id);

    if (!publicUser) {
      logger.warn('Usuario autenticado pero sin perfil público', {
        userId: authUser.id,
        email: authUser.email,
      });
      throw ApiError.forbidden('Perfil de usuario no encontrado');
    }

    if (!publicUser.isActive) {
      logger.warn('Intento de login de cuenta desactivada', {
        userId: authUser.id,
        email: authUser.email,
      });
      throw ApiError.forbidden('Tu cuenta ha sido desactivada. Contacta al administrador');
    }

    // =========================================================================
    // 4. OBTENER TOKEN DE SESIÓN
    // =========================================================================
    /**
     * Supabase Auth ya genera un token JWT válido
     * Lo usamos directamente en lugar de crear uno personalizado
     */
    const token = session?.access_token;

    if (!token) {
      throw ApiError.internal('Error al generar token de sesión');
    }

    // =========================================================================
    // 5. ACTUALIZAR ÚLTIMO ACCESO
    // =========================================================================
    await UserRepository.updateLastSignIn(authUser.id);

    // =========================================================================
    // 6. RETORNAR USUARIO Y TOKEN
    // =========================================================================
    logger.info('Login exitoso', {
      userId: authUser.id,
      email: authUser.email,
      role: authUser.user_metadata?.role || publicUser.role,
    });

    return {
      user: formatUserForResponse({
        ...publicUser,
        ...authUser,
      }),
      token,
      refreshToken: session?.refresh_token,
      expiresIn: session?.expires_in || 3600,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en login', {
      error: error.message,
      email,
    });

    throw ApiError.internal('Error al iniciar sesión');
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
 * @returns {Object} Payload del token decodificado
 * 
 * @throws {ApiError} 401 - Token inválido o expirado
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET, {
      issuer: 'OSFLSystem',
      audience: 'osfl-users',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('El token ha expirado. Por favor inicia sesión nuevamente');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Token inválido');
    }
    throw ApiError.unauthorized('Error de autenticación');
  }
};

/**
 * -----------------------------------------------------------------------------
 * SOLICITAR REESTABLECIMIENTO DE CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Genera un token seguro para reestablecer contraseña y lo guarda en BD.
 * Envía email con link de reset.
 * 
 * @param {string} email - Email del usuario que solicita el reset
 * @returns {Promise<{resetToken: string|null, user: Object|null}>} Token y usuario (si existe)
 * 
 * @throws {ApiError} 500 - Error al generar o guardar token
 */
export const forgottenPassword = async (email) => {
  try {
    // =========================================================================
    // 1. BUSCAR USUARIO (SIN REVELAR SI EXISTE O NO)
    // =========================================================================
    const user = await UserRepository.findByEmail(email);

    // Si no existe, retornar sin error para no revelar información
    if (!user) {
      logger.info('Solicitud de reset para email no registrado', {
        email,
      });
      return { resetToken: null, user: null };
    }

    // =========================================================================
    // 2. VERIFICAR SI YA HAY UN TOKEN ACTIVO RECIENTE
    // =========================================================================
    const existingReset = await PasswordResetRepository.findActiveByUserId(user.id);
    
    if (existingReset && isTokenUsable(existingReset)) {
      // Token aún válido, no crear otro inmediatamente
      logger.info('Token de reset ya existente para usuario', {
        userId: user.id,
        email: user.email,
      });
    }

    // =========================================================================
    // 3. GENERAR TOKEN CRIPTOGRÁFICAMENTE SEGURO
    // =========================================================================
    const resetToken = crypto.randomBytes(TOKEN_LENGTH).toString('hex');

    // =========================================================================
    // 4. HASHEAR EL TOKEN ANTES DE GUARDARLO EN BD
    // =========================================================================
    const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);

    // =========================================================================
    // 5. CREAR/ACTUALIZAR REGISTRO DE RESET
    // =========================================================================
    const resetData = {
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS).toISOString(),
      used: false,
    };

    const { error: upsertError } = await PasswordResetRepository.upsert(resetData);

    if (upsertError) {
      logger.error('Error al guardar token de reset', {
        error: upsertError,
        userId: user.id,
      });
      throw ApiError.internal('Error al generar token de recuperación');
    }

    // =========================================================================
    // 6. RETORNAR TOKEN EN TEXTO PLANO (PARA ENVIAR POR EMAIL)
    // =========================================================================
    logger.info('Token de reset generado exitosamente', {
      userId: user.id,
      email: user.email,
      expiresAt: resetData.expiresAt,
    });

    return {
      resetToken,
      user: formatUserForResponse(user),
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en forgottenPassword', {
      error: error.message,
      email,
    });

    // Retornar sin error para no revelar información
    return { resetToken: null, user: null };
  }
};

/**
 * -----------------------------------------------------------------------------
 * REESTABLECER CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Valida el token de reset y actualiza la contraseña del usuario.
 * 
 * @param {string} resetToken - Token recibido por email
 * @param {string} newPassword - Nueva contraseña en texto plano
 * @returns {Promise<Object>} Usuario actualizado
 * 
 * @throws {ApiError} 400 - Token inválido, expirado o ya usado
 * @throws {ApiError} 404 - Usuario no encontrado
 */
export const resetPassword = async (resetToken, newPassword) => {
  try {
    // =========================================================================
    // 1. VALIDAR NUEVA CONTRASEÑA
    // =========================================================================
    if (!newPassword || newPassword.length < 8) {
      throw ApiError.badRequest('La contraseña debe tener al menos 8 caracteres');
    }

    // =========================================================================
    // 2. BUSCAR REGISTRO DE RESET VÁLIDO
    // =========================================================================
    /**
     * Buscamos todos los registros no usados y no expirados
     * Luego verificamos el token uno por uno (porque está hasheado)
     */
    const { resetRecord, error: findError } = await PasswordResetRepository.findValid(resetToken);

    if (findError || !resetRecord) {
      logger.warn('Intento de reset con token inválido o expirado', {
        tokenLength: resetToken?.length,
      });
      throw ApiError.badRequest('Token inválido o expirado');
    }

    // =========================================================================
    // 3. VERIFICAR QUE EL TOKEN COINCIDA (COMPARAR CON HASH)
    // =========================================================================
    const isTokenValid = await bcrypt.compare(resetToken, resetRecord.token);
    if (!isTokenValid) {
      logger.warn('Token de reset no coincide con hash almacenado', {
        resetId: resetRecord.id,
      });
      throw ApiError.badRequest('Token inválido');
    }

    // =========================================================================
    // 4. OBTENER USUARIO ASOCIADO
    // =========================================================================
    const user = await UserRepository.findById(resetRecord.userId);

    if (!user) {
      logger.error('Usuario no encontrado para token de reset', {
        userId: resetRecord.userId,
        resetId: resetRecord.id,
      });
      throw ApiError.notFound('Usuario no encontrado');
    }

    // =========================================================================
    // 5. ACTUALIZAR CONTRASEÑA EN SUPABASE AUTH
    // =========================================================================
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateAuthError) {
      logger.error('Error al actualizar contraseña en Supabase Auth', {
        error: updateAuthError,
        userId: user.id,
      });
      throw ApiError.internal('Error al actualizar contraseña');
    }

    // =========================================================================
    // 6. MARCAR TOKEN COMO USADO
    // =========================================================================
    await PasswordResetRepository.markAsUsed(resetRecord.id);

    // =========================================================================
    // 7. INVALIDAR OTRAS SESIONES ACTIVAS (OPCIONAL PERO RECOMENDADO)
    // =========================================================================
    // Esto fuerza al usuario a iniciar sesión nuevamente con la nueva contraseña
    await supabaseAdmin.auth.admin.signOut(user.id);

    // =========================================================================
    // 8. RETORNAR USUARIO SIN DATOS SENSIBLES
    // =========================================================================
    logger.info('Contraseña reestablecida exitosamente', {
      userId: user.id,
      email: user.email,
    });

    return formatUserForResponse(user);

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en resetPassword', {
      error: error.message,
    });

    throw ApiError.internal('Error al reestablecer contraseña');
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR CONTRASEÑA (USUARIO AUTENTICADO)
 * -----------------------------------------------------------------------------
 * 
 * Permite cambiar la contraseña validando la actual.
 * 
 * @param {string} userId - ID del usuario autenticado
 * @param {string} currentPassword - Contraseña actual en texto plano
 * @param {string} newPassword - Nueva contraseña en texto plano
 * @returns {Promise<Object>} Usuario actualizado
 * 
 * @throws {ApiError} 401 - Contraseña actual incorrecta
 * @throws {ApiError} 400 - Nueva contraseña inválida
 */
export const updatedPassword = async (userId, currentPassword, newPassword) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS DE ENTRADA
    // =========================================================================
    validateChangePassword({
      currentPassword,
      newPassword,
      newPasswordConfirm: newPassword,
    });

    // =========================================================================
    // 2. OBTENER USUARIO CON CONTRASEÑA PARA VALIDACIÓN
    // =========================================================================
    /**
     * Nota: Con Supabase Auth, no podemos obtener la contraseña hasheada
     * directamente. En su lugar, intentamos autenticar con las credenciales actuales.
     */
    
    // =========================================================================
    // 3. VERIFICAR CONTRASEÑA ACTUAL
    // =========================================================================
    /**
     * Estrategia: Intentar iniciar sesión con email y contraseña actual
     * Si falla, la contraseña actual es incorrecta
     */
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('Usuario no encontrado');
    }

    // Intentar autenticar con credenciales actuales
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      logger.warn('Intento de cambio de contraseña con contraseña actual incorrecta', {
        userId,
        email: user.email,
      });
      throw ApiError.unauthorized('La contraseña actual es incorrecta');
    }

    // =========================================================================
    // 4. ACTUALIZAR CONTRASEÑA EN SUPABASE AUTH
    // =========================================================================
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      logger.error('Error al actualizar contraseña', {
        error: updateError,
        userId,
      });
      throw ApiError.internal('Error al actualizar contraseña');
    }

    // =========================================================================
    // 5. REGISTRAR EL CAMBIO
    // =========================================================================
    await UserRepository.updatePasswordChangedAt(userId);

    // =========================================================================
    // 6. RETORNAR USUARIO SIN DATOS SENSIBLES
    // =========================================================================
    logger.info('Contraseña actualizada exitosamente', {
      userId,
      email: user.email,
    });

    return formatUserForResponse(user);

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en updatedPassword', {
      error: error.message,
      userId,
    });

    throw ApiError.internal('Error al actualizar contraseña');
  }
};

/**
 * -----------------------------------------------------------------------------
 * CERRAR SESIÓN (CU-04)
 * -----------------------------------------------------------------------------
 * 
 * Invalida el token actual y limpia la sesión.
 * 
 * @param {string} token - Token JWT actual
 * @returns {Promise<Object>} Resultado del logout
 * 
 * @throws {ApiError} 500 - Error al cerrar sesión
 */
export const logout = async (token) => {
  try {
    // =========================================================================
    // 1. OBTENER ID DEL USUARIO DEL TOKEN
    // =========================================================================
    let userId = null;
    
    if (token) {
      try {
        const decoded = jwt.decode(token);
        userId = decoded?.sub;
      } catch (error) {
        logger.warn('Token inválido en logout', {
          error: error.message,
        });
      }
    }

    // =========================================================================
    // 2. CERRAR SESIÓN EN SUPABASE AUTH
    // =========================================================================
    if (userId) {
      await supabaseAdmin.auth.admin.signOut(userId);
      
      logger.info('Logout exitoso', {
        userId,
      });
    }

    // =========================================================================
    // 3. RETORNAR RESULTADO
    // =========================================================================
    return {
      success: true,
      message: 'Sesión cerrada exitosamente',
    };

  } catch (error) {
    logger.error('Error en logout', {
      error: error.message,
    });

    // No lanzar error, el logout siempre "éxito" aunque falle la invalidación
    return {
      success: true,
      message: 'Sesión cerrada (algunos tokens pueden permanecer activos)',
    };
  }
};

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR EMAIL DE USUARIO
 * -----------------------------------------------------------------------------
 * 
 * Verifica el email de un usuario con un token de verificación.
 * 
 * @param {string} token - Token de verificación de email
 * @returns {Promise<Object>} Resultado de la verificación
 * 
 * @throws {ApiError} 400 - Token inválido o expirado
 */
export const verifyEmail = async (token) => {
  try {
    // =========================================================================
    // 1. VERIFICAR TOKEN CON SUPABASE AUTH
    // =========================================================================
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    if (error || !data?.user) {
      throw ApiError.badRequest('Token de verificación inválido o expirado');
    }

    // =========================================================================
    // 2. ACTUALIZAR ESTADO EN TABLA PÚBLICA
    // =========================================================================
    await UserRepository.updateEmailVerified(data.user.id, true);

    // =========================================================================
    // 3. RETORNAR RESULTADO
    // =========================================================================
    logger.info('Email verificado exitosamente', {
      userId: data.user.id,
      email: data.user.email,
    });

    return {
      success: true,
      message: 'Email verificado exitosamente',
      user: formatUserForResponse(data.user),
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en verifyEmail', {
      error: error.message,
    });

    throw ApiError.badRequest('Error al verificar email');
  }
};

/**
 * -----------------------------------------------------------------------------
 * REENVIAR VERIFICACIÓN DE EMAIL
 * -----------------------------------------------------------------------------
 * 
 * Reenvía el email de verificación a un usuario.
 * 
 * @param {string} email - Email del usuario
 * @returns {Promise<Object>} Resultado del reenvío
 * 
 * @throws {ApiError} 404 - Usuario no encontrado
 * @throws {ApiError} 500 - Error al enviar email
 */
export const resendEmailVerification = async (email) => {
  try {
    // =========================================================================
    // 1. BUSCAR USUARIO
    // =========================================================================
    const user = await UserRepository.findByEmail(email);

    if (!user) {
      // No revelar si el email existe o no
      return {
        success: true,
        message: 'Si el email está registrado, recibirás un nuevo email de verificación',
      };
    }

    // =========================================================================
    // 2. VERIFICAR SI YA ESTÁ VERIFICADO
    // =========================================================================
    if (user.emailVerified) {
      return {
        success: true,
        message: 'El email ya está verificado',
      };
    }

    // =========================================================================
    // 3. REENVIAR EMAIL DE VERIFICACIÓN
    // =========================================================================
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      logger.error('Error al reenviar email de verificación', {
        error: error.message,
        email,
      });
      throw ApiError.internal('Error al enviar email de verificación');
    }

    // =========================================================================
    // 4. RETORNAR RESULTADO
    // =========================================================================
    logger.info('Email de verificación reenviado', {
      email,
    });

    return {
      success: true,
      message: 'Email de verificación reenviado',
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en resendEmailVerification', {
      error: error.message,
      email,
    });

    throw ApiError.internal('Error al reenviar email de verificación');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER USUARIO POR ID
 * -----------------------------------------------------------------------------
 * 
 * Recupera datos de un usuario por su ID.
 * 
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Datos del usuario sin información sensible
 * 
 * @throws {ApiError} 404 - Usuario no encontrado
 */
export const getUserById = async (userId) => {
  const user = await UserRepository.findById(userId);

  if (!user) {
    throw ApiError.notFound('Usuario no encontrado');
  }

  return formatUserForResponse(user);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR ROL DE USUARIO
 * -----------------------------------------------------------------------------
 * 
 * Verifica si un usuario tiene uno de los roles permitidos.
 * 
 * @param {Object} user - Objeto de usuario
 * @param {Array<string>} allowedRoles - Roles permitidos
 * @returns {boolean} True si el usuario tiene un rol permitido
 */
export const hasRole = (user, allowedRoles) => {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR MÚLTIPLES ROLES
 * -----------------------------------------------------------------------------
 * 
 * Verifica si un usuario tiene al menos uno de los roles especificados.
 * 
 * @param {Object} user - Objeto de usuario
 * @param {Array<string>} roles - Array de roles a verificar
 * @returns {boolean} True si el usuario tiene alguno de los roles
 */
export const hasAnyRole = (user, roles) => {
  return hasRole(user, roles);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR JERARQUÍA DE ROLES
 * -----------------------------------------------------------------------------
 * 
 * Verifica si un usuario tiene al menos un nivel de jerarquía.
 * 
 * @param {Object} user - Objeto de usuario
 * @param {string} minRole - Rol mínimo requerido
 * @returns {boolean} True si el usuario tiene el nivel mínimo
 */
export const hasMinRoleLevel = (user, minRole) => {
  if (!user || !user.role) return false;

  const roleHierarchy = {
    [USER_ROLES.MIEMBRO]: 1,
    [USER_ROLES.LIDER_COMITE]: 2,
    [USER_ROLES.LIDER_ORGANIZACION]: 3,
    [USER_ROLES.ADMIN]: 4,
    [USER_ROLES.SUPER_ADMIN]: 5,
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const minLevel = roleHierarchy[minRole] || 0;

  return userLevel >= minLevel;
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Objeto con todas las funciones del servicio
 * para facilitar la importación en controllers
 */
export default {
  register,
  login,
  logout,
  verifyToken,
  forgottenPassword,
  resetPassword,
  updatedPassword,
  verifyEmail,
  resendEmailVerification,
  getUserById,
  hasRole,
  hasAnyRole,
  hasMinRoleLevel,
};