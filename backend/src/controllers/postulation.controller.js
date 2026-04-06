import * as postulationService from '../services/postulation.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const createPostulation = async (req, res, next) => {
  try {
    const postulation = await postulationService.createPostulation(
      req.supabase,
      req.user.id,
      req.params.proyectoId
    );
    res.status(201).json(ApiResponse.created(postulation, 'Postulación creada'));
  } catch (err) {
    next(err);
  }
};

export const getMyPostulations = async (req, res, next) => {
  try {
    const postulations = await postulationService.getMyPostulations(req.supabase, req.user.id);
    res.json(ApiResponse.ok(postulations, 'Mis postulaciones'));
  } catch (err) {
    next(err);
  }
};

export const getPostulationsByProject = async (req, res, next) => {
  try {
    const postulations = await postulationService.getPostulationsByProject(req.supabase, req.params.proyectoId);
    res.json(ApiResponse.ok(postulations, 'Postulaciones del proyecto'));
  } catch (err) {
    next(err);
  }
};

export const updatePostulationStatus = async (req, res, next) => {
  try {
    const postulation = await postulationService.updatePostulationStatus(
      req.supabase,
      req.params.id,
      req.body
    );
    res.json(ApiResponse.ok(postulation, 'Estado de postulación actualizado'));
  } catch (err) {
    next(err);
  }
};