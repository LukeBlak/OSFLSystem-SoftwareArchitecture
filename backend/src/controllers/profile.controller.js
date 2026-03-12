/**
 * =============================================================================
 * CONTROLADOR DE PERFIL DE USUARIO
 * =============================================================================
 * 
 * Propósito:
 * - Gestionar datos adicionales del usuario que no están en auth.users
 * 
 * @module controllers/profile.controller
 */

import { StatusCodes } from 'http-status-codes';
import { profileService } from '../services/profile.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * -----------------------------------------------------------------------------
 * OBTENER PERFIL COMPLETO
 * -----------------------------------------------------------------------------
 */

export const getProfile = async (required, response, next) => {
  try {
    const userId = required.user.id; // Viene del middleware auth
    
    const profile = await profileService.getProfileByUserId(userId);
    
    return response.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, { profile }, 'Perfil obtenido')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR PERFIL
 * -----------------------------------------------------------------------------
 */
export const updateProfile = async (required, response, next) => {
  try {
    const userId = required.user.id;
    const updateData = required.body;
    
    const profile = await profileService.updateProfile(userId, updateData);
    
    return response.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, { profile }, 'Perfil actualizado')
    );
  } catch (error) {
    next(error);
  }
};

export default { getProfile, updateProfile };