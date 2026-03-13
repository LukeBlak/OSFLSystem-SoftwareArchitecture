/**
 * =============================================================================
 * VALIDADORES DE COMITÉS - CAPA DE VALIDACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir esquemas de validación Zod para todas las operaciones de comités
 * - Centralizar las reglas de validación de datos de comités en un solo módulo
 * - Proveer validaciones reutilizables para controllers y middleware
 * - Implementar reglas de negocio específicas para comités
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
 * - createCommitteeSchema: Validación para crear comité
 * - updateCommitteeSchema: Validación para actualizar comité
 * - committeeIdSchema: Validación para ID de comité
 * - listCommitteesSchema: Validación para listados con filtros
 * - assignLeaderSchema: Validación para asignar líder
 * 
 * @module validators/committee.validator
 * @layer Validation
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTES Y REGLAS DE VALIDACIÓN
// =============================================================================

/**
 * Estados válidos para comités según el modelo de dominio
 * 
 * @constant {Array<string>}
 */
const VALID_COMMITTEE_STATUS = [
  'activo',
  'inactivo',
  'en_formacion',
  'disuelto',
];

/**
 * Áreas de responsabilidad válidas para comités
 * 
 * @constant {Array<string>}
 */
const VALID_COMMITTEE_AREAS = [
  'logistica',
  'finanzas',
  'comunicacion',
  'recursos_humanos',
  'proyectos',
  'tecnologia',
  'eventos',
  'alianzas',
  'capacitacion',
  'otro',
];

/**
 * Longitud mínima del nombre del comité
 * 
 * @constant {number}
 */
const MIN_NAME_LENGTH = 3;

/**
 * Longitud máxima del nombre del comité
 * 
 * @constant {number}
 */
const MAX_NAME_LENGTH = 100;

/**
 * Longitud máxima de la descripción
 * 
 * @constant {number}
 */
const MAX_DESCRIPTION_LENGTH = 1000;

/**
 * Longitud máxima del área de responsabilidad
 * 
 * @constant {number}
 */
const MAX_AREA_LENGTH = 50;

/**
 * Presupuesto mínimo asignado (no negativo)
 * 
 * @constant {number}
 */
const MIN_BUDGET = 0;

/**
 * Presupuesto máximo asignado
 * 
 * @constant {number}
 */
const MAX_BUDGET = 10000000;

// =============================================================================
// ESQUEMAS DE VALIDACIÓN PRINCIPALES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE CREACIÓN DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para crear un nuevo comité.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   nombre: 'Comité de Marketing',
 *   areaResponsabilidad: 'comunicacion',
 *   descripcion: 'Encargado de promoción de eventos',
 *   estado: 'activo',
 *   presupuestoAsignado: 5000,
 *   organizacionId: 'uuid-organizacion',
 *   liderComiteId: 'uuid-lider'
 * }
 */
