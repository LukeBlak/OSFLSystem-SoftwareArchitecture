/**
 * =============================================================================
 * RUTAS DE AUTENTICACIÓN - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir todos los endpoints relacionados con autenticación y autorización
 * - Conectar controllers con middleware de validación y autenticación
 * - Implementar los casos de uso de autenticación del MVP
 * - Centralizar la configuración de rutas de auth en un solo módulo
 * 
 * Arquitectura:
 * - Capa: Presentación (Rutas/Endpoints)
 * - Patrón: Router Module
 * - Integración: Express Router + Middleware Chain
 * 
 * Casos de Uso que implementa:
 * - CU-03: Iniciar sesión multi-rol
 * - CU-04: Cerrar sesión
 * - Registro de usuario
 * - Reestablecer contraseña
 * - Verificar sesión activa
 * - Actualizar contraseña
 * 
 * @module routes/auth.routes
 * @layer Presentation
 */

import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';
import { rateLimit } from 'express-rate-limit';

// =============================================================================
// CONFIGURACIÓN DEL ROUTER
// =============================================================================

/**
 * Instancia del router para rutas de autenticación
 * 
 * Todas las rutas estarán prefijadas con /api/auth
 * @type {Router}
 */
const router = Router();

// =============================================================================
// MIDDLEWARE DE RATE LIMITING ESPECÍFICO PARA AUTH
// =============================================================================

/**
 * Rate limiter para endpoints de login
 * 
 * Previene ataques de fuerza bruta limitando intentos de login
 * - 5 intentos por 15 minutos
 * - Más restrictivo que el rate limiter general
 */
