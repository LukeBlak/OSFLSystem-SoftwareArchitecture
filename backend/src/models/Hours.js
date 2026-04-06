/**
 * =============================================================================
 * MODELO DE HORAS/ASISTENCIA - CAPA DE DOMINIO
 * =============================================================================
 * 
 * @module models/Hours
 * @layer Domain
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTES
// =============================================================================

/**
 * Estados válidos para registros de horas
 */
export const HOURS_STATUS = {
  PENDIENTE: 'pendiente',
  VALIDADA: 'validada',
  RECHAZADA: 'rechazada',
};

/**
 * Horas mínimas por registro
 */
export const MIN_HOURS = 0.5;

/**
 * Horas máximas por día
 */
export const MAX_HOURS_PER_DAY = 24;

// =============================================================================
// ESQUEMAS DE VALIDACIÓN
// =============================================================================

/**
 * Esquema para registrar asistencia/horas
 */
export const registerHoursSchema = z.object({
  /**
   * ID del miembro
   */
  miembroId: z
    .string()
    .uuid('El ID del miembro debe ser un UUID válido'),
  
  /**
   * ID del proyecto
   */
  proyectoId: z
    .string()
    .uuid('El ID del proyecto debe ser un UUID válido'),
  
  /**
   * Fecha de la asistencia
   */
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD'),
  
  /**
   * Cantidad de horas
   */
  cantidadHoras: z
    .number()
    .min(MIN_HOURS, `Las horas mínimas son ${MIN_HOURS}`)
    .max(MAX_HOURS_PER_DAY, `Las horas máximas por día son ${MAX_HOURS_PER_DAY}`),
  
  /**
   * Descripción de las actividades
   */
  descripcion: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  
  /**
   * Estado inicial (default: pendiente)
   */
  estado: z
    .enum(Object.values(HOURS_STATUS))
    .default(HOURS_STATUS.PENDIENTE),
});

/**
 * Esquema para validar horas (líderes)
 */
export const validateHoursSchema = z.object({
  /**
   * Si las horas son aprobadas o rechazadas
   */
  aprobada: z
    .boolean(),
  
  /**
   * Observaciones de la validación
   */
  observaciones: z
    .string()
    .max(500, 'Las observaciones no pueden exceder 500 caracteres')
    .optional(),
});

/**
 * Esquema para listar registros de horas
 */
export const listHoursSchema = z.object({
  /**
   * Filtrar por miembro
   */
  miembroId: z
    .string()
    .uuid()
    .optional(),
  
  /**
   * Filtrar por proyecto
   */
  proyectoId: z
    .string()
    .uuid()
    .optional(),
  
  /**
   * Filtrar por comité
   */
  comiteId: z
    .string()
    .uuid()
    .optional(),
  
  /**
   * Filtrar por estado
   */
  estado: z
    .enum(Object.values(HOURS_STATUS))
    .optional(),
  
  /**
   * Fecha desde
   */
  fechaDesde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  
  /**
   * Fecha hasta
   */
  fechaHasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  
  /**
   * Paginación
   */
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(val => parseInt(val, 10))
    .default('1'),
  
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(val => Math.min(100, Math.max(1, parseInt(val, 10))))
    .default('10'),
});

// =============================================================================
// FUNCIONES DE VALIDACIÓN
// =============================================================================

export const validateRegisterHours = (data) => {
  return registerHoursSchema.parse(data);
};

export const validateHoursValidation = (data) => {
  return validateHoursSchema.parse(data);
};

export const validateListHours = (data) => {
  return listHoursSchema.parse(data);
};

// =============================================================================
// EXPORTACIÓN
// =============================================================================

export default {
  HOURS_STATUS,
  MIN_HOURS,
  MAX_HOURS_PER_DAY,
  registerHoursSchema,
  validateHoursSchema,
  listHoursSchema,
  validateRegisterHours,
  validateHoursValidation,
  validateListHours,
};