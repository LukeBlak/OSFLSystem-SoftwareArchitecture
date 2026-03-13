/**
 * =============================================================================
 * MODELO DE USUARIO - CAPA DE DOMINIO
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir la entidad de dominio Usuario según el modelo de datos
 * - Proveer esquemas de validación con Zod para la entidad
 * - Centralizar constantes y enumeraciones relacionadas con Usuarios
 * - Documentar la estructura de la tabla `usuario` en Supabase
 * 
 * Arquitectura:
 * - Capa: Dominio (Entidades)
 * - Patrón: Domain Model + Validation Schema
 * - Base de datos: Supabase (PostgreSQL) - Tabla: `usuario`
 * - Autenticación: Supabase Auth (auth.users)
 * 
 * Relación con otras entidades:
 * - Tiene muchos: Miembros (1:N) - cuando es líder de organización
 * - Tiene muchos: Comités (1:N) - cuando es líder de comité
 * - Pertenece a: Organización (N:1) - como miembro o líder
 * - Extiende de: auth.users (Supabase Auth)
 * 
 * @module models/User
 * @layer Domain
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTES DE USUARIO
// =============================================================================

/**
 * Roles disponibles en el sistema según el Modelo de Dominio
 * 
 * @constant {Object}
 * @readonly
 */
export const USER_ROLES = {
  /** Super Administrador - Acceso total al sistema */
  SUPER_ADMIN: 'super_admin',
  
  /** Administrador de plataforma - Gestión administrativa */
  ADMIN: 'admin',
  
  /** Líder de Organización - Gestiona una organización específica */
  LIDER_ORGANIZACION: 'lider_organizacion',
  
  /** Líder de Comité - Gestiona un comité específico */
  LIDER_COMITE: 'lider_comite',
  
  /** Miembro/Voluntario - Acceso básico */
  MIEMBRO: 'miembro',
};

/**
 * Array de todos los roles válidos
 * @constant {Array<string>}
 */
export const VALID_USER_ROLES = Object.values(USER_ROLES);

/**
 * Estados posibles de un usuario
 * 
 * @constant {Object}
 * @readonly
 */
export const USER_STATUS = {
  /** Usuario activo y operativo */
  ACTIVO: true,
  
  /** Usuario inactivo o suspendido */
  INACTIVO: false,
};

/**
 * Array de todos los estados válidos
 * @constant {Array<boolean>}
 */
export const VALID_USER_STATUS = Object.values(USER_STATUS);

/**
 * Tipos de verificación de email
 * 
 * @constant {Object}
 * @readonly
 */
export const EMAIL_VERIFICATION = {
  /** Email verificado */
  VERIFIED: 'verified',
  
  /** Email pendiente de verificación */
  PENDING: 'pending',
  
  /** Email no verificado */
  UNVERIFIED: 'unverified',
};

// =============================================================================
// ESQUEMAS DE VALIDACIÓN ZOD
// =============================================================================

/**
 * Esquema de validación para registro de usuario (Supabase Auth + public.usuario)
 * 
 * Se usa cuando se registra un nuevo usuario en el sistema
 * 
 * @type {z.ZodObject}
 */
