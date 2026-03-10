import * as projectService from '../services/project.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const createProject = async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.body, req.user.organizacion_id);
    res.status(201).json(ApiResponse.success('Proyecto creado', project));
  } catch (err) {
    next(err);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getProjects(req.query);
    res.json(ApiResponse.success('Proyectos obtenidos', projects));
  } catch (err) {
    next(err);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    if (!project) return next(new ApiError(404, 'Proyecto no encontrado'));
    res.json(ApiResponse.success('Proyecto', project));
  } catch (err) {
    next(err);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    res.json(ApiResponse.success('Proyecto actualizado', project));
  } catch (err) {
    next(err);
  }
};

export const assignCommittee = async (req, res, next) => {
  try {
    const { comiteId } = req.body;
    if (!comiteId) return next(new ApiError(400, 'comiteId es requerido'));
    const project = await projectService.assignCommittee(req.params.id, comiteId);
    res.json(ApiResponse.success('Comité vinculado', project));
  } catch (err) {
    next(err);
  }
};
