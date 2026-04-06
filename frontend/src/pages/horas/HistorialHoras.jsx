import React, { useEffect, useMemo, useState } from 'react';
import NavbarInner from '../../components/NavbarInner';
import { Clock, Calendar, FolderKanban, Award, TrendingUp, Download, User, CheckCircle, BarChart3, FileText } from 'lucide-react';
import { getMyHistory } from '../../services/hoursService';
import authService from '../../services/authService';

const normalizeHistory = (response) => {
  const payload = response?.data || {};
  const records = Array.isArray(payload.registros) ? payload.registros : [];

  return {
    member: payload.member || null,
    memberId: payload.miembroId || null,
    records: records.map((record) => ({
      ...record,
      projectName: record.proyecto?.nombre || record.projectName || 'Proyecto',
      hours: record.cantidadHoras ?? record.hours ?? 0,
      date: record.fecha || record.date,
      status: (record.estado || record.status || 'pendiente').toLowerCase(),
    })),
    summary: payload.resumen || {},
    pagination: response?.metadata?.pagination || response?.pagination || null,
  };
};

const HistorialHoras = () => {
  const currentUser = authService.getUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memberInfo, setMemberInfo] = useState(null);
  const [summary, setSummary] = useState({ horasTotales: 0, horasValidadas: 0, horasPendientes: 0, registrosTotales: 0 });
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getMyHistory({ limit: 100 });
      const payload = normalizeHistory(response);

      setMemberInfo(payload.member || {
        name: currentUser?.profile?.nombre || currentUser?.name || 'Miembro',
        email: currentUser?.email || '',
        committee: currentUser?.profile?.comite || 'Sin comité',
        joinDate: currentUser?.createdAt || null,
      });
      setSummary(payload.summary);
      setActivities(payload.records);
    } catch (apiError) {
      setError(apiError.userMessage || apiError.message || 'Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const totalHours = Number(summary.horasTotales || 0);

  const projects = useMemo(() => {
    const grouped = activities.reduce((accumulator, activity) => {
      const key = activity.projectName || 'Proyecto';
      if (!accumulator[key]) {
        accumulator[key] = { id: key, name: key, hours: 0, color: '#0d9488' };
      }
      accumulator[key].hours += Number(activity.hours || 0);
      return accumulator;
    }, {});

    return Object.values(grouped);
  }, [activities]);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDownloadReport = () => {
    const report = {
      member: memberInfo,
      summary,
      activities,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historial-horas-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
      <NavbarInner title="Historial de Horas" subtitle="Consulta el resumen de todas tus horas sociales validadas" />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-6xl">
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">Historial de Horas Sociales</h2>
          <p className="font-inter text-[#64748b]">Visualiza tu contribución acumulada y el detalle de actividades realizadas.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-inter">
            {error}
          </div>
        )}

        {memberInfo && (
          <div className="card p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#0d9488] flex items-center justify-center">
                <User size={32} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-poppins font-bold text-xl text-[#1f2937]">{memberInfo.name || 'Miembro'}</h3>
                <p className="font-inter text-sm text-[#64748b]">{memberInfo.email}</p>
                <div className="flex gap-4 mt-2 text-sm text-[#64748b]">
                  <span className="flex items-center gap-1"><FolderKanban size={14} />{memberInfo.committee || 'Sin comité'}</span>
                  {memberInfo.joinDate && <span className="flex items-center gap-1"><Calendar size={14} />Miembro desde: {formatDate(memberInfo.joinDate)}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card bg-gradient-to-r from-[#0d9488] to-[#0f766e] p-8 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-lg mb-2 font-inter">Total de Horas Acumuladas</p>
              <p className="text-6xl font-poppins font-bold">{totalHours} <span className="text-2xl">hrs</span></p>
              <div className="flex items-center gap-2 mt-4"><Award size={20} className="text-teal-200" /><span className="font-inter text-teal-100">Horas validadas y certificadas</span></div>
            </div>
            <div className="text-9xl opacity-20"><Clock /></div>
          </div>
        </div>

        {totalHours === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-[#E0F2FE] flex items-center justify-center mx-auto mb-6">
              <FileText size={48} className="text-[#0d9488]" />
            </div>
            <h2 className="font-poppins font-bold text-2xl text-[#1f2937] mb-3">Aún no tienes horas registradas</h2>
            <p className="font-inter text-[#64748b] mb-6 max-w-md mx-auto">Inscríbete en proyectos disponibles y comienza a acumular horas sociales para tu historial.</p>
            <button onClick={() => window.location.href = '/'} className="btn-primary">Ver Proyectos Disponibles</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-6"><BarChart3 size={20} className="text-[#0d9488]" /><h3 className="font-poppins font-bold text-xl text-[#1f2937]">Horas por Proyecto</h3></div>
              <div className="space-y-5">
                {projects.map((project) => (
                  <div key={project.id}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-inter font-medium text-[#1f2937]">{project.name}</p>
                      <p className="font-poppins font-bold text-lg" style={{ color: project.color }}>{project.hours} hrs</p>
                    </div>
                    <div className="w-full bg-[#e2e8f0] rounded-full h-3">
                      <div className="h-3 rounded-full transition-all duration-500" style={{ width: `${totalHours ? (project.hours / totalHours) * 100 : 0}%`, backgroundColor: project.color }} />
                    </div>
                    <p className="font-inter text-xs text-[#64748b] mt-1">{Math.round(totalHours ? (project.hours / totalHours) * 100 : 0)}% del total</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-6"><TrendingUp size={20} className="text-[#0d9488]" /><h3 className="font-poppins font-bold text-xl text-[#1f2937]">Estadísticas</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#E0F2FE] rounded-lg p-4"><div className="flex items-center gap-2 mb-2"><FolderKanban size={18} className="text-[#0d9488]" /><p className="font-inter text-sm text-[#64748b]">Proyectos</p></div><p className="font-poppins font-bold text-3xl text-[#0d9488]">{projects.length}</p></div>
                <div className="bg-green-50 rounded-lg p-4"><div className="flex items-center gap-2 mb-2"><CheckCircle size={18} className="text-green-600" /><p className="font-inter text-sm text-[#64748b]">Actividades</p></div><p className="font-poppins font-bold text-3xl text-green-600">{activities.length}</p></div>
                <div className="bg-yellow-50 rounded-lg p-4"><div className="flex items-center gap-2 mb-2"><Clock size={18} className="text-yellow-600" /><p className="font-inter text-sm text-[#64748b]">Promedio</p></div><p className="font-poppins font-bold text-3xl text-yellow-600">{activities.length ? Math.round(totalHours / activities.length) : 0} hrs</p></div>
                <div className="bg-purple-50 rounded-lg p-4"><div className="flex items-center gap-2 mb-2"><Award size={18} className="text-purple-600" /><p className="font-inter text-sm text-[#64748b]">Validadas</p></div><p className="font-poppins font-bold text-3xl text-purple-600">{summary.horasValidadas ?? totalHours} hrs</p></div>
              </div>
            </div>
          </div>
        )}

        {totalHours > 0 && (
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2"><Calendar size={20} className="text-[#0d9488]" /><h3 className="font-poppins font-bold text-xl text-[#1f2937]">Últimas Actividades</h3></div>
              <button onClick={handleDownloadReport} className="flex items-center gap-2 px-4 py-2 bg-[#0d9488] text-white rounded-lg font-inter font-semibold hover:bg-[#0f766e] transition-colors"><Download size={18} />Descargar Reporte</button>
            </div>

            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="border-l-4 border-[#0d9488] pl-4 py-3 bg-[#f8faf9] rounded-r-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1"><FolderKanban size={16} className="text-[#64748b]" /><p className="font-poppins font-semibold text-[#1f2937]">{activity.projectName}</p></div>
                      <div className="flex items-center gap-4 text-sm text-[#64748b] mb-2"><span className="flex items-center gap-1"><Calendar size={14} />{formatDate(activity.date)}</span><span className="flex items-center gap-1"><Clock size={14} />{Number(activity.hours).toFixed(1)} horas</span></div>
                      <p className="font-inter text-sm text-[#1f2937]">{activity.descripcion || activity.description || 'Sin descripción'}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Validada</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistorialHoras;