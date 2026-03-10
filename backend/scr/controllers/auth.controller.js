import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { env } from '../config/env.js';

export const register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    res.status(201).json(ApiResponse.success('Usuario registrado exitosamente', data));
  } catch (err) {
    next(new ApiError(400, err.message));
  }
};

export const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    res.json(ApiResponse.success('Inicio de sesión exitoso', data));
  } catch (err) {
    next(new ApiError(401, err.message));
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const redirectTo = `${env.FRONTEND_URL}/reset-password`;
    await authService.forgotPassword(req.body.email, redirectTo);
    res.json(ApiResponse.success('Email de recuperación enviado'));
  } catch (err) {
    next(new ApiError(400, err.message));
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const data = await authService.updatePassword(req.body.password);
    res.json(ApiResponse.success('Contraseña actualizada exitosamente', data));
  } catch (err) {
    next(new ApiError(400, err.message));
  }
};

export const me = async (req, res) => {
  res.json(ApiResponse.success('Usuario autenticado', req.user));
};
