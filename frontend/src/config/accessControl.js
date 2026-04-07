export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  LIDER_ORGANIZACION: 'lider_organizacion',
  LIDER_COMITE: 'lider_comite',
  MIEMBRO: 'miembro',
};

export const ROUTES = {
  '/admin': [ROLES.SUPER_ADMIN],
  '/admin/organizaciones': [ROLES.SUPER_ADMIN],
  '/admin/organizaciones/nueva': [ROLES.SUPER_ADMIN],
  '/admin/organizaciones/:id/editar': [ROLES.SUPER_ADMIN],
  '/admin/usuarios': [ROLES.SUPER_ADMIN],

  '/estructura/organizaciones': [ROLES.ADMIN],
  '/estructura/organizaciones/nueva': [ROLES.ADMIN],
  '/estructura/miembros': [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  '/estructura/miembros/nuevo': [ROLES.LIDER_ORGANIZACION],
  '/estructura/miembros/baja/:id': [ROLES.LIDER_ORGANIZACION],
  '/estructura/comites': [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  '/estructura/comites/nuevo': [ROLES.LIDER_ORGANIZACION],
  '/estructura/comites/:id/gestion': [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  
  '/proyectos/planificar': [ROLES.LIDER_ORGANIZACION],
  '/proyectos/vincular': [ROLES.LIDER_ORGANIZACION],
  '/proyectos/aprobar': [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  '/proyectos/inscribirse': [
    ROLES.MIEMBRO,
    ROLES.LIDER_ORGANIZACION,
  ],

  '/horas/asistencia': [ROLES.LIDER_COMITE],
  '/horas/validar': [ROLES.LIDER_COMITE],
  '/horas/historial': [ROLES.MIEMBRO],

  '/finanzas/ingreso/nuevo': [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  '/finanzas/egreso/nuevo': [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  '/finanzas/caja': [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.MIEMBRO],
  '/finanzas/reportes': [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE, ROLES.MIEMBRO],
};

// Alias para compatibilidad con código existente
export const ROUTE_ACCESS = ROUTES;

export const canAccessRoute = (role, path) => {
  const normalizedRole = role ? String(role).toLowerCase() : '';
  const allowedRoles = ROUTES[path];
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return Boolean(normalizedRole) && allowedRoles.includes(normalizedRole);
};

export const firstAllowedPath = (role, paths = []) => {
  for (const path of paths) {
    if (canAccessRoute(role, path)) {
      return path;
    }
  }
  return '/';
};
