import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import Login from './pages/auth/Login';
import RecuperarPassword from './pages/auth/RecuperarPassword';
import Perfil from './pages/auth/Perfil';
import Dashboard from './pages/Dashboard';
import DashboardAdmin from './pages/admin/DashboardAdmin';
import UsuariosAdmin from './pages/admin/UsuariosAdmin';
import RegistroOrganizacion from './pages/admin/RegistroOrganizacion';
import ConsultaOrganizaciones from './pages/admin/ConsultaOrganizaciones';
import ListadoMiembros from './pages/miembros/ListadoMiembros';
import RegistroMiembros from './pages/miembros/RegistroMiembros';
import BajaMiembro from './pages/miembros/BajaMiembro';
import ConsultaComites from './pages/comites/ConsultaComites';
import CrearComite from './pages/comites/CrearComite';
import GestionComite from './pages/comites/GestionComite';
import PlanificarProyecto from './pages/operaciones/PlanificarProyecto';
import VincularComite from './pages/operaciones/VincularComite';
import AprobarParticipante from './pages/operaciones/AprobarParticipante';
import InscribirseProyecto from './pages/operaciones/InscribirseProyecto';
import RegistroAsistencia from './pages/horas/RegistroAsistencia';
import ValidarHoras from './pages/horas/ValidarHoras';
import HistorialHoras from './pages/horas/HistorialHoras';
import RegistroIngreso from './pages/finanzas/RegistroIngreso';
import RegistroEgreso from './pages/finanzas/RegistroEgreso';
import ConsultarCaja from './pages/finanzas/ConsultarCaja';
import ReportesFinancieros from './pages/finanzas/ReportesFinancieros';
import PrivateRoute from './components/PrivateRoute';
import authService from './services/authService';
import { ROLES, firstAllowedPath } from './config/accessControl';

const Protected = ({ children, roles }) => <PrivateRoute roles={roles}>{children}</PrivateRoute>;

const slugifyTenant = (value = '') => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const getTenantSlugFromUser = (user) => {
  const organizationName = user?.organizationName || null;
  const organizationId = user?.organizationId
    || user?.organizacionId
    || user?.organization_id
    || user?.organizacion_id
    || null;

  return slugifyTenant(organizationName) || slugifyTenant(organizationId);
};

const withTenantPath = (path) => {
  if (path === '/') return '/:tenant';
  return `/:tenant${path}`;
};

const TenantPathEnforcer = ({ children }) => {
  const location = useLocation();
  const currentUser = authService.getUser();

  if (!currentUser) {
    return children;
  }

  const normalizedRole = String(currentUser?.role || '').toLowerCase();
  if (normalizedRole === 'super_admin') {
    return children;
  }

  const currentPath = location.pathname;
  const isAuthPath = ['/login', '/recuperar-password', '/reset-password'].includes(currentPath);
  if (isAuthPath) {
    return children;
  }

  const tenantSlug = getTenantSlugFromUser(currentUser);
  if (!tenantSlug) {
    return children;
  }

  const tenantPrefix = `/${tenantSlug}`;
  const hasTenantPrefix = currentPath === tenantPrefix || currentPath.startsWith(`${tenantPrefix}/`);

  if (!hasTenantPrefix) {
    return <Navigate to={`${tenantPrefix}${currentPath}`} replace />;
  }

  return children;
};

const ModuleRedirect = ({ paths }) => {
  const role = authService.getUser()?.role;
  const location = useLocation();
  const currentUser = authService.getUser();
  const tenantSlug = getTenantSlugFromUser(currentUser);
  const nextPath = firstAllowedPath(role, paths);

  if (!tenantSlug || String(currentUser?.role || '').toLowerCase() === 'super_admin') {
    return <Navigate to={nextPath} replace />;
  }

  const tenantPrefix = `/${tenantSlug}`;
  const isTenantContext = location.pathname === tenantPrefix || location.pathname.startsWith(`${tenantPrefix}/`);

  return <Navigate to={isTenantContext ? `${tenantPrefix}${nextPath}` : nextPath} replace />;
};

const TenantInicioRedirect = () => {
  const { tenant } = useParams();
  return <Navigate to={`/${tenant}`} replace />;
};

