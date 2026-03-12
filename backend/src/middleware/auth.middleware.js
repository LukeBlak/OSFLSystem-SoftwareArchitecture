/**
 * =============================================================================
 * MIDDLEWARE DE AUTENTICACIÓN (Supabase Auth)
 * =============================================================================
 * 
 * Propósito:
 * - Verificar el token JWT enviado por el frontend (generado por Supabase Auth)
 * - Extraer el user_id del token y adjuntarlo al request
 * - Proteger rutas privadas del backend
 * 
 * @module middleware/auth.middleware
 */

import { createClient } from '@supabase/supabase-js';
import { ApiError } from '../utils/apiError.js';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';

/**
 * Cliente de Supabase para verificar tokens
 * Usamos la clave ANON para verificar tokens de usuario
 */
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

/**
 * Middleware para proteger rutas
 * 
 * Uso: router.get('/ruta', authenticate, controller);
 */

export const authenticate = async (required, response, next) => {
  try {
    // 1. Obtener token del header Authorization
    const authHeader = required.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token no proporcionado');
    }

    const token = authHeader.split(' ')[1];

    // 2. Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token inválido o expirado');
    }

    // 3. Adjuntar usuario al request para usar en controllers
    required.user = {
      id: user.id,              // UUID de Supabase Auth
      email: user.email,
      role: user.user_metadata?.role || 'miembro', // Rol almacenado en metadata
      organizationId: user.user_metadata?.organization_id,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware opcional para requerir roles específicos
 * Uso: router.get('/admin', authenticate, requireRole(['admin']), controller);
 */
export const requireRole = (allowedRoles) => {
  return (required, response, next) => {
    const userRole = required.user?.role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN, 
        `Acceso denegado. Roles permitidos: ${allowedRoles.join(', ')}`
      );
    }
    
    next();
  };
};