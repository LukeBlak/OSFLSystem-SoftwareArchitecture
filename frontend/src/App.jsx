import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import RecuperarPassword from './pages/auth/RecuperarPassword';
import Perfil from './pages/auth/Perfil';
import Dashboard from './pages/Dashboard';
import DashboardAdmin from './pages/admin/DashboardAdmin';
import UsuariosAdmin from './pages/admin/UsuariosAdmin';
import RegistroOrganizacion from './pages/admin/RegistroOrganizacion';
import ConsultaOrganizaciones from './pages/admin/ConsultaOrganizaciones';
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

const ModuleRedirect = ({ paths }) => {
  const role = authService.getUser()?.role;
  return <Navigate to={firstAllowedPath(role, paths)} replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />
        <Route path="/reset-password" element={<RecuperarPassword />} />
        
        {/* Rutas Protegidas */}
        <Route
          path="/"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route path="/proyectos" element={<ModuleRedirect paths={['/proyectos/planificar', '/proyectos/inscribirse']} />} />
        <Route path="/horas" element={<ModuleRedirect paths={['/horas/asistencia', '/horas/historial']} />} />
        <Route path="/finanzas" element={<ModuleRedirect paths={['/finanzas/caja']} />} />
        <Route path="/perfil" element={<Protected><Perfil /></Protected>} />
        
        {/* Rutas de Administración (Super Admin) */}
        <Route path="/admin" element={<Protected roles={[ROLES.SUPER_ADMIN]}><DashboardAdmin /></Protected>} />
        <Route path="/admin/organizaciones" element={<Protected roles={[ROLES.SUPER_ADMIN]}><ConsultaOrganizaciones /></Protected>} />
        <Route path="/admin/organizaciones/nueva" element={<Protected roles={[ROLES.SUPER_ADMIN]}><RegistroOrganizacion /></Protected>} />
        <Route path="/admin/organizaciones/:id/editar" element={<Protected roles={[ROLES.SUPER_ADMIN]}><RegistroOrganizacion /></Protected>} />
        <Route path="/admin/usuarios" element={<Protected roles={[ROLES.SUPER_ADMIN]}><UsuariosAdmin /></Protected>} />
        
        <Route path="/proyectos/planificar" element={<Protected roles={[ROLES.ADMIN, ROLES.LIDER_ORGANIZACION]}><PlanificarProyecto /></Protected>} />
        <Route path="/proyectos/vincular" element={<Protected roles={[ROLES.ADMIN, ROLES.LIDER_ORGANIZACION]}><VincularComite /></Protected>} />
        <Route path="/proyectos/vincular/:projectId" element={<Protected roles={[ROLES.ADMIN, ROLES.LIDER_ORGANIZACION]}><VincularComite /></Protected>} />
        <Route path="/proyectos/inscribirse" element={<Protected roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE, ROLES.MIEMBRO]}><InscribirseProyecto /></Protected>} />
        <Route path="/proyectos/aprobar" element={<Protected roles={[ROLES.ADMIN, ROLES.LIDER_ORGANIZACION]}><AprobarParticipante /></Protected>} />
        <Route path="/proyectos/aprobar/:projectId" element={<Protected roles={[ROLES.ADMIN, ROLES.LIDER_ORGANIZACION]}><AprobarParticipante /></Protected>} />
        <Route path="/horas/asistencia" element={<Protected roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE]}><RegistroAsistencia /></Protected>} />
        <Route path="/horas/validar" element={<Protected roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE]}><ValidarHoras /></Protected>} />
        <Route path="/horas/historial" element={<Protected roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION, ROLES.LIDER_COMITE, ROLES.MIEMBRO]}><HistorialHoras /></Protected>} />
        <Route path="/finanzas/ingreso/nuevo" element={<Protected roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION]}><RegistroIngreso /></Protected>} />
        <Route path="/finanzas/egreso/nuevo" element={<Protected roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION]}><RegistroEgreso /></Protected>} />
        <Route path="/finanzas/caja" element={<Protected roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION]}><ConsultarCaja /></Protected>} />
        <Route path="/finanzas/reportes" element={<Protected roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION]}><ReportesFinancieros /></Protected>} />

        {/* Redirecciones por defecto */}
        <Route path="/inicio" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;