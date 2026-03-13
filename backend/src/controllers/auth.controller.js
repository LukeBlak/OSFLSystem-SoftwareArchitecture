/**
 * =============================================================================
 * CONTROLADOR DE AUTENTICACIÓN - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Manejar todas las peticiones HTTP relacionadas con autenticación
 * - Coordinar con Supabase Auth para operaciones de login/register
 * - Verificar tokens JWT y gestionar sesiones de usuario
 * - Formatear respuestas estandarizadas para el cliente
 * 
 * Arquitectura:
 * - Capa: Presentación (Controladores)
 * - Patrón: MVC Controller
 * - Integración: Supabase Auth (BaaS)
 * 
 * Casos de Uso que implementa:
 * - CU-03: Iniciar sesión multi-rol
 * - CU-04: Cerrar sesión
 * - Reestablecer contraseña
 * - Verificar sesión activa
 * 
 * @module controllers/auth.controller
 * @layer Presentation
 */

import { StatusCodes } from 'http-status-codes';
import { authService } from '../services/auth.service.js';
import { emailService } from '../services/email.service.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

// =============================================================================
// FUNCIONES DEL CONTROLADOR
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * REGISTRAR USUARIO
 * -----------------------------------------------------------------------------
 * 
 * Permite el registro de nuevos usuarios en el sistema.
 * 
 * ⚠️  NOTA: Con Supabase Auth, el registro real ocurre en el frontend
 *           Este endpoint es para registro administrativo o casos especiales
 * 
 * @route POST /api/auth/register
 * @access Público (o Admin según configuración)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.body - Datos del usuario a registrar
 * @param {string} req.body.email - Email del usuario (único)
 * @param {string} req.body.password - Contraseña del usuario (mínimo 8 caracteres)
 * @param {string} req.body.role - Rol del usuario (admin, organizacion, comite, miembro)
 * @param {Object} [req.body.profile] - Información adicional del perfil
 * @param {string} [req.body.profile.nombre] - Nombre del usuario
 * @param {string} [req.body.profile.apellido] - Apellido del usuario
 * @param {string} [req.body.profile.telefono] - Teléfono de contacto
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta con datos del usuario creado (sin contraseña)
 * 
 * @throws {ApiError} 400 - Si los datos son inválidos o faltan campos requeridos
 * @throws {ApiError} 409 - Si el email ya está registrado
 * @throws {ApiError} 500 - Si hay error en el servicio de registro
 * 
 * @example
 * // Request
 * POST /api/auth/register
 * {
 *   "email": "usuario@ejemplo.com",
 *   "password": "contraseña123",
 *   "role": "miembro",
 *   "profile": {
 *     "nombre": "Juan",
 *     "apellido": "Pérez"
 *   }
 * }
 * 
 * @example
 * // Response (201 Created)
 * {
 *   "success": true,
 *   "data": {
 *     "user": {
 *       "id": "uuid-del-usuario",
 *       "email": "usuario@ejemplo.com",
 *       "role": "miembro",
 *       "profile": { "nombre": "Juan", "apellido": "Pérez" },
 *       "isActive": true
 *     }
 *   },
 *   "message": "Usuario registrado exitosamente"
 * }
 */
