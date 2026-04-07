/**
 * =============================================================================
 * MODELO DE FINANZAS - CAPA DE DOMINIO
 * =============================================================================
 * 
 * @module models/Finance
 * @layer Domain
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTES
// =============================================================================

/**
 * Tipos de transacción
 */
export const TRANSACTION_TYPE = {
  INGRESO: 'ingreso',
  EGRESO: 'egreso',
};

/**
 * Categorías de ingresos
 */
export const INCOME_CATEGORIES = [
  'cuota_miembro',
  'donacion',
  'evento',
  'venta',
  'subvencion',
  'transferencia',
  'otro',
];

/**
 * Categorías de egresos
 */
export const EXPENSE_CATEGORIES = [
  'materiales',
  'transporte',
  'alimentacion',
  'publicidad',
  'servicios',
  'impuestos',
  'transferencia',
  'otro',
];

/**
 * Estados de transacción
 */
export const TRANSACTION_STATUS = {
  PENDIENTE: 'pendiente',
  APROBADA: 'aprobada',
  RECHAZADA: 'rechazada',
  CANCELADA: 'cancelada',
};

/**
 * Monto mínimo de transacción
 */
export const MIN_AMOUNT = 0.01;

/**
 * Monto máximo de transacción
 */
export const MAX_AMOUNT = 1000000;

// =============================================================================
// ESQUEMAS DE VALIDACIÓN
// =============================================================================

/**
 * Esquema para registrar entrada de fondos (CU-20)
 */
export const registerIncomeSchema = z.object({
  /**
   * Monto del ingreso
   */
  monto: z
    .number()
    .min(MIN_AMOUNT, `El monto mínimo es $${MIN_AMOUNT}`)
    .max(MAX_AMOUNT, `El monto máximo es $${MAX_AMOUNT}`)
    .positive('El monto debe ser positivo'),
  
  /**
   * Concepto/descripción del ingreso
   */
  concepto: z
    .string()
    .min(5, 'El concepto debe tener al menos 5 caracteres')
    .max(255, 'El concepto no puede exceder 255 caracteres'),
  
  /**
   * Categoría del ingreso
   */
  categoria: z
    .enum(INCOME_CATEGORIES, {
      errorMap: () => ({
        message: `Categoría inválida. Opciones: ${INCOME_CATEGORIES.join(', ')}`,
      }),
    }),
  
  /**
   * Fecha de la transacción
   */
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD'),
  
  /**
   * ID de la organización
   */
  organizacionId: z
    .string()
    .uuid('El ID de organización debe ser un UUID válido')
    .optional(),
  
  /**
   * Método de pago
   */
  metodoPago: z
    .enum(['efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro'])
    .default('efectivo'),
  
  /**
   * Número de comprobante (opcional)
   */
  numeroComprobante: z
    .string()
    .max(50, 'El número de comprobante no puede exceder 50 caracteres')
    .optional(),
  
  /**
   * URL del comprobante (opcional)
   */
  comprobanteUrl: z
    .string()
    .url('La URL del comprobante debe ser válida')
    .optional(),
  
  /**
   * Notas adicionales (opcional)
   */
  notas: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional(),
});

/**
 * Esquema para registrar salida de fondos (CU-21)
 */