export const registerUserSchema = z.object({
  /**
   * Email del usuario (único en el sistema)
   * Debe ser email válido, se usa para autenticación en Supabase Auth
   */
  email: z
    .string()
    .email('El email debe ser válido')
    .max(255, 'El email no puede exceder 255 caracteres')
    .transform(val => val.toLowerCase()),
  
  /**
   * Contraseña del usuario
   * Mínimo 8 caracteres, debe incluir mayúsculas, minúsculas y números
   * Se almacena hasheada en Supabase Auth
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
   * Rol del usuario en el sistema
   * Define los permisos y acceso del usuario
   */
  role: z
    .enum(VALID_USER_ROLES, {
      errorMap: () => ({
        message: `Rol inválido. Opciones: ${VALID_USER_ROLES.join(', ')}`,
      }),
    })
    .default(USER_ROLES.MIEMBRO),
  
  /**
   * Información adicional del perfil
   * Campos opcionales que se almacenan en public.usuario
   */
  profile: z.object({
    /** Nombre del usuario */
    nombre: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres')
      .optional(),
    
    /** Apellido del usuario */
    apellido: z
      .string()
      .min(2, 'El apellido debe tener al menos 2 caracteres')
      .max(100, 'El apellido no puede exceder 100 caracteres')
      .optional(),
    
    /** Teléfono de contacto */
    telefono: z
      .string()
      .regex(/^\d{8}$/, 'El teléfono debe tener 8 dígitos')
      .optional(),
    
    /** URL del avatar/foto de perfil */
    avatar: z
      .string()
      .url('El avatar debe ser una URL válida')
      .optional(),
    
    /** Dirección de residencia */
    direccion: z
      .string()
      .max(255, 'La dirección no puede exceder 255 caracteres')
      .optional(),
    
    /** Fecha de nacimiento */
    fechaNacimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
      .optional(),
  }).optional(),
  
  /**
   * ID de la organización asociada (si aplica)
   * Requerido para roles de líder_organizacion, lider_comite, miembro
   */
  organizationId: z
    .string()
    .uuid('El ID de organización debe ser un UUID válido')
    .optional(),
});

/**
 * Esquema de validación para login de usuario
 * 
 * @type {z.ZodObject}
 */
export const loginUserSchema = z.object({
  /**
   * Email del usuario
   */
  email: z
    .string()
    .email('El email debe ser válido')
    .transform(val => val.toLowerCase()),
  
  /**
   * Contraseña del usuario
   */
  password: z
    .string()
    .min(1, 'La contraseña es requerida'),
});

/**
 * Esquema de validación para actualización de perfil de usuario
 * 
 * Todos los campos son opcionales (partial)
 * Solo se actualizan los campos proporcionados
 * 
 * @type {z.ZodObject}
 */
export const updateUserProfileSchema = z.object({
  /**
   * Nombre del usuario (opcional para update)
   */
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),
  
  /**
   * Apellido del usuario (opcional para update)
   */
  apellido: z
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(100, 'El apellido no puede exceder 100 caracteres')
    .optional(),
  
  /**
   * Teléfono del usuario (opcional para update)
   */
  telefono: z
    .string()
    .regex(/^\d{8}$/, 'El teléfono debe tener 8 dígitos')
    .optional(),
  
  /**
   * Avatar del usuario (opcional para update)
   */
  avatar: z
    .string()
    .url('El avatar debe ser una URL válida')
    .optional()
    .nullable(),
  
  /**
   * Dirección del usuario (opcional para update)
   */
  direccion: z
    .string()
    .max(255, 'La dirección no puede exceder 255 caracteres')
    .optional(),
  
  /**
   * Fecha de nacimiento (opcional para update)
   */
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
    .optional(),
});

/**
 * Esquema de validación para cambio de contraseña
 * 
 * @type {z.ZodObject}
 */
export const changePasswordSchema = z.object({
  /**
   * Contraseña actual
   */
  currentPassword: z
    .string()
    .min(1, 'La contraseña actual es requerida'),
  
  /**
   * Nueva contraseña
   */
  newPassword: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe incluir mayúsculas, minúsculas y números'
    ),
  
  /**
   * Confirmación de nueva contraseña
   */
  newPasswordConfirm: z
    .string()
    .min(8, 'La confirmación debe tener al menos 8 caracteres'),
}).refine(
  (data) => data.newPassword === data.newPasswordConfirm,
  {
    message: 'Las contraseñas no coinciden',
    path: ['newPasswordConfirm'],
  }
);

/**
 * Esquema de validación para parámetros de ID
 * 
 * @type {z.ZodObject}
 */
export const userIdSchema = z.object({
  /**
   * ID del usuario (UUID)
   */
  id: z
    .string()
    .uuid('El ID del usuario debe ser un UUID válido'),
});

/**
 * Esquema completo de usuario (para respuestas de API)
 * 
 * @type {z.ZodObject}
 */
