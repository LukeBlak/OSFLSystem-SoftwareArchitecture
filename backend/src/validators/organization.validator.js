/**
 * =============================================================================
 * VALIDADORES DE ORGANIZACIONES - CAPA DE VALIDACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir esquemas de validación Zod para todas las operaciones de organizaciones
 * - Centralizar las reglas de validación de datos de organizaciones en un solo módulo
 * - Proveer validaciones reutilizables para controllers y middleware
 * - Implementar reglas de negocio específicas para organizaciones
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
 * - createOrganizationSchema: Validación para crear organización
 * - updateOrganizationSchema: Validación para actualizar organización
 * - organizationIdSchema: Validación para ID de organización
 * - listOrganizationsSchema: Validación para listados con filtros
 * 
 * @module validators/organization.validator
 * @layer Validation
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTES Y REGLAS DE VALIDACIÓN
// =============================================================================

/**
 * Tipos válidos de organización según el modelo de dominio
 * 
 * @constant {Array<string>}
 */
const VALID_ORGANIZATION_TYPES = [
  'asociacion',
  'fundacion',
  'ong',
  'cooperativa',
  'grupo_comunitario',
  'religiosa',
  'estudiantil',
  'otro',
];

/**
 * Estados válidos para organizaciones
 * 
 * @constant {Array<string>}
 */
const VALID_ORGANIZATION_STATUS = [
  'activa',
  'inactiva',
  'en_registro',
  'suspendida',
];

/**
 * Expresión regular para validar emails
 * 
 * @constant {RegExp}
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Expresión regular para validar nombres de organización
 * 
 * @constant {RegExp}
 */
const NAME_REGEX = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/;

/**
 * Expresión regular para validar teléfonos de El Salvador (8 dígitos)
 * 
 * @constant {RegExp}
 */
const PHONE_REGEX = /^\d{8}$/;

/**
 * Longitud mínima del nombre de la organización
 * 
 * @constant {number}
 */
const MIN_NAME_LENGTH = 3;

/**
 * Longitud máxima del nombre de la organización
 * 
 * @constant {number}
 */
const MAX_NAME_LENGTH = 150;

/**
 * Longitud máxima de la descripción
 * 
 * @constant {number}
 */
const MAX_DESCRIPTION_LENGTH = 1000;

/**
 * Longitud máxima de la dirección
 * 
 * @constant {number}
 */
const MAX_ADDRESS_LENGTH = 255;

/**
 * Longitud máxima del email
 * 
 * @constant {number}
 */
const MAX_EMAIL_LENGTH = 255;

/**
 * Saldo mínimo (no negativo)
 * 
 * @constant {number}
 */
const MIN_BALANCE = 0;

/**
 * Saldo máximo permitido
 * 
 * @constant {number}
 */
const MAX_BALANCE = 100000000;

// =============================================================================
// ESQUEMAS DE VALIDACIÓN PRINCIPALES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE CREACIÓN DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para crear una nueva organización.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   nombre: 'Asociación de Voluntarios de El Salvador',
 *   tipo: 'ong',
 *   descripcion: 'Organización dedicada al voluntariado social',
 *   direccion: 'Calle Principal #123, San Salvador',
 *   telefono: '22220000',
 *   email: 'contacto@asvoluntarios.org',
 *   estado: 'activa'
 * }
 */