export const register = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER DATOS DEL BODY
    // =========================================================================
    const { email, password, role, profile } = req.body;

    // =========================================================================
    // 2. LLAMAR AL SERVICIO DE REGISTRO
    // =========================================================================
    // El servicio se encarga de:
    // - Validar datos con Zod
    // - Verificar unicidad de email
    // - Registrar en Supabase Auth
    // - Crear perfil en tabla pública.usuario
    const user = await authService.register({
      email,
      password,
      role,
      profile,
    });

    // =========================================================================
    // 3. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.CREATED).json(
      new ApiResponse(
        StatusCodes.CREATED,
        {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            profile: user.profile,
            isActive: user.isActive,
            createdAt: user.createdAt,
          },
        },
        'Usuario registrado exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * INICIAR SESIÓN (CU-03)
 * -----------------------------------------------------------------------------
 * 
 * Autentica un usuario y devuelve un token JWT para acceso a la API.
 * Soporta múltiples roles según el modelo de dominio.
 * 
 * ⚠️  NOTA: Con Supabase Auth, el login principal ocurre en el frontend
 *           Este endpoint es para validar credenciales en backend si es necesario
 * 
 * @route POST /api/auth/login
 * @access Público
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.body - Credenciales del usuario
 * @param {string} req.body.email - Email del usuario
 * @param {string} req.body.password - Contraseña del usuario
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta con token JWT y datos del usuario
 * 
 * @throws {ApiError} 400 - Si faltan credenciales
 * @throws {ApiError} 401 - Si las credenciales son inválidas
 * @throws {ApiError} 403 - Si la cuenta está desactivada
 * 
 * @example
 * // Request
 * POST /api/auth/login
 * {
 *   "email": "usuario@ejemplo.com",
 *   "password": "contraseña123"
 * }
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "user": {
 *       "id": "uuid-del-usuario",
 *       "email": "usuario@ejemplo.com",
 *       "role": "miembro",
 *       "profile": { "nombre": "Juan" },
 *       "organizationId": "uuid-organizacion"
 *     },
 *     "expiresIn": "1h"
 *   },
 *   "message": "Inicio de sesión exitoso"
 * }
 */
export const login = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER CREDENCIALES DEL BODY
    // =========================================================================
    const { email, password } = req.body;

    // =========================================================================
    // 2. VALIDAR QUE SE PROPORCIONARON CREDENCIALES
    // =========================================================================
    if (!email || !password) {
      throw ApiError.badRequest('Email y contraseña son requeridos');
    }

    // =========================================================================
    // 3. LLAMAR AL SERVICIO DE LOGIN
    // =========================================================================
    // El servicio se encarga de:
    // - Buscar usuario en Supabase
    // - Verificar contraseña hasheada
    // - Validar estado de la cuenta
    // - Generar token JWT
    const { user, token } = await authService.login({ email, password });

    // =========================================================================
    // 4. CONFIGURAR OPCIONES DE LA COOKIE (OPCIONAL)
    // =========================================================================
    // Si se desea usar cookies para el token en lugar de enviarlo en el body
    const cookieOptions = {
      httpOnly: true, // Previene acceso desde JavaScript (XSS)
      secure: env.NODE_ENV === 'production', // Solo HTTPS en producción
      sameSite: 'strict', // Previene CSRF
      maxAge: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
    };

    // Enviar token en cookie (opcional, también se puede enviar solo en el body)
    res.cookie('token', token, cookieOptions);

    // =========================================================================
    // 5. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            profile: user.profile,
            organizationId: user.organizationId,
          },
          expiresIn: env.JWT_EXPIRES_IN,
        },
        'Inicio de sesión exitoso'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * CERRAR SESIÓN (CU-04)
 * -----------------------------------------------------------------------------
 * 
 * Invalida el token actual y limpia la cookie de autenticación.
 * 
 * @route POST /api/auth/logout
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.user - Datos del usuario autenticado (inyectado por middleware)
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta de confirmación
 * 
 * @example
 * // Request
 * POST /api/auth/logout
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Sesión cerrada exitosamente"
 * }
 */
export const logout = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. LIMPIAR LA COOKIE DEL TOKEN
    // =========================================================================
    res.clearCookie('token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    // =========================================================================
    // 2. OPCIONAL: INVALIDAR TOKEN EN BACKEND
    // =========================================================================
    // En una implementación más avanzada, aquí se podría:
    // 1. Agregar el token a una lista negra (blacklist) en Redis/BD
    // 2. Invalidar el token en Supabase Auth
    // 3. Registrar el logout en logs de auditoría
    // 
    // Para el MVP, con limpiar la cookie es suficiente
    // =========================================================================

    // =========================================================================
    // 3. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {},
        'Sesión cerrada exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * SOLICITAR REESTABLECIMIENTO DE CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Envía un email con un token seguro para reestablecer la contraseña.
 * 
 * @route POST /api/auth/forgotten-password
 * @access Público
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.body - Email del usuario
 * @param {string} req.body.email - Email del usuario registrado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta de confirmación (sin revelar si el email existe)
 * 
 * @throws {ApiError} 400 - Si el email no es válido o no se proporciona
 * 
 * @security No revela si el email existe para prevenir enumeración de usuarios
 * 
 * @example
 * // Request
 * POST /api/auth/forgotten-password
 * {
 *   "email": "usuario@ejemplo.com"
 * }
 * 
 * @example
 * // Response (200 OK) - Mismo response exista o no el usuario
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Si el email está registrado, recibirás instrucciones para reestablecer tu contraseña"
 * }
 */
