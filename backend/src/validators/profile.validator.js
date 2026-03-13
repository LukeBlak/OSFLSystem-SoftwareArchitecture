/**
 * =============================================================================
 * VALIDADORES DE PERFIL DE USUARIO - CAPA DE VALIDACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir esquemas de validación Zod para todas las operaciones de perfil de usuario
 * - Centralizar las reglas de validación de datos de perfil en un solo módulo
 * - Proveer validaciones reutilizables para controllers y middleware
 * - Implementar reglas de negocio específicas para perfiles de usuario
 * 
 * Arquitectura:
 * - Capa: Validación (usada en Middleware y Controllers)
 * - Patrón: Schema Validation + Reusable Validators
 * - Integración: Zod, validation.middleware.js
 * 
 * Librerías utilizadas:
 * - zod: Validación de esquemas con TypeScript-like safety
 * 
 * Esquemas Incluidos:
 * - updateProfileSchema: Validación para actualizar perfil
 * - changePasswordSchema: Validación para cambiar contraseña
 * - uploadAvatarSchema: Validación para subir avatar
 * - deleteAvatarSchema: Validación para eliminar avatar
 * - getProfileSchema: Validación para obtener perfil
 * 
 * @module validators/profile.validator
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
 * Expresión regular para validar nombres
 * 
 * @constant {RegExp}
 */
const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

/**
 * Expresión regular para validar teléfonos de El Salvador (8 dígitos)
 * 
 * @constant {RegExp}
 */
const PHONE_REGEX = /^\d{8}$/;

/**
 * Expresión regular para validar URLs de avatar
 * 
 * @constant {RegExp}
 */
const AVATAR_URL_REGEX = /^https:\/\/(res\.cloudinary\.com|images\.unsplash\.com|cdn\.pixabay\.com)/;

/**
 * Expresión regular para validar fechas (YYYY-MM-DD)
 * 
 * @constant {RegExp}
 */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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
 * Longitud máxima de dirección
 * 
 * @constant {number}
 */
const MAX_ADDRESS_LENGTH = 255;

/**
 * Longitud máxima de biografía
 * 
 * @constant {number}
 */
const MAX_BIO_LENGTH = 500;

/**
 * Tamaño máximo de avatar en bytes (2MB)
 * 
 * @constant {number}
 */
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

/**
 * Formatos de archivo permitidos para avatar
 * 
 * @constant {Array<string>}
 */
const ALLOWED_AVATAR_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

/**
 * Edad mínima para registro
 * 
 * @constant {number}
 */
const MIN_AGE = 16;

// =============================================================================
// ESQUEMAS DE VALIDACIÓN PRINCIPALES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ACTUALIZACIÓN DE PERFIL
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para actualizar el perfil de un usuario.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   profile: {
 *     nombre: 'Juan Carlos',
 *     apellido: 'Pérez García',
 *     telefono: '70001234',
 *     direccion: 'Calle Principal #123',
 *     biografia: 'Voluntario apasionado'
 *   }
 * }
 */