export const createOrganizationSchema = z.object({
  /**
   * Nombre de la organización (requerido, único en el sistema)
   */
  nombre: z
    .string()
    .min(MIN_NAME_LENGTH, `El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
    .max(MAX_NAME_LENGTH, `El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`)
    .trim()
    .regex(NAME_REGEX, 'El nombre solo puede contener letras, números y espacios'),
  
  /**
   * Tipo de organización
   * - Por defecto: 'ong'
   */
  tipo: z
    .enum(VALID_ORGANIZATION_TYPES, {
      errorMap: () => ({
        message: `Tipo inválido. Opciones: ${VALID_ORGANIZATION_TYPES.join(', ')}`,
      }),
    })
    .default('ong'),
  
  /**
   * Descripción detallada de la organización (opcional)
   */
  descripcion: z
    .string()
    .max(MAX_DESCRIPTION_LENGTH, `La descripción no puede exceder ${MAX_DESCRIPTION_LENGTH} caracteres`)
    .optional(),
  
  /**
   * Dirección física de la organización (opcional)
   */
  direccion: z
    .string()
    .max(MAX_ADDRESS_LENGTH, `La dirección no puede exceder ${MAX_ADDRESS_LENGTH} caracteres`)
    .optional(),
  
  /**
   * Teléfono de contacto (opcional)
   * - Formato El Salvador: 8 dígitos
   */
  telefono: z
    .string()
    .regex(PHONE_REGEX, 'El teléfono debe tener 8 dígitos')
    .optional(),
  
  /**
   * Email de contacto de la organización (opcional)
   */
  email: z
    .string()
    .max(MAX_EMAIL_LENGTH, `El email no puede exceder ${MAX_EMAIL_LENGTH} caracteres`)
    .email('El email debe ser válido')
    .transform(val => val.toLowerCase().trim())
    .optional(),
  
  /**
   * Estado inicial de la organización
   * - Por defecto: 'activa'
   */
  estado: z
    .enum(VALID_ORGANIZATION_STATUS, {
      errorMap: () => ({
        message: `Estado inválido. Opciones: ${VALID_ORGANIZATION_STATUS.join(', ')}`,
      }),
    })
    .default('activa'),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ACTUALIZACIÓN DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para actualizar una organización existente.
 * Todos los campos son opcionales (partial).
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos (parciales)
 * {
 *   nombre: 'Asociación de Voluntarios - Actualizado',
 *   telefono: '22221111'
 * }
 */
export const updateOrganizationSchema = z.object({
  /**
   * Nombre de la organización (opcional para update)
   */
  nombre: z
    .string()
    .min(MIN_NAME_LENGTH, `El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
    .max(MAX_NAME_LENGTH, `El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`)
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
    .max(MAX_DESCRIPTION_LENGTH, `La descripción no puede exceder ${MAX_DESCRIPTION_LENGTH} caracteres`)
    .optional(),
  
  /**
   * Dirección (opcional para update)
   */
  direccion: z
    .string()
    .max(MAX_ADDRESS_LENGTH, `La dirección no puede exceder ${MAX_ADDRESS_LENGTH} caracteres`)
    .optional(),
  
  /**
   * Teléfono (opcional para update)
   */
  telefono: z
    .string()
    .regex(PHONE_REGEX, 'El teléfono debe tener 8 dígitos')
    .optional(),
  
  /**
   * Email (opcional para update)
   */
  email: z
    .string()
    .max(MAX_EMAIL_LENGTH, `El email no puede exceder ${MAX_EMAIL_LENGTH} caracteres`)
    .email('El email debe ser válido')
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
    .min(MIN_BALANCE, 'El saldo no puede ser negativo')
    .max(MAX_BALANCE, `El saldo no puede exceder ${MAX_BALANCE}`)
    .optional(),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ID DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Valida el ID de una organización en parámetros de ruta.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos (params)
 * {
 *   id: 'uuid-organizacion'
 * }
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
 * -----------------------------------------------------------------------------
 * ESQUEMA DE LISTADO DE ORGANIZACIONES
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros de consulta para listados de organizaciones.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos (query params)
 * {
 *   tipo: 'ong',
 *   estado: 'activa',
 *   search: 'Voluntarios',
 *   page: '1',
 *   limit: '10'
 * }
 */
export const listOrganizationsSchema = z.object({
  /**
   * Filtrar por tipo de organización (opcional)
   */
  tipo: z
    .enum(VALID_ORGANIZATION_TYPES)
    .optional(),
  
  /**
   * Filtrar por estado (opcional)
   */
  estado: z
    .enum(VALID_ORGANIZATION_STATUS)
    .optional(),
  
  /**
   * Buscar por nombre o descripción (opcional)
   */
  search: z
    .string()
    .max(100, 'La búsqueda no puede exceder 100 caracteres')
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
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ESTADÍSTICAS DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros para obtener estadísticas de una organización.
 * 
 * @type {z.ZodObject}
 */
export const organizationStatsSchema = z.object({
  /**
   * ID de la organización
   */
  id: z
    .string()
    .uuid('El ID de la organización debe ser un UUID válido'),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE FINANZAS DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros para obtener finanzas de una organización.
 * 
 * @type {z.ZodObject}
 */
export const organizationFinancesSchema = z.object({
  /**
   * ID de la organización
   */
  id: z
    .string()
    .uuid('El ID de la organización debe ser un UUID válido'),
  
  /**
   * Periodo para filtrar (opcional, ej: 2026-01, 2026-Q1)
   */
  periodo: z
    .string()
    .regex(/^\d{4}(-\d{2})?(-Q[1-4])?$/, 'El periodo debe tener formato YYYY, YYYY-MM, o YYYY-Q#')
    .optional(),
});

// =============================================================================
// ESQUEMAS REUTILIZABLES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE NOMBRE DE ORGANIZACIÓN (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar nombres de organizaciones.
 * 
 * @type {z.ZodString}
 */
export const organizationNameSchema = z
  .string()
  .min(MIN_NAME_LENGTH, `El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
  .max(MAX_NAME_LENGTH, `El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`)
  .trim()
  .regex(NAME_REGEX, 'El nombre solo puede contener letras, números y espacios');

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE TIPO DE ORGANIZACIÓN (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar tipos de organización.
 * 
 * @type {z.ZodEnum}
 */
export const organizationTypeSchema = z.enum(VALID_ORGANIZATION_TYPES);

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ESTADO DE ORGANIZACIÓN (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar estados de organización.
 * 
 * @type {z.ZodEnum}
 */
export const organizationStatusSchema = z.enum(VALID_ORGANIZATION_STATUS);

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
  .max(MAX_EMAIL_LENGTH, `El email no puede exceder ${MAX_EMAIL_LENGTH} caracteres`)
  .email('El email debe ser válido')
  .transform(val => val.toLowerCase().trim())
  .optional();

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
 * ESQUEMA DE SALDO (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar saldos financieros.
 * 
 * @type {z.ZodNumber}
 */
export const balanceSchema = z
  .number()
  .min(MIN_BALANCE, 'El saldo no puede ser negativo')
  .max(MAX_BALANCE, `El saldo no puede exceder ${MAX_BALANCE}`);

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
 * VALIDAR DATOS DE CREACIÓN DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para crear una organización.
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
 * -----------------------------------------------------------------------------
 * VALIDAR DATOS DE ACTUALIZACIÓN DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para actualizar una organización.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateUpdateOrganization = (data) => {
  return updateOrganizationSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR ID DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Valida el ID de una organización.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateOrganizationId = (data) => {
  return organizationIdSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR PARÁMETROS DE LISTADO
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros para listados de organizaciones.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateListOrganizations = (data) => {
  return listOrganizationsSchema.parse(data);
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
export const validateOrganizationStats = (data) => {
  return organizationStatsSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR SOLICITUD DE FINANZAS
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros para obtener finanzas.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateOrganizationFinances = (data) => {
  return organizationFinancesSchema.parse(data);
};

// =============================================================================
// FUNCIONES DE UTILIDAD
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * VALIDAR TIPO DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Verifica si un tipo de organización es válido.
 * 
 * @param {string} type - Tipo a validar
 * @returns {boolean} True si el tipo es válido
 * 
 * @example
 * const isValid = isValidOrganizationType('ong'); // true
 */
export const isValidOrganizationType = (type) => {
  return VALID_ORGANIZATION_TYPES.includes(type);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR ESTADO DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Verifica si un estado de organización es válido.
 * 
 * @param {string} status - Estado a validar
 * @returns {boolean} True si el estado es válido
 */
export const isValidOrganizationStatus = (status) => {
  return VALID_ORGANIZATION_STATUS.includes(status);
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER ETIQUETA DE TIPO
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la etiqueta legible de un tipo de organización.
 * 
 * @param {string} type - Tipo de organización
 * @returns {string} Etiqueta legible
 * 
 * @example
 * const label = getOrganizationTypeLabel('ong'); // 'ONG'
 */
export const getOrganizationTypeLabel = (type) => {
  const labels = {
    asociacion: 'Asociación',
    fundacion: 'Fundación',
    ong: 'ONG',
    cooperativa: 'Cooperativa',
    grupo_comunitario: 'Grupo Comunitario',
    religiosa: 'Organización Religiosa',
    estudiantil: 'Organización Estudiantil',
    otro: 'Otro',
  };
  
  return labels[type] || type;
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER ETIQUETA DE ESTADO
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la etiqueta legible de un estado de organización.
 * 
 * @param {string} status - Estado de la organización
 * @returns {string} Etiqueta legible
 */
export const getOrganizationStatusLabel = (status) => {
  const labels = {
    activa: 'Activa',
    inactiva: 'Inactiva',
    en_registro: 'En Registro',
    suspendida: 'Suspendida',
  };
  
  return labels[status] || status;
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
      normalized: email ? email.toLowerCase().trim() : null,
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
 * VALIDAR DATOS PARCIALES DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Valida datos parciales para actualizaciones (solo campos proporcionados).
 * 
 * @param {Object} data - Datos parciales a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validatePartialOrganization = (data) => {
  return updateOrganizationSchema.partial().parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * NORMALIZAR DATOS DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Normaliza los datos de una organización para consistencia.
 * 
 * @param {Object} data - Datos a normalizar
 * @returns {Object} Datos normalizados
 */
export const normalizeOrganizationData = (data) => {
  return {
    ...data,
    nombre: data.nombre?.trim(),
    email: data.email?.toLowerCase().trim(),
    tipo: data.tipo?.toLowerCase(),
    estado: data.estado?.toLowerCase(),
  };
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
 *   createOrganizationSchema, 
 *   validateCreateOrganization,
 *   isValidOrganizationType
 * } from './validators/organization.validator.js';
 * 
 * @example
 * // Importación por defecto
 * import organizationValidator from './validators/organization.validator.js';
 * organizationValidator.createOrganizationSchema.parse(data);
 */
export default {
  // Esquemas principales
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationIdSchema,
  listOrganizationsSchema,
  organizationStatsSchema,
  organizationFinancesSchema,
  
  // Esquemas reutilizables
  organizationNameSchema,
  organizationTypeSchema,
  organizationStatusSchema,
  emailSchema,
  phoneSchema,
  balanceSchema,
  uuidSchema,
  
  // Funciones de validación
  validateCreateOrganization,
  validateUpdateOrganization,
  validateOrganizationId,
  validateListOrganizations,
  validateOrganizationStats,
  validateOrganizationFinances,
  validatePartialOrganization,
  
  // Funciones de utilidad
  isValidOrganizationType,
  isValidOrganizationStatus,
  getOrganizationTypeLabel,
  getOrganizationStatusLabel,
  validateEmailFormat,
  getFriendlyErrors,
  normalizeOrganizationData,
  
  // Constantes
  VALID_ORGANIZATION_TYPES,
  VALID_ORGANIZATION_STATUS,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_EMAIL_LENGTH,
  MIN_BALANCE,
  MAX_BALANCE,
  EMAIL_REGEX,
  PHONE_REGEX,
  NAME_REGEX,
};

/**
 * Exportaciones named para conveniencia
 */
export {
  // Esquemas
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationIdSchema,
  listOrganizationsSchema,
  organizationStatsSchema,
  organizationFinancesSchema,
  organizationNameSchema,
  organizationTypeSchema,
  organizationStatusSchema,
  emailSchema,
  phoneSchema,
  balanceSchema,
  uuidSchema,
  
  // Funciones
  validateCreateOrganization,
  validateUpdateOrganization,
  validateOrganizationId,
  validateListOrganizations,
  validateOrganizationStats,
  validateOrganizationFinances,
  validatePartialOrganization,
  isValidOrganizationType,
  isValidOrganizationStatus,
  getOrganizationTypeLabel,
  getOrganizationStatusLabel,
  validateEmailFormat,
  getFriendlyErrors,
  normalizeOrganizationData,
  
  // Constantes
  VALID_ORGANIZATION_TYPES,
  VALID_ORGANIZATION_STATUS,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_EMAIL_LENGTH,
  MIN_BALANCE,
  MAX_BALANCE,
  EMAIL_REGEX,
  PHONE_REGEX,
  NAME_REGEX,
};