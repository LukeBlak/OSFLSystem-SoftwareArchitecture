/**
 * =============================================================================
 * MODELO DE COMITÉ - CAPA DE DOMINIO
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir la entidad de dominio Comité según el modelo de datos
 * - Proveer esquemas de validación con Zod para la entidad
 * - Centralizar constantes y enumeraciones relacionadas con Comités
 * - Documentar la estructura de la tabla `comite` en Supabase
 * 
 * Arquitectura:
 * - Capa: Dominio (Entidades)
 * - Patrón: Domain Model + Validation Schema
 * - Base de datos: Supabase (PostgreSQL) - Tabla: `comite`
 * 
 * Relación con otras entidades:
 * - Pertenece a: Organización (1:N)
 * - Tiene un: Líder de Comité (1:1)
 * - Tiene muchos: Proyectos (1:N)
 * - Tiene muchos: Miembros (1:N)
 * 
 * @module models/Committee
 * @layer Domain
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTES DE COMITÉ
// =============================================================================

/**
 * Estados posibles de un comité
 * 
 * @constant {Object}
 * @readonly
 */
export const COMMITTEE_STATUS = {
  /** Comité activo y operativo */
  ACTIVO: 'activo',
  
  /** Comité inactivo o en pausa */
  INACTIVO: 'inactivo',
  
  /** Comité en proceso de formación */
  EN_FORMACION: 'en_formacion',
  
  /** Comité disuelto o eliminado */
  DISUELTO: 'disuelto',
};

/**
 * Array de todos los estados válidos
 * @constant {Array<string>}
 */
export const VALID_COMMITTEE_STATUS = Object.values(COMMITTEE_STATUS);

/**
 * Áreas de responsabilidad predefinidas para comités
 * 
 * @constant {Object}
 * @readonly
 */
export const COMMITTEE_AREAS = {
  /** Comité de logística y operaciones */
  LOGISTICA: 'logistica',
  
  /** Comité de finanzas y presupuesto */
  FINANZAS: 'finanzas',
  
  /** Comité de comunicación y marketing */
  COMUNICACION: 'comunicacion',
  
  /** Comité de recursos humanos y voluntarios */
  RECURSOS_HUMANOS: 'recursos_humanos',
  
  /** Comité de proyectos y programas */
  PROYECTOS: 'proyectos',
  
  /** Comité de tecnología y sistemas */
  TECNOLOGIA: 'tecnologia',
  
  /** Comité de eventos y actividades */
  EVENTOS: 'eventos',
  
  /** Comité de alianzas y relaciones externas */
  ALIANZAS: 'alianzas',
  
  /** Comité de capacitación y desarrollo */
  CAPACITACION: 'capacitacion',
  
  /** Otro comité no listado */
  OTRO: 'otro',
};

/**
 * Array de todas las áreas válidas
 * @constant {Array<string>}
 */
export const VALID_COMMITTEE_AREAS = Object.values(COMMITTEE_AREAS);

// =============================================================================
// ESQUEMAS DE VALIDACIÓN ZOD
// =============================================================================

/**
 * Esquema de validación para creación de comités
 * 
 * Se usa cuando se crea un nuevo comité en el sistema
 * 
 * @type {z.ZodObject}
 */
export const createCommitteeSchema = z.object({
  /**
   * Nombre del comité (requerido, único por organización)
   * Mínimo 3 caracteres, máximo 100 caracteres
   */
  nombre: z
    .string()
    .min(3, 'El nombre del comité debe tener al menos 3 caracteres')
    .max(100, 'El nombre del comité no puede exceder 100 caracteres')
    .trim(),
  
  /**
   * Área de responsabilidad del comité
   * Opcional, pero recomendado para clasificación
   */
  areaResponsabilidad: z
    .enum(VALID_COMMITTEE_AREAS, {
      errorMap: () => ({
        message: `Área de responsabilidad inválida. Opciones: ${VALID_COMMITTEE_AREAS.join(', ')}`,
      }),
    })
    .optional(),
  
  /**
   * Descripción detallada del comité
   * Opcional, máximo 1000 caracteres
   */
  descripcion: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional(),
  
  /**
   * Estado inicial del comité
   * Por defecto: 'activo'
   */
  estado: z
    .enum(VALID_COMMITTEE_STATUS, {
      errorMap: () => ({
        message: `Estado inválido. Opciones: ${VALID_COMMITTEE_STATUS.join(', ')}`,
      }),
    })
    .default(COMMITTEE_STATUS.ACTIVO),
  
  /**
   * Presupuesto asignado al comité
   * Debe ser número positivo o cero
   * Por defecto: 0
   */
  presupuestoAsignado: z
    .number()
    .min(0, 'El presupuesto no puede ser negativo')
    .default(0),
  
  /**
   * ID de la organización propietaria del comité
   * Requerido - UUID válido
   */
  organizacionId: z
    .string()
    .uuid('El ID de organización debe ser un UUID válido'),
  
  /**
   * ID del líder asignado al comité
   * Opcional - UUID válido
   * Puede asignarse después de crear el comité
   */
  liderComiteId: z
    .string()
    .uuid('El ID del líder debe ser un UUID válido')
    .optional(),
});