const loginLimiter = rateLimit({
  /**
   * Ventana de tiempo: 15 minutos
   */
  windowMs: 15 * 60 * 1000,
  
  /**
   * Máximo de peticiones por ventana
   */
  max: 5,
  
  /**
   * Mensaje cuando se excede el límite
   */
  message: {
    success: false,
    error: {
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      message: 'Demasiados intentos de inicio de sesión. Por favor espera 15 minutos.',
      retryAfter: 900, // 15 minutos en segundos
    },
  },
  
  /**
   * Incluir headers de rate limit en la respuesta
   */
  standardHeaders: true,
  legacyHeaders: false,
  
  /**
   * Key para identificar usuarios (por IP)
   */
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },
  
  /**
   * Skip para requests exitosos (opcional)
   */
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter para registro de usuarios
 * 
 * Previene creación masiva de cuentas falsas
 * - 3 registros por hora
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  message: {
    success: false,
    error: {
      code: 'REGISTER_RATE_LIMIT_EXCEEDED',
      message: 'Demasiados registros. Por favor intenta más tarde.',
      retryAfter: 3600,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para password reset
 * 
 * Previene abuso del sistema de recuperación de contraseña
 * - 3 solicitudes por hora
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  message: {
    success: false,
    error: {
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas solicitudes de recuperación. Por favor espera 1 hora.',
      retryAfter: 3600,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================================================
// RUTAS PÚBLICAS (No requieren autenticación)
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * REGISTRAR USUARIO
 * -----------------------------------------------------------------------------
 * 
 * Permite el registro de nuevos usuarios en el sistema.
 * 
 * @route POST /api/auth/register
 * @access Público
 * @middleware registerLimiter, validate(registerSchema)
 * 
 * @body {Object} requestData
 * @body {string} requestData.email - Email del usuario
 * @body {string} requestData.password - Contraseña (mínimo 8 caracteres)
 * @body {string} requestData.role - Rol del usuario
 * @body {Object} [requestData.profile] - Información adicional del perfil
 * 
 * @returns {Object} 201 - Usuario creado exitosamente
 * @returns {Object} 400 - Datos inválidos
 * @returns {Object} 409 - Email ya registrado
 * @returns {Object} 429 - Límite de registros excedido
 * 
 * @example
 * // Request
 * POST /api/auth/register
 * Content-Type: application/json
 * {
 *   "email": "usuario@ejemplo.com",
 *   "password": "Contraseña123",
 *   "role": "miembro",
 *   "profile": {
 *     "nombre": "Juan",
 *     "apellido": "Pérez"
 *   }
 * }
 * 
 * @example
 * // Response (201)
 * {
 *   "success": true,
 *   "data": {
 *     "user": {
 *       "id": "uuid-del-usuario",
 *       "email": "usuario@ejemplo.com",
 *       "role": "miembro"
 *     }
 *   },
 *   "message": "Usuario registrado exitosamente"
 * }
 */
router.post(
  '/register',
  registerLimiter,
  validate(registerSchema),
  authController.register
);

/**
 * -----------------------------------------------------------------------------
 * INICIAR SESIÓN (CU-03)
 * -----------------------------------------------------------------------------
 * 
 * Autentica un usuario y devuelve un token JWT para acceso a la API.
 * Soporta múltiples roles según el modelo de dominio.
 * 
 * @route POST /api/auth/login
 * @access Público
 * @middleware loginLimiter, validate(loginSchema)
 * 
 * @body {Object} requestData
 * @body {string} requestData.email - Email del usuario
 * @body {string} requestData.password - Contraseña del usuario
 * 
 * @returns {Object} 200 - Login exitoso con token
 * @returns {Object} 400 - Datos inválidos
 * @returns {Object} 401 - Credenciales inválidas
 * @returns {Object} 403 - Cuenta desactivada
 * @returns {Object} 429 - Límite de intentos excedido
 * 
 * @example
 * // Request
 * POST /api/auth/login
 * Content-Type: application/json
 * {
 *   "email": "usuario@ejemplo.com",
 *   "password": "Contraseña123"
 * }
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "user": {
 *       "id": "uuid-del-usuario",
 *       "email": "usuario@ejemplo.com",
 *       "role": "miembro",
 *       "organizationId": "uuid-organizacion"
 *     },
 *     "expiresIn": "1h"
 *   },
 *   "message": "Inicio de sesión exitoso"
 * }
 */
router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  authController.login
);

/**
 * -----------------------------------------------------------------------------
 * SOLICITAR REESTABLECIMIENTO DE CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Envía un email con un token seguro para reestablecer la contraseña.
 * No revela si el email existe (por seguridad).
 * 
 * @route POST /api/auth/forgot-password
 * @access Público
 * @middleware passwordResetLimiter, validate(forgotPasswordSchema)
 * 
 * @body {Object} requestData
 * @body {string} requestData.email - Email del usuario registrado
 * 
 * @returns {Object} 200 - Solicitud procesada (sin revelar si existe)
 * @returns {Object} 400 - Email inválido
 * @returns {Object} 429 - Límite de solicitudes excedido
 * 
 * @security No revela si el email existe para prevenir enumeración
 * 
 * @example
 * // Request
 * POST /api/auth/forgot-password
 * Content-Type: application/json
 * {
 *   "email": "usuario@ejemplo.com"
 * }
 * 
 * @example
 * // Response (200) - Mismo response exista o no el usuario
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Si el email está registrado, recibirás instrucciones para reestablecer tu contraseña"
 * }
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * -----------------------------------------------------------------------------
 * REESTABLECER CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Valida el token de reset y actualiza la contraseña del usuario.
 * 
 * @route POST /api/auth/reset-password
 * @access Público (con token válido)
 * @middleware validate(resetPasswordSchema)
 * 
 * @body {Object} requestData
 * @body {string} requestData.token - Token de reestablecimiento (del email)
 * @body {string} requestData.password - Nueva contraseña
 * @body {string} requestData.passwordConfirm - Confirmación de nueva contraseña
 * 
 * @returns {Object} 200 - Contraseña reestablecida
 * @returns {Object} 400 - Token inválido o contraseñas no coinciden
 * @returns {Object} 404 - Token no encontrado o expirado
 * 
 * @example
 * // Request
 * POST /api/auth/reset-password
 * Content-Type: application/json
 * {
 *   "token": "token-del-email-abc123...",
 *   "password": "NuevaContraseña456",
 *   "passwordConfirm": "NuevaContraseña456"
 * }
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Contraseña reestablecida exitosamente. Ahora puedes iniciar sesión."
 * }
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword
);

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR EMAIL (OPCIONAL - Si se implementa verificación de email)
 * -----------------------------------------------------------------------------
 * 
 * Verifica el email de un usuario con un token de verificación.
 * 
 * @route GET /api/auth/verify-email
 * @access Público
 * 
 * @query {string} token - Token de verificación de email
 * 
 * @returns {Object} 200 - Email verificado
 * @returns {Object} 400 - Token inválido
 * @returns {Object} 404 - Token no encontrado
 */
router.get(
  '/verify-email',
  authController.verifyEmail
);

// =============================================================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * CERRAR SESIÓN (CU-04)
 * -----------------------------------------------------------------------------
 * 
 * Invalida el token actual y limpia la cookie de autenticación.
 * 
 * @route POST /api/auth/logout
 * @access Privado (requiere autenticación)
 * @middleware authenticate
 * 
 * @header {string} Authorization - Bearer <token>
 * 
 * @returns {Object} 200 - Sesión cerrada exitosamente
 * @returns {Object} 401 - No autenticado
 * 
 * @example
 * // Request
 * POST /api/auth/logout
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Sesión cerrada exitosamente"
 * }
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER PERFIL DEL USUARIO AUTENTICADO (GET ME)
 * -----------------------------------------------------------------------------
 * 
 * Verifica si el token JWT actual es válido y devuelve los datos del usuario.
 * Útil para validar sesión al recargar la página en el frontend.
 * 
 * @route GET /api/auth/me
 * @access Privado (requiere autenticación)
 * @middleware authenticate
 * 
 * @header {string} Authorization - Bearer <token>
 * 
 * @returns {Object} 200 - Datos del usuario autenticado
 * @returns {Object} 401 - Token inválido o expirado
 * 
 * @example
 * // Request
 * GET /api/auth/me
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {
 *     "user": {
 *       "id": "uuid-del-usuario",
 *       "email": "usuario@ejemplo.com",
 *       "role": "miembro",
 *       "profile": {
 *         "nombre": "Juan",
 *         "apellido": "Pérez"
 *       },
 *       "organizationId": "uuid-organizacion",
 *       "isActive": true,
 *       "createdAt": "2026-01-01T10:00:00.000Z"
 *     }
 *   },
 *   "message": "Usuario autenticado"
 * }
 */
router.get(
  '/me',
  authenticate,
  authController.getMe
);

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
 * @middleware authenticate, validate(changePasswordSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @body {Object} requestData
 * @body {string} requestData.currentPassword - Contraseña actual
 * @body {string} requestData.newPassword - Nueva contraseña
 * @body {string} requestData.newPasswordConfirm - Confirmación de nueva contraseña
 * 
 * @returns {Object} 200 - Contraseña actualizada
 * @returns {Object} 400 - Datos inválidos o contraseñas no coinciden
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - Contraseña actual incorrecta
 * 
 * @example
 * // Request
 * PUT /api/auth/update-password
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * {
 *   "currentPassword": "ContraseñaActual123",
 *   "newPassword": "NuevaContraseña456",
 *   "newPasswordConfirm": "NuevaContraseña456"
 * }
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Contraseña actualizada exitosamente"
 * }
 */
router.put(
  '/update-password',
  authenticate,
  validate(changePasswordSchema),
  authController.updatedPassword
);

/**
 * -----------------------------------------------------------------------------
 * REFRESCAR TOKEN (OPCIONAL - Si se implementan refresh tokens)
 * -----------------------------------------------------------------------------
 * 
 * Obtiene un nuevo token de acceso usando un refresh token.
 * 
 * @route POST /api/auth/refresh
 * @access Privado (requiere refresh token)
 * 
 * @body {string} refreshToken - Refresh token válido
 * 
 * @returns {Object} 200 - Nuevo token de acceso
 * @returns {Object} 401 - Refresh token inválido o expirado
 */
router.post(
  '/refresh',
  authController.refreshToken
);

/**
 * -----------------------------------------------------------------------------
 * REVOCAR TOKEN (OPCIONAL - Para logout de todos los dispositivos)
 * -----------------------------------------------------------------------------
 * 
 * Revoca todos los tokens activos del usuario.
 * 
 * @route POST /api/auth/revoke-all
 * @access Privado (requiere autenticación)
 * @middleware authenticate
 * 
 * @returns {Object} 200 - Todos los tokens revocados
 * @returns {Object} 401 - No autenticado
 */
router.post(
  '/revoke-all',
  authenticate,
  authController.revokeAllTokens
);

// =============================================================================
// RUTAS DE ADMINISTRACIÓN (Solo para admins)
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * LISTAR USUARIOS (Solo administradores)
 * -----------------------------------------------------------------------------
 * 
 * Obtiene una lista de todos los usuarios del sistema.
 * Solo accesible para administradores y super_admins.
 * 
 * @route GET /api/auth/users
 * @access Privado (admin only)
 * @middleware authenticate, requireRole(['admin', 'super_admin'])
 * 
 * @query {number} page - Número de página (default: 1)
 * @query {number} limit - Límite de resultados (default: 10, max: 100)
 * @query {string} role - Filtrar por rol
 * @query {string} search - Buscar por email o nombre
 * 
 * @returns {Object} 200 - Lista de usuarios con paginación
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos de admin
 */
router.get(
  '/users',
  authenticate,
  // requireRole(['admin', 'super_admin']), // Descomentar cuando se implemente
  authController.listUsers
);

/**
 * -----------------------------------------------------------------------------
 * DESACTIVAR USUARIO (Solo administradores)
 * -----------------------------------------------------------------------------
 * 
 * Desactiva la cuenta de un usuario sin eliminarla.
 * 
 * @route PUT /api/auth/users/:id/deactivate
 * @access Privado (admin only)
 * @middleware authenticate, requireRole(['admin', 'super_admin'])
 * 
 * @param {string} id - ID del usuario a desactivar
 * 
 * @returns {Object} 200 - Usuario desactivado
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos de admin
 * @returns {Object} 404 - Usuario no encontrado
 */
router.put(
  '/users/:id/deactivate',
  authenticate,
  // requireRole(['admin', 'super_admin']), // Descomentar cuando se implemente
  authController.deactivateUser
);

/**
 * -----------------------------------------------------------------------------
 * ACTIVAR USUARIO (Solo administradores)
 * -----------------------------------------------------------------------------
 * 
 * Reactiva la cuenta de un usuario previamente desactivado.
 * 
 * @route PUT /api/auth/users/:id/activate
 * @access Privado (admin only)
 * @middleware authenticate, requireRole(['admin', 'super_admin'])
 * 
 * @param {string} id - ID del usuario a activar
 * 
 * @returns {Object} 200 - Usuario activado
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos de admin
 * @returns {Object} 404 - Usuario no encontrado
 */
router.put(
  '/users/:id/activate',
  authenticate,
  // requireRole(['admin', 'super_admin']), // Descomentar cuando se implemente
  authController.activateUser
);

// =============================================================================
// EXPORTACIÓN DEL ROUTER
// =============================================================================

/**
 * Exporta el router para ser montado en app.js
 * 
 * @example
 * // En src/routes/index.js
 * import authRoutes from './auth.routes.js';
 * router.use('/auth', authRoutes);
 * 
 * @example
 * // En src/app.js
 * import routes from './routes/index.js';
 * app.use('/api', routes);
 */
export default router;

/**
 * Exporta las rutas individuales para testing o uso específico
 */
export { router as authRouter };