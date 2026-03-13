/**
 * =============================================================================
 * MODELO DE RESTABLECIMIENTO DE CONTRASEÑA - CAPA DE DOMINIO
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir la entidad de dominio PasswordReset para gestión de tokens de reset
 * - Proveer esquemas de validación con Zod para la entidad
 * - Centralizar constantes y configuraciones relacionadas con password reset
 * - Documentar la estructura de la tabla `password_reset` en Supabase
 * 
 * Arquitectura:
 * - Capa: Dominio (Entidades)
 * - Patrón: Domain Model + Validation Schema
 * - Base de datos: Supabase (PostgreSQL) - Tabla: `password_reset`
 * 
 * Relación con otras entidades:
 * - Pertenece a: Usuario (N:1) - Un usuario puede tener múltiples tokens de reset
 * - Usado por: Auth Service para flujo de forgot/reset password
 * 
 * Seguridad:
 * - Los tokens se almacenan hasheados (bcrypt)
 * - Tokens tienen expiración temporal (1 hora por defecto)
 * - Tokens son de un solo uso (se marcan como usados después)
 * 
 * @module models/PasswordReset
 * @layer Domain
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTES DE PASSWORD RESET
// =============================================================================

/**
 * Tiempo de expiración de tokens de reset por defecto
 * 
 * @constant {number}
 * @default 3600000 (1 hora en milisegundos)
 */
export const DEFAULT_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Tiempo de expiración de tokens de reset para email
 * 
 * @constant {string}
 * @default '1h' (1 hora en formato ms/ms)
 */
export const DEFAULT_TOKEN_EXPIRY_STRING = '1h';

/**
 * Longitud del token en bytes (antes de convertir a hex)
 * 
 * 32 bytes = 64 caracteres hexadecimales
 * 
 * @constant {number}
 */
export const TOKEN_BYTE_LENGTH = 32;

/**
 * Número de rondas de bcrypt para hashear tokens
 * 
 * @constant {number}
 */
export const BCRYPT_SALT_ROUNDS = 12;

/**
 * Estados posibles de un token de reset
 * 
 * @constant {Object}
 * @readonly
 */
export const RESET_TOKEN_STATUS = {
  /** Token activo y usable */
  ACTIVE: 'active',
  
  /** Token ya fue usado */
  USED: 'used',
  
  /** Token expiró por tiempo */
  EXPIRED: 'expired',
  
  /** Token fue revocado manualmente */
  REVOKED: 'revoked',
};

/**
 * Array de todos los estados válidos de token
 * @constant {Array<string>}
 */
export const VALID_RESET_TOKEN_STATUS = Object.values(RESET_TOKEN_STATUS);

// =============================================================================
// ESQUEMAS DE VALIDACIÓN ZOD
// =============================================================================

/**
 * Esquema de validación para creación de registro de password reset
 * 
 * Se usa cuando se genera un nuevo token de reset para un usuario
 * 
 * @type {z.ZodObject}
 */
export const createPasswordResetSchema = z.object({
  /**
   * ID del usuario que solicita el reset (UUID)
   * Requerido - debe ser UUID válido
   */
  userId: z
    .string()
    .uuid('El ID de usuario debe ser un UUID válido'),
  
  /**
   * Token hasheado (no el token en texto plano)
   * Requerido - mínimo 64 caracteres (32 bytes en hex)
   */
  token: z
    .string()
    .min(64, 'El token hasheado debe tener al menos 64 caracteres')
    .max(255, 'El token hasheado no puede exceder 255 caracteres'),
  
  /**
   * Fecha de expiración del token
   * Requerido - debe ser fecha ISO válida
   */
  expiresAt: z
    .string()
    .datetime('La fecha de expiración debe ser formato ISO 8601'),
  
  /**
   * Estado inicial del token
   * Por defecto: 'active'
   */
  status: z
    .enum(VALID_RESET_TOKEN_STATUS)
    .default(RESET_TOKEN_STATUS.ACTIVE),
  
  /**
   * Si el token ya fue usado
   * Por defecto: false
   */
  used: z
    .boolean()
    .default(false),
});

/**
 * Esquema de validación para actualización de password reset
 * 
 * Todos los campos son opcionales (partial)
 * Solo se actualizan los campos proporcionados
 * 
 * @type {z.ZodObject}
 */
