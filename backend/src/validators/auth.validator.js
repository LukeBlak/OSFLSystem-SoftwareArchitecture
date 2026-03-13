/**
 * =============================================================================
 * VALIDADORES DE AUTENTICACIÓN - CAPA DE VALIDACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir esquemas de validación Zod para todas las operaciones de autenticación
 * - Centralizar las reglas de validación de datos de auth en un solo módulo
 * - Proveer validaciones reutilizables para controllers y middleware
 * - Implementar reglas de seguridad para contraseñas y emails
 * 
 * Arquitectura:
 * - Capa: Validación (usada en Middleware y Controllers)
 * - Patrón: Schema Validation + Reusable Validators
 * - Integración: Zod, validation.middleware.js
 * 
 * Librerías utilizadas:
 * - zod: Validación de esquemas con TypeScript-like safety
 * 
 * Esquemas Incluídos:
 * - loginSchema: Validación para inicio de sesión
 * - registerSchema: Validación para registro de usuario
 * - forgotPasswordSchema: Validación para solicitud de reset
 * - resetPasswordSchema: Validación para reestablecer contraseña
 * - changePasswordSchema: Validación para cambiar contraseña
 * - verifyEmailSchema: Validación para verificación de email
 * - refreshTokenSchema: Validación para refresh de token
 * 
 * @module validators/auth.validator
 * @layer Validation
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTES Y REGLAS DE VALIDACIÓN
// =============================================================================

/**
 * Expresión regular para validar emails
 * 
 * @constant {RegExp}
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Expresión regular para validar contraseñas seguras
 * 
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Al menos 1 letra mayúscula
 * - Al menos 1 letra minúscula
 * - Al menos 1 número
 * 
 * @constant {RegExp}
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Expresión regular para validar nombres de usuario
 * 
 * @constant {RegExp}
 */
const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,100}$/;

/**
 * Expresión regular para validar teléfonos (El Salvador - 8 dígitos)
 * 
 * @constant {RegExp}
 */
const PHONE_REGEX = /^\d{8}$/;

/**
 * Longitud mínima de contraseña
 * 
 * @constant {number}
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Longitud máxima de contraseña
 * 
 * @constant {number}
 */
const MAX_PASSWORD_LENGTH = 128;

/**
 * Longitud mínima de nombre
 * 
 * @constant {number}
 */
const MIN_NAME_LENGTH = 2;

/**
 * Longitud máxima de nombre
 * 
 * @constant {number}
 */
const MAX_NAME_LENGTH = 100;

/**
 * Longitud máxima de email
 * 
 * @constant {number}
 */
const MAX_EMAIL_LENGTH = 255;

/**
 * Roles válidos en el sistema
 * 
 * @constant {Array<string>}
 */
const VALID_ROLES = [
  'super_admin',
  'admin',
  'lider_organizacion',
  'lider_comite',
  'miembro',
];

// =============================================================================
// ESQUEMAS DE VALIDACIÓN PRINCIPALES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE LOGIN
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para inicio de sesión de usuario.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   email: 'usuario@ejemplo.com',
 *   password: 'Contraseña123'
 * }
 */
