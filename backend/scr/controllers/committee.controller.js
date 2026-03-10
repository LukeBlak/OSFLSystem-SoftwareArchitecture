import * as committeeService from '../services/committee.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const create = async (req, res, next) => {
  try {
    const committee = await committeeService.createCommittee(req.body);
    res.status(201).json(ApiResponse.success('Comité creado exitosamente', committee));
  } catch (err) {
    next(new ApiError(400, err.message));
  }
};

export const getAll = async (req, res, next) => {
  try {
    const committees = await committeeService.getCommittees(req.query);
    res.json(ApiResponse.success('Comités obtenidos', committees));
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const getById = async (req, res, next) => {
  try {
    const committee = await committeeService.getCommitteeById(req.params.id);
    if (!committee) return next(new ApiError(404, 'Comité no encontrado'));
    res.json(ApiResponse.success('Comité obtenido', committee));
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const update = async (req, res, next) => {
  try {
    const committee = await committeeService.updateCommittee(req.params.id, req.body);
    res.json(ApiResponse.success('Comité actualizado', committee));
  } catch (err) {
    next(err.message === 'Comité no encontrado' ? new ApiError(404, err.message) : new ApiError(400, err.message));
  }
};

export const remove = async (req, res, next) => {
  try {
    await committeeService.deleteCommittee(req.params.id);
    res.json(ApiResponse.success('Comité eliminado'));
  } catch (err) {
    next(err.message === 'Comité no encontrado' ? new ApiError(404, err.message) : new ApiError(400, err.message));
  }
};
