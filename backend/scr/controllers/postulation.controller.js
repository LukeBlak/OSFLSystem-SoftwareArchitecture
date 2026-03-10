import * as postulationService from '../services/postulation.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const createPostulation = async (req, res, next) => {
  try {
    const postulation = await postulationService.createPostulation(
      req.user.miembro_id,
      req.params.proyectoId
    );
    res.status(201).json(ApiResponse.success('Postulacion creada', postulation));
  } catch (err) {
    next(new ApiError(400, err.message));
  }
};

export const getMyPostulations = async (req, res, next) => {
  try {
    const postulations = await postulationService.getMyPostulations(req.user.miembro_id);
    res.json(ApiResponse.success('Mis postulaciones', postulations));
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const getPostulationsByProject = async (req, res, next) => {
  try {
    const postulations = await postulationService.getPostulationsByProject(req.params.proyectoId);
    res.json(ApiResponse.success('Postulaciones del proyecto', postulations));
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const updatePostulationStatus = async (req, res, next) => {
  try {
    const postulation = await postulationService.updatePostulationStatus(
      req.params.id,
      req.body
    );
    res.json(ApiResponse.success('Postulacion actualizada', postulation));
  } catch (err) {
    const status = err.message === 'Postulacion no encontrada' ? 404 : 400;
    next(new ApiError(status, err.message));
  }
};