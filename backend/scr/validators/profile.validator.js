import { body } from 'express-validator';

export const updateProfileValidator = [
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('apellido').optional().trim().notEmpty().withMessage('El apellido no puede estar vacío'),
  body('telefono').optional().trim(),
  body('bio').optional().trim(),
];

export const updatePasswordValidator = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
];
