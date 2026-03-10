import * as memberService from '../services/member.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const getAll = async (req, res, next) => {
  try {
    const members = await memberService.getMembers(req.query);
    res.json(ApiResponse.success('Miembros obtenidos', members));
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const getById = async (req, res, next) => {
  try {
    const member = await memberService.getMemberById(req.params.id);
    if (!member) return next(new ApiError(404, 'Miembro no encontrado'));
    res.json(ApiResponse.success('Miembro obtenido', member));
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const register = async (req, res, next) => {
  try {
    const member = await memberService.registerMember(req.body);
    res.status(201).json(ApiResponse.success('Miembro registrado exitosamente', member));
  } catch (err) {
    next(new ApiError(400, err.message));
  }
};

export const deactivate = async (req, res, next) => {
  try {
    const member = await memberService.deactivateMember(req.params.id, req.body.motivo);
    res.json(ApiResponse.success('Miembro dado de baja', member));
  } catch (err) {
    const status = err.message === 'Miembro no encontrado' ? 404 : 400;
    next(new ApiError(status, err.message));
  }
};
