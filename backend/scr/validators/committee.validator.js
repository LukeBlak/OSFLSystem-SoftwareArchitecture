import { body } from 'express-validator';

export const createCommitteeValidator = [
  body('nombre').trim().notEmpty().withMessage('El nombre del comité es requerido'),
  body('descripcion').optional().trim(),
  body('organizacion_id').notEmpty().withMessage('La organización es requerida'),
  body('presidente_id').optional(),
];

export const updateCommitteeValidator = [
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('descripcion').optional().trim(),
  body('presidente_id').optional(),
];
