/**
 * =============================================================================
 * MODELO DE MIEMBRO - CAPA DE DOMINIO
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir la entidad de dominio Miembro/Voluntario según el modelo de datos
 * - Proveer esquemas de validación con Zod para la entidad
 * - Centralizar constantes y enumeraciones relacionadas con Miembros
 * - Documentar la estructura de la tabla `miembro` en Supabase
 * 
 * Arquitectura:
 * - Capa: Dominio (Entidades)
 * - Patrón: Domain Model + Validation Schema
 * - Base de datos: Supabase (PostgreSQL) - Tabla: `miembro`
 * 
 * Relación con otras entidades:
 * - Extiende de: Usuario (1:1)
 * - Pertenece a: Organización (N:1)
 * - Puede ser: Líder de Comité (1:0..1)
 * - Tiene muchos: Registros de Horas (1:N)
 * - Tiene muchos: Postulaciones a Proyectos (1:N)
 * 
 * @module models/Member
 * @layer Domain
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTES DE MIEMBRO
// =============================================================================

/**
 * Estados posibles de un miembro
 * 
 * @constant {Object}
 * @readonly
 */
export const MEMBER_STATUS = {
  /** Miembro activo y operativo */
  ACTIVO: true,
  
  /** Miembro inactivo o dado de baja */
  INACTIVO: false,
};

/**
 * Array de todos los estados válidos
 * @constant {Array<boolean>}
 */
export const VALID_MEMBER_STATUS = Object.values(MEMBER_STATUS);

/**
 * Tipos de membresía disponibles
 * 
 * @constant {Object}
 * @readonly
 */
export const MEMBERSHIP_TYPE = {
  /** Voluntario regular */
  VOLUNTARIO: 'voluntario',
  
  /** Voluntario con liderazgo */
  LIDER: 'lider',
  
  /** Miembro fundador */
  FUNDADOR: 'fundador',
  
  /** Miembro honorífico */
  HONORIFICO: 'honorifico',
  
  /** Miembro temporal/provisional */
  TEMPORAL: 'temporal',
};

/**
 * Array de todos los tipos de membresía válidos
 * @constant {Array<string>}
 */
export const VALID_MEMBERSHIP_TYPE = Object.values(MEMBERSHIP_TYPE);

/**
 * Estados de validación de horas sociales
 * 
 * @constant {Object}
 * @readonly
 */
export const HOURS_VALIDATION_STATUS = {
  /** Horas pendientes de validación */
  PENDIENTE: 'pendiente',
  
  /** Horas validadas y aprobadas */
  VALIDADA: 'validada',
  
  /** Horas rechazadas */
  RECHAZADA: 'rechazada',
  
  /** Horas anuladas */
  ANULADA: 'anulada',
};

/**
 * Array de todos los estados de validación válidos
 * @constant {Array<string>}
 */
export const VALID_HOURS_VALIDATION_STATUS = Object.values(HOURS_VALIDATION_STATUS);

// =============================================================================
// ESQUEMAS DE VALIDACIÓN ZOD
// =============================================================================

/**
 * Esquema de validación para creación de miembros
 * 
 * Se usa cuando se registra un nuevo miembro/voluntario en el sistema
 * 
 * @type {z.ZodObject}
 */
export const createMemberSchema = z.object({
  /**
   * Documento Único de Identidad (DUI) de El Salvador
   * Formato: 00000000-0 (8 dígitos, guión, 1 dígito)
   */
  dui: z
    .string()
    .min(9, 'El DUI debe tener al menos 9 caracteres')
    .max(10, 'El DUI no puede exceder 10 caracteres')
    .regex(/^\d{8}-\d$/, 'El DUI debe tener formato 00000000-0')
    .transform(val => val.toUpperCase()),
  
  /**
   * Nombre completo del miembro
   * Mínimo 3 caracteres, máximo 150 caracteres
   */
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede exceder 150 caracteres')
    .trim(),
  
  /**
   * Email del miembro (único en el sistema)
   * Debe ser email válido
   */
  email: z
    .string()
    .email('El email debe ser válido')
    .max(255, 'El email no puede exceder 255 caracteres')
    .transform(val => val.toLowerCase()),
  
  /**
   * Teléfono de contacto
   * Formato El Salvador: 8 dígitos
   */
  telefono: z
    .string()
    .regex(/^\d{8}$/, 'El teléfono debe tener 8 dígitos')
    .optional(),
  
  /**
   * Fecha de nacimiento
   * Debe ser fecha válida y el miembro debe ser mayor de 16 años
   */
  fechanacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
    .optional(),
  
  /**
   * Dirección de residencia
   * Máximo 255 caracteres
   */
  direccion: z
    .string()
    .max(255, 'La dirección no puede exceder 255 caracteres')
    .optional(),
  
  /**
   * ID de la organización a la que pertenece
   * Requerido - UUID válido
   */
  organizacionId: z
    .string()
    .uuid('El ID de organización debe ser un UUID válido'),
  
  /**
   * Estado inicial del miembro
   * Por defecto: activo
   */
  estadoActivo: z
    .boolean()
    .default(true),
});

