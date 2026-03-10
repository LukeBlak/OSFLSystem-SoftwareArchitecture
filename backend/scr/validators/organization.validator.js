import { body } from 'express-validator';

export const createOrganizationValidator = [
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('descripcion').optional().trim(),
  body('email_contacto')
    .optional()
    .isEmail()
    .withMessage('Email de contacto inválido')
    .normalizeEmail(),
  body('telefono').optional().trim(),
  body('direccion').optional().trim(),
];

export const updateOrganizationValidator = [
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('descripcion').optional().trim(),
  body('email_contacto')
    .optional()
    .isEmail()
    .withMessage('Email de contacto inválido')
    .normalizeEmail(),
  body('telefono').optional().trim(),
  body('direccion').optional().trim(),
];
