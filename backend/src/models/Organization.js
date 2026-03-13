/**
 * =============================================================================
 * MODELO DE ORGANIZACIÓN - CAPA DE DOMINIO
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir la entidad de dominio Organización según el modelo de datos
 * - Proveer esquemas de validación con Zod para la entidad
 * - Centralizar constantes y enumeraciones relacionadas con Organizaciones
 * - Documentar la estructura de la tabla `organizacion` en Supabase
 * 
 * Arquitectura:
 * - Capa: Dominio (Entidades)
 * - Patrón: Domain Model + Validation Schema
 * - Base de datos: Supabase (PostgreSQL) - Tabla: `organizacion`
 * 
 * Relación con otras entidades:
 * - Tiene muchos: Comités (1:N)
 * - Tiene muchos: Miembros (1:N)
 * - Tiene muchos: Proyectos (1:N)
 * - Tiene muchos: Ingresos/Egresos (1:N)
 * - Pertenece a: Líder de Organización (1:1)
 * 
 * @module models/Organization
 * @layer Domain
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTES DE ORGANIZACIÓN
// =============================================================================

/**
 * Tipos de organización disponibles en el sistema
 * 
 * @constant {Object}
 * @readonly
 */
export const ORGANIZATION_TYPE = {
  /** Asociación sin fines de lucro */
  ASOCIACION: 'asociacion',
  
  /** Fundación */
  FUNDACION: 'fundacion',
  
  /** ONG (Organización No Gubernamental) */
  ONG: 'ong',
  
  /** Cooperativa */
  COOPERATIVA: 'cooperativa',
  
  /** Grupo comunitario */
  GRUPO_COMUNITARIO: 'grupo_comunitario',
  
  /** Iglesia o grupo religioso */
  RELIGIOSA: 'religiosa',
  
  /** Estudiantil */
  ESTUDIANTIL: 'estudiantil',
  
  /** Otro tipo de organización */
  OTRO: 'otro',
};

/**
 * Array de todos los tipos de organización válidos
 * @constant {Array<string>}
 */
export const VALID_ORGANIZATION_TYPES = Object.values(ORGANIZATION_TYPE);

/**
 * Estados posibles de una organización
 * 
 * @constant {Object}
 * @readonly
 */
export const ORGANIZATION_STATUS = {
  /** Organización activa y operativa */
  ACTIVA: 'activa',
  
  /** Organización inactiva o en pausa */
  INACTIVA: 'inactiva',
  
  /** Organización en proceso de registro */
  EN_REGISTRO: 'en_registro',
  
  /** Organización suspendida */
  SUSPENDIDA: 'suspendida',
};

/**
 * Array de todos los estados de organización válidos
 * @constant {Array<string>}
 */
export const VALID_ORGANIZATION_STATUS = Object.values(ORGANIZATION_STATUS);

// =============================================================================
// ESQUEMAS DE VALIDACIÓN ZOD
// =============================================================================

/**
 * Esquema de validación para creación de organizaciones
 * 
 * Se usa cuando se registra una nueva organización en el sistema
 * 
 * @type {z.ZodObject}
 */
