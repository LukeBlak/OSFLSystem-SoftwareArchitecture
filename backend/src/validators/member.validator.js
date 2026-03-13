/**
 * =============================================================================
 * VALIDADORES DE MIEMBROS - CAPA DE VALIDACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir esquemas de validación Zod para todas las operaciones de miembros
 * - Centralizar las reglas de validación de datos de miembros en un solo módulo
 * - Proveer validaciones reutilizables para controllers y middleware
 * - Implementar reglas de negocio específicas para miembros/voluntarios
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
 * - createMemberSchema: Validación para crear miembro
 * - updateMemberSchema: Validación para actualizar miembro
 * - memberIdSchema: Validación para ID de miembro
 * - listMembersSchema: Validación para listados con filtros
 * - registerHoursSchema: Validación para registro de horas
 * 
 * @module validators/member.validator
 * @layer Validation
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTES Y REGLAS DE VALIDACIÓN
// =============================================================================

/**
 * Expresión regular para validar DUI de El Salvador
 * Formato: 8 dígitos, guión, 1 dígito (00000000-0)
 * 
 * @constant {RegExp}
 */
const DUI_REGEX = /^\d{8}-\d$/;

/**
 * Expresión regular para validar emails
 * 
 * @constant {RegExp}
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * Expresión regular para validar fechas (YYYY-MM-DD)
 * 
 * @constant {RegExp}
 */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Estados válidos para miembros
 * 
 * @constant {Array<boolean>}
 */
const VALID_MEMBER_STATUS = [true, false];

/**
 * Longitud mínima del nombre del miembro
 * 
 * @constant {number}
 */
const MIN_NAME_LENGTH = 3;

/**
 * Longitud máxima del nombre del miembro
 * 
 * @constant {number}
 */
const MAX_NAME_LENGTH = 150;

/**
 * Longitud máxima del email
 * 
 * @constant {number}
 */
const MAX_EMAIL_LENGTH = 255;

/**
 * Longitud máxima de la dirección
 * 
 * @constant {number}
 */
const MAX_ADDRESS_LENGTH = 255;

/**
 * Longitud máxima de la descripción de horas
 * 
 * @constant {number}
 */
const MAX_HOURS_DESCRIPTION_LENGTH = 500;

/**
 * Horas mínimas por registro
 * 
 * @constant {number}
 */
const MIN_HOURS = 0.5;

/**
 * Horas máximas por día
 * 
 * @constant {number}
 */
const MAX_HOURS_PER_DAY = 24;

/**
 * Edad mínima para ser miembro voluntario
 * 
 * @constant {number}
 */
const MIN_AGE = 16;

// =============================================================================
// ESQUEMAS DE VALIDACIÓN PRINCIPALES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE CREACIÓN DE MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para registrar un nuevo miembro/voluntario.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   dui: '01234567-8',
 *   nombre: 'Juan Pérez',
 *   email: 'juan@ejemplo.com',
 *   telefono: '70001234',
 *   fechanacimiento: '1990-05-15',
 *   direccion: 'Calle Principal #123, San Salvador',
 *   organizacionId: 'uuid-organizacion'
 * }
 */