export const createCommitteeSchema = z.object({
  /**
   * Nombre del comité (requerido, único por organización)
   */
  nombre: z
    .string()
    .min(MIN_NAME_LENGTH, `El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
    .max(MAX_NAME_LENGTH, `El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`)
    .trim()
    .regex(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras, números y espacios'),
  
  /**
   * Área de responsabilidad del comité (opcional)
   */
  areaResponsabilidad: z
    .enum(VALID_COMMITTEE_AREAS, {
      errorMap: () => ({
        message: `Área inválida. Opciones: ${VALID_COMMITTEE_AREAS.join(', ')}`,
      }),
    })
    .optional(),
  
  /**
   * Descripción detallada del comité (opcional)
   */
  descripcion: z
    .string()
    .max(MAX_DESCRIPTION_LENGTH, `La descripción no puede exceder ${MAX_DESCRIPTION_LENGTH} caracteres`)
    .optional(),
  
  /**
   * Estado inicial del comité
   * - Por defecto: 'activo'
   */
  estado: z
    .enum(VALID_COMMITTEE_STATUS, {
      errorMap: () => ({
        message: `Estado inválido. Opciones: ${VALID_COMMITTEE_STATUS.join(', ')}`,
      }),
    })
    .default('activo'),
  
  /**
   * Presupuesto asignado al comité
   * - Debe ser número positivo o cero
   * - Por defecto: 0
   */
  presupuestoAsignado: z
    .number()
    .min(MIN_BUDGET, 'El presupuesto no puede ser negativo')
    .max(MAX_BUDGET, `El presupuesto no puede exceder ${MAX_BUDGET}`)
    .default(0),
  
  /**
   * ID de la organización propietaria del comité (requerido)
   */
  organizacionId: z
    .string()
    .uuid('El ID de organización debe ser un UUID válido'),
  
  /**
   * ID del líder asignado al comité (opcional)
   */
  liderComiteId: z
    .string()
    .uuid('El ID del líder debe ser un UUID válido')
    .optional(),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ACTUALIZACIÓN DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para actualizar un comité existente.
 * Todos los campos son opcionales (partial).
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos (parciales)
 * {
 *   nombre: 'Comité de Marketing Digital',
 *   presupuestoAsignado: 7500
 * }
 */
export const updateCommitteeSchema = z.object({
  /**
   * Nombre del comité (opcional para update)
   */
  nombre: z
    .string()
    .min(MIN_NAME_LENGTH, `El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
    .max(MAX_NAME_LENGTH, `El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`)
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
    .max(MAX_DESCRIPTION_LENGTH, `La descripción no puede exceder ${MAX_DESCRIPTION_LENGTH} caracteres`)
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
    .min(MIN_BUDGET, 'El presupuesto no puede ser negativo')
    .max(MAX_BUDGET, `El presupuesto no puede exceder ${MAX_BUDGET}`)
    .optional(),
  
  /**
   * ID del líder (opcional para update, nullable para remover líder)
   */
  liderComiteId: z
    .string()
    .uuid('El ID del líder debe ser un UUID válido')
    .nullable()
    .optional(),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ID DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Valida el ID de un comité en parámetros de ruta.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos (params)
 * {
 *   id: 'uuid-comite'
 * }
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
 * -----------------------------------------------------------------------------
 * ESQUEMA DE LISTADO DE COMITÉS
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros de consulta para listados de comités.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos (query params)
 * {
 *   organizacionId: 'uuid-organizacion',
 *   estado: 'activo',
 *   page: '1',
 *   limit: '10'
 * }
 */
export const listCommitteesSchema = z.object({
  /**
   * Filtrar por organización (opcional)
   */
  organizacionId: z
    .string()
    .uuid('El ID de organización debe ser un UUID válido')
    .optional(),
  
  /**
   * Filtrar por estado (opcional)
   */
  estado: z
    .enum(VALID_COMMITTEE_STATUS)
    .optional(),
  
  /**
   * Filtrar por área de responsabilidad (opcional)
   */
  areaResponsabilidad: z
    .enum(VALID_COMMITTEE_AREAS)
    .optional(),
  
  /**
   * Página para paginación
   * - Default: 1
   * - Debe ser número entero positivo
   */
  page: z
    .string()
    .regex(/^\d+$/, 'La página debe ser un número')
    .transform(val => parseInt(val, 10))
    .default('1'),
  
  /**
   * Límite de resultados por página
   * - Default: 10
   * - Máximo: 100
   * - Mínimo: 1
   */
  limit: z
    .string()
    .regex(/^\d+$/, 'El límite debe ser un número')
    .transform(val => {
      const num = parseInt(val, 10);
      return Math.min(100, Math.max(1, num));
    })
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
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ASIGNACIÓN DE LÍDER
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para asignar un líder a un comité.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   liderComiteId: 'uuid-lider'
 * }
 */
export const assignLeaderSchema = z.object({
  /**
   * ID del líder a asignar (requerido)
   */
  liderComiteId: z
    .string()
    .uuid('El ID del líder debe ser un UUID válido')
    .min(1, 'El ID del líder es requerido'),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ESTADÍSTICAS DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros para obtener estadísticas de un comité.
 * 
 * @type {z.ZodObject}
 */
export const committeeStatsSchema = z.object({
  /**
   * ID del comité
   */
  id: z
    .string()
    .uuid('El ID del comité debe ser un UUID válido'),
});

// =============================================================================
// ESQUEMAS REUTILIZABLES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE NOMBRE DE COMITÉ (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar nombres de comités.
 * 
 * @type {z.ZodString}
 */
export const committeeNameSchema = z
  .string()
  .min(MIN_NAME_LENGTH, `El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
  .max(MAX_NAME_LENGTH, `El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`)
  .trim()
  .regex(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras, números y espacios');

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ESTADO DE COMITÉ (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar estados de comités.
 * 
 * @type {z.ZodEnum}
 */
export const committeeStatusSchema = z.enum(VALID_COMMITTEE_STATUS);

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ÁREA DE RESPONSABILIDAD (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar áreas de responsabilidad.
 * 
 * @type {z.ZodEnum}
 */
export const committeeAreaSchema = z.enum(VALID_COMMITTEE_AREAS);

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE PRESUPUESTO (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar presupuestos.
 * 
 * @type {z.ZodNumber}
 */
export const budgetSchema = z
  .number()
  .min(MIN_BUDGET, 'El presupuesto no puede ser negativo')
  .max(MAX_BUDGET, `El presupuesto no puede exceder ${MAX_BUDGET}`);

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

// =============================================================================
// FUNCIONES DE VALIDACIÓN
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * VALIDAR DATOS DE CREACIÓN DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para crear un comité.
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
 * -----------------------------------------------------------------------------
 * VALIDAR DATOS DE ACTUALIZACIÓN DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para actualizar un comité.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateUpdateCommittee = (data) => {
  return updateCommitteeSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR ID DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Valida el ID de un comité.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateCommitteeId = (data) => {
  return committeeIdSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR PARÁMETROS DE LISTADO
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros para listados de comités.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateListCommittees = (data) => {
  return listCommitteesSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR ASIGNACIÓN DE LÍDER
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para asignar un líder.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateAssignLeader = (data) => {
  return assignLeaderSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR SOLICITUD DE ESTADÍSTICAS
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros para obtener estadísticas.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateCommitteeStats = (data) => {
  return committeeStatsSchema.parse(data);
};

// =============================================================================
// FUNCIONES DE UTILIDAD
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * VALIDAR ESTADO DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Verifica si un estado de comité es válido.
 * 
 * @param {string} status - Estado a validar
 * @returns {boolean} True si el estado es válido
 * 
 * @example
 * const isValid = isValidCommitteeStatus('activo'); // true
 */
export const isValidCommitteeStatus = (status) => {
  return VALID_COMMITTEE_STATUS.includes(status);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR ÁREA DE RESPONSABILIDAD
 * -----------------------------------------------------------------------------
 * 
 * Verifica si un área de responsabilidad es válida.
 * 
 * @param {string} area - Área a validar
 * @returns {boolean} True si el área es válida
 */
export const isValidCommitteeArea = (area) => {
  return VALID_COMMITTEE_AREAS.includes(area);
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER ETIQUETA DE ESTADO
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la etiqueta legible de un estado de comité.
 * 
 * @param {string} status - Estado del comité
 * @returns {string} Etiqueta legible
 * 
 * @example
 * const label = getCommitteeStatusLabel('activo'); // 'Activo'
 */
export const getCommitteeStatusLabel = (status) => {
  const labels = {
    activo: 'Activo',
    inactivo: 'Inactivo',
    en_formacion: 'En Formación',
    disuelto: 'Disuelto',
  };
  
  return labels[status] || status;
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER ETIQUETA DE ÁREA
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la etiqueta legible de un área de responsabilidad.
 * 
 * @param {string} area - Área del comité
 * @returns {string} Etiqueta legible
 */
export const getCommitteeAreaLabel = (area) => {
  const labels = {
    logistica: 'Logística y Operaciones',
    finanzas: 'Finanzas y Presupuesto',
    comunicacion: 'Comunicación y Marketing',
    recursos_humanos: 'Recursos Humanos y Voluntarios',
    proyectos: 'Proyectos y Programas',
    tecnologia: 'Tecnología y Sistemas',
    eventos: 'Eventos y Actividades',
    alianzas: 'Alianzas y Relaciones Externas',
    capacitacion: 'Capacitación y Desarrollo',
    otro: 'Otro',
  };
  
  return labels[area] || area;
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
 * // [{ field: 'nombre', message: 'El nombre es requerido' }]
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
 * VALIDAR DATOS PARCIALES DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Valida datos parciales para actualizaciones (solo campos proporcionados).
 * 
 * @param {Object} data - Datos parciales a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validatePartialCommittee = (data) => {
  return updateCommitteeSchema.partial().parse(data);
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
 *   createCommitteeSchema, 
 *   validateCreateCommittee,
 *   isValidCommitteeStatus
 * } from './validators/committee.validator.js';
 * 
 * @example
 * // Importación por defecto
 * import committeeValidator from './validators/committee.validator.js';
 * committeeValidator.createCommitteeSchema.parse(data);
 */
export default {
  // Esquemas principales
  createCommitteeSchema,
  updateCommitteeSchema,
  committeeIdSchema,
  listCommitteesSchema,
  assignLeaderSchema,
  committeeStatsSchema,
  
  // Esquemas reutilizables
  committeeNameSchema,
  committeeStatusSchema,
  committeeAreaSchema,
  budgetSchema,
  uuidSchema,
  
  // Funciones de validación
  validateCreateCommittee,
  validateUpdateCommittee,
  validateCommitteeId,
  validateListCommittees,
  validateAssignLeader,
  validateCommitteeStats,
  validatePartialCommittee,
  
  // Funciones de utilidad
  isValidCommitteeStatus,
  isValidCommitteeArea,
  getCommitteeStatusLabel,
  getCommitteeAreaLabel,
  getFriendlyErrors,
  
  // Constantes
  VALID_COMMITTEE_STATUS,
  VALID_COMMITTEE_AREAS,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MIN_BUDGET,
  MAX_BUDGET,
};

/**
 * Exportaciones named para conveniencia
 */
export {
  // Esquemas
  createCommitteeSchema,
  updateCommitteeSchema,
  committeeIdSchema,
  listCommitteesSchema,
  assignLeaderSchema,
  committeeStatsSchema,
  committeeNameSchema,
  committeeStatusSchema,
  committeeAreaSchema,
  budgetSchema,
  uuidSchema,
  
  // Funciones
  validateCreateCommittee,
  validateUpdateCommittee,
  validateCommitteeId,
  validateListCommittees,
  validateAssignLeader,
  validateCommitteeStats,
  validatePartialCommittee,
  isValidCommitteeStatus,
  isValidCommitteeArea,
  getCommitteeStatusLabel,
  getCommitteeAreaLabel,
  getFriendlyErrors,
  
  // Constantes
  VALID_COMMITTEE_STATUS,
  VALID_COMMITTEE_AREAS,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MIN_BUDGET,
  MAX_BUDGET,
};