export const createOrganizationSchema = z.object({
  /**
   * Nombre de la organización (requerido, único)
   * Mínimo 3 caracteres, máximo 150 caracteres
   */
  nombre: z
    .string()
    .min(3, 'El nombre de la organización debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede exceder 150 caracteres')
    .trim(),
  
  /**
   * Tipo de organización
   * Opcional, por defecto: 'ong'
   */
  tipo: z
    .enum(VALID_ORGANIZATION_TYPES, {
      errorMap: () => ({
        message: `Tipo de organización inválido. Opciones: ${VALID_ORGANIZATION_TYPES.join(', ')}`,
      }),
    })
    .default(ORGANIZATION_TYPE.ONG),
  
  /**
   * Descripción detallada de la organización
   * Opcional, máximo 1000 caracteres
   */
  descripcion: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional(),
  
  /**
   * Dirección física de la organización
   * Opcional, máximo 255 caracteres
   */
  direccion: z
    .string()
    .max(255, 'La dirección no puede exceder 255 caracteres')
    .optional(),
  
  /**
   * Teléfono de contacto
   * Opcional, formato El Salvador: 8 dígitos
   */
  telefono: z
    .string()
    .regex(/^\d{8}$/, 'El teléfono debe tener 8 dígitos')
    .optional(),
  
  /**
   * Email de contacto de la organización
   * Opcional, debe ser email válido
   */
  email: z
    .string()
    .email('El email debe ser válido')
    .max(255, 'El email no puede exceder 255 caracteres')
    .optional(),
  
  /**
   * Estado inicial de la organización
   * Por defecto: 'activa'
   */
  estado: z
    .enum(VALID_ORGANIZATION_STATUS, {
      errorMap: () => ({
        message: `Estado inválido. Opciones: ${VALID_ORGANIZATION_STATUS.join(', ')}`,
      }),
    })
    .default(ORGANIZATION_STATUS.ACTIVA),
});

/**
 * Esquema de validación para actualización de organizaciones
 * 
 * Todos los campos son opcionales (partial)
 * Solo se actualizan los campos proporcionados
 * 
 * @type {z.ZodObject}
 */
export const updateOrganizationSchema = z.object({
  /**
   * Nombre de la organización (opcional para update)
   */
  nombre: z
    .string()
    .min(3, 'El nombre de la organización debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede exceder 150 caracteres')
    .optional(),
  
  /**
   * Tipo de organización (opcional para update)
   */
  tipo: z
    .enum(VALID_ORGANIZATION_TYPES)
    .optional(),
  
  /**
   * Descripción (opcional para update)
   */
  descripcion: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional(),
  
  /**
   * Dirección (opcional para update)
   */
  direccion: z
    .string()
    .max(255, 'La dirección no puede exceder 255 caracteres')
    .optional(),
  
  /**
   * Teléfono (opcional para update)
   */
  telefono: z
    .string()
    .regex(/^\d{8}$/, 'El teléfono debe tener 8 dígitos')
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
   * Estado (opcional para update)
   */
  estado: z
    .enum(VALID_ORGANIZATION_STATUS)
    .optional(),
  
  /**
   * Saldo actual (solo administración)
   */
  saldoActual: z
    .number()
    .min(0, 'El saldo no puede ser negativo')
    .optional(),
});

/**
 * Esquema de validación para parámetros de ID
 * 
 * Se usa para validar IDs en rutas (params)
 * 
 * @type {z.ZodObject}
 */
export const organizationIdSchema = z.object({
  /**
   * ID de la organización (UUID)
   */
  id: z
    .string()
    .uuid('El ID de la organización debe ser un UUID válido'),
});

/**
 * Esquema de validación para query parameters de listados
 * 
 * Se usa para validar filtros en consultas de listados
 * 
 * @type {z.ZodObject}
 */
export const listOrganizationsSchema = z.object({
  /**
   * Filtrar por tipo de organización
   */
  tipo: z
    .enum(VALID_ORGANIZATION_TYPES)
    .optional(),
  
  /**
   * Filtrar por estado
   */
  estado: z
    .enum(VALID_ORGANIZATION_STATUS)
    .optional(),
  
  /**
   * Buscar por nombre o descripción
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
    .enum(['nombre', 'fechaCreacion', 'tipo', 'estado'])
    .default('fechaCreacion'),
  
  /**
   * Orden de resultados (ASC o DESC)
   */
  sortOrder: z
    .enum(['ASC', 'DESC'])
    .default('DESC'),
});

/**
 * Esquema completo de organización (para respuestas de API)
 * 
 * Incluye todos los campos que puede tener una organización
 * 
 * @type {z.ZodObject}
 */
