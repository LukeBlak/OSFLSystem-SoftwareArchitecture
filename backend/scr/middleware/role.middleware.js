import { ApiError } from '../utils/apiError.js';

export const requireRole = (...roles) =>
  (req, res, next) => {
    const userRole = req.user?.user_metadata?.role;
    if (!roles.includes(userRole)) {
      return next(new ApiError(403, 'No tienes permisos para realizar esta acción'));
    }
    next();
  };
