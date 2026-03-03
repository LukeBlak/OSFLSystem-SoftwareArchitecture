import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

// ==================== AUTH (SIN NAVBAR) ====================
import Login from './pages/auth/Login';
import Perfil from './pages/auth/Perfil';

// ==================== DASHBOARD ====================
import Dashboard from './pages/Dashboard';

// ==================== ESTRUCTURA - Organizaciones ====================
import ConsultaOrganizaciones from './pages/admin/ConsultaOrganizaciones';
import RegistroOrganizacion from './pages/admin/RegistroOrganizacion';

// ==================== ESTRUCTURA - Miembros ====================
import ListadoMiembros from './pages/miembros/ListadoMiembros';
import RegistroMiembros from './pages/miembros/RegistroMiembros';
import BajaMiembro from './pages/miembros/BajaMiembro';

// ==================== ESTRUCTURA - Comités ====================
import ConsultaComites from './pages/comites/ConsultaComites';
import CrearComite from './pages/comites/CrearComite';
import GestionComite from './pages/comites/GestionComite';

// ==================== OPERACIONES - Proyectos ====================
import PlanificarProyecto from './pages/operaciones/PlanificarProyecto';
import VincularComite from './pages/operaciones/VincularComite';
import AprobarParticipante from './pages/operaciones/AprobarParticipante';

// ==================== HORAS SOCIALES ====================
import RegistroAsistencia from './pages/horas/RegistroAsistencia';
import ValidarHoras from './pages/horas/ValidarHoras';
import HistorialHoras from './pages/horas/HistorialHoras';

// ==================== FINANZAS ====================
import ConsultarCaja from './pages/finanzas/ConsultarCaja';
import RegistroIngreso from './pages/finanzas/RegistroIngreso';
import RegistroEgreso from './pages/finanzas/RegistroEgreso';
import ReportesFinancieros from './pages/finanzas/ReportesFinancieros';

function App() {
  return (
    <Router>
      <Routes>
        {/* ==================== AUTH (SIN NAVBAR) ==================== */}
        <Route path="/login" element={<Login />} />

        {/* ==================== TODAS LAS DEMÁS RUTAS (CON NAVBAR) ==================== */}
        <Route path="/*" element={
          <>
            <Navbar />
            <Routes>
              {/* Dashboard */}
              <Route path="" element={<Dashboard />} />

              {/* Perfil */}
              <Route path="perfil" element={<Perfil />} />

              {/* ==================== ESTRUCTURA - Organizaciones ==================== */}
              <Route path="estructura" element={<Navigate to="/estructura/organizaciones" replace />} />
              <Route path="estructura/organizaciones" element={<ConsultaOrganizaciones />} />
              <Route path="estructura/organizaciones/nueva" element={<RegistroOrganizacion />} />

              {/* ==================== ESTRUCTURA - Miembros ==================== */}
              <Route path="estructura/miembros" element={<ListadoMiembros />} />
              <Route path="estructura/miembros/nuevo" element={<RegistroMiembros />} />
              <Route path="estructura/miembros/baja/:id" element={<BajaMiembro />} />

              {/* ==================== ESTRUCTURA - Comités ==================== */}
              <Route path="estructura/comites" element={<ConsultaComites />} />
              <Route path="estructura/comites/nuevo" element={<CrearComite />} />
              <Route path="estructura/comites/:id/gestion" element={<GestionComite />} />

              {/* ==================== OPERACIONES - Proyectos ==================== */}
              <Route path="operaciones" element={<Navigate to="/" replace />} />
              <Route path="operaciones/planificar" element={<PlanificarProyecto />} />
              <Route path="operaciones/vincular" element={<VincularComite />} />
              <Route path="operaciones/vincular/:projectId" element={<VincularComite />} />
              <Route path="operaciones/aprobar" element={<AprobarParticipante />} />

              {/* ==================== HORAS SOCIALES ==================== */}
              <Route path="horas" element={<Navigate to="/" replace />} />
              <Route path="horas/asistencia" element={<RegistroAsistencia />} />
              <Route path="horas/validar" element={<ValidarHoras />} />
              <Route path="horas/historial" element={<HistorialHoras />} />

              {/* ==================== FINANZAS ==================== */}
              <Route path="finanzas" element={<Navigate to="/" replace />} />
              <Route path="finanzas/caja" element={<ConsultarCaja />} />
              <Route path="finanzas/ingreso/nuevo" element={<RegistroIngreso />} />
              <Route path="finanzas/egreso/nuevo" element={<RegistroEgreso />} />
              <Route path="finanzas/reportes" element={<ReportesFinancieros />} />

              {/* Ruta por defecto */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </>
        } />
      </Routes>
    </Router>
  );
}

export default App;