export const organizationSchema = z.object({
  /** ID único de la organización (UUID) */
  id: z.string().uuid(),
  
  /** Nombre de la organización */
  nombre: z.string(),
  
  /** Tipo de organización */
  tipo: z.string(),
  
  /** Descripción detallada */
  descripcion: z.string().nullable(),
  
  /** Fecha de creación de la organización */
  fechaCreacion: z.string().nullable(),
  
  /** Dirección física */
  direccion: z.string().nullable(),
  
  /** Teléfono de contacto */
  telefono: z.string().nullable(),
  
  /** Email de contacto */
  email: z.string().nullable(),
  
  /** Saldo actual de la organización */
  saldoActual: z.number().default(0),
  
  /** Estado de la organización */
  estado: z.string(),
  
  /** ID del usuario que creó la organización */
  creadoPor: z.string().uuid().nullable(),
  
  /** ID del usuario que modificó por última vez */
  modificadoPor: z.string().uuid().nullable(),
  
  /** Fecha de creación del registro */
  fecha_creacion: z.string().datetime().nullable(),
  
  /** Fecha de última modificación */
  fecha_edicion: z.string().datetime().nullable(),
});

// =============================================================================
// FUNCIONES DE UTILIDAD
// =============================================================================

/**
 * Valida los datos para crear una organización
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 * 
 * @example
 * const validData = validateCreateOrganization({
 *   nombre: 'Asociación de Voluntarios',
 *   tipo: 'ong',
 *   email: 'contacto@asovol.org'
 * });
 */
export const validateCreateOrganization = (data) => {
  return createOrganizationSchema.parse(data);
};

/**
 * Valida los datos para actualizar una organización
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateUpdateOrganization = (data) => {
  return updateOrganizationSchema.parse(data);
};

/**
 * Valida el ID de una organización
 * 
 * @param {string} id - ID de la organización
 * @returns {Object} ID validado
 * @throws {z.ZodError} Si el ID no es válido
 */
export const validateOrganizationId = (id) => {
  return organizationIdSchema.parse({ id });
};

/**
 * Valida parámetros de listado de organizaciones
 * 
 * @param {Object} params - Parámetros de consulta
 * @returns {Object} Parámetros validados
 * @throws {z.ZodError} Si los parámetros no son válidos
 */
export const validateListOrganizations = (params) => {
  return listOrganizationsSchema.parse(params);
};

/**
 * Formatea una organización para respuesta de API
 * 
 * Elimina campos sensibles y formatea fechas
 * 
 * @param {Object} organization - Objeto organización de la base de datos
 * @returns {Object} Organización formateada para API
 */
export const formatOrganizationForResponse = (organization) => {
  if (!organization) return null;
  
  return {
    id: organization.id,
    nombre: organization.nombre,
    tipo: organization.tipo,
    descripcion: organization.descripcion,
    direccion: organization.direccion,
    telefono: organization.telefono,
    email: organization.email,
    saldoActual: organization.saldoActual,
    estado: organization.estado,
    fechaCreacion: organization.fechaCreacion,
    fechaEdicion: organization.fechaEdicion,
    // Campos relacionados (si se incluyen)
    comites: organization.comites || [],
    miembros: organization.miembros || [],
    proyectos: organization.proyectos || [],
    lider: organization.lider || null,
  };
};

/**
 * Genera un objeto de organización vacío con valores por defecto
 * 
 * Útil para inicializar formularios o datos
 * 
 * @returns {Object} Organización con valores por defecto
 */
export const createEmptyOrganization = () => ({
  nombre: '',
  tipo: ORGANIZATION_TYPE.ONG,
  descripcion: '',
  direccion: '',
  telefono: '',
  email: '',
  saldoActual: 0,
  estado: ORGANIZATION_STATUS.ACTIVA,
});

/**
 * Verifica si un tipo de organización es válido
 * 
 * @param {string} type - Tipo de organización a verificar
 * @returns {boolean} True si el tipo es válido
 */
export const isValidOrganizationType = (type) => {
  return VALID_ORGANIZATION_TYPES.includes(type);
};

