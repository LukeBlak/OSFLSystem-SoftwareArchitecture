import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

/**
 * Protege rutas privadas. Si no hay sesión, redirige al login guardando la ruta original.
 * Uso: <PrivateRoute roles={['admin']}>...</PrivateRoute>
 */
const PrivateRoute = ({ children, roles }) => {
  const location = useLocation();

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0) {
    const user = authService.getUser();
    if (!user || !roles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