/**
 * Esquema de validación para actualización de comités
 * 
 * Todos los campos son opcionales (partial)
 * Solo se actualizan los campos proporcionados
 * 
 * @type {z.ZodObject}
 */
export const updateCommitteeSchema = z.object({
  /**
   * Nombre del comité (opcional para update)
   */
  nombre: z
    .string()
    .min(3, 'El nombre del comité debe tener al menos 3 caracteres')
    .max(100, 'El nombre del comité no puede exceder 100 caracteres')
    .trim()
    .optional(),
  
  /**
   * Área de responsabilidad (opcional para update)
   */
  areaResponsabilidad: z
    .enum(VALID_COMMITTEE_AREAS)
    .optional(),
  
  /**
   * Descripción (opcional para update)
   */
  descripcion: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional(),
  
  /**
   * Estado (opcional para update)
   */
  estado: z
    .enum(VALID_COMMITTEE_STATUS)
    .optional(),
  
  /**
   * Presupuesto asignado (opcional para update)
   */
  presupuestoAsignado: z
    .number()
    .min(0, 'El presupuesto no puede ser negativo')
    .optional(),
  
  /**
   * ID del líder (opcional para update)
   */
  liderComiteId: z
    .string()
    .uuid('El ID del líder debe ser un UUID válido')
    .optional()
    .nullable(), // Permitir null para remover líder
});

/**
 * Esquema de validación para parámetros de ID
 * 
 * Se usa para validar IDs en rutas (params)
 * 
 * @type {z.ZodObject}
 */
export const committeeIdSchema = z.object({
  /**
   * ID del comité (UUID)
   */
  id: z
    .string()
    .uuid('El ID del comité debe ser un UUID válido'),
});

/**
 * Esquema de validación para query parameters de listados
 * 
 * Se usa para validar filtros en consultas de listados
 * 
 * @type {z.ZodObject}
 */
export const listCommitteesSchema = z.object({
  /**
   * Filtrar por organización
   */
  organizacionId: z
    .string()
    .uuid()
    .optional(),
  
  /**
   * Filtrar por estado
   */
  estado: z
    .enum(VALID_COMMITTEE_STATUS)
    .optional(),
  
  /**
   * Filtrar por área de responsabilidad
   */
  areaResponsabilidad: z
    .enum(VALID_COMMITTEE_AREAS)
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
    .enum(['nombre', 'fechaCreacion', 'estado', 'presupuestoAsignado'])
    .default('fechaCreacion'),
  
  /**
   * Orden de resultados (ASC o DESC)
   */
  sortOrder: z
    .enum(['ASC', 'DESC'])
    .default('DESC'),
});

/**
 * Esquema completo del comité (para respuestas de API)
 * 
 * Incluye todos los campos que puede tener un comité
 * 
 * @type {z.ZodObject}
 */
