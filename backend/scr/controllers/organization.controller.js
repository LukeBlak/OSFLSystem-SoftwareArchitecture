import * as orgService from '../services/organization.service.js';
import { uploadImage } from '../services/cloudinary.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const create = async (req, res, next) => {
  try {
    let logo_url;
    if (req.file) {
      const result = await uploadImage(req.file.buffer, req.file.mimetype, 'organizations');
      logo_url = result.url;
    }
    const org = await orgService.createOrganization({ ...req.body, logo_url });
    res.status(201).json(ApiResponse.success('Organización creada exitosamente', org));
  } catch (err) {
    next(new ApiError(400, err.message));
  }
};

export const getAll = async (req, res, next) => {
  try {
    const orgs = await orgService.getOrganizations();
    res.json(ApiResponse.success('Organizaciones obtenidas', orgs));
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const getById = async (req, res, next) => {
  try {
    const org = await orgService.getOrganizationById(req.params.id);
    if (!org) return next(new ApiError(404, 'Organización no encontrada'));
    res.json(ApiResponse.success('Organización obtenida', org));
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const update = async (req, res, next) => {
  try {
    let logo_url;
    if (req.file) {
      const result = await uploadImage(req.file.buffer, req.file.mimetype, 'organizations');
      logo_url = result.url;
    }
    const updateData = logo_url ? { ...req.body, logo_url } : req.body;
    const org = await orgService.updateOrganization(req.params.id, updateData);
    res.json(ApiResponse.success('Organización actualizada', org));
  } catch (err) {
    next(err.message === 'Organización no encontrada' ? new ApiError(404, err.message) : new ApiError(400, err.message));
  }
};

export const remove = async (req, res, next) => {
  try {
    await orgService.deleteOrganization(req.params.id);
    res.json(ApiResponse.success('Organización eliminada'));
  } catch (err) {
    next(err.message === 'Organización no encontrada' ? new ApiError(404, err.message) : new ApiError(400, err.message));
  }
};
