import { supabase } from '../config/database.js';
import { ApiError } from '../utils/apiError.js';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Token no proporcionado'));
  }

  const token = authHeader.split(' ')[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return next(new ApiError(401, 'Token inválido o expirado'));
  }

  req.user = user;
  req.token = token;
  next();
};