export const committeeSchema = z.object({
  /** ID único del comité (UUID) */
  id: z.string().uuid(),
  
  /** Nombre del comité */
  nombre: z.string(),
  
  /** Área de responsabilidad */
  areaResponsabilidad: z.string().nullable(),
  
  /** Descripción detallada */
  descripcion: z.string().nullable(),
  
  /** Fecha de creación del comité */
  fechaCreacion: z.string().datetime().nullable(),
  
  /** Estado actual del comité */
  estado: z.string(),
  
  /** Presupuesto asignado */
  presupuestoAsignado: z.number(),
  
  /** ID de la organización propietaria */
  organizacionId: z.string().uuid(),
  
  /** ID del líder del comité */
  liderComiteId: z.string().uuid().nullable(),
  
  /** ID del usuario que creó el comité */
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
 * Valida los datos para crear un comité
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 * 
 * @example
 * const validData = validateCreateCommittee({
 *   nombre: 'Comité de Marketing',
 *   organizacionId: 'uuid-organizacion'
 * });
 */
export const validateCreateCommittee = (data) => {
  return createCommitteeSchema.parse(data);
};

/**
 * Valida los datos para actualizar un comité
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateUpdateCommittee = (data) => {
  return updateCommitteeSchema.parse(data);
};

/**
 * Valida el ID de un comité
 * 
 * @param {string} id - ID del comité
 * @returns {Object} ID validado
 * @throws {z.ZodError} Si el ID no es válido
 */
export const validateCommitteeId = (id) => {
  return committeeIdSchema.parse({ id });
};

/**
 * Valida parámetros de listado de comités
 * 
 * @param {Object} params - Parámetros de consulta
 * @returns {Object} Parámetros validados
 * @throws {z.ZodError} Si los parámetros no son válidos
 */
export const validateListCommittees = (params) => {
  return listCommitteesSchema.parse(params);
};

/**
 * Formatea un comité para respuesta de API
 * 
 * Elimina campos sensibles y formatea fechas
 * 
 * @param {Object} committee - Objeto comité de la base de datos
 * @returns {Object} Comité formateado para API
 */
export const formatCommitteeForResponse = (committee) => {
  if (!committee) return null;
  
  return {
    id: committee.id,
    nombre: committee.nombre,
    areaResponsabilidad: committee.areaResponsabilidad,
    descripcion: committee.descripcion,
    estado: committee.estado,
    presupuestoAsignado: committee.presupuestoAsignado,
    organizacionId: committee.organizacionId,
    liderComiteId: committee.liderComiteId,
    fechaCreacion: committee.fechaCreacion,
    fechaEdicion: committee.fechaEdicion,
    // Campos relacionados (si se incluyen)
    organizacion: committee.organizacion || null,
    lider: committee.lider || null,
    proyectos: committee.proyectos || [],
  };
};

/**
 * Genera un objeto de comité vacío con valores por defecto
 * 
 * Útil para inicializar formularios o datos
 * 
 * @param {string} organizacionId - ID de la organización
 * @returns {Object} Comité con valores por defecto
 */
export const createEmptyCommittee = (organizacionId) => ({
  nombre: '',
  areaResponsabilidad: COMMITTEE_AREAS.OTRO,
  descripcion: '',
  estado: COMMITTEE_STATUS.ACTIVO,
  presupuestoAsignado: 0,
  organizacionId: organizacionId,
  liderComiteId: null,
});

/**
 * Verifica si un estado de comité es válido
 * 
 * @param {string} status - Estado a verificar
 * @returns {boolean} True si el estado es válido
 */
export const isValidCommitteeStatus = (status) => {
  return VALID_COMMITTEE_STATUS.includes(status);
};

/**
 * Verifica si un área de responsabilidad es válida
 * 
 * @param {string} area - Área a verificar
 * @returns {boolean} True si el área es válida
 */
export const isValidCommitteeArea = (area) => {
  return VALID_COMMITTEE_AREAS.includes(area);
};

/**
 * Obtiene la etiqueta legible de un estado de comité
 * 
 * @param {string} status - Estado del comité
 * @returns {string} Etiqueta legible
 */
export const getCommitteeStatusLabel = (status) => {
  const labels = {
    [COMMITTEE_STATUS.ACTIVO]: 'Activo',
    [COMMITTEE_STATUS.INACTIVO]: 'Inactivo',
    [COMMITTEE_STATUS.EN_FORMACION]: 'En Formación',
    [COMMITTEE_STATUS.DISUELTO]: 'Disuelto',
  };
  
  return labels[status] || status;
};

/**
 * Obtiene la etiqueta legible de un área de responsabilidad
 * 
 * @param {string} area - Área del comité
 * @returns {string} Etiqueta legible
 */
export const getCommitteeAreaLabel = (area) => {
  const labels = {
    [COMMITTEE_AREAS.LOGISTICA]: 'Logística y Operaciones',
    [COMMITTEE_AREAS.FINANZAS]: 'Finanzas y Presupuesto',
    [COMMITTEE_AREAS.COMUNICACION]: 'Comunicación y Marketing',
    [COMMITTEE_AREAS.RECURSOS_HUMANOS]: 'Recursos Humanos y Voluntarios',
    [COMMITTEE_AREAS.PROYECTOS]: 'Proyectos y Programas',
    [COMMITTEE_AREAS.TECNOLOGIA]: 'Tecnología y Sistemas',
    [COMMITTEE_AREAS.EVENTOS]: 'Eventos y Actividades',
    [COMMITTEE_AREAS.ALIANZAS]: 'Alianzas y Relaciones Externas',
    [COMMITTEE_AREAS.CAPACITACION]: 'Capacitación y Desarrollo',
    [COMMITTEE_AREAS.OTRO]: 'Otro',
  };
  
  return labels[area] || area;
};

// =============================================================================
// DOCUMENTACIÓN DE LA TABLA EN SUPABASE
// =============================================================================

/**
 * Estructura de la tabla `comite` en Supabase
 * 
 * @constant {Object}
 * 
 * @example
 * // SQL para crear la tabla:
 * CREATE TABLE public.comite (
 *   id uuid NOT NULL DEFAULT gen_random_uuid(),
 *   nombre character varying NOT NULL,
 *   areaResponsabilidad character varying,
 *   descripcion character varying,
 *   fechacreacion date,
 *   estado character varying DEFAULT 'activo',
 *   presupuestoAsignado numeric DEFAULT 0,
 *   organizacionid uuid REFERENCES public.organizacion(id),
 *   lidercomiteid uuid REFERENCES public.lider_comite(id),
 *   creado_por uuid REFERENCES auth.users(id),
 *   modificado_por uuid REFERENCES auth.users(id),
 *   fecha_creacion timestamp without time zone DEFAULT now(),
 *   fecha_edicion timestamp without time zone,
 *   CONSTRAINT comite_pkey PRIMARY KEY (id)
 * );
 */
export const COMMITTEE_TABLE_STRUCTURE = {
  tableName: 'comite',
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
      maxLength: 100,
    },
    areaResponsabilidad: {
      type: 'character varying',
      nullable: true,
      maxLength: 50,
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
    estado: {
      type: 'character varying',
      nullable: false,
      default: 'activo',
      enum: VALID_COMMITTEE_STATUS,
    },
    presupuestoAsignado: {
      type: 'numeric',
      nullable: false,
      default: 0,
    },
    organizacionId: {
      type: 'uuid',
      nullable: false,
      foreignKey: {
        table: 'organizacion',
        column: 'id',
      },
    },
    liderComiteId: {
      type: 'uuid',
      nullable: true,
      foreignKey: {
        table: 'lider_comite',
        column: 'id',
      },
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
    { name: 'comite_organizacion_idx', columns: ['organizacionid'] },
    { name: 'comite_estado_idx', columns: ['estado'] },
    { name: 'comite_lider_idx', columns: ['lidercomiteid'] },
  ],
  constraints: [
    {
      name: 'comite_pkey',
      type: 'PRIMARY KEY',
      columns: ['id'],
    },
    {
      name: 'comite_organizacionid_fkey',
      type: 'FOREIGN KEY',
      columns: ['organizacionid'],
      references: { table: 'organizacion', column: 'id' },
    },
    {
      name: 'comite_lidercomiteid_fkey',
      type: 'FOREIGN KEY',
      columns: ['lidercomiteid'],
      references: { table: 'lider_comite', column: 'id' },
    },
  ],
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
 *   COMMITTEE_STATUS, 
 *   createCommitteeSchema,
 *   validateCreateCommittee 
 * } from './models/Committee.js';
 * 
 * @example
 * // Importación por defecto
 * import Committee from './models/Committee.js';
 * Committee.COMMITTEE_STATUS;
 * Committee.createCommitteeSchema;
 */
export default {
  // Constantes
  COMMITTEE_STATUS,
  VALID_COMMITTEE_STATUS,
  COMMITTEE_AREAS,
  VALID_COMMITTEE_AREAS,
  
  // Esquemas de validación
  createCommitteeSchema,
  updateCommitteeSchema,
  committeeIdSchema,
  listCommitteesSchema,
  committeeSchema,
  
  // Funciones de validación
  validateCreateCommittee,
  validateUpdateCommittee,
  validateCommitteeId,
  validateListCommittees,
  
  // Funciones de utilidad
  formatCommitteeForResponse,
  createEmptyCommittee,
  isValidCommitteeStatus,
  isValidCommitteeArea,
  getCommitteeStatusLabel,
  getCommitteeAreaLabel,
  
  // Documentación de tabla
  COMMITTEE_TABLE_STRUCTURE,
};