/**
 * Verifica si un estado de organización es válido
 * 
 * @param {string} status - Estado de la organización a verificar
 * @returns {boolean} True si el estado es válido
 */
export const isValidOrganizationStatus = (status) => {
  return VALID_ORGANIZATION_STATUS.includes(status);
};

/**
 * Obtiene la etiqueta legible de un tipo de organización
 * 
 * @param {string} type - Tipo de organización
 * @returns {string} Etiqueta legible
 */
export const getOrganizationTypeLabel = (type) => {
  const labels = {
    [ORGANIZATION_TYPE.ASOCIACION]: 'Asociación',
    [ORGANIZATION_TYPE.FUNDACION]: 'Fundación',
    [ORGANIZATION_TYPE.ONG]: 'ONG',
    [ORGANIZATION_TYPE.COOPERATIVA]: 'Cooperativa',
    [ORGANIZATION_TYPE.GRUPO_COMUNITARIO]: 'Grupo Comunitario',
    [ORGANIZATION_TYPE.RELIGIOSA]: 'Organización Religiosa',
    [ORGANIZATION_TYPE.ESTUDIANTIL]: 'Organización Estudiantil',
    [ORGANIZATION_TYPE.OTRO]: 'Otro',
  };
  
  return labels[type] || type;
};

/**
 * Obtiene la etiqueta legible de un estado de organización
 * 
 * @param {string} status - Estado de la organización
 * @returns {string} Etiqueta legible
 */
export const getOrganizationStatusLabel = (status) => {
  const labels = {
    [ORGANIZATION_STATUS.ACTIVA]: 'Activa',
    [ORGANIZATION_STATUS.INACTIVA]: 'Inactiva',
    [ORGANIZATION_STATUS.EN_REGISTRO]: 'En Registro',
    [ORGANIZATION_STATUS.SUSPENDIDA]: 'Suspendida',
  };
  
  return labels[status] || status;
};

/**
 * Valida el formato de teléfono de El Salvador
 * 
 * @param {string} phone - Teléfono a validar
 * @returns {Object} Resultado de validación
 * 
 * @example
 * const result = validatePhone('22220000');
 * // { isValid: true, formatted: '2222-0000' }
 */