/**
 * Esquema de validación para actualización de miembros
 * 
 * Todos los campos son opcionales (partial)
 * Solo se actualizan los campos proporcionados
 * 
 * @type {z.ZodObject}
 */
export const updateMemberSchema = z.object({
  /**
   * DUI (opcional para update)
   */
  dui: z
    .string()
    .min(9, 'El DUI debe tener al menos 9 caracteres')
    .max(10, 'El DUI no puede exceder 10 caracteres')
    .regex(/^\d{8}-\d$/, 'El DUI debe tener formato 00000000-0')
    .optional(),
  
  /**
   * Nombre (opcional para update)
   */
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede exceder 150 caracteres')
    .optional(),
  
  /**
   * Email (opcional para update)
   */
  email: z
    .string()
    .email('El email debe ser válido')
    .max(255, 'El email no puede exceder 255 caracteres')
    .optional(),
  
  /**
   * Teléfono (opcional para update)
   */
  telefono: z
    .string()
    .regex(/^\d{8}$/, 'El teléfono debe tener 8 dígitos')
    .optional(),
  
  /**
   * Fecha de nacimiento (opcional para update)
   */
  fechanacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
    .optional(),
  
  /**
   * Dirección (opcional para update)
   */
  direccion: z
    .string()
    .max(255, 'La dirección no puede exceder 255 caracteres')
    .optional(),
  
  /**
   * Estado activo (opcional para update)
   */
  estadoActivo: z
    .boolean()
    .optional(),
  
  /**
   * Horas totales acumuladas (solo administración)
   */
  horasTotales: z
    .number()
    .min(0, 'Las horas totales no pueden ser negativas')
    .optional(),
});

/**
 * Esquema de validación para parámetros de ID
 * 
 * Se usa para validar IDs en rutas (params)
 * 
 * @type {z.ZodObject}
 */
export const memberIdSchema = z.object({
  /**
   * ID del miembro (UUID)
   */
  id: z
    .string()
    .uuid('El ID del miembro debe ser un UUID válido'),
});

/**
 * Esquema de validación para query parameters de listados
 * 
 * Se usa para validar filtros en consultas de listados
 * 
 * @type {z.ZodObject}
 */
export const listMembersSchema = z.object({
  /**
   * Filtrar por organización
   */
  organizacionId: z
    .string()
    .uuid()
    .optional(),
  
  /**
   * Filtrar por estado activo
   */
  estadoActivo: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  
  /**
   * Buscar por nombre o email
   */
  search: z
    .string()
    .max(100)
    .optional(),
  
  /**
   * Página para paginación
   * Default: 1
   */
  page: z
    .string()
    .regex(/^\d+$/, 'La página debe ser un número')
    .transform(val => parseInt(val, 10))
    .default('1'),
  
  /**
   * Límite de resultados por página
   * Default: 10, Máximo: 100
   */
  limit: z
    .string()
    .regex(/^\d+$/, 'El límite debe ser un número')
    .transform(val => parseInt(val, 10))
    .default('10'),
  
  /**
   * Campo para ordenar resultados
   */
  sortBy: z
    .enum(['nombre', 'email', 'fechaCreacion', 'horasTotales'])
    .default('fechaCreacion'),
  
  /**
   * Orden de resultados (ASC o DESC)
   */
  sortOrder: z
    .enum(['ASC', 'DESC'])
    .default('DESC'),
});

/**
 * Esquema de validación para registro de horas
 * 
 * @type {z.ZodObject}
 */