const protectedRoutes = [
  { path: '/', element: <Dashboard /> },
  { path: '/proyectos', element: <ModuleRedirect paths={['/proyectos/planificar', '/proyectos/inscribirse']} /> },
  { path: '/horas', element: <ModuleRedirect paths={['/horas/asistencia', '/horas/historial']} /> },
  { path: '/finanzas', element: <ModuleRedirect paths={['/finanzas/caja']} /> },
  { path: '/perfil', element: <Perfil /> },

  { path: '/admin', roles: [ROLES.SUPER_ADMIN], element: <DashboardAdmin /> },
  { path: '/admin/organizaciones', roles: [ROLES.SUPER_ADMIN], element: <ConsultaOrganizaciones /> },
  { path: '/admin/organizaciones/nueva', roles: [ROLES.SUPER_ADMIN], element: <RegistroOrganizacion /> },
  { path: '/admin/organizaciones/:id/editar', roles: [ROLES.SUPER_ADMIN], element: <RegistroOrganizacion /> },
  { path: '/admin/usuarios', roles: [ROLES.SUPER_ADMIN], element: <UsuariosAdmin /> },

  { path: '/estructura/organizaciones', roles: [ROLES.ADMIN], element: <ConsultaOrganizaciones /> },
  { path: '/estructura/organizaciones/nueva', roles: [ROLES.ADMIN], element: <RegistroOrganizacion /> },
  { path: '/estructura/miembros', roles: [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE], element: <ListadoMiembros /> },
  { path: '/estructura/miembros/nuevo', roles: [ROLES.LIDER_ORGANIZACION], element: <RegistroMiembros /> },
  { path: '/estructura/miembros/baja/:id', roles: [ROLES.LIDER_ORGANIZACION], element: <BajaMiembro /> },
  { path: '/estructura/comites', roles: [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE], element: <ConsultaComites /> },
  { path: '/estructura/comites/nuevo', roles: [ROLES.LIDER_ORGANIZACION], element: <CrearComite /> },
  { path: '/estructura/comites/:id/gestion', roles: [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE], element: <GestionComite /> },

  { path: '/proyectos/planificar', roles: [ROLES.LIDER_ORGANIZACION], element: <PlanificarProyecto /> },
  { path: '/proyectos/vincular', roles: [ROLES.LIDER_ORGANIZACION], element: <VincularComite /> },
  { path: '/proyectos/vincular/:projectId', roles: [ROLES.LIDER_ORGANIZACION], element: <VincularComite /> },
  { path: '/proyectos/inscribirse', roles: [ROLES.MIEMBRO], element: <InscribirseProyecto /> },
  { path: '/proyectos/aprobar', roles: [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE], element: <AprobarParticipante /> },
  { path: '/proyectos/aprobar/:projectId', roles: [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE], element: <AprobarParticipante /> },

  { path: '/horas/asistencia', roles: [ROLES.LIDER_COMITE], element: <RegistroAsistencia /> },
  { path: '/horas/validar', roles: [ROLES.LIDER_COMITE], element: <ValidarHoras /> },
  { path: '/horas/historial', roles: [ROLES.MIEMBRO], element: <HistorialHoras /> },

  { path: '/finanzas/ingreso/nuevo', roles: [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE], element: <RegistroIngreso /> },
  { path: '/finanzas/egreso/nuevo', roles: [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE], element: <RegistroEgreso /> },
  { path: '/finanzas/caja', roles: [ROLES.ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE, ROLES.MIEMBRO], element: <ConsultarCaja /> },
  { path: '/finanzas/reportes', roles: [ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE, ROLES.MIEMBRO], element: <ReportesFinancieros /> },
];

function App() {
  return (
    <Router>
      <TenantPathEnforcer>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-password" element={<RecuperarPassword />} />
          <Route path="/reset-password" element={<RecuperarPassword />} />

          {/* Rutas Protegidas (sin prefijo y con prefijo tenant) */}
          {protectedRoutes.map((route) => (
            <React.Fragment key={`plain-${route.path}`}>
              <Route
                path={route.path}
                element={<Protected roles={route.roles}>{route.element}</Protected>}
              />
              <Route
                path={withTenantPath(route.path)}
                element={<Protected roles={route.roles}>{route.element}</Protected>}
              />
            </React.Fragment>
          ))}

          {/* Redirecciones por defecto */}
          <Route path="/inicio" element={<Navigate to="/" replace />} />
          <Route path="/:tenant/inicio" element={<TenantInicioRedirect />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </TenantPathEnforcer>
    </Router>
  );
}

export default App;