export const updatePasswordResetSchema = z.object({
  /**
   * Token hasheado (opcional para update)
   */
  token: z
    .string()
    .min(64, 'El token hasheado debe tener al menos 64 caracteres')
    .max(255, 'El token hasheado no puede exceder 255 caracteres')
    .optional(),
  
  /**
   * Fecha de expiración (opcional para update)
   */
  expiresAt: z
    .string()
    .datetime('La fecha de expiración debe ser formato ISO 8601')
    .optional(),
  
  /**
   * Estado del token (opcional para update)
   */
  status: z
    .enum(VALID_RESET_TOKEN_STATUS)
    .optional(),
  
  /**
   * Si el token fue usado (opcional para update)
   */
  used: z
    .boolean()
    .optional(),
});

/**
 * Esquema de validación para parámetros de ID
 * 
 * Se usa para validar IDs en rutas (params)
 * 
 * @type {z.ZodObject}
 */
export const passwordResetIdSchema = z.object({
  /**
   * ID del registro de password reset (UUID)
   */
  id: z
    .string()
    .uuid('El ID debe ser un UUID válido'),
});

/**
 * Esquema de validación para token en texto plano (del email)
 * 
 * Se usa cuando el usuario recibe el token por email
 * 
 * @type {z.ZodObject}
 */
export const plainTokenSchema = z.object({
  /**
   * Token en texto plano (64 caracteres hex)
   */
  token: z
    .string()
    .length(64, 'El token debe tener exactamente 64 caracteres')
    .regex(/^[0-9a-fA-F]+$/, 'El token debe ser hexadecimal válido'),
});

/**
 * Esquema completo de password reset (para respuestas de API)
 * 
 * Incluye todos los campos que puede tener un registro
 * 
 * @type {z.ZodObject}
 */
export const passwordResetSchema = z.object({
  /** ID único del registro (UUID) */
  id: z.string().uuid(),
  
  /** ID del usuario asociado */
  userId: z.string().uuid(),
  
  /** Token hasheado almacenado */
  token: z.string(),
  
  /** Fecha de expiración del token */
  expiresAt: z.string().datetime(),
  
  /** Estado actual del token */
  status: z.string(),
  
  /** Si el token ya fue usado */
  used: z.boolean(),
  
  /** ID del usuario que creó el registro */
  creadoPor: z.string().uuid().nullable(),
  
  /** ID del usuario que modificó por última vez */
  modificadoPor: z.string().uuid().nullable(),
  
  /** Fecha de creación del registro */
  fechaCreacion: z.string().datetime().nullable(),
  
  /** Fecha de última modificación */
  fechaEdicion: z.string().datetime().nullable(),
});

/**
 * Esquema para solicitud de reset de contraseña (forgot password)
 * 
 * @type {z.ZodObject}
 */
export const forgotPasswordSchema = z.object({
  /**
   * Email del usuario que solicita reset
   */
  email: z
    .string()
    .email('El email debe ser válido')
    .max(255, 'El email no puede exceder 255 caracteres'),
});

/**
 * Esquema para restablecimiento de contraseña (reset password)
 * 
 * @type {z.ZodObject}
 */
export const resetPasswordSchema = z.object({
  /**
   * Token de reset (en texto plano, del email)
   */
  token: z
    .string()
    .length(64, 'El token debe tener exactamente 64 caracteres')
    .regex(/^[0-9a-fA-F]+$/, 'El token debe ser hexadecimal válido'),
  
  /**
   * Nueva contraseña
   */
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe incluir mayúsculas, minúsculas y números'
    ),
  
  /**
   * Confirmación de nueva contraseña
   */
  passwordConfirm: z
    .string()
    .min(8, 'La confirmación debe tener al menos 8 caracteres'),
}).refine(
  (data) => data.password === data.passwordConfirm,
  {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirm'],
  }
);

// =============================================================================
// FUNCIONES DE UTILIDAD
// =============================================================================

/**
 * Valida los datos para crear un registro de password reset
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 * 
 * @example
 * const validData = validateCreatePasswordReset({
 *   userId: 'uuid-usuario',
 *   token: 'hashed_token_here',
 *   expiresAt: new Date(Date.now() + 3600000).toISOString()
 * });
 */
export const validateCreatePasswordReset = (data) => {
  return createPasswordResetSchema.parse(data);
};

/**
 * Valida los datos para actualizar un registro de password reset
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateUpdatePasswordReset = (data) => {
  return updatePasswordResetSchema.parse(data);
};

/**
 * Valida el ID de un registro de password reset
 * 
 * @param {string} id - ID del registro
 * @returns {Object} ID validado
 * @throws {z.ZodError} Si el ID no es válido
 */