export const updateProfileSchema = z.object({
  /**
   * Información del perfil a actualizar
   */
  profile: z.object({
    /**
     * Nombre del usuario (opcional)
     */
    nombre: z
      .string()
      .min(MIN_NAME_LENGTH, `El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
      .max(MAX_NAME_LENGTH, `El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`)
      .regex(NAME_REGEX, 'El nombre solo puede contener letras y espacios')
      .optional(),
    
    /**
     * Apellido del usuario (opcional)
     */
    apellido: z
      .string()
      .min(MIN_NAME_LENGTH, `El apellido debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
      .max(MAX_NAME_LENGTH, `El apellido no puede exceder ${MAX_NAME_LENGTH} caracteres`)
      .regex(NAME_REGEX, 'El apellido solo puede contener letras y espacios')
      .optional(),
    
    /**
     * Teléfono de contacto (opcional)
     */
    telefono: z
      .string()
      .regex(PHONE_REGEX, 'El teléfono debe tener 8 dígitos')
      .optional(),
    
    /**
     * URL del avatar (opcional)
     */
    avatar: z
      .string()
      .url('El avatar debe ser una URL válida')
      .optional()
      .nullable(),
    
    /**
     * Dirección de residencia (opcional)
     */
    direccion: z
      .string()
      .max(MAX_ADDRESS_LENGTH, `La dirección no puede exceder ${MAX_ADDRESS_LENGTH} caracteres`)
      .optional(),
    
    /**
     * Biografía o descripción personal (opcional)
     */
    biografia: z
      .string()
      .max(MAX_BIO_LENGTH, `La biografía no puede exceder ${MAX_BIO_LENGTH} caracteres`)
      .optional(),
    
    /**
     * Fecha de nacimiento (opcional)
     */
    fechaNacimiento: z
      .string()
      .regex(DATE_REGEX, 'La fecha debe tener formato YYYY-MM-DD')
      .refine(
        (date) => {
          if (!date) return true;
          const birthDate = new Date(date);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age >= MIN_AGE;
        },
        {
          message: `Debes tener al menos ${MIN_AGE} años`,
        }
      )
      .optional(),
    
    /**
     * URL de LinkedIn (opcional)
     */
    linkedin: z
      .string()
      .url('La URL de LinkedIn debe ser válida')
      .optional()
      .nullable(),
    
    /**
     * URL de GitHub (opcional)
     */
    github: z
      .string()
      .url('La URL de GitHub debe ser válida')
      .optional()
      .nullable(),
    
    /**
     * URL de sitio web personal (opcional)
     */
    website: z
      .string()
      .url('La URL del sitio web debe ser válida')
      .optional()
      .nullable(),
  }).optional(),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE CAMBIO DE CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para cambiar la contraseña de un usuario autenticado.
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
   * Contraseña actual (requerida para verificar identidad)
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
    .min(MIN_PASSWORD_LENGTH, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
    .max(MAX_PASSWORD_LENGTH, `La contraseña no puede exceder ${MAX_PASSWORD_LENGTH} caracteres`)
    .regex(
      PASSWORD_REGEX,
      'La contraseña debe incluir al menos una mayúscula, una minúscula y un número'
    ),
  
  /**
   * Confirmación de nueva contraseña
   * - Debe coincidir con la nueva contraseña
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
 * ESQUEMA DE SUBIDA DE AVATAR
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para subir un avatar/foto de perfil.
 * Este esquema es para validación de metadata, el archivo se valida con multer.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos (metadata)
 * {
 *   avatarType: 'profile'
 * }
 */
export const uploadAvatarSchema = z.object({
  /**
   * Tipo de avatar (para fines de organización)
   */
  avatarType: z
    .enum(['profile', 'cover', 'thumbnail'])
    .default('profile'),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ELIMINACIÓN DE AVATAR
 * -----------------------------------------------------------------------------
 * 
 * Valida la solicitud para eliminar el avatar del usuario.
 * 
 * @type {z.ZodObject}
 */
export const deleteAvatarSchema = z.object({
  /**
   * Confirmación de eliminación (opcional pero recomendado)
   */
  confirm: z
    .boolean()
    .optional(),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE OBTENCIÓN DE PERFIL
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros para obtener el perfil de un usuario.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos (params)
 * {
 *   userId: 'uuid-usuario'
 * }
 */
export const getProfileSchema = z.object({
  /**
   * ID del usuario cuyo perfil se desea obtener
   */
  userId: z
    .string()
    .uuid('El ID de usuario debe ser un UUID válido')
    .optional(),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ESTADÍSTICAS DE USUARIO
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros para obtener estadísticas del usuario.
 * 
 * @type {z.ZodObject}
 */
export const userStatsSchema = z.object({
  /**
   * ID del usuario (opcional, si no se proporciona usa el usuario autenticado)
   */
  userId: z
    .string()
    .uuid('El ID de usuario debe ser un UUID válido')
    .optional(),
  
  /**
   * Periodo para filtrar estadísticas (opcional, ej: 2026-01, 2026-Q1)
   */
  periodo: z
    .string()
    .regex(/^\d{4}(-\d{2})?(-Q[1-4])?$/, 'El periodo debe tener formato YYYY, YYYY-MM, o YYYY-Q#')
    .optional(),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE DESACTIVACIÓN DE CUENTA
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para desactivar la cuenta del usuario.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   currentPassword: 'Contraseña123',
 *   confirm: true,
 *   reason: 'Otro'
 * }
 */
export const deactivateAccountSchema = z.object({
  /**
   * Contraseña actual (requerida para verificar identidad)
   */
  currentPassword: z
    .string()
    .min(1, 'La contraseña actual es requerida para confirmar'),
  
  /**
   * Confirmación de desactivación (requerida)
   */
  confirm: z
    .boolean()
    .refine(val => val === true, 'Debes confirmar la desactivación de tu cuenta'),
  
  /**
   * Razón de desactivación (opcional, para feedback)
   */
  reason: z
    .enum([
      'temporal',
      'privacidad',
      'no_uso',
      'problemas_tecnicos',
      'otro',
    ])
    .optional(),
  
  /**
   * Comentarios adicionales (opcional)
   */
  comments: z
    .string()
    .max(500, 'Los comentarios no pueden exceder 500 caracteres')
    .optional(),
});

// =============================================================================
// ESQUEMAS REUTILIZABLES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE NOMBRE (REUTILIZABLE)
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
  .trim();

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE CONTRASEÑA (REUTILIZABLE)
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
 * ESQUEMA DE EMAIL (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar emails.
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
 * ESQUEMA DE TELÉFONO (REUTILIZABLE)
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
 * ESQUEMA DE URL DE AVATAR (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar URLs de avatar.
 * 
 * @type {z.ZodString}
 */
export const avatarUrlSchema = z
  .string()
  .url('El avatar debe ser una URL válida')
  .regex(
    AVATAR_URL_REGEX,
    'El avatar debe ser alojado en un servicio permitido (Cloudinary, Unsplash, etc.)'
  )
  .optional()
  .nullable();

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE UUID (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar UUIDs.
 * 
 * @type {z.ZodString}
 */
export const uuidSchema = z
  .string()
  .uuid('El ID debe ser un UUID válido');

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE FECHA (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar fechas.
 * 
 * @type {z.ZodString}
 */
export const dateSchema = z
  .string()
  .regex(DATE_REGEX, 'La fecha debe tener formato YYYY-MM-DD');

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE INFORMACIÓN DE PERFIL COMPLETA (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar información completa de perfil.
 * 
 * @type {z.ZodObject}
 */
export const fullProfileSchema = z.object({
  nombre: nameSchema.optional(),
  apellido: nameSchema.optional(),
  telefono: phoneSchema.optional(),
  avatar: avatarUrlSchema.optional(),
  direccion: z.string().max(MAX_ADDRESS_LENGTH).optional(),
  biografia: z.string().max(MAX_BIO_LENGTH).optional(),
  fechaNacimiento: dateSchema.optional(),
  linkedin: z.string().url().optional().nullable(),
  github: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
});

// =============================================================================
// FUNCIONES DE VALIDACIÓN
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * VALIDAR DATOS DE ACTUALIZACIÓN DE PERFIL
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para actualizar un perfil.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 * 
 * @example
 * const validData = validateUpdateProfile({
 *   profile: {
 *     nombre: 'Juan Carlos',
 *     telefono: '70001234'
 *   }
 * });
 */
export const validateUpdateProfile = (data) => {
  return updateProfileSchema.parse(data);
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
 * VALIDAR SUBIDA DE AVATAR
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para subir avatar.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateUploadAvatar = (data) => {
  return uploadAvatarSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR ELIMINACIÓN DE AVATAR
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para eliminar avatar.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateDeleteAvatar = (data) => {
  return deleteAvatarSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR OBTENCIÓN DE PERFIL
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros para obtener perfil.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateGetProfile = (data) => {
  return getProfileSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR ESTADÍSTICAS DE USUARIO
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros para obtener estadísticas.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateUserStats = (data) => {
  return userStatsSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR DESACTIVACIÓN DE CUENTA
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para desactivar cuenta.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateDeactivateAccount = (data) => {
  return deactivateAccountSchema.parse(data);
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
 * @returns {number} return.score - Puntuación de fortaleza (0-6)
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

  // Longitud recomendada (12+ caracteres)
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
 * CALCULAR EDAD DESDE FECHA DE NACIMIENTO
 * -----------------------------------------------------------------------------
 * 
 * Calcula la edad de una persona basada en su fecha de nacimiento.
 * 
 * @param {string} birthDate - Fecha de nacimiento (YYYY-MM-DD)
 * @returns {number|null} Edad en años o null si fecha inválida
 * 
 * @example
 * const age = calculateAge('1990-05-15'); // 35 (dependiendo del año actual)
 */
export const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  
  const today = new Date();
  const birth = new Date(birthDate);
  
  if (isNaN(birth.getTime())) return null;
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR EDAD MÍNIMA
 * -----------------------------------------------------------------------------
 * 
 * Verifica si una persona tiene la edad mínima requerida.
 * 
 * @param {string} birthDate - Fecha de nacimiento (YYYY-MM-DD)
 * @param {number} [minAge=MIN_AGE] - Edad mínima requerida
 * @returns {boolean} True si cumple la edad mínima
 */
export const isMinimumAge = (birthDate, minAge = MIN_AGE) => {
  const age = calculateAge(birthDate);
  return age !== null && age >= minAge;
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR URL DE AVATAR
 * -----------------------------------------------------------------------------
 * 
 * Verifica si una URL de avatar es válida y de un servicio permitido.
 * 
 * @param {string} url - URL del avatar a validar
 * @returns {Object} Resultado de validación
 * @returns {boolean} return.isValid - Si la URL es válida
 * @returns {string|null} return.error - Mensaje de error si es inválida
 * @returns {string} return.service - Servicio detectado (cloudinary, unsplash, etc.)
 */
export const validateAvatarUrl = (url) => {
  if (!url) {
    return {
      isValid: true,
      error: null,
      service: null,
    };
  }

  try {
    const urlObj = new URL(url);
    
    // Verificar protocolo HTTPS
    if (urlObj.protocol !== 'https:') {
      return {
        isValid: false,
        error: 'El avatar debe usar protocolo HTTPS',
        service: null,
      };
    }

    // Detectar servicio
    let service = null;
    if (urlObj.hostname.includes('res.cloudinary.com')) {
      service = 'cloudinary';
    } else if (urlObj.hostname.includes('images.unsplash.com')) {
      service = 'unsplash';
    } else if (urlObj.hostname.includes('cdn.pixabay.com')) {
      service = 'pixabay';
    }

    return {
      isValid: true,
      error: null,
      service,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'URL de avatar inválida',
      service: null,
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
 * // [{ field: 'profile.nombre', message: 'El nombre es requerido' }]
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

/**
 * -----------------------------------------------------------------------------
 * NORMALIZAR DATOS DE PERFIL
 * -----------------------------------------------------------------------------
 * 
 * Normaliza los datos de un perfil para consistencia.
 * 
 * @param {Object} data - Datos a normalizar
 * @returns {Object} Datos normalizados
 */
export const normalizeProfileData = (data) => {
  if (!data) return {};
  
  return {
    ...data,
    nombre: data.nombre?.trim(),
    apellido: data.apellido?.trim(),
    telefono: data.telefono?.trim(),
    direccion: data.direccion?.trim(),
    biografia: data.biografia?.trim(),
    avatar: data.avatar || null,
    linkedin: data.linkedin || null,
    github: data.github || null,
    website: data.website || null,
  };
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR DATOS PARCIALES DE PERFIL
 * -----------------------------------------------------------------------------
 * 
 * Valida datos parciales para actualizaciones (solo campos proporcionados).
 * 
 * @param {Object} data - Datos parciales a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validatePartialProfile = (data) => {
  return updateProfileSchema.partial().parse(data);
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
 *   updateProfileSchema, 
 *   validateUpdateProfile,
 *   validatePasswordStrength,
 *   calculateAge
 * } from './validators/profile.validator.js';
 * 
 * @example
 * // Importación por defecto
 * import profileValidator from './validators/profile.validator.js';
 * profileValidator.updateProfileSchema.parse(data);
 */
export default {
  // Esquemas principales
  updateProfileSchema,
  changePasswordSchema,
  uploadAvatarSchema,
  deleteAvatarSchema,
  getProfileSchema,
  userStatsSchema,
  deactivateAccountSchema,
  
  // Esquemas reutilizables
  nameSchema,
  passwordSchema,
  emailSchema,
  phoneSchema,
  avatarUrlSchema,
  uuidSchema,
  dateSchema,
  fullProfileSchema,
  
  // Funciones de validación
  validateUpdateProfile,
  validateChangePassword,
  validateUploadAvatar,
  validateDeleteAvatar,
  validateGetProfile,
  validateUserStats,
  validateDeactivateAccount,
  validatePartialProfile,
  
  // Funciones de utilidad
  validatePasswordStrength,
  calculateAge,
  isMinimumAge,
  validateAvatarUrl,
  getFriendlyErrors,
  normalizeProfileData,
  
  // Constantes
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_BIO_LENGTH,
  MAX_AVATAR_SIZE,
  ALLOWED_AVATAR_FORMATS,
  MIN_AGE,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  PHONE_REGEX,
  DATE_REGEX,
  AVATAR_URL_REGEX,
};

/**
 * Exportaciones named para conveniencia
 */
export {
  // Esquemas
  updateProfileSchema,
  changePasswordSchema,
  uploadAvatarSchema,
  deleteAvatarSchema,
  getProfileSchema,
  userStatsSchema,
  deactivateAccountSchema,
  nameSchema,
  passwordSchema,
  emailSchema,
  phoneSchema,
  avatarUrlSchema,
  uuidSchema,
  dateSchema,
  fullProfileSchema,
  
  // Funciones
  validateUpdateProfile,
  validateChangePassword,
  validateUploadAvatar,
  validateDeleteAvatar,
  validateGetProfile,
  validateUserStats,
  validateDeactivateAccount,
  validatePartialProfile,
  validatePasswordStrength,
  calculateAge,
  isMinimumAge,
  validateAvatarUrl,
  getFriendlyErrors,
  normalizeProfileData,
  
  // Constantes
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_BIO_LENGTH,
  MAX_AVATAR_SIZE,
  ALLOWED_AVATAR_FORMATS,
  MIN_AGE,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  PHONE_REGEX,
  DATE_REGEX,
  AVATAR_URL_REGEX,
};