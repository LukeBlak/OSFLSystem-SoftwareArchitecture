import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BarChart3, Users, Briefcase, Clock, Wallet, 
  TrendingUp, TrendingDown, Layers, ArrowLeft,
  ChevronRight, Search, Filter
} from 'lucide-react';

const EstadisticasOrganizacion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados para toda la información del backend
  const [stats, setStats] = useState(null);
  const [finances, setFinances] = useState(null);
  const [members, setMembers] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('miembros'); // miembros | comites | proyectos

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
        
        // Ejecutamos todas las peticiones en paralelo para mayor eficiencia
        const [resStats, resFinances, resMembers, resCommittees, resProjects] = await Promise.all([
          fetch(`/api/organizations/${id}/stats`, { headers }),
          fetch(`/api/organizations/${id}/finances`, { headers }),
          fetch(`/api/organizations/${id}/members?limit=5`, { headers }), // Solo los primeros 5
          fetch(`/api/organizations/${id}/committees`, { headers }),
          fetch(`/api/organizations/${id}/projects`, { headers })
        ]);

        const [dataStats, dataFinances, dataMembers, dataCommittees, dataProjects] = await Promise.all([
          resStats.json(), resFinances.json(), resMembers.json(), resCommittees.json(), resProjects.json()
        ]);

        setStats(dataStats.data.stats);
        setFinances(dataFinances.data.finances);
        setMembers(dataMembers.data.members);
        setCommittees(dataCommittees.data.committees);
        setProjects(dataProjects.data.projects);

      } catch (error) {
        console.error("Error cargando estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22C55E]"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAF9] p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabecera */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1F2937] font-poppins">Panel de Estadísticas</h1>
            <p className="text-[#64748B] font-inter text-sm">Análisis detallado y gestión operativa de la organización</p>
          </div>
        </div>

        {/* 1. KPIs - Métricas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={<Users className="text-[#38BDF8]" />} label="Total Miembros" value={stats.totalMiembros} bg="bg-[#E0F2FE]" />
          <StatCard icon={<Briefcase className="text-[#22C55E]" />} label="Proyectos Activos" value={`${stats.proyectosActivos}/${stats.totalProyectos}`} bg="bg-[#DCECE7]" />
          <StatCard icon={<Clock className="text-[#7C3AED]" />} label="Horas Voluntariado" value={stats.horasTotalesRegistradas.toLocaleString()} bg="bg-[#EDE9FE]" />
          <StatCard icon={<Layers className="text-[#38BDF8]" />} label="Comités" value={stats.totalComites} bg="bg-[#E0F2FE]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* 2. Resumen Financiero (Finances Endpoint) */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm">
            <h3 className="text-lg font-bold text-[#1F2937] font-poppins mb-6 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#22C55E]" />
              Estado Financiero
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-[#F8FAF9] rounded-xl border border-[#DCECE7]">
                <p className="text-xs text-[#64748B] font-inter uppercase font-bold tracking-wider mb-2">Ingresos Totales</p>
                <p className="text-2xl font-bold text-[#22C55E] font-poppins">${stats.ingresosTotales.toLocaleString()}</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-[#22C55E]">
                  <TrendingUp className="w-3 h-3" /> <span>Flujo Positivo</span>
                </div>
              </div>
              <div className="p-6 bg-[#F8FAF9] rounded-xl border border-[#DCECE7]">
                <p className="text-xs text-[#64748B] font-inter uppercase font-bold tracking-wider mb-2">Egresos Totales</p>
                <p className="text-2xl font-bold text-red-500 font-poppins">${stats.egresosTotales.toLocaleString()}</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-red-400">
                  <TrendingDown className="w-3 h-3" /> <span>Gastos Operativos</span>
                </div>
              </div>
              <div className="p-6 bg-[#22C55E] rounded-xl shadow-lg shadow-green-100">
                <p className="text-xs text-white/80 font-inter uppercase font-bold tracking-wider mb-2">Saldo Actual</p>
                <p className="text-2xl font-bold text-white font-poppins">${stats.saldoActual.toLocaleString()}</p>
                <p className="mt-2 text-[10px] text-white/70 italic">Disponible para ejecución</p>
              </div>
            </div>
            {/* Visualización simple de barra de presupuesto */}
            <div className="mt-8">
               <div className="flex justify-between text-xs font-inter mb-2">
                  <span className="text-[#64748B]">Ejecución de Presupuesto</span>
                  <span className="font-bold text-[#1F2937]">{Math.round((stats.egresosTotales / stats.ingresosTotales) * 100)}%</span>
               </div>
               <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#7C3AED] h-full transition-all duration-1000" style={{ width: `${(stats.egresosTotales / stats.ingresosTotales) * 100}%` }}></div>
               </div>
            </div>
          </div>

          {/* 3. Proyectos Recientes (Projects Endpoint) */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#1F2937] font-poppins mb-6">Proyectos en Curso</h3>
            <div className="space-y-4">
              {projects.slice(0, 4).map(project => (
                <div key={project.id} className="flex items-center gap-3 p-3 hover:bg-[#F8FAF9] rounded-lg transition-colors border-b border-[#F1F5F9] last:border-0">
                  <div className={`w-2 h-2 rounded-full ${project.estado === 'Activo' ? 'bg-[#22C55E]' : 'bg-[#38BDF8]'}`}></div>
                  <div className="flex-grow">
                    <p className="text-sm font-bold text-[#1F2937] font-inter line-clamp-1">{project.nombre}</p>
                    <p className="text-[10px] text-[#64748B] font-inter uppercase">{project.estado}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#E2E8F0]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Tablas Detalladas (Miembros y Comités) */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
          <div className="flex border-b border-[#E2E8F0]">
            <button 
              onClick={() => setActiveTab('miembros')}
              className={`px-8 py-4 font-poppins text-sm font-bold transition-all ${activeTab === 'miembros' ? 'border-b-2 border-[#22C55E] text-[#22C55E]' : 'text-[#64748B] hover:text-[#1F2937]'}`}
            >
              Miembros ({stats.totalMiembros})
            </button>
            <button 
              onClick={() => setActiveTab('comites')}
              className={`px-8 py-4 font-poppins text-sm font-bold transition-all ${activeTab === 'comites' ? 'border-b-2 border-[#22C55E] text-[#22C55E]' : 'text-[#64748B] hover:text-[#1F2937]'}`}
            >
              Comités ({stats.totalComites})
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'miembros' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-inter">
                  <thead>
                    <tr className="text-[#64748B] text-xs uppercase tracking-wider border-b border-[#E2E8F0]">
                      <th className="pb-4 px-4">Nombre</th>
                      <th className="pb-4 px-4">DUI</th>
                      <th className="pb-4 px-4">Email</th>
                      <th className="pb-4 px-4 text-center">Horas</th>
                      <th className="pb-4 px-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {members.map(member => (
                      <tr key={member.id} className="text-sm text-[#1F2937] hover:bg-[#F8FAF9] transition-colors">
                        <td className="py-4 px-4 font-medium">{member.nombre}</td>
                        <td className="py-4 px-4 text-[#64748B]">{member.dui}</td>
                        <td className="py-4 px-4 text-[#64748B]">{member.email}</td>
                        <td className="py-4 px-4 text-center font-bold">{member.horasTotales}h</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${member.estadoActivo ? 'bg-[#DCECE7] text-[#22C55E]' : 'bg-gray-100 text-gray-400'}`}>
                            {member.estadoActivo ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {committees.map(committee => (
                  <div key={committee.id} className="p-4 border border-[#E2E8F0] rounded-xl hover:border-[#38BDF8] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-[#1F2937] font-poppins">{committee.nombre}</h4>
                      <span className="text-[10px] font-bold text-[#38BDF8] bg-[#E0F2FE] px-2 py-0.5 rounded uppercase">
                        {committee.estado}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] font-inter mb-3">{committee.areaResponsabilidad}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                      <span className="text-[10px] text-[#64748B] uppercase font-bold">Presupuesto:</span>
                      <span className="text-sm font-bold text-[#1F2937]">${committee.presupuestoAsignado.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// Componente auxiliar para las cards de estadísticas
const StatCard = ({ icon, label, value, bg }) => (
  <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm">
    <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4`}>
      {React.cloneElement(icon, { className: "w-6 h-6 " + icon.props.className })}
    </div>
    <p className="text-[#64748B] font-inter text-sm mb-1">{label}</p>
    <p className="text-2xl font-bold text-[#1F2937] font-poppins">{value}</p>
  </div>
);

export default EstadisticasOrganizacion;