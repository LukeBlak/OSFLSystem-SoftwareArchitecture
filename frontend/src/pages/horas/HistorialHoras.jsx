import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { 
  Clock, 
  Calendar, 
  FolderKanban, 
  Award, 
  TrendingUp, 
  Download,
  User,
  CheckCircle,
  BarChart3,
  FileText
} from 'lucide-react';

const HistorialHoras = () => {
  const [totalHours, setTotalHours] = useState(0);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberInfo, setMemberInfo] = useState(null);

  useEffect(() => {
    loadHistorialData();
  }, []);

  const loadHistorialData = async () => {
    setLoading(true);
    try {
      // Simulación de datos - En producción sería llamada a API
      const mockData = {
        member: {
          name: 'María González',
          email: 'maria@email.com',
          committee: 'Medio Ambiente',
          joinDate: '2026-01-15'
        },
        totalHours: 48,
        projects: [
          { id: 1, name: 'Campaña de Reforestación', hours: 20, color: '#0d9488' },
          { id: 2, name: 'Alfabetización Digital', hours: 15, color: '#6d28d9' },
          { id: 3, name: 'Salud Preventiva', hours: 13, color: '#7dd3fc' }
        ],
        activities: [
          {
            id: 1,
            projectName: 'Campaña de Reforestación',
            date: '2026-03-15',
            hours: 4,
            description: 'Plantación de árboles en zona urbana',
            validated: true
          },
          {
            id: 2,
            projectName: 'Alfabetización Digital',
            date: '2026-03-18',
            hours: 3,
            description: 'Clase de introducción a computación',
            validated: true
          },
          {
            id: 3,
            projectName: 'Salud Preventiva',
            date: '2026-03-20',
            hours: 5,
            description: 'Jornada de vacunación',
            validated: true
          },
          {
            id: 4,
            projectName: 'Campaña de Reforestación',
            date: '2026-03-22',
            hours: 6,
            description: 'Mantenimiento de áreas verdes',
            validated: true
          }
        ]
      };

      setMemberInfo(mockData.member);
      setTotalHours(mockData.totalHours);
      setProjects(mockData.projects);
      setActivities(mockData.activities);
    } catch (error) {
      console.error('Error loading historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDownloadReport = () => {
    alert('Generando reporte de horas sociales...');
    // Aquí iría la lógica para descargar el reporte en PDF/Excel
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#0d9488] mx-auto mb-4"></div>
          <p className="font-inter text-[#64748b]">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner 
        title="Historial de Horas"
        subtitle="Consulta el resumen de todas tus horas sociales validadas"
      />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-6xl">
        {/* Header de la página */}
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">
            Historial de Horas Sociales
          </h2>
          <p className="font-inter text-[#64748b]">
            Visualiza tu contribución acumulada y el detalle de actividades realizadas
          </p>
        </div>

        {/* Información del Miembro */}
        {memberInfo && (
          <div className="card p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#0d9488] flex items-center justify-center">
                <User size={32} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                  {memberInfo.name}
                </h3>
                <p className="font-inter text-sm text-[#64748b]">{memberInfo.email}</p>
                <div className="flex gap-4 mt-2 text-sm text-[#64748b]">
                  <span className="flex items-center gap-1">
                    <FolderKanban size={14} />
                    {memberInfo.committee}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    Miembro desde: {formatDate(memberInfo.joinDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tarjeta Principal de Horas Totales */}
        <div className="card bg-gradient-to-r from-[#0d9488] to-[#0f766e] p-8 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-lg mb-2 font-inter">Total de Horas Acumuladas</p>
              <p className="text-6xl font-poppins font-bold">{totalHours} <span className="text-2xl">hrs</span></p>
              <div className="flex items-center gap-2 mt-4">
                <Award size={20} className="text-teal-200" />
                <span className="font-inter text-teal-100">Horas validadas y certificadas</span>
              </div>
            </div>
            <div className="text-9xl opacity-20">
              <Clock />
            </div>
          </div>
        </div>

        {totalHours === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-[#E0F2FE] flex items-center justify-center mx-auto mb-6">
              <FileText size={48} className="text-[#0d9488]" />
            </div>
            <h2 className="font-poppins font-bold text-2xl text-[#1f2937] mb-3">
              Aún no tienes horas registradas
            </h2>
            <p className="font-inter text-[#64748b] mb-6 max-w-md mx-auto">
              ¡Inscríbete en proyectos disponibles y comienza a acumular horas sociales para tu historial!
            </p>
            <button 
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              Ver Proyectos Disponibles
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Horas por Proyecto */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={20} className="text-[#0d9488]" />
                <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                  Horas por Proyecto
                </h3>
              </div>
              <div className="space-y-5">
                {projects.map((project) => (
                  <div key={project.id}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-inter font-medium text-[#1f2937]">{project.name}</p>
                      <p className="font-poppins font-bold text-lg" style={{ color: project.color }}>
                        {project.hours} hrs
                      </p>
                    </div>
                    <div className="w-full bg-[#e2e8f0] rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(project.hours / totalHours) * 100}%`,
                          backgroundColor: project.color
                        }}
                      ></div>
                    </div>
                    <p className="font-inter text-xs text-[#64748b] mt-1">
                      {Math.round((project.hours / totalHours) * 100)}% del total
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Estadísticas Rápidas */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={20} className="text-[#0d9488]" />
                <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                  Estadísticas
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#E0F2FE] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderKanban size={18} className="text-[#0d9488]" />
                    <p className="font-inter text-sm text-[#64748b]">Proyectos</p>
                  </div>
                  <p className="font-poppins font-bold text-3xl text-[#0d9488]">
                    {projects.length}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={18} className="text-green-600" />
                    <p className="font-inter text-sm text-[#64748b]">Actividades</p>
                  </div>
                  <p className="font-poppins font-bold text-3xl text-green-600">
                    {activities.length}
                  </p>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={18} className="text-yellow-600" />
                    <p className="font-inter text-sm text-[#64748b]">Promedio</p>
                  </div>
                  <p className="font-poppins font-bold text-3xl text-yellow-600">
                    {Math.round(totalHours / activities.length)} hrs
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award size={18} className="text-purple-600" />
                    <p className="font-inter text-sm text-[#64748b]">Validadas</p>
                  </div>
                  <p className="font-poppins font-bold text-3xl text-purple-600">
                    {totalHours} hrs
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Últimas Actividades */}
        {totalHours > 0 && (
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-[#0d9488]" />
                <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                  Últimas Actividades
                </h3>
              </div>
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-[#0d9488] text-white rounded-lg 
                         font-inter font-semibold hover:bg-[#0f766e] transition-colors"
              >
                <Download size={18} />
                Descargar Reporte
              </button>
            </div>

            <div className="space-y-4">
              {activities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="border-l-4 border-[#0d9488] pl-4 py-3 bg-[#f8faf9] rounded-r-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderKanban size={16} className="text-[#64748b]" />
                        <p className="font-poppins font-semibold text-[#1f2937]">
                          {activity.projectName}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#64748b] mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(activity.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle size={14} className="text-green-600" />
                          Validada
                        </span>
                      </div>
                      <p className="font-inter text-sm text-[#64748b]">
                        {activity.description}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-poppins font-bold text-2xl text-[#0d9488]">
                        +{activity.hours}
                      </p>
                      <p className="font-inter text-xs text-[#64748b]">horas</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón de Reporte */}
        {totalHours > 0 && (
          <div className="card p-6 bg-gradient-to-r from-[#E0F2FE] to-[#ccfbf1] border border-[#7dd3fc]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#0d9488] flex items-center justify-center">
                  <FileText size={28} className="text-white" />
                </div>
                <div>
                  <h4 className="font-poppins font-bold text-lg text-[#1f2937]">
                    ¿Necesitas un certificado oficial?
                  </h4>
                  <p className="font-inter text-sm text-[#64748b]">
                    Genera un reporte con validez institucional de tus horas acumuladas
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-6 py-3 bg-[#0d9488] text-white rounded-lg 
                         font-poppins font-semibold hover:bg-[#0f766e] transition-colors shadow-lg"
              >
                <Download size={20} />
                Generar Certificado
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistorialHoras;