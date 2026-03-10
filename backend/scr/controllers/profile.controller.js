import { supabase } from '../config/database.js';
import { uploadImage } from '../services/cloudinary.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const getProfile = async (req, res) => {
  res.json(ApiResponse.success('Perfil obtenido', req.user));
};

export const updateProfile = async (req, res, next) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: req.body,
    });
    if (error) return next(new ApiError(400, error.message));
    res.json(ApiResponse.success('Perfil actualizado', data.user));
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) return next(new ApiError(400, 'No se proporcionó ninguna imagen'));

    const { url } = await uploadImage(req.file.buffer, req.file.mimetype, 'avatars');

    const { data, error } = await supabase.auth.updateUser({
      data: { avatar_url: url },
    });
    if (error) return next(new ApiError(400, error.message));
    res.json(ApiResponse.success('Avatar actualizado', { avatar_url: url, user: data.user }));
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: req.body.password,
    });
    if (error) return next(new ApiError(400, error.message));
    res.json(ApiResponse.success('Contraseña actualizada', data.user));
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};
