import { body } from 'express-validator';

export const validateProject = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre del proyecto es requerido')
    .isLength({ max: 150 }).withMessage('El nombre no puede superar 150 caracteres'),

  body('cupos')
    .notEmpty().withMessage('Los cupos son requeridos')
    .isInt({ min: 1 }).withMessage('Los cupos deben ser un entero mayor a 0'),

  body('fecha_inicio')
    .notEmpty().withMessage('La fecha de inicio es requerida')
    .isISO8601().withMessage('fecha_inicio debe ser una fecha válida (ISO 8601)'),

  body('fecha_fin')
    .notEmpty().withMessage('La fecha de fin es requerida')
    .isISO8601().withMessage('fecha_fin debe ser una fecha válida (ISO 8601)')
    .custom((fecha_fin, { req }) => {
      if (new Date(fecha_fin) <= new Date(req.body.fecha_inicio)) {
        throw new Error('fecha_fin debe ser posterior a fecha_inicio');
      }
      return true;
    }),

  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('La descripción no puede superar 500 caracteres'),

  body('presupuesto_asignado')
    .optional()
    .isFloat({ min: 0 }).withMessage('El presupuesto asignado debe ser un número mayor o igual a 0'),

  body('recomendacion_horas')
    .optional()
    .isFloat({ min: 0 }).withMessage('La recomendación de horas debe ser un número mayor o igual a 0'),
];

export const assignCommitteeValidator = [
  body('comiteId').notEmpty().withMessage('comiteId es requerido'),
];
