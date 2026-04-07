import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';

export const getGlobalStats = async (req, res, next) => {
  try {
    const [
      { count: totalOrgs, error: errOrgs },
      { count: totalUsers, error: errUsers },
      { count: totalProyectos, error: errProjs }
    ] = await Promise.all([
      supabaseAdmin.from('organizacion').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('usuario').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('proyecto').select('*', { count: 'exact', head: true })
    ]);

    if (errOrgs || errUsers || errProjs) {
      throw ApiError.internal('Error al consultar estadísticas en la base de datos');
    }

    res.status(200).json({
      totalOrganizaciones: totalOrgs || 0,
      totalUsuarios: totalUsers || 0,
      proyectosGlobales: totalProyectos || 0
    });
  } catch (error) {
    next(error);
  }
};