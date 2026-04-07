import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users2,
  CheckCircle2,
  ArrowRight,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

const DashboardAdmin = () => {
  const [globalStats, setGlobalStats] = useState({
    totalOrganizaciones: 0,
    totalUsuarios: 0,
    proyectosGlobales: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const token = localStorage.getItem('token');

        const response = await fetch('/api/admin/global-stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Error al obtener datos');

        const data = await response.json();
        setGlobalStats(data);
      } catch (error) {
        console.error("Error cargando estadísticas reales:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAF9] p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* ... Encabezado ... */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

          {/* Card: Total Organizaciones */}
          <div className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-[#E0F2FE] p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7 text-[#38BDF8]" />
              </div>
              <span className="text-[10px] font-bold text-[#38BDF8] bg-[#E0F2FE] px-2 py-1 rounded-full uppercase tracking-widest">Global</span>
            </div>
            <p className="text-[#64748B] text-sm mb-1 font-medium">Total Organizaciones</p>
            <h2 className="text-4xl font-bold text-[#1F2937]">
              {loading ? "..." : globalStats.totalOrganizaciones}
            </h2>
          </div>

          {/* Card: Total Proyectos (Sustituye a Organizaciones Activas) */}
          <div className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-[#DCECE7] p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-[#22C55E]" />
              </div>
              <span className="text-[10px] font-bold text-[#22C55E] bg-[#DCECE7] px-2 py-1 rounded-full uppercase tracking-widest">Proyectos</span>
            </div>
            <p className="text-[#64748B] text-sm mb-1 font-medium">Proyectos Totales</p>
            <h2 className="text-4xl font-bold text-[#1F2937]">
              {loading ? "..." : globalStats.proyectosGlobales}
            </h2>
          </div>

          {/* Card: Cantidad de Usuarios */}
          <div className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-[#EDE9FE] p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <Users2 className="w-7 h-7 text-[#7C3AED]" />
              </div>
              <span className="text-[10px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-2 py-1 rounded-full uppercase tracking-widest">Usuarios</span>
            </div>
            <p className="text-[#64748B] text-sm mb-1 font-medium">Usuarios Registrados</p>
            <h2 className="text-4xl font-bold text-[#1F2937]">
              {loading ? "..." : globalStats.totalUsuarios}
            </h2>
          </div>

          {/* Sección de Accesos Directos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Botón Principal de Navegación */}
            <Link
              to="/ConsultaOrganizaciones"
              className="flex items-center justify-between p-10 bg-[#22C55E] hover:bg-[#16A34A] rounded-[2.5rem] text-white shadow-xl shadow-green-100 transition-all group relative overflow-hidden"
            >
              <div className="z-10">
                <h3 className="text-2xl font-bold font-poppins mb-2">Gestionar Organizaciones</h3>
                <p className="text-white/80 font-inter text-sm max-w-[250px]">
                  Consulta, registra y actualiza la información de todas las instituciones.
                </p>
              </div>
              <div className="bg-white/20 p-4 rounded-full group-hover:translate-x-3 transition-transform z-10">
                <ArrowRight className="w-8 h-8 text-white" />
              </div>
              {/* Círculo decorativo */}
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            </Link>

            {/* Otros Accesos Secundarios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="flex flex-col items-center justify-center p-6 bg-white border border-[#E2E8F0] rounded-3xl hover:border-[#38BDF8] transition-colors group">
                <Settings className="w-8 h-8 text-[#64748B] group-hover:text-[#38BDF8] mb-3 transition-colors" />
                <span className="font-poppins font-bold text-[#1F2937] text-sm">Configuración</span>
              </button>
              <button className="flex flex-col items-center justify-center p-6 bg-white border border-[#E2E8F0] rounded-3xl hover:border-[#38BDF8] transition-colors group">
                <LayoutDashboard className="w-8 h-8 text-[#64748B] group-hover:text-[#38BDF8] mb-3 transition-colors" />
                <span className="font-poppins font-bold text-[#1F2937] text-sm">Reportes Globales</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;