export const registerHoursSchema = z.object({
  /**
   * ID del proyecto donde se registran las horas
   */
  proyectoId: z
    .string()
    .uuid('El ID del proyecto debe ser un UUID válido'),
  
  /**
   * Fecha del registro
   */
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD'),
  
  /**
   * Cantidad de horas registradas
   * Mínimo: 0.5, Máximo: 24
   */
  cantidadHoras: z
    .number()
    .min(0.5, 'Las horas mínimas son 0.5')
    .max(24, 'Las horas máximas por día son 24'),
  
  /**
   * Descripción de las actividades realizadas
   */
  descripcion: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
});

/**
 * Esquema completo del miembro (para respuestas de API)
 * 
 * Incluye todos los campos que puede tener un miembro
 * 
 * @type {z.ZodObject}
 */
export const memberSchema = z.object({
  /** ID único del miembro (UUID) */
  id: z.string().uuid(),
  
  /** DUI del miembro */
  dui: z.string(),
  
  /** Nombre completo */
  nombre: z.string(),
  
  /** Email */
  email: z.string().email(),
  
  /** Teléfono */
  telefono: z.string().nullable(),
  
  /** Fecha de nacimiento */
  fechanacimiento: z.string().nullable(),
  
  /** Dirección */
  direccion: z.string().nullable(),
  
  /** Horas totales acumuladas */
  horasTotales: z.number().default(0),
  
  /** Estado activo */
  estadoActivo: z.boolean().default(true),
  
  /** ID de la organización */
  organizacionId: z.string().uuid(),
  
  /** ID del usuario que creó el registro */
  creadoPor: z.string().uuid().nullable(),
  
  /** ID del usuario que modificó por última vez */
  modificadoPor: z.string().uuid().nullable(),
  
  /** Fecha de creación del registro */
  fechaCreacion: z.string().datetime().nullable(),
  
  /** Fecha de última modificación */
  fechaEdicion: z.string().datetime().nullable(),
});

// =============================================================================
// FUNCIONES DE UTILIDAD
// =============================================================================

/**
 * Valida los datos para crear un miembro
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 * 
 * @example
 * const validData = validateCreateMember({
 *   dui: '01234567-8',
 *   nombre: 'Juan Pérez',
 *   email: 'juan@example.com',
 *   organizacionId: 'uuid-organizacion'
 * });
 */
export const validateCreateMember = (data) => {
  return createMemberSchema.parse(data);
};

/**
 * Valida los datos para actualizar un miembro
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateUpdateMember = (data) => {
  return updateMemberSchema.parse(data);
};

/**
 * Valida el ID de un miembro
 * 
 * @param {string} id - ID del miembro
 * @returns {Object} ID validado
 * @throws {z.ZodError} Si el ID no es válido
 */
export const validateMemberId = (id) => {
  return memberIdSchema.parse({ id });
};

/**
 * Valida parámetros de listado de miembros
 * 
 * @param {Object} params - Parámetros de consulta
 * @returns {Object} Parámetros validados
 * @throws {z.ZodError} Si los parámetros no son válidos
 */
export const validateListMembers = (params) => {
  return listMembersSchema.parse(params);
};

/**
 * Valida datos para registro de horas
 * 
 * @param {Object} data - Datos del registro de horas
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateRegisterHours = (data) => {
  return registerHoursSchema.parse(data);
};

/**
 * Formatea un miembro para respuesta de API
 * 
 * Elimina campos sensibles y formatea fechas
 * 
 * @param {Object} member - Objeto miembro de la base de datos
 * @returns {Object} Miembro formateado para API
 */
export const formatMemberForResponse = (member) => {
  if (!member) return null;
  
  return {
    id: member.id,
    dui: member.dui,
    nombre: member.nombre,
    email: member.email,
    telefono: member.telefono,
    fechanacimiento: member.fechanacimiento,
    direccion: member.direccion,
    horasTotales: member.horasTotales,
    estadoActivo: member.estadoActivo,
    organizacionId: member.organizacionId,
    fechaCreacion: member.fechaCreacion,
    fechaEdicion: member.fechaEdicion,
    // Campos relacionados (si se incluyen)
    organizacion: member.organizacion || null,
    usuario: member.usuario || null,
    registroHoras: member.registroHoras || [],
    postulaciones: member.postulaciones || [],
  };
};

/**
 * Genera un objeto de miembro vacío con valores por defecto
 * 
 * Útil para inicializar formularios o datos
 * 
 * @param {string} organizacionId - ID de la organización
 * @returns {Object} Miembro con valores por defecto
 */