export const loginSchema = z.object({
  /**
   * Email del usuario
   * - Debe ser email válido
   * - Se convierte a minúsculas automáticamente
   */
  email: z
    .string()
    .min(1, 'El email es requerido')
    .max(MAX_EMAIL_LENGTH, `El email no puede exceder ${MAX_EMAIL_LENGTH} caracteres`)
    .email('El email debe ser válido')
    .transform(val => val.toLowerCase().trim()),
  
  /**
   * Contraseña del usuario
   * - Debe tener al menos 8 caracteres
   * - No se transforma (se usa tal cual para verificación)
   */
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .max(MAX_PASSWORD_LENGTH, `La contraseña no puede exceder ${MAX_PASSWORD_LENGTH} caracteres`),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE REGISTRO DE USUARIO
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para registro de nuevo usuario.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   email: 'usuario@ejemplo.com',
 *   password: 'Contraseña123',
 *   role: 'miembro',
 *   profile: {
 *     nombre: 'Juan',
 *     apellido: 'Pérez'
 *   }
 * }
 */
export const registerSchema = z.object({
  /**
   * Email del usuario (único en el sistema)
   */
  email: z
    .string()
    .min(1, 'El email es requerido')
    .max(MAX_EMAIL_LENGTH, `El email no puede exceder ${MAX_EMAIL_LENGTH} caracteres`)
    .email('El email debe ser válido')
    .transform(val => val.toLowerCase().trim()),
  
  /**
   * Contraseña del usuario
   * - Debe cumplir con requisitos de seguridad
   */
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
    .max(MAX_PASSWORD_LENGTH, `La contraseña no puede exceder ${MAX_PASSWORD_LENGTH} caracteres`)
    .regex(
      PASSWORD_REGEX,
      'La contraseña debe incluir al menos una mayúscula, una minúscula y un número'
    ),
  
  /**
   * Rol del usuario en el sistema
   * - Por defecto: 'miembro'
   */
  role: z
    .enum(VALID_ROLES, {
      errorMap: () => ({
        message: `Rol inválido. Roles permitidos: ${VALID_ROLES.join(', ')}`,
      }),
    })
    .default('miembro'),
  
  /**
   * Información adicional del perfil (opcional)
   */
  profile: z.object({
    /**
     * Nombre del usuario
     */
    nombre: z
      .string()
      .min(MIN_NAME_LENGTH, `El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
      .max(MAX_NAME_LENGTH, `El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`)
      .regex(NAME_REGEX, 'El nombre solo puede contener letras y espacios')
      .optional(),
    
    /**
     * Apellido del usuario
     */
    apellido: z
      .string()
      .min(MIN_NAME_LENGTH, `El apellido debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
      .max(MAX_NAME_LENGTH, `El apellido no puede exceder ${MAX_NAME_LENGTH} caracteres`)
      .regex(NAME_REGEX, 'El apellido solo puede contener letras y espacios')
      .optional(),
    
    /**
     * Teléfono de contacto
     */
    telefono: z
      .string()
      .regex(PHONE_REGEX, 'El teléfono debe tener 8 dígitos')
      .optional(),
    
    /**
     * URL del avatar
     */
    avatar: z
      .string()
      .url('El avatar debe ser una URL válida')
      .optional(),
    
    /**
     * Dirección de residencia
     */
    direccion: z
      .string()
      .max(255, 'La dirección no puede exceder 255 caracteres')
      .optional(),
    
    /**
     * Fecha de nacimiento
     */
    fechaNacimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
      .optional(),
  }).optional(),
  
  /**
   * ID de la organización asociada (opcional)
   */
  organizationId: z
    .string()
    .uuid('El ID de organización debe ser un UUID válido')
    .optional(),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE SOLICITUD DE RESETEO DE CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para solicitar reestablecimiento de contraseña.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   email: 'usuario@ejemplo.com'
 * }
 */
export const forgotPasswordSchema = z.object({
  /**
   * Email del usuario registrado
   */
  email: z
    .string()
    .min(1, 'El email es requerido')
    .max(MAX_EMAIL_LENGTH, `El email no puede exceder ${MAX_EMAIL_LENGTH} caracteres`)
    .email('El email debe ser válido')
    .transform(val => val.toLowerCase().trim()),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE RESETEO DE CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para reestablecer contraseña con token.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   token: 'abc123...',
 *   password: 'NuevaContraseña123',
 *   passwordConfirm: 'NuevaContraseña123'
 * }
 */
export const resetPasswordSchema = z.object({
  /**
   * Token de reestablecimiento (recibido por email)
   * - Debe tener exactamente 64 caracteres (hexadecimal)
   */
  token: z
    .string()
    .length(64, 'El token debe tener exactamente 64 caracteres')
    .regex(/^[0-9a-fA-F]+$/, 'El token debe ser hexadecimal válido'),
  
  /**
   * Nueva contraseña
   * - Debe cumplir con requisitos de seguridad
   */
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
    .max(MAX_PASSWORD_LENGTH, `La contraseña no puede exceder ${MAX_PASSWORD_LENGTH} caracteres`)
    .regex(
      PASSWORD_REGEX,
      'La contraseña debe incluir al menos una mayúscula, una minúscula y un número'
    ),
  
  /**
   * Confirmación de nueva contraseña
   * - Debe coincidir con la contraseña
   */
  passwordConfirm: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `La confirmación debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`),
}).refine(
  (data) => data.password === data.passwordConfirm,
  {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirm'],
  }
);

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE CAMBIO DE CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para cambiar contraseña (usuario autenticado).
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   currentPassword: 'ContraseñaActual123',
 *   newPassword: 'NuevaContraseña456',
 *   newPasswordConfirm: 'NuevaContraseña456'
 * }
 */
export const changePasswordSchema = z.object({
  /**
   * Contraseña actual
   * - Requerida para verificar identidad
   */
  currentPassword: z
    .string()
    .min(1, 'La contraseña actual es requerida')
    .max(MAX_PASSWORD_LENGTH, `La contraseña no puede exceder ${MAX_PASSWORD_LENGTH} caracteres`),
  
  /**
   * Nueva contraseña
   * - Debe ser diferente a la actual
   * - Debe cumplir con requisitos de seguridad
   */
  newPassword: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
    .max(MAX_PASSWORD_LENGTH, `La contraseña no puede exceder ${MAX_PASSWORD_LENGTH} caracteres`)
    .regex(
      PASSWORD_REGEX,
      'La contraseña debe incluir al menos una mayúscula, una minúscula y un número'
    ),
  
  /**
   * Confirmación de nueva contraseña
   */
  newPasswordConfirm: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `La confirmación debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`),
}).refine(
  (data) => data.newPassword === data.newPasswordConfirm,
  {
    message: 'Las contraseñas no coinciden',
    path: ['newPasswordConfirm'],
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['newPassword'],
  }
);

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE VERIFICACIÓN DE EMAIL
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para verificación de email.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos (query params)
 * {
 *   token: 'abc123...'
 * }
 */
export const verifyEmailSchema = z.object({
  /**
   * Token de verificación de email
   */
  token: z
    .string()
    .min(1, 'El token de verificación es requerido')
    .regex(/^[0-9a-zA-Z]+$/, 'El token debe ser alfanumérico'),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE REFRESH DE TOKEN
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para obtener nuevo token de acceso.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   refreshToken: 'eyJhbGciOiJIUzI1NiIs...'
 * }
 */
export const refreshTokenSchema = z.object({
  /**
   * Token de refresco
   * - Debe ser un JWT válido
   */
  refreshToken: z
    .string()
    .min(1, 'El token de refresco es requerido')
    .regex(/^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/, 'El token debe ser un JWT válido'),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE VALIDACIÓN DE EMAIL (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar emails en cualquier contexto.
 * 
 * @type {z.ZodString}
 */
export const emailSchema = z
  .string()
  .min(1, 'El email es requerido')
  .max(MAX_EMAIL_LENGTH, `El email no puede exceder ${MAX_EMAIL_LENGTH} caracteres`)
  .email('El email debe ser válido')
  .transform(val => val.toLowerCase().trim());

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE VALIDACIÓN DE CONTRASEÑA (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar contraseñas seguras.
 * 
 * @type {z.ZodString}
 */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
  .max(MAX_PASSWORD_LENGTH, `La contraseña no puede exceder ${MAX_PASSWORD_LENGTH} caracteres`)
  .regex(
    PASSWORD_REGEX,
    'La contraseña debe incluir al menos una mayúscula, una minúscula y un número'
  );

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE VALIDACIÓN DE NOMBRE (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar nombres.
 * 
 * @type {z.ZodString}
 */
export const nameSchema = z
  .string()
  .min(MIN_NAME_LENGTH, `El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
  .max(MAX_NAME_LENGTH, `El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`)
  .regex(NAME_REGEX, 'El nombre solo puede contener letras y espacios')
  .transform(val => val.trim());

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE VALIDACIÓN DE TELÉFONO (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar teléfonos.
 * 
 * @type {z.ZodString}
 */
export const phoneSchema = z
  .string()
  .regex(PHONE_REGEX, 'El teléfono debe tener 8 dígitos')
  .optional();

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE VALIDACIÓN DE UUID (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar UUIDs.
 * 
 * @type {z.ZodString}
 */
export const uuidSchema = z
  .string()
  .uuid('El ID debe ser un UUID válido');

// =============================================================================
// FUNCIONES DE VALIDACIÓN
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * VALIDAR DATOS DE LOGIN
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para inicio de sesión.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 * 
 * @example
 * const validData = validateLogin({
 *   email: 'usuario@ejemplo.com',
 *   password: 'Contraseña123'
 * });
 */
export const validateLogin = (data) => {
  return loginSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR DATOS DE REGISTRO
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para registro de usuario.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateRegister = (data) => {
  return registerSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR SOLICITUD DE RESETEO
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para solicitud de reestablecimiento de contraseña.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateForgotPassword = (data) => {
  return forgotPasswordSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR RESETEO DE CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para reestablecer contraseña.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateResetPassword = (data) => {
  return resetPasswordSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR CAMBIO DE CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para cambiar contraseña.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateChangePassword = (data) => {
  return changePasswordSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR TOKEN DE VERIFICACIÓN DE EMAIL
 * -----------------------------------------------------------------------------
 * 
 * Valida el token de verificación de email.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateVerifyEmail = (data) => {
  return verifyEmailSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR TOKEN DE REFRESCO
 * -----------------------------------------------------------------------------
 * 
 * Valida el token de refresco.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateRefreshToken = (data) => {
  return refreshTokenSchema.parse(data);
};

// =============================================================================
// FUNCIONES DE UTILIDAD
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * VALIDAR FORTALEZA DE CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Verifica si una contraseña cumple con los requisitos de seguridad.
 * 
 * @param {string} password - Contraseña a validar
 * @returns {Object} Resultado de validación
 * @returns {boolean} return.isValid - Si la contraseña es válida
 * @returns {Array<string>} return.errors - Array de errores encontrados
 * 
 * @example
 * const result = validatePasswordStrength('Contraseña123');
 * // { isValid: true, errors: [], score: 4 }
 */
export const validatePasswordStrength = (password) => {
  const errors = [];
  let score = 0;

  // Longitud mínima
  if (password.length >= MIN_PASSWORD_LENGTH) {
    score++;
  } else {
    errors.push(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }

  // Longitud recomendada
  if (password.length >= 12) {
    score++;
  }

  // Mayúsculas
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    errors.push('Debe incluir al menos una letra mayúscula');
  }

  // Minúsculas
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    errors.push('Debe incluir al menos una letra minúscula');
  }

  // Números
  if (/\d/.test(password)) {
    score++;
  } else {
    errors.push('Debe incluir al menos un número');
  }

  // Caracteres especiales
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score++;
  } else {
    errors.push('Se recomienda incluir caracteres especiales');
  }

  return {
    isValid: errors.length === 0,
    errors,
    score,
    maxScore: 6,
  };
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR FORMATO DE EMAIL
 * -----------------------------------------------------------------------------
 * 
 * Verifica si un email tiene formato válido.
 * 
 * @param {string} email - Email a validar
 * @returns {Object} Resultado de validación
 * @returns {boolean} return.isValid - Si el email es válido
 * @returns {string|null} return.error - Mensaje de error si es inválido
 */
export const validateEmailFormat = (email) => {
  try {
    emailSchema.parse(email);
    return {
      isValid: true,
      error: null,
      normalized: email.toLowerCase().trim(),
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.errors?.[0]?.message || 'Email inválido',
      normalized: null,
    };
  }
};

/**
 * -----------------------------------------------------------------------------
 * GENERAR MENSAJE DE ERROR AMIGABLE
 * -----------------------------------------------------------------------------
 * 
 * Convierte errores de Zod en mensajes amigables para el usuario.
 * 
 * @param {z.ZodError} error - Error de Zod
 * @returns {Array<Object>} Array de errores formateados
 * 
 * @example
 * const friendlyErrors = getFriendlyErrors(zodError);
 * // [{ field: 'email', message: 'El email debe ser válido' }]
 */
export const getFriendlyErrors = (error) => {
  if (!error || !(error instanceof z.ZodError)) {
    return [];
  }

  return error.errors.map(err => ({
    field: err.path.join('.') || 'root',
    message: err.message,
    code: err.code,
  }));
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta todos los esquemas y funciones del módulo
 * 
 * @example
 * // Importación named (recomendado)
 * import { 
 *   loginSchema, 
 *   registerSchema, 
 *   validateLogin,
 *   validatePasswordStrength
 * } from './validators/auth.validator.js';
 * 
 * @example
 * // Importación por defecto
 * import authValidator from './validators/auth.validator.js';
 * authValidator.loginSchema.parse(data);
 */
export default {
  // Esquemas principales
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  
  // Esquemas reutilizables
  emailSchema,
  passwordSchema,
  nameSchema,
  phoneSchema,
  uuidSchema,
  
  // Funciones de validación
  validateLogin,
  validateRegister,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateVerifyEmail,
  validateRefreshToken,
  
  // Funciones de utilidad
  validatePasswordStrength,
  validateEmailFormat,
  getFriendlyErrors,
  
  // Constantes
  VALID_ROLES,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  EMAIL_REGEX,
  PASSWORD_REGEX,
};

/**
 * Exportaciones named para conveniencia
 */
export {
  // Esquemas
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  emailSchema,
  passwordSchema,
  nameSchema,
  phoneSchema,
  uuidSchema,
  
  // Funciones
  validateLogin,
  validateRegister,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateVerifyEmail,
  validateRefreshToken,
  validatePasswordStrength,
  validateEmailFormat,
  getFriendlyErrors,
  
  // Constantes
  VALID_ROLES,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  EMAIL_REGEX,
  PASSWORD_REGEX,
};