export const userSchema = z.object({
  /** ID único del usuario en Supabase Auth (UUID) */
  id: z.string().uuid(),
  
  /** Email del usuario */
  email: z.string().email(),
  
  /** Rol del usuario */
  role: z.string(),
  
  /** Información del perfil */
  profile: z.object({
    nombre: z.string().nullable(),
    apellido: z.string().nullable(),
    telefono: z.string().nullable(),
    avatar: z.string().nullable(),
    direccion: z.string().nullable(),
    fechaNacimiento: z.string().nullable(),
  }),
  
  /** ID de la organización asociada */
  organizationId: z.string().uuid().nullable(),
  
  /** Estado activo del usuario */
  isActive: z.boolean(),
  
  /** Email verificado */
  emailVerified: z.boolean(),
  
  /** Fecha de creación */
  createdAt: z.string().datetime().nullable(),
  
  /** Fecha de última modificación */
  updatedAt: z.string().datetime().nullable(),
  
  /** Última vez que inició sesión */
  lastSignInAt: z.string().datetime().nullable(),
});

// =============================================================================
// FUNCIONES DE UTILIDAD
// =============================================================================

/**
 * Valida los datos para registro de usuario
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 * 
 * @example
 * const validData = validateRegisterUser({
 *   email: 'usuario@ejemplo.com',
 *   password: 'Contraseña123',
 *   role: 'miembro',
 *   profile: { nombre: 'Juan', apellido: 'Pérez' }
 * });
 */
export const validateRegisterUser = (data) => {
  return registerUserSchema.parse(data);
};

/**
 * Valida los datos para login de usuario
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateLoginUser = (data) => {
  return loginUserSchema.parse(data);
};

/**
 * Valida los datos para actualización de perfil
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateUpdateUserProfile = (data) => {
  return updateUserProfileSchema.parse(data);
};

/**
 * Valida los datos para cambio de contraseña
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateChangePassword = (data) => {
  return changePasswordSchema.parse(data);
};

/**
 * Valida el ID de un usuario
 * 
 * @param {string} id - ID del usuario
 * @returns {Object} ID validado
 * @throws {z.ZodError} Si el ID no es válido
 */
export const validateUserId = (id) => {
  return userIdSchema.parse({ id });
};

/**
 * Formatea un usuario para respuesta de API
 * 
 * Elimina campos sensibles y formatea fechas
 * 
 * @param {Object} user - Objeto usuario de la base de datos
 * @returns {Object} Usuario formateado para API
 */
export const formatUserForResponse = (user) => {
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    profile: {
      nombre: user.profile?.nombre || user.nombre || null,
      apellido: user.profile?.apellido || user.apellido || null,
      telefono: user.profile?.telefono || user.telefono || null,
      avatar: user.profile?.avatar || user.avatar || null,
      direccion: user.profile?.direccion || user.direccion || null,
      fechaNacimiento: user.profile?.fechaNacimiento || user.fechanacimiento || null,
    },
    organizationId: user.organizationId || user.organizacionId || null,
    isActive: user.isActive ?? user.estadoActivo ?? true,
    emailVerified: user.emailVerified ?? user.email_confirmed_at !== null,
    createdAt: user.createdAt || user.fecha_creacion,
    updatedAt: user.updatedAt || user.fecha_edicion,
    lastSignInAt: user.lastSignInAt || user.last_sign_in_at,
  };
};

/**
 * Genera un objeto de usuario vacío con valores por defecto
 * 
 * @param {string} email - Email del usuario
 * @param {string} role - Rol del usuario
 * @returns {Object} Usuario con valores por defecto
 */
export const createEmptyUser = (email, role = USER_ROLES.MIEMBRO) => ({
  email: email,
  role: role,
  profile: {
    nombre: '',
    apellido: '',
    telefono: '',
    avatar: null,
    direccion: '',
    fechaNacimiento: null,
  },
  organizationId: null,
  isActive: true,
});

/**
 * Verifica si un rol de usuario es válido
 * 
 * @param {string} role - Rol a verificar
 * @returns {boolean} True si el rol es válido
 */