export const validatePasswordResetId = (id) => {
  return passwordResetIdSchema.parse({ id });
};

/**
 * Valida un token en texto plano (del email)
 * 
 * @param {string} token - Token en texto plano
 * @returns {Object} Token validado
 * @throws {z.ZodError} Si el token no es válido
 */
export const validatePlainToken = (token) => {
  return plainTokenSchema.parse({ token });
};

/**
 * Valida solicitud de forgot password
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateForgotPassword = (data) => {
  return forgotPasswordSchema.parse(data);
};

/**
 * Valida solicitud de reset password
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateResetPassword = (data) => {
  return resetPasswordSchema.parse(data);
};

/**
 * Formatea un registro de password reset para respuesta de API
 * 
 * Elimina campos sensibles (token hasheado) y formatea fechas
 * 
 * @param {Object} reset - Objeto password reset de la base de datos
 * @returns {Object|null} Password reset formateado para API (sin token)
 */
export const formatPasswordResetForResponse = (reset) => {
  if (!reset) return null;
  
  // NUNCA retornar el token hasheado en respuestas API
  const { token, ...safeData } = reset;
  
  return {
    id: safeData.id,
    userId: safeData.userId,
    expiresAt: safeData.expiresAt,
    status: safeData.status,
    used: safeData.used,
    fechaCreacion: safeData.fechaCreacion,
    fechaEdicion: safeData.fechaEdicion,
  };
};

/**
 * Genera un objeto de password reset vacío con valores por defecto
 * 
 * @param {string} userId - ID del usuario
 * @param {string} hashedToken - Token hasheado
 * @returns {Object} Password reset con valores por defecto
 */
export const createEmptyPasswordReset = (userId, hashedToken) => ({
  userId: userId,
  token: hashedToken,
  expiresAt: new Date(Date.now() + DEFAULT_TOKEN_EXPIRY_MS).toISOString(),
  status: RESET_TOKEN_STATUS.ACTIVE,
  used: false,
});

/**
 * Verifica si un estado de token es válido
 * 
 * @param {string} status - Estado a verificar
 * @returns {boolean} True si el estado es válido
 */
export const isValidResetTokenStatus = (status) => {
  return VALID_RESET_TOKEN_STATUS.includes(status);
};

/**
 * Verifica si un token está expirado
 * 
 * @param {string} expiresAt - Fecha de expiración (ISO 8601)
 * @returns {boolean} True si el token está expirado
 */
export const isTokenExpired = (expiresAt) => {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date();
};

/**
 * Verifica si un token es usable (activo y no expirado)
 * 
 * @param {Object} reset - Registro de password reset
 * @returns {boolean} True si el token es usable
 */
export const isTokenUsable = (reset) => {
  if (!reset) return false;
  if (reset.used) return false;
  if (reset.status !== RESET_TOKEN_STATUS.ACTIVE) return false;
  if (isTokenExpired(reset.expiresAt)) return false;
  return true;
};

/**
 * Calcula el tiempo restante de un token en segundos
 * 
 * @param {string} expiresAt - Fecha de expiración (ISO 8601)
 * @returns {number} Segundos restantes (0 si expirado)
 */
export const getTokenRemainingTime = (expiresAt) => {
  if (!expiresAt) return 0;
  
  const now = new Date();
  const expiry = new Date(expiresAt);
  const remaining = expiry.getTime() - now.getTime();
  
  return Math.max(0, Math.floor(remaining / 1000));
};

/**
 * Obtiene la etiqueta legible de un estado de token
 * 
 * @param {string} status - Estado del token
 * @returns {string} Etiqueta legible
 */
export const getResetTokenStatusLabel = (status) => {
  const labels = {
    [RESET_TOKEN_STATUS.ACTIVE]: 'Activo',
    [RESET_TOKEN_STATUS.USED]: 'Usado',
    [RESET_TOKEN_STATUS.EXPIRED]: 'Expirado',
    [RESET_TOKEN_STATUS.REVOKED]: 'Revocado',
  };
  
  return labels[status] || status;
};

// =============================================================================
// DOCUMENTACIÓN DE LA TABLA EN SUPABASE
// =============================================================================

