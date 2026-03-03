import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Dashboard
import Dashboard from './pages/Dashboard';

// Operaciones - Proyectos
import PlanificarProyecto from './pages/operaciones/PlanificarProyecto';
import VincularComite from './pages/operaciones/VincularComite';
import AprobarParticipante from './pages/operaciones/AprobarParticipante';

// Horas Sociales
import RegistroAsistenciaHoras from './pages/horas/RegistroAsistencia';
import ValidarHoras from './pages/horas/ValidarHoras';
import HistorialHoras from './pages/horas/HistorialHoras';

// Finanzas
import ConsultarCaja from './pages/finanzas/ConsultarCaja';
import RegistroIngreso from './pages/finanzas/RegistroIngreso';
import RegistroEgreso from './pages/finanzas/RegistroEgreso';
import ReportesFinancieros from './pages/finanzas/ReportesFinancieros';

function App() {
  return (
    <Router>
      <Routes>
        {/* Dashboard Principal */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Módulo de Operaciones - Proyectos */}
        <Route path="/operaciones" element={<Navigate to="/" replace />} />
        <Route path="/operaciones/planificar" element={<PlanificarProyecto />} />
        <Route path="/operaciones/vincular" element={<VincularComite />} />
        <Route path="/operaciones/vincular/:projectId" element={<VincularComite />} />
        <Route path="/operaciones/aprobar" element={<AprobarParticipante />} />
        
        {/* Módulo de Horas Sociales */}
        <Route path="/horas" element={<Navigate to="/" replace />} />
        <Route path="/horas/asistencia" element={<RegistroAsistenciaHoras />} />
        <Route path="/horas/validar" element={<ValidarHoras />} />
        <Route path="/horas/historial" element={<HistorialHoras />} />
        
        {/* Módulo de Finanzas */}
        <Route path="/finanzas" element={<Navigate to="/" replace />} />
        <Route path="/finanzas/caja" element={<ConsultarCaja />} />
        <Route path="/finanzas/ingreso/nuevo" element={<RegistroIngreso />} />
        <Route path="/finanzas/egreso/nuevo" element={<RegistroEgreso />} />
        <Route path="/finanzas/reportes" element={<ReportesFinancieros />} />
        
        {/* Ruta por defecto - Redirige al dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;