export const isValidUserRole = (role) => {
  return VALID_USER_ROLES.includes(role);
};

/**
 * Verifica si un usuario tiene un rol específico
 * 
 * @param {Object} user - Objeto de usuario
 * @param {string|string[]} requiredRole - Rol o array de roles requeridos
 * @returns {boolean} True si el usuario tiene el rol requerido
 * 
 * @example
 * hasUserRole(user, USER_ROLES.ADMIN);
 * hasUserRole(user, [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]);
 */
export const hasUserRole = (user, requiredRole) => {
  if (!user || !user.role) return false;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }
  
  return user.role === requiredRole;
};

/**
 * Verifica si un usuario tiene al menos un nivel de rol
 * 
 * Jerarquía: SUPER_ADMIN > ADMIN > LIDER_ORGANIZACION > LIDER_COMITE > MIEMBRO
 * 
 * @param {Object} user - Objeto de usuario
 * @param {string} minRole - Rol mínimo requerido
 * @returns {boolean} True si el usuario tiene el nivel mínimo
 */
export const hasMinUserRole = (user, minRole) => {
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

/**
 * Obtiene la etiqueta legible de un rol de usuario
 * 
 * @param {string} role - Rol del usuario
 * @returns {string} Etiqueta legible
 */
export const getUserRoleLabel = (role) => {
  const labels = {
    [USER_ROLES.SUPER_ADMIN]: 'Super Administrador',
    [USER_ROLES.ADMIN]: 'Administrador',
    [USER_ROLES.LIDER_ORGANIZACION]: 'Líder de Organización',
    [USER_ROLES.LIDER_COMITE]: 'Líder de Comité',
    [USER_ROLES.MIEMBRO]: 'Miembro/Voluntario',
  };
  
  return labels[role] || role;
};

/**
 * Valida la fortaleza de una contraseña
 * 
 * @param {string} password - Contraseña a validar
 * @returns {Object} Resultado de validación
 * 
 * @example
 * const result = validatePasswordStrength('Contraseña123');
 * // { isValid: true, score: 3, feedback: [] }
 */
export const validatePasswordStrength = (password) => {
  const feedback = [];
  let score = 0;
  
  // Longitud mínima
  if (password.length >= 8) score++;
  else feedback.push('La contraseña debe tener al menos 8 caracteres');
  
  // Longitud recomendada
  if (password.length >= 12) score++;
  
  // Mayúsculas
  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Debe incluir al menos una letra mayúscula');
  
  // Minúsculas
  if (/[a-z]/.test(password)) score++;
  else feedback.push('Debe incluir al menos una letra minúscula');
  
  // Números
  if (/\d/.test(password)) score++;
  else feedback.push('Debe incluir al menos un número');
  
  // Caracteres especiales
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  else feedback.push('Se recomienda incluir caracteres especiales');
  
  return {
    isValid: score >= 3 && password.length >= 8,
    score: score,
    maxScore: 6,
    feedback: feedback,
  };
};

/**
 * Enmascara un email para mostrar parcialmente
 * 
 * @param {string} email - Email a enmascarar
 * @returns {string} Email enmascarado
 * 
 * @example
 * maskEmail('juan.perez@example.com'); // 'j***@example.com'
 */
export const maskEmail = (email) => {
  if (!email) return '';
  
  const [username, domain] = email.split('@');
  const maskedUsername = username.charAt(0) + '***';
  
  return `${maskedUsername}@${domain}`;
};

// =============================================================================
// DOCUMENTACIÓN DE LA TABLA EN SUPABASE
// =============================================================================

/**
 * Estructura de la tabla `usuario` en Supabase
 * 
 * @constant {Object}
 * 
 * @example
 * // SQL para crear la tabla:
 * CREATE TABLE public.usuario (
 *   id uuid NOT NULL DEFAULT gen_random_uuid(),
 *   nombre character varying,
 *   email character varying NOT NULL UNIQUE,
 *   password character varying NOT NULL,
 *   creado_por uuid REFERENCES auth.users(id),
 *   modificado_por uuid REFERENCES auth.users(id),
 *   fecha_creacion timestamp without time zone DEFAULT now(),
 *   fecha_edicion timestamp without time zone,
 *   CONSTRAINT usuario_pkey PRIMARY KEY (id)
 * );
 */
export const USER_TABLE_STRUCTURE = {
  tableName: 'usuario',
  schema: 'public',
  columns: {
    id: {
      type: 'uuid',
      nullable: false,
      default: 'gen_random_uuid()',
      primary: true,
      foreignKey: {
        table: 'auth.users',
        column: 'id',
      },
    },
    nombre: {
      type: 'character varying',
      nullable: true,
      maxLength: 100,
    },
    email: {
      type: 'character varying',
      nullable: false,
      maxLength: 255,
      unique: true,
    },
    password: {
      type: 'character varying',
      nullable: false,
      maxLength: 255,
      note: 'Hasheada con bcrypt (Supabase Auth)',
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
    { name: 'usuario_email_idx', columns: ['email'], unique: true },
    { name: 'usuario_nombre_idx', columns: ['nombre'] },
  ],
  constraints: [
    {
      name: 'usuario_pkey',
      type: 'PRIMARY KEY',
      columns: ['id'],
    },
    {
      name: 'usuario_email_key',
      type: 'UNIQUE',
      columns: ['email'],
    },
    {
      name: 'usuario_id_fkey',
      type: 'FOREIGN KEY',
      columns: ['id'],
      references: { table: 'auth.users', column: 'id' },
      onDelete: 'CASCADE',
    },
  ],
};

/**
 * Estructura de la tabla `auth.users` en Supabase Auth
 * 
 * @constant {Object}
 * 
 * @note Esta tabla es gestionada automáticamente por Supabase Auth
 *       No se debe modificar directamente
 */
export const AUTH_USERS_TABLE_STRUCTURE = {
  tableName: 'auth.users',
  schema: 'auth',
  managed: 'Supabase Auth',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      default: 'gen_random_uuid()',
    },
    email: {
      type: 'character varying',
      unique: true,
    },
    encrypted_password: {
      type: 'character varying',
      note: 'Contraseña hasheada',
    },
    email_confirmed_at: {
      type: 'timestamp without time zone',
      note: 'Fecha de confirmación de email',
    },
    created_at: {
      type: 'timestamp without time zone',
      default: 'now()',
    },
    updated_at: {
      type: 'timestamp without time zone',
    },
    last_sign_in_at: {
      type: 'timestamp without time zone',
    },
    raw_app_meta_data: {
      type: 'jsonb',
      note: 'Metadatos de aplicación (roles, permisos)',
    },
    raw_user_meta_data: {
      type: 'jsonb',
      note: 'Metadatos de usuario (perfil, organización)',
    },
  },
};