/**
 * Estructura de la tabla `password_reset` en Supabase
 * 
 * @constant {Object}
 * 
 * @example
 * // SQL para crear la tabla:
 * CREATE TABLE public.password_reset (
 *   id uuid NOT NULL DEFAULT gen_random_uuid(),
 *   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *   token character varying(255) NOT NULL,
 *   expires_at timestamp without time zone NOT NULL,
 *   status character varying(20) DEFAULT 'active',
 *   used boolean DEFAULT false,
 *   creado_por uuid REFERENCES auth.users(id),
 *   modificado_por uuid REFERENCES auth.users(id),
 *   fecha_creacion timestamp without time zone DEFAULT now(),
 *   fecha_edicion timestamp without time zone,
 *   CONSTRAINT password_reset_pkey PRIMARY KEY (id)
 * );
 * 
 * // Índice para búsquedas por token
 * CREATE INDEX idx_password_reset_token ON public.password_reset(token);
 * 
 * // Índice para limpieza de tokens expirados
 * CREATE INDEX idx_password_reset_expires_at ON public.password_reset(expires_at);
 */
export const PASSWORD_RESET_TABLE_STRUCTURE = {
  tableName: 'password_reset',
  schema: 'public',
  columns: {
    id: {
      type: 'uuid',
      nullable: false,
      default: 'gen_random_uuid()',
      primary: true,
    },
    userId: {
      type: 'uuid',
      nullable: false,
      foreignKey: {
        table: 'auth.users',
        column: 'id',
        onDelete: 'CASCADE',
      },
    },
    token: {
      type: 'character varying',
      nullable: false,
      maxLength: 255,
      indexed: true,
    },
    expiresAt: {
      type: 'timestamp without time zone',
      nullable: false,
      indexed: true,
    },
    status: {
      type: 'character varying',
      nullable: false,
      default: 'active',
      maxLength: 20,
      enum: VALID_RESET_TOKEN_STATUS,
    },
    used: {
      type: 'boolean',
      nullable: false,
      default: false,
    },
    creadoPor: {
      type: 'uuid',
      nullable: true,
      foreignKey: {
        table: 'auth.users',
        column: 'id',
      },
    },
    modificadoPor: {
      type: 'uuid',
      nullable: true,
      foreignKey: {
        table: 'auth.users',
        column: 'id',
      },
    },
    fecha_creacion: {
      type: 'timestamp without time zone',
      nullable: true,
      default: 'now()',
    },
    fecha_edicion: {
      type: 'timestamp without time zone',
      nullable: true,
    },
  },
  indexes: [
    { 
      name: 'idx_password_reset_token', 
      columns: ['token'],
      unique: false,
    },
    { 
      name: 'idx_password_reset_expires_at', 
      columns: ['expires_at'],
      unique: false,
    },
    { 
      name: 'idx_password_reset_user_id', 
      columns: ['user_id'],
      unique: false,
    },
  ],
  constraints: [
    {
      name: 'password_reset_pkey',
      type: 'PRIMARY KEY',
      columns: ['id'],
    },
    {
      name: 'password_reset_user_id_fkey',
      type: 'FOREIGN KEY',
      columns: ['user_id'],
      references: { table: 'auth.users', column: 'id' },
      onDelete: 'CASCADE',
    },
  ],
};

// =============================================================================
// REGLAS DE NEGOCIO
// =============================================================================

/**
 * Reglas de negocio para password reset
 * 
 * @constant {Object}
 */
export const PASSWORD_RESET_BUSINESS_RULES = {
  /**
   * Tiempo de expiración de tokens (1 hora)
   * @type {number}
   */
  TOKEN_EXPIRY_MS: DEFAULT_TOKEN_EXPIRY_MS,
  
  /**
   * Tiempo de expiración en formato string
   * @type {string}
   */
  TOKEN_EXPIRY_STRING: DEFAULT_TOKEN_EXPIRY_STRING,
  
  /**
   * Longitud del token en bytes
   * @type {number}
   */
  TOKEN_BYTE_LENGTH: TOKEN_BYTE_LENGTH,
  
  /**
   * Longitud del token en caracteres hex (32 bytes * 2)
   * @type {number}
   */
  TOKEN_HEX_LENGTH: TOKEN_BYTE_LENGTH * 2,
  
  /**
   * Rondas de bcrypt para hashear tokens
   * @type {number}
   */
  BCRYPT_SALT_ROUNDS: BCRYPT_SALT_ROUNDS,
  
  /**
   * Máximo de tokens activos por usuario
   * @type {number}
   */
  MAX_ACTIVE_TOKENS_PER_USER: 3,
  
  /**
   * Tiempo mínimo entre solicitudes de reset (en ms)
   * @type {number}
   */
  MIN_TIME_BETWEEN_REQUESTS: 60000, // 1 minuto
  
  /**
   * Mínimo de caracteres para contraseña nueva
   * @type {number}
   */
  MIN_PASSWORD_LENGTH: 8,
  
  /**
   * Máximo de caracteres para contraseña nueva
   * @type {number}
   */
  MAX_PASSWORD_LENGTH: 128,
};

