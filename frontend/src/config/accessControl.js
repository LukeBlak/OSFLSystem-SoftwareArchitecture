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

  '/estructura/organizaciones': [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION],
  '/estructura/organizaciones/nueva': [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION],
  '/estructura/miembros': [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  '/estructura/miembros/nuevo': [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  '/estructura/miembros/baja/:id': [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  '/estructura/comites': [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  '/estructura/comites/nuevo': [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  '/estructura/comites/:id/gestion': [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  
  '/proyectos/planificar': [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION],
  '/proyectos/vincular': [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION],
  '/proyectos/aprobar': [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION],
  '/proyectos/inscribirse': [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.LIDER_ORGANIZACION,
    ROLES.LIDER_COMITE,
    ROLES.MIEMBRO,
  ],

  '/horas/asistencia': [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  '/horas/validar': [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE],
  '/horas/historial': [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE, ROLES.MIEMBRO],

  '/finanzas/ingreso/nuevo': [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION],
  '/finanzas/egreso/nuevo': [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION],
  '/finanzas/caja': [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION],
  '/finanzas/reportes': [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION],
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