// =============================================================================
// REGLAS DE NEGOCIO
// =============================================================================

/**
 * Reglas de negocio para usuarios
 * 
 * @constant {Object}
 */
export const USER_BUSINESS_RULES = {
  /**
   * Longitud mínima de contraseña
   * @type {number}
   */
  MIN_PASSWORD_LENGTH: 8,
  
  /**
   * Longitud máxima de contraseña
   * @type {number}
   */
  MAX_PASSWORD_LENGTH: 128,
  
  /**
   * Longitud mínima de nombre
   * @type {number}
   */
  MIN_NAME_LENGTH: 2,
  
  /**
   * Longitud máxima de nombre
   * @type {number}
   */
  MAX_NAME_LENGTH: 100,
  
  /**
   * Longitud máxima de email
   * @type {number}
   */
  MAX_EMAIL_LENGTH: 255,
  
  /**
   * Formato de teléfono (El Salvador - 8 dígitos)
   * @type {string}
   */
  PHONE_FORMAT: '########',
  
  /**
   * Tiempo de expiración de token de reset (1 hora)
   * @type {number}
   */
  RESET_TOKEN_EXPIRY_MS: 60 * 60 * 1000,
  
  /**
   * Intentos máximos de login antes de bloqueo temporal
   * @type {number}
   */
  MAX_LOGIN_ATTEMPTS: 5,
  
  /**
   * Tiempo de bloqueo después de intentos fallidos (15 minutos)
   * @type {number}
   */
  LOGIN_LOCKOUT_MS: 15 * 60 * 1000,
};