export const createMemberSchema = z.object({
  /**
   * Documento Único de Identidad (DUI) de El Salvador
   * - Formato: 00000000-0 (8 dígitos, guión, 1 dígito)
   * - Único en el sistema
   */
  dui: z
    .string()
    .min(9, 'El DUI debe tener al menos 9 caracteres')
    .max(10, 'El DUI no puede exceder 10 caracteres')
    .regex(DUI_REGEX, 'El DUI debe tener formato 00000000-0')
    .transform(val => val.toUpperCase()),
  
  /**
   * Nombre completo del miembro
   * - Mínimo 3 caracteres, máximo 150 caracteres
   */
  nombre: z
    .string()
    .min(MIN_NAME_LENGTH, `El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
    .max(MAX_NAME_LENGTH, `El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`)
    .regex(NAME_REGEX, 'El nombre solo puede contener letras y espacios')
    .trim(),
  
  /**
   * Email del miembro (único en el sistema)
   * - Debe ser email válido
   */
  email: z
    .string()
    .min(1, 'El email es requerido')
    .max(MAX_EMAIL_LENGTH, `El email no puede exceder ${MAX_EMAIL_LENGTH} caracteres`)
    .email('El email debe ser válido')
    .transform(val => val.toLowerCase().trim()),
  
  /**
   * Teléfono de contacto (opcional)
   * - Formato El Salvador: 8 dígitos
   */
  telefono: z
    .string()
    .regex(PHONE_REGEX, 'El teléfono debe tener 8 dígitos')
    .optional(),
  
  /**
   * Fecha de nacimiento (opcional)
   * - Formato: YYYY-MM-DD
   * - El miembro debe tener al menos MIN_AGE años
   */
  fechanacimiento: z
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
        message: `El miembro debe tener al menos ${MIN_AGE} años`,
      }
    )
    .optional(),
  
  /**
   * Dirección de residencia (opcional)
   * - Máximo 255 caracteres
   */
  direccion: z
    .string()
    .max(MAX_ADDRESS_LENGTH, `La dirección no puede exceder ${MAX_ADDRESS_LENGTH} caracteres`)
    .optional(),
  
  /**
   * ID de la organización a la que pertenece (requerido)
   */
  organizacionId: z
    .string()
    .uuid('El ID de organización debe ser un UUID válido'),
  
  /**
   * Estado inicial del miembro
   * - Por defecto: activo (true)
   */
  estadoActivo: z
    .boolean()
    .default(true),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ACTUALIZACIÓN DE MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para actualizar un miembro existente.
 * Todos los campos son opcionales (partial).
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos (parciales)
 * {
 *   nombre: 'Juan Carlos Pérez',
 *   telefono: '70001234'
 * }
 */
export const updateMemberSchema = z.object({
  /**
   * DUI (opcional para update)
   */
  dui: z
    .string()
    .min(9, 'El DUI debe tener al menos 9 caracteres')
    .max(10, 'El DUI no puede exceder 10 caracteres')
    .regex(DUI_REGEX, 'El DUI debe tener formato 00000000-0')
    .optional(),
  
  /**
   * Nombre (opcional para update)
   */
  nombre: z
    .string()
    .min(MIN_NAME_LENGTH, `El nombre debe tener al menos ${MIN_NAME_LENGTH} caracteres`)
    .max(MAX_NAME_LENGTH, `El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`)
    .regex(NAME_REGEX, 'El nombre solo puede contener letras y espacios')
    .optional(),
  
  /**
   * Email (opcional para update)
   */
  email: z
    .string()
    .min(1, 'El email es requerido')
    .max(MAX_EMAIL_LENGTH, `El email no puede exceder ${MAX_EMAIL_LENGTH} caracteres`)
    .email('El email debe ser válido')
    .optional(),
  
  /**
   * Teléfono (opcional para update)
   */
  telefono: z
    .string()
    .regex(PHONE_REGEX, 'El teléfono debe tener 8 dígitos')
    .optional(),
  
  /**
   * Fecha de nacimiento (opcional para update)
   */
  fechanacimiento: z
    .string()
    .regex(DATE_REGEX, 'La fecha debe tener formato YYYY-MM-DD')
    .optional(),
  
  /**
   * Dirección (opcional para update)
   */
  direccion: z
    .string()
    .max(MAX_ADDRESS_LENGTH, `La dirección no puede exceder ${MAX_ADDRESS_LENGTH} caracteres`)
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
 * -----------------------------------------------------------------------------
 * ESQUEMA DE ID DE MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Valida el ID de un miembro en parámetros de ruta.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos (params)
 * {
 *   id: 'uuid-miembro'
 * }
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
 * -----------------------------------------------------------------------------
 * ESQUEMA DE LISTADO DE MIEMBROS
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros de consulta para listados de miembros.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos (query params)
 * {
 *   organizacionId: 'uuid-organizacion',
 *   estadoActivo: 'true',
 *   search: 'Juan',
 *   page: '1',
 *   limit: '10'
 * }
 */
export const listMembersSchema = z.object({
  /**
   * Filtrar por organización (opcional)
   */
  organizacionId: z
    .string()
    .uuid('El ID de organización debe ser un UUID válido')
    .optional(),
  
  /**
   * Filtrar por estado activo (opcional)
   * - 'true' o 'false' como string
   */
  estadoActivo: z
    .string()
    .regex(/^(true|false)$/, 'El estado debe ser true o false')
    .transform(val => val === 'true')
    .optional(),
  
  /**
   * Buscar por nombre o email (opcional)
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
 * -----------------------------------------------------------------------------
 * ESQUEMA DE REGISTRO DE HORAS
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para registrar horas sociales de un miembro.
 * 
 * @type {z.ZodObject}
 * 
 * @example
 * // Datos válidos
 * {
 *   proyectoId: 'uuid-proyecto',
 *   fecha: '2026-02-03',
 *   cantidadHoras: 4,
 *   descripcion: 'Actividades de limpieza comunitaria'
 * }
 */
export const registerHoursSchema = z.object({
  /**
   * ID del proyecto donde se registran las horas (requerido)
   */
  proyectoId: z
    .string()
    .uuid('El ID del proyecto debe ser un UUID válido'),
  
  /**
   * Fecha del registro (requerido)
   * - Formato: YYYY-MM-DD
   */
  fecha: z
    .string()
    .regex(DATE_REGEX, 'La fecha debe tener formato YYYY-MM-DD'),
  
  /**
   * Cantidad de horas registradas (requerido)
   * - Mínimo: 0.5 horas
   * - Máximo: 24 horas por día
   */
  cantidadHoras: z
    .number()
    .min(MIN_HOURS, `Las horas mínimas son ${MIN_HOURS}`)
    .max(MAX_HOURS_PER_DAY, `Las horas máximas por día son ${MAX_HOURS_PER_DAY}`),
  
  /**
   * Descripción de las actividades realizadas (opcional)
   */
  descripcion: z
    .string()
    .max(MAX_HOURS_DESCRIPTION_LENGTH, `La descripción no puede exceder ${MAX_HOURS_DESCRIPTION_LENGTH} caracteres`)
    .optional(),
});

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE VALIDACIÓN DE HORAS
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para validar horas registradas.
 * 
 * @type {z.ZodObject}
 */
export const validateHoursSchema = z.object({
  /**
   * Si las horas son aprobadas o rechazadas
   */
  aprobado: z
    .boolean(),
  
  /**
   * Observaciones de la validación (opcional)
   */
  observaciones: z
    .string()
    .max(500, 'Las observaciones no pueden exceder 500 caracteres')
    .optional(),
});

// =============================================================================
// ESQUEMAS REUTILIZABLES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ESQUEMA DE DUI (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar DUI de El Salvador.
 * 
 * @type {z.ZodString}
 */
export const duiSchema = z
  .string()
  .min(9, 'El DUI debe tener al menos 9 caracteres')
  .max(10, 'El DUI no puede exceder 10 caracteres')
  .regex(DUI_REGEX, 'El DUI debe tener formato 00000000-0')
  .transform(val => val.toUpperCase());

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
 * ESQUEMA DE CANTIDAD DE HORAS (REUTILIZABLE)
 * -----------------------------------------------------------------------------
 * 
 * Esquema reutilizable para validar cantidad de horas.
 * 
 * @type {z.ZodNumber}
 */
export const hoursSchema = z
  .number()
  .min(MIN_HOURS, `Las horas mínimas son ${MIN_HOURS}`)
  .max(MAX_HOURS_PER_DAY, `Las horas máximas por día son ${MAX_HOURS_PER_DAY}`);

// =============================================================================
// FUNCIONES DE VALIDACIÓN
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * VALIDAR DATOS DE CREACIÓN DE MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para crear un miembro.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 * 
 * @example
 * const validData = validateCreateMember({
 *   dui: '01234567-8',
 *   nombre: 'Juan Pérez',
 *   email: 'juan@ejemplo.com',
 *   organizacionId: 'uuid-organizacion'
 * });
 */
export const validateCreateMember = (data) => {
  return createMemberSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR DATOS DE ACTUALIZACIÓN DE MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para actualizar un miembro.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateUpdateMember = (data) => {
  return updateMemberSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR ID DE MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Valida el ID de un miembro.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateMemberId = (data) => {
  return memberIdSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR PARÁMETROS DE LISTADO
 * -----------------------------------------------------------------------------
 * 
 * Valida los parámetros para listados de miembros.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateListMembers = (data) => {
  return listMembersSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR REGISTRO DE HORAS
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para registrar horas.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateRegisterHours = (data) => {
  return registerHoursSchema.parse(data);
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR VALIDACIÓN DE HORAS
 * -----------------------------------------------------------------------------
 * 
 * Valida los datos para validar horas.
 * 
 * @param {Object} data - Datos a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validateHours = (data) => {
  return validateHoursSchema.parse(data);
};

// =============================================================================
// FUNCIONES DE UTILIDAD
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * VALIDAR FORMATO DE DUI
 * -----------------------------------------------------------------------------
 * 
 * Verifica si un DUI tiene formato válido y lo formatea.
 * 
 * @param {string} dui - DUI a validar
 * @returns {Object} Resultado de validación
 * @returns {boolean} return.isValid - Si el DUI es válido
 * @returns {string} return.formatted - DUI formateado
 * @returns {string} return.original - DUI original
 * 
 * @example
 * const result = validateDUI('012345678');
 * // { isValid: true, formatted: '01234567-8', original: '012345678' }
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
 * // [{ field: 'dui', message: 'El DUI debe tener formato 00000000-0' }]
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
 * VALIDAR DATOS PARCIALES DE MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Valida datos parciales para actualizaciones (solo campos proporcionados).
 * 
 * @param {Object} data - Datos parciales a validar
 * @returns {Object} Datos validados
 * @throws {z.ZodError} Si los datos no son válidos
 */
export const validatePartialMember = (data) => {
  return updateMemberSchema.partial().parse(data);
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
 *   createMemberSchema, 
 *   validateCreateMember,
 *   validateDUI,
 *   calculateAge
 * } from './validators/member.validator.js';
 * 
 * @example
 * // Importación por defecto
 * import memberValidator from './validators/member.validator.js';
 * memberValidator.createMemberSchema.parse(data);
 */
export default {
  // Esquemas principales
  createMemberSchema,
  updateMemberSchema,
  memberIdSchema,
  listMembersSchema,
  registerHoursSchema,
  validateHoursSchema,
  
  // Esquemas reutilizables
  duiSchema,
  emailSchema,
  phoneSchema,
  nameSchema,
  dateSchema,
  uuidSchema,
  hoursSchema,
  
  // Funciones de validación
  validateCreateMember,
  validateUpdateMember,
  validateMemberId,
  validateListMembers,
  validateRegisterHours,
  validateHours,
  validatePartialMember,
  
  // Funciones de utilidad
  validateDUI,
  calculateAge,
  isMinimumAge,
  validateEmailFormat,
  getFriendlyErrors,
  
  // Constantes
  VALID_MEMBER_STATUS,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_ADDRESS_LENGTH,
  MIN_HOURS,
  MAX_HOURS_PER_DAY,
  MIN_AGE,
  DUI_REGEX,
  EMAIL_REGEX,
  PHONE_REGEX,
  DATE_REGEX,
};

/**
 * Exportaciones named para conveniencia
 */
export {
  // Esquemas
  createMemberSchema,
  updateMemberSchema,
  memberIdSchema,
  listMembersSchema,
  registerHoursSchema,
  validateHoursSchema,
  duiSchema,
  emailSchema,
  phoneSchema,
  nameSchema,
  dateSchema,
  uuidSchema,
  hoursSchema,
  
  // Funciones
  validateCreateMember,
  validateUpdateMember,
  validateMemberId,
  validateListMembers,
  validateRegisterHours,
  validateHours,
  validatePartialMember,
  validateDUI,
  calculateAge,
  isMinimumAge,
  validateEmailFormat,
  getFriendlyErrors,
  
  // Constantes
  VALID_MEMBER_STATUS,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_ADDRESS_LENGTH,
  MIN_HOURS,
  MAX_HOURS_PER_DAY,
  MIN_AGE,
  DUI_REGEX,
  EMAIL_REGEX,
  PHONE_REGEX,
  DATE_REGEX,
};