export const validatePhone = (phone) => {
  const cleaned = phone.trim().replace(/[\s-]/g, '');
  const pattern = /^\d{8}$/;
  
  let formatted = cleaned;
  if (pattern.test(cleaned)) {
    formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  
  return {
    isValid: pattern.test(cleaned),
    formatted,
    original: phone,
  };
};

// =============================================================================
// DOCUMENTACIÓN DE LA TABLA EN SUPABASE
// =============================================================================

/**
 * Estructura de la tabla `organizacion` en Supabase
 * 
 * @constant {Object}
 * 
 * @example
 * // SQL para crear la tabla:
 * CREATE TABLE public.organizacion (
 *   id uuid NOT NULL DEFAULT gen_random_uuid(),
 *   nombre character varying NOT NULL UNIQUE,
 *   tipo character varying DEFAULT 'ong',
 *   descripcion character varying,
 *   fechacreacion date,
 *   direccion character varying,
 *   telefono character varying,
 *   saldoactual numeric DEFAULT 0,
 *   creado_por uuid REFERENCES auth.users(id),
 *   modificado_por uuid REFERENCES auth.users(id),
 *   fecha_creacion timestamp without time zone DEFAULT now(),
 *   fecha_edicion timestamp without time zone,
 *   CONSTRAINT organizacion_pkey PRIMARY KEY (id)
 * );
 */
export const ORGANIZATION_TABLE_STRUCTURE = {
  tableName: 'organizacion',
  schema: 'public',
  columns: {
    id: {
      type: 'uuid',
      nullable: false,
      default: 'gen_random_uuid()',
      primary: true,
    },
    nombre: {
      type: 'character varying',
      nullable: false,
      maxLength: 150,
      unique: true,
    },
    tipo: {
      type: 'character varying',
      nullable: false,
      default: 'ong',
      maxLength: 50,
      enum: VALID_ORGANIZATION_TYPES,
    },
    descripcion: {
      type: 'character varying',
      nullable: true,
      maxLength: 1000,
    },
    fechaCreacion: {
      type: 'date',
      nullable: true,
    },
    direccion: {
      type: 'character varying',
      nullable: true,
      maxLength: 255,
    },
    telefono: {
      type: 'character varying',
      nullable: true,
      maxLength: 8,
    },
    email: {
      type: 'character varying',
      nullable: true,
      maxLength: 255,
    },
    saldoActual: {
      type: 'numeric',
      nullable: false,
      default: 0,
    },
    estado: {
      type: 'character varying',
      nullable: false,
      default: 'activa',
      enum: VALID_ORGANIZATION_STATUS,
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
    { name: 'organizacion_nombre_idx', columns: ['nombre'] },
    { name: 'organizacion_tipo_idx', columns: ['tipo'] },
    { name: 'organizacion_estado_idx', columns: ['estado'] },
  ],
  constraints: [
    {
      name: 'organizacion_pkey',
      type: 'PRIMARY KEY',
      columns: ['id'],
    },
    {
      name: 'organizacion_nombre_key',
      type: 'UNIQUE',
      columns: ['nombre'],
    },
  ],
};

// =============================================================================
// REGLAS DE NEGOCIO
// =============================================================================

/**
 * Reglas de negocio para organizaciones
 * 
 * @constant {Object}
 */
export const ORGANIZATION_BUSINESS_RULES = {
  /**
   * Nombre mínimo de caracteres
   * @type {number}
   */
  MIN_NAME_LENGTH: 3,
  
  /**
   * Nombre máximo de caracteres
   * @type {number}
   */
  MAX_NAME_LENGTH: 150,
  
  /**
   * Descripción máxima de caracteres
   * @type {number}
   */
  MAX_DESCRIPTION_LENGTH: 1000,
  
  /**
   * Dirección máxima de caracteres
   * @type {number}
   */
  MAX_ADDRESS_LENGTH: 255,
  
  /**
   * Teléfono formato (dígitos)
   * @type {number}
   */
  PHONE_DIGITS: 8,
  
  /**
   * Saldo mínimo (no negativo)
   * @type {number}
   */
  MIN_BALANCE: 0,
  
  /**
   * Comités mínimos por organización
   * @type {number}
   */
  MIN_COMMITTEES: 0,
  
  /**
   * Miembros mínimos por organización
   * @type {number}
   */
  MIN_MEMBERS: 1,
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
 *   ORGANIZATION_TYPE, 
 *   createOrganizationSchema,
 *   validateCreateOrganization 
 * } from './models/Organization.js';
 * 
 * @example
 * // Importación por defecto
 * import Organization from './models/Organization.js';
 * Organization.ORGANIZATION_TYPE;
 * Organization.createOrganizationSchema;
 */
export default {
  // Constantes de tipo
  ORGANIZATION_TYPE,
  VALID_ORGANIZATION_TYPES,
  
  // Constantes de estado
  ORGANIZATION_STATUS,
  VALID_ORGANIZATION_STATUS,
  
  // Reglas de negocio
  ORGANIZATION_BUSINESS_RULES,
  
  // Esquemas de validación
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationIdSchema,
  listOrganizationsSchema,
  organizationSchema,
  
  // Funciones de validación
  validateCreateOrganization,
  validateUpdateOrganization,
  validateOrganizationId,
  validateListOrganizations,
  
  // Funciones de utilidad
  formatOrganizationForResponse,
  createEmptyOrganization,
  isValidOrganizationType,
  isValidOrganizationStatus,
  getOrganizationTypeLabel,
  getOrganizationStatusLabel,
  validatePhone,
  
  // Documentación de tabla
  ORGANIZATION_TABLE_STRUCTURE,
};