// =============================================================================
// SCRIPT SQL PARA CREAR TABLA
// =============================================================================

/**
 * Script SQL completo para crear la tabla usuario
 * 
 * @constant {string}
 */
export const CREATE_USER_TABLE_SQL = `
-- =============================================================================
-- TABLA: usuario
-- PROPÓSITO: Almacenar información extendida de usuarios (complementa auth.users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.usuario (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre character varying(100),
  email character varying(255) NOT NULL,
  password character varying(255) NOT NULL,
  creado_por uuid,
  modificado_por uuid,
  fecha_creacion timestamp without time zone DEFAULT now(),
  fecha_edicion timestamp without time zone,
  
  CONSTRAINT usuario_pkey PRIMARY KEY (id),
  CONSTRAINT usuario_email_key UNIQUE (email),
  CONSTRAINT usuario_id_fkey 
    FOREIGN KEY (id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE,
  CONSTRAINT usuario_creado_por_fkey 
    FOREIGN KEY (creado_por) 
    REFERENCES auth.users(id),
  CONSTRAINT usuario_modificado_por_fkey 
    FOREIGN KEY (modificado_por) 
    REFERENCES auth.users(id)
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS usuario_email_idx 
  ON public.usuario(email);

CREATE INDEX IF NOT EXISTS usuario_nombre_idx 
  ON public.usuario(nombre);

-- Comentario de la tabla
COMMENT ON TABLE public.usuario 
  IS 'Información extendida de usuarios (complementa auth.users de Supabase)';

-- Comentario de columnas
COMMENT ON COLUMN public.usuario.email 
  IS 'Email único del usuario (sincronizado con auth.users)';

COMMENT ON COLUMN public.usuario.password 
  IS 'Contraseña hasheada (gestionada por Supabase Auth)';
`;

/**
 * Trigger para sincronizar usuario entre auth.users y public.usuario
 * 
 * @constant {string}
 */
export const CREATE_USER_TRIGGER_SQL = `
-- =============================================================================
-- TRIGGER: Crear registro en public.usuario cuando se crea en auth.users
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuario (
    id,
    email,
    password,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    new.encrypted_password,
    new.created_at,
    new.updated_at
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
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
 *   USER_ROLES, 
 *   registerUserSchema,
 *   validateRegisterUser,
 *   hasUserRole
 * } from './models/User.js';
 * 
 * @example
 * // Importación por defecto
 * import User from './models/User.js';
 * User.USER_ROLES;
 * User.registerUserSchema;
 */
export default {
  // Constantes de roles
  USER_ROLES,
  VALID_USER_ROLES,
  
  // Constantes de estado
  USER_STATUS,
  VALID_USER_STATUS,
  
  // Constantes de verificación
  EMAIL_VERIFICATION,
  
  // Reglas de negocio
  USER_BUSINESS_RULES,
  
  // Esquemas de validación
  registerUserSchema,
  loginUserSchema,
  updateUserProfileSchema,
  changePasswordSchema,
  userIdSchema,
  userSchema,
  
  // Funciones de validación
  validateRegisterUser,
  validateLoginUser,
  validateUpdateUserProfile,
  validateChangePassword,
  validateUserId,
  
  // Funciones de utilidad
  formatUserForResponse,
  createEmptyUser,
  isValidUserRole,
  hasUserRole,
  hasMinUserRole,
  getUserRoleLabel,
  validatePasswordStrength,
  maskEmail,
  
  // Documentación de tabla
  USER_TABLE_STRUCTURE,
  AUTH_USERS_TABLE_STRUCTURE,
  CREATE_USER_TABLE_SQL,
  CREATE_USER_TRIGGER_SQL,
};