export const createEmptyMember = (organizacionId) => ({
  dui: '',
  nombre: '',
  email: '',
  telefono: '',
  fechanacimiento: null,
  direccion: '',
  horasTotales: 0,
  estadoActivo: true,
  organizacionId: organizacionId,
});

/**
 * Verifica si un estado de miembro es válido
 * 
 * @param {boolean} status - Estado a verificar
 * @returns {boolean} True si el estado es válido
 */
export const isValidMemberStatus = (status) => {
  return VALID_MEMBER_STATUS.includes(status);
};

/**
 * Verifica si un tipo de membresía es válido
 * 
 * @param {string} type - Tipo de membresía a verificar
 * @returns {boolean} True si el tipo es válido
 */
export const isValidMembershipType = (type) => {
  return VALID_MEMBERSHIP_TYPE.includes(type);
};

/**
 * Obtiene la etiqueta legible de un estado de miembro
 * 
 * @param {boolean} status - Estado del miembro
 * @returns {string} Etiqueta legible
 */
export const getMemberStatusLabel = (status) => {
  const labels = {
    [MEMBER_STATUS.ACTIVO]: 'Activo',
    [MEMBER_STATUS.INACTIVO]: 'Inactivo',
  };
  
  return labels[status] || (status ? 'Activo' : 'Inactivo');
};

/**
 * Valida el formato del DUI de El Salvador
 * 
 * @param {string} dui - DUI a validar
 * @returns {Object} Resultado de validación
 * 
 * @example
 * const result = validateDUI('01234567-8');
 * // { isValid: true, formatted: '01234567-8' }
 */
export const validateDUI = (dui) => {
  // Eliminar espacios y caracteres no deseados
  const cleaned = dui.trim().replace(/\s/g, '');
  
  // Patrón para DUI de El Salvador: 8 dígitos, guión, 1 dígito
  const pattern = /^\d{8}-\d$/;
  
  // Intentar formatear si no tiene guión
  let formatted = cleaned;
  if (!pattern.test(cleaned) && /^\d{9}$/.test(cleaned)) {
    formatted = `${cleaned.slice(0, 8)}-${cleaned.slice(8)}`;
  }
  
  return {
    isValid: pattern.test(formatted),
    formatted: formatted.toUpperCase(),
    original: dui,
  };
};

/**
 * Calcula la edad a partir de una fecha de nacimiento
 * 
 * @param {string} birthDate - Fecha de nacimiento (YYYY-MM-DD)
 * @returns {number|null} Edad en años o null si fecha inválida
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
 * Verifica si un miembro es mayor de edad para voluntariado
 * 
 * @param {string} birthDate - Fecha de nacimiento
 * @param {number} [minAge=16] - Edad mínima requerida
 * @returns {boolean} True si cumple la edad mínima
 */
export const isMinimumAge = (birthDate, minAge = 16) => {
  const age = calculateAge(birthDate);
  return age !== null && age >= minAge;
};

// =============================================================================
// DOCUMENTACIÓN DE LA TABLA EN SUPABASE
// =============================================================================

/**
 * Estructura de la tabla `miembro` en Supabase
 * 
 * @constant {Object}
 * 
 * @example
 * // SQL para crear la tabla:
 * CREATE TABLE public.miembro (
 *   id uuid NOT NULL DEFAULT gen_random_uuid(),
 *   dui character varying NOT NULL UNIQUE,
 *   nombre character varying NOT NULL,
 *   email character varying NOT NULL UNIQUE,
 *   telefono character varying,
 *   fechanacimiento date,
 *   direccion character varying,
 *   horastotales numeric DEFAULT 0,
 *   estadoactivo boolean DEFAULT true,
 *   creado_por uuid REFERENCES auth.users(id),
 *   modificado_por uuid REFERENCES auth.users(id),
 *   fecha_creacion timestamp without time zone DEFAULT now(),
 *   fecha_edicion timestamp without time zone,
 *   CONSTRAINT miembro_pkey PRIMARY KEY (id),
 *   CONSTRAINT miembro_id_fkey FOREIGN KEY (id) REFERENCES public.usuario(id)
 * );
 */