export const forgottenPassword = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER EMAIL DEL BODY
    // =========================================================================
    const { email } = req.body;

    // =========================================================================
    // 2. VALIDAR QUE SE PROPORCIONÓ EMAIL
    // =========================================================================
    if (!email) {
      throw ApiError.badRequest('Email es requerido');
    }

    // =========================================================================
    // 3. LLAMAR AL SERVICIO PARA GENERAR TOKEN DE RESET
    // =========================================================================
    // El servicio se encarga de:
    // - Buscar usuario por email
    // - Generar token criptográficamente seguro
    // - Guardar token hasheado en BD con expiración
    const { resetToken, user } = await authService.forgottenPassword(email);

    // =========================================================================
    // 4. ENVIAR EMAIL CON LINK DE RESET (SOLO SI EL USUARIO EXISTE)
    // =========================================================================
    if (user) {
      // Construir URL de reset (frontend URL + token)
      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      // Enviar email con el link de reset
      await emailService.sendPasswordResetEmail({
        to: user.email,
        subject: 'Reestablecimiento de Contraseña - OSFLSystem',
        resetUrl,
        userName: user.profile?.nombre || user.email,
      });
    }

    // =========================================================================
    // 5. RETORNAR RESPUESTA EXITOSA (MISMA RESPUESTA EXISTA O NO EL USUARIO)
    // =========================================================================
    // Esto previene que atacantes enumeren emails registrados
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {},
        'Si el email está registrado, recibirás instrucciones para reestablecer tu contraseña'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * REESTABLECER CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Valida el token de reset y actualiza la contraseña del usuario.
 * 
 * @route POST /api/auth/reset-password
 * @access Público (con token válido)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.body - Datos para reset
 * @param {string} req.body.token - Token de reestablecimiento (del email)
 * @param {string} req.body.password - Nueva contraseña
 * @param {string} req.body.passwordConfirm - Confirmación de nueva contraseña
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta de confirmación
 * 
 * @throws {ApiError} 400 - Si el token es inválido, expiró o ya fue usado
 * @throws {ApiError} 400 - Si las contraseñas no coinciden
 * 
 * @example
 * // Request
 * POST /api/auth/reset-password
 * {
 *   "token": "token-del-email",
 *   "password": "nuevaContraseña123",
 *   "passwordConfirm": "nuevaContraseña123"
 * }
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Contraseña reestablecida exitosamente. Ahora puedes iniciar sesión."
 * }
 */
export const resetPassword = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER DATOS DEL BODY
    // =========================================================================
    const { token, password, passwordConfirm } = req.body;

    // =========================================================================
    // 2. VALIDAR QUE SE PROPORCIONARON TODOS LOS DATOS
    // =========================================================================
    if (!token || !password || !passwordConfirm) {
      throw ApiError.badRequest('Token, contraseña y confirmación son requeridos');
    }

    // =========================================================================
    // 3. VALIDAR QUE LAS CONTRASEÑAS COINCIDAN
    // =========================================================================
    if (password !== passwordConfirm) {
      throw ApiError.badRequest('Las contraseñas no coinciden');
    }

    // =========================================================================
    // 4. LLAMAR AL SERVICIO PARA RESETEAR CONTRASEÑA
    // =========================================================================
    // El servicio se encarga de:
    // - Validar token (no expirado, no usado)
    // - Hashear nueva contraseña
    // - Actualizar en Supabase Auth
    // - Marcar token como usado
    await authService.resetPassword(token, password);

    // =========================================================================
    // 5. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {},
        'Contraseña reestablecida exitosamente. Ahora puedes iniciar sesión.'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR TOKEN / OBTENER PERFIL ACTUAL (GET ME)
 * -----------------------------------------------------------------------------
 * 
 * Verifica si el token JWT actual es válido y devuelve los datos del usuario.
 * Útil para validar sesión al recargar la página en el frontend.
 * 
 * @route GET /api/auth/me
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.user - Datos del usuario autenticado (inyectado por middleware)
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Datos del usuario autenticado
 * 
 * @example
 * // Request
 * GET /api/auth/me
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "user": {
 *       "id": "uuid-del-usuario",
 *       "email": "usuario@ejemplo.com",
 *       "role": "miembro",
 *       "profile": { "nombre": "Juan", "apellido": "Pérez" },
 *       "organizationId": "uuid-organizacion",
 *       "isActive": true,
 *       "createdAt": "2026-02-03T10:00:00.000Z"
 *     }
 *   },
 *   "message": "Usuario autenticado"
 * }
 */
