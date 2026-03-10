import { body } from 'express-validator';

export const registerValidator = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('apellido').trim().notEmpty().withMessage('El apellido es requerido'),
  body('role')
    .optional()
    .isIn(['ADMIN', 'COORDINADOR', 'VOLUNTARIO'])
    .withMessage('Rol inválido'),
];

export const loginValidator = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
];

export const forgotPasswordValidator = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
];

export const updatePasswordValidator = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
];