export const MEMBER_TABLE_STRUCTURE = {
  tableName: 'miembro',
  schema: 'public',
  columns: {
    id: {
      type: 'uuid',
      nullable: false,
      default: 'gen_random_uuid()',
      primary: true,
      foreignKey: {
        table: 'usuario',
        column: 'id',
      },
    },
    dui: {
      type: 'character varying',
      nullable: false,
      maxLength: 10,
      unique: true,
    },
    nombre: {
      type: 'character varying',
      nullable: false,
      maxLength: 150,
    },
    email: {
      type: 'character varying',
      nullable: false,
      maxLength: 255,
      unique: true,
    },
    telefono: {
      type: 'character varying',
      nullable: true,
      maxLength: 8,
    },
    fechanacimiento: {
      type: 'date',
      nullable: true,
    },
    direccion: {
      type: 'character varying',
      nullable: true,
      maxLength: 255,
    },
    horasTotales: {
      type: 'numeric',
      nullable: false,
      default: 0,
    },
    estadoActivo: {
      type: 'boolean',
      nullable: false,
      default: true,
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
    { name: 'miembro_dui_idx', columns: ['dui'] },
    { name: 'miembro_email_idx', columns: ['email'] },
    { name: 'miembro_estado_idx', columns: ['estadoactivo'] },
    { name: 'miembro_nombre_idx', columns: ['nombre'] },
  ],
  constraints: [
    {
      name: 'miembro_pkey',
      type: 'PRIMARY KEY',
      columns: ['id'],
    },
    {
      name: 'miembro_dui_key',
      type: 'UNIQUE',
      columns: ['dui'],
    },
    {
      name: 'miembro_email_key',
      type: 'UNIQUE',
      columns: ['email'],
    },
    {
      name: 'miembro_id_fkey',
      type: 'FOREIGN KEY',
      columns: ['id'],
      references: { table: 'usuario', column: 'id' },
    },
  ],
};

// =============================================================================
// REGLAS DE NEGOCIO
// =============================================================================

/**
 * Reglas de negocio para miembros
 * 
 * @constant {Object}
 */
export const MEMBER_BUSINESS_RULES = {
  /**
   * Edad mínima para ser voluntario
   * @type {number}
   */
  MIN_AGE: 16,
  
  /**
   * Horas máximas que se pueden registrar por día
   * @type {number}
   */
  MAX_HOURS_PER_DAY: 24,
  
  /**
   * Horas mínimas que se pueden registrar por sesión
   * @type {number}
   */
  MIN_HOURS_PER_SESSION: 0.5,
  
  /**
   * Longitud mínima del nombre
   * @type {number}
   */
  MIN_NAME_LENGTH: 3,
  
  /**
   * Longitud máxima del nombre
   * @type {number}
   */
  MAX_NAME_LENGTH: 150,
  
  /**
   * Formato requerido para DUI
   * @type {string}
   */
  DUI_FORMAT: '########-#',
  
  /**
   * Formato requerido para teléfono (El Salvador)
   * @type {string}
   */
  PHONE_FORMAT: '########',
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta todas las constantes, esquemas y funciones del modelo
 * 
 * @example
 * // Importación named (recomendado)
 * import { 
 *   MEMBER_STATUS, 
 *   createMemberSchema,
 *   validateCreateMember 
 * } from './models/Member.js';
 * 
 * @example
 * // Importación por defecto
 * import Member from './models/Member.js';
 * Member.MEMBER_STATUS;
 * Member.createMemberSchema;
 */
export default {
  // Constantes de estado
  MEMBER_STATUS,
  VALID_MEMBER_STATUS,
  
  // Constantes de tipo de membresía
  MEMBERSHIP_TYPE,
  VALID_MEMBERSHIP_TYPE,
  
  // Constantes de validación de horas
  HOURS_VALIDATION_STATUS,
  VALID_HOURS_VALIDATION_STATUS,
  
  // Reglas de negocio
  MEMBER_BUSINESS_RULES,
  
  // Esquemas de validación
  createMemberSchema,
  updateMemberSchema,
  memberIdSchema,
  listMembersSchema,
  registerHoursSchema,
  memberSchema,
  
  // Funciones de validación
  validateCreateMember,
  validateUpdateMember,
  validateMemberId,
  validateListMembers,
  validateRegisterHours,
  
  // Funciones de utilidad
  formatMemberForResponse,
  createEmptyMember,
  isValidMemberStatus,
  isValidMembershipType,
  getMemberStatusLabel,
  validateDUI,
  calculateAge,
  isMinimumAge,
  
  // Documentación de tabla
  MEMBER_TABLE_STRUCTURE,
};