export const getMe = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EL USUARIO YA FUE VALIDADO POR EL MIDDLEWARE DE AUTENTICACIÓN
    // =========================================================================
    // El middleware auth.middleware.js ya verificó el token y adjuntó
    // los datos del usuario en req.user
    const user = req.user;

    // =========================================================================
    // 2. RETORNAR DATOS DEL USUARIO
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            profile: user.profile,
            organizationId: user.organizationId,
            isActive: user.isActive,
            createdAt: user.createdAt,
          },
        },
        'Usuario autenticado'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR CONTRASEÑA (PARA USUARIOS AUTENTICADOS)
 * -----------------------------------------------------------------------------
 * 
 * Permite a un usuario autenticado cambiar su contraseña.
 * Requiere conocer la contraseña actual por seguridad.
 * 
 * @route PUT /api/auth/update-password
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.user - Datos del usuario autenticado
 * @param {Object} req.body - Datos para actualización
 * @param {string} req.body.currentPassword - Contraseña actual
 * @param {string} req.body.newPassword - Nueva contraseña
 * @param {string} req.body.newPasswordConfirm - Confirmación de nueva contraseña
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta de confirmación
 * 
 * @throws {ApiError} 401 - Si la contraseña actual es incorrecta
 * 
 * @example
 * // Request
 * PUT /api/auth/update-password
 * Authorization: Bearer <token>
 * {
 *   "currentPassword": "contraseñaActual123",
 *   "newPassword": "nuevaContraseña456",
 *   "newPasswordConfirm": "nuevaContraseña456"
 * }
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Contraseña actualizada exitosamente"
 * }
 */
export const updatedPassword = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. OBTENER ID DEL USUARIO AUTENTICADO
    // =========================================================================
    const userId = req.user.id;

    // =========================================================================
    // 2. EXTRAER DATOS DEL BODY
    // =========================================================================
    const { currentPassword, newPassword, newPasswordConfirm } = req.body;

    // =========================================================================
    // 3. VALIDAR QUE SE PROPORCIONARON TODOS LOS DATOS
    // =========================================================================
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      throw ApiError.badRequest('Contraseña actual, nueva contraseña y confirmación son requeridos');
    }

    // =========================================================================
    // 4. VALIDAR QUE LAS NUEVAS CONTRASEÑAS COINCIDAN
    // =========================================================================
    if (newPassword !== newPasswordConfirm) {
      throw ApiError.badRequest('Las nuevas contraseñas no coinciden');
    }

    // =========================================================================
    // 5. LLAMAR AL SERVICIO PARA ACTUALIZAR CONTRASEÑA
    // =========================================================================
    // El servicio se encarga de:
    // - Validar contraseña actual
    // - Hashear nueva contraseña
    // - Actualizar en Supabase Auth
    await authService.updatedPassword(userId, currentPassword, newPassword);

    // =========================================================================
    // 6. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {},
        'Contraseña actualizada exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Objeto con todas las funciones del controlador
 * para facilitar la importación en las rutas
 * 
 * @example
 * // En auth.routes.js
 * import authController from '../controllers/auth.controller.js';
 * 
 * router.post('/login', authController.login);
 * router.post('/logout', authController.logout);
 */
export default {
  register,
  login,
  logout,
  forgottenPassword,
  resetPassword,
  getMe,
  updatedPassword,
};