// =============================================================================
// SCRIPT SQL PARA CREAR LA TABLA
// =============================================================================

/**
 * Script SQL completo para crear la tabla password_reset
 * 
 * @constant {string}
 */
export const CREATE_PASSWORD_RESET_TABLE_SQL = `
-- =============================================================================
-- TABLA: password_reset
-- PROPÓSITO: Almacenar tokens temporales para restablecimiento de contraseña
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.password_reset (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token character varying(255) NOT NULL,
  expires_at timestamp without time zone NOT NULL,
  status character varying(20) NOT NULL DEFAULT 'active',
  used boolean NOT NULL DEFAULT false,
  creado_por uuid,
  modificado_por uuid,
  fecha_creacion timestamp without time zone DEFAULT now(),
  fecha_edicion timestamp without time zone,
  
  CONSTRAINT password_reset_pkey PRIMARY KEY (id),
  CONSTRAINT password_reset_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE,
  CONSTRAINT password_reset_creado_por_fkey 
    FOREIGN KEY (creado_por) 
    REFERENCES auth.users(id),
  CONSTRAINT password_reset_modificado_por_fkey 
    FOREIGN KEY (modificado_por) 
    REFERENCES auth.users(id),
  CONSTRAINT password_reset_status_check 
    CHECK (status IN ('active', 'used', 'expired', 'revoked'))
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_password_reset_token 
  ON public.password_reset(token);

CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at 
  ON public.password_reset(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_user_id 
  ON public.password_reset(user_id);

-- Comentario de la tabla
COMMENT ON TABLE public.password_reset 
  IS 'Almacena tokens temporales para restablecimiento de contraseña de usuarios';

-- Comentario de columnas
COMMENT ON COLUMN public.password_reset.token 
  IS 'Token hasheado con bcrypt (nunca almacenar en texto plano)';

COMMENT ON COLUMN public.password_reset.expires_at 
  IS 'Fecha y hora de expiración del token';

COMMENT ON COLUMN public.password_reset.used 
  IS 'Indica si el token ya fue usado para resetear contraseña';

COMMENT ON COLUMN public.password_reset.status 
  IS 'Estado actual del token: active, used, expired, revoked';
`;

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta todas las constantes, esquemas y funciones del modelo
 * 
 * @example
 * // Importación named (recomendado)
 * import { 
 *   RESET_TOKEN_STATUS, 
 *   createPasswordResetSchema,
 *   validateCreatePasswordReset,
 *   isTokenUsable
 * } from './models/PasswordReset.js';
 * 
 * @example
 * // Importación por defecto
 * import PasswordReset from './models/PasswordReset.js';
 * PasswordReset.RESET_TOKEN_STATUS;
 * PasswordReset.createPasswordResetSchema;
 */
export default {
  // Constantes de estado
  RESET_TOKEN_STATUS,
  VALID_RESET_TOKEN_STATUS,
  
  // Constantes de configuración
  DEFAULT_TOKEN_EXPIRY_MS,
  DEFAULT_TOKEN_EXPIRY_STRING,
  TOKEN_BYTE_LENGTH,
  BCRYPT_SALT_ROUNDS,
  
  // Reglas de negocio
  PASSWORD_RESET_BUSINESS_RULES,
  
  // Esquemas de validación
  createPasswordResetSchema,
  updatePasswordResetSchema,
  passwordResetIdSchema,
  plainTokenSchema,
  passwordResetSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  
  // Funciones de validación
  validateCreatePasswordReset,
  validateUpdatePasswordReset,
  validatePasswordResetId,
  validatePlainToken,
  validateForgotPassword,
  validateResetPassword,
  
  // Funciones de utilidad
  formatPasswordResetForResponse,
  createEmptyPasswordReset,
  isValidResetTokenStatus,
  isTokenExpired,
  isTokenUsable,
  getTokenRemainingTime,
  getResetTokenStatusLabel,
  
  // Documentación de tabla
  PASSWORD_RESET_TABLE_STRUCTURE,
  CREATE_PASSWORD_RESET_TABLE_SQL,
};