export const registerExpenseSchema = z.object({
  /**
   * Monto del egreso
   */
  monto: z
    .number()
    .min(MIN_AMOUNT, `El monto mínimo es $${MIN_AMOUNT}`)
    .max(MAX_AMOUNT, `El monto máximo es $${MAX_AMOUNT}`)
    .positive('El monto debe ser positivo'),
  
  /**
   * Concepto/descripción del egreso
   */
  concepto: z
    .string()
    .min(5, 'El concepto debe tener al menos 5 caracteres')
    .max(255, 'El concepto no puede exceder 255 caracteres'),
  
  /**
   * Categoría del egreso
   */
  categoria: z
    .enum(EXPENSE_CATEGORIES, {
      errorMap: () => ({
        message: `Categoría inválida. Opciones: ${EXPENSE_CATEGORIES.join(', ')}`,
      }),
    }),
  
  /**
   * Fecha de la transacción
   */
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD'),
  
  /**
   * ID de la organización
   */
  organizacionId: z
    .string()
    .uuid('El ID de organización debe ser un UUID válido')
    .optional(),
  
  /**
   * Método de pago
   */
  metodoPago: z
    .enum(['efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro'])
    .default('efectivo'),
  
  /**
   * Número de comprobante (opcional)
   */
  numeroComprobante: z
    .string()
    .max(50, 'El número de comprobante no puede exceder 50 caracteres')
    .optional(),
  
  /**
   * URL del comprobante (opcional)
   */
  comprobanteUrl: z
    .string()
    .url('La URL del comprobante debe ser válida')
    .optional(),
  
  /**
   * ID del proyecto asociado (opcional)
   */
  proyectoId: z
    .string()
    .uuid('El ID del proyecto debe ser un UUID válido')
    .optional(),
  
  /**
   * Notas adicionales (opcional)
   */
  notas: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional(),
});

/**
 * Esquema para listar transacciones
 */
export const listTransactionsSchema = z.object({
  /**
   * Filtrar por organización
   */
  organizacionId: z
    .string()
    .uuid()
    .optional(),
  
  /**
   * Filtrar por tipo (ingreso/egreso)
   */
  tipo: z
    .enum(Object.values(TRANSACTION_TYPE))
    .optional(),
  
  /**
   * Filtrar por categoría
   */
  categoria: z
    .string()
    .optional(),
  
  /**
   * Filtrar por estado
   */
  estado: z
    .enum(Object.values(TRANSACTION_STATUS))
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
   * Monto mínimo
   */
  montoMin: z
    .number()
    .positive()
    .optional(),
  
  /**
   * Monto máximo
   */
  montoMax: z
    .number()
    .positive()
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

/**
 * Esquema para consultar saldo
 */
export const getBalanceSchema = z.object({
  /**
   * ID de la organización
   */
  organizacionId: z
    .string()
    .uuid('El ID de organización debe ser un UUID válido'),
  
  /**
   * Fecha de corte (opcional)
   */
  fechaCorte: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/**
 * Esquema para validar params de consulta de saldo (CU-22)
 */
export const getBalanceParamsSchema = z.object({
  organizacionId: z
    .string()
    .uuid('El ID de organización debe ser un UUID válido'),
});

/**
 * Esquema para validar query de consulta de saldo (CU-22)
 */
export const getBalanceQuerySchema = z.object({
  fechaCorte: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
    .optional(),
});

// =============================================================================
// FUNCIONES DE VALIDACIÓN
// =============================================================================

export const validateRegisterIncome = (data) => {
  return registerIncomeSchema.parse(data);
};

export const validateRegisterExpense = (data) => {
  return registerExpenseSchema.parse(data);
};

export const validateListTransactions = (data) => {
  return listTransactionsSchema.parse(data);
};

export const validateGetBalance = (data) => {
  return getBalanceSchema.parse(data);
};

export const validateGetBalanceParams = (data) => {
  return getBalanceParamsSchema.parse(data);
};

export const validateGetBalanceQuery = (data) => {
  return getBalanceQuerySchema.parse(data);
};

// =============================================================================
// EXPORTACIÓN
// =============================================================================

export default {
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  MIN_AMOUNT,
  MAX_AMOUNT,
  registerIncomeSchema,
  registerExpenseSchema,
  listTransactionsSchema,
  getBalanceSchema,
  getBalanceParamsSchema,
  getBalanceQuerySchema,
  validateRegisterIncome,
  validateRegisterExpense,
  validateListTransactions,
  validateGetBalance,
  validateGetBalanceParams,
  validateGetBalanceQuery,
};