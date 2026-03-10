import { body } from 'express-validator';

export const registerMemberValidator = [
  body('user_id').notEmpty().withMessage('El user_id es requerido'),
  body('organizacion_id').notEmpty().withMessage('La organización es requerida'),
  body('cargo').optional().trim(),
];

export const deactivateMemberValidator = [
  body('motivo').trim().notEmpty().withMessage('El motivo de baja es requerido'),
];
