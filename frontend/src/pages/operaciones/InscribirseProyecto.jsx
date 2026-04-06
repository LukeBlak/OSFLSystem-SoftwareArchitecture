import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { FolderKanban, Calendar, Users, Send, RefreshCcw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { getProjects } from '../../services/projectService';
import { createPostulation, getMyPostulations } from '../../services/postulationService';

const normalizeProjects = (response) => {
  const items = Array.isArray(response?.data)
    ? response.data
    : response?.data?.projects || response?.data || [];

  return items.map((project) => ({
    ...project,
    name: project.nombre || project.name,
    description: project.descripcion || project.description,
    startDate: project.fechainicio || project.startDate,
    endDate: project.fechafin || project.endDate,
    slots: Number(project.cupos || project.slots || 0),
    status: project.estado || project.status,
  }));
};

const normalizeMyPostulations = (response) => {
  const items = Array.isArray(response?.data)
    ? response.data
    : response?.data?.postulations || response?.data || [];

  return items.map((postulation) => ({
    ...postulation,
    status: (postulation.estado || postulation.status || 'Pendiente').toLowerCase(),
    date: postulation.fechapostulacion || postulation.date,
    projectName: postulation.proyecto?.nombre || postulation.project?.name || 'Proyecto',
    projectStatus: postulation.proyecto?.estado || postulation.project?.status || 'Sin estado',
  }));
};

const InscribirseProyecto = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [myPostulations, setMyPostulations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    setMessage('');

    try {
      const [projectsResponse, myPostulationsResponse] = await Promise.all([
        getProjects({ limit: 100 }),
        getMyPostulations(),
      ]);

      const allProjects = normalizeProjects(projectsResponse);
      const convocatoriaProjects = allProjects.filter(
        (project) => (project.status || '').toLowerCase() === 'convocatoria'
      );

      setProjects(convocatoriaProjects.length > 0 ? convocatoriaProjects : allProjects);
      setMyPostulations(normalizeMyPostulations(myPostulationsResponse));
    } catch (error) {
      setMessage(error.userMessage || error.message || 'No se pudieron cargar los proyectos');
      setMessageType('error');
    } finally {
      setLoadingData(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const stats = useMemo(() => ({
    available: projects.length,
    pending: myPostulations.filter((postulation) => postulation.status === 'pendiente').length,
    accepted: myPostulations.filter((postulation) => postulation.status === 'aceptada').length,
    rejected: myPostulations.filter((postulation) => postulation.status === 'rechazada').length,
  }), [projects, myPostulations]);

  const handlePostulate = async (projectId) => {
    setLoading(true);
    setMessage('');

    try {
      await createPostulation(projectId);
      setMessage('Postulación enviada correctamente');
      setMessageType('success');
      await loadData();
    } catch (error) {
      setMessage(error.userMessage || error.message || 'No se pudo enviar la postulación');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const normalized = (status || '').toLowerCase();

    if (normalized === 'aceptada') {
      return <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">Aceptada</span>;
    }
    if (normalized === 'rechazada') {
      return <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">Rechazada</span>;
    }
    return <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700">Pendiente</span>;
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner
        title="Inscribirse a Proyecto"
        subtitle="Postúlate a los proyectos disponibles en convocatoria"
      />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-6xl">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">Proyectos Disponibles</h2>
            <p className="font-inter text-[#64748b]">Selecciona un proyecto para enviar tu postulación.</p>
          </div>
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e2e8f0] rounded-lg font-inter font-semibold text-[#64748b] hover:bg-[#f8faf9] transition-colors" disabled={loadingData || loading}>
            <RefreshCcw size={18} /> Actualizar
          </button>
        </div>

        {message && (
          <div className={`mb-6 rounded-lg px-4 py-3 font-inter ${messageType === 'error' ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-[#c7f9e2] bg-[#ecfdf5] text-[#0f766e]'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4"><p className="font-inter text-xs text-[#64748b]">En convocatoria</p><p className="font-poppins font-bold text-2xl text-[#1f2937]">{stats.available}</p></div>
          <div className="card p-4"><p className="font-inter text-xs text-[#64748b]">Pendientes</p><p className="font-poppins font-bold text-2xl text-yellow-600">{stats.pending}</p></div>
          <div className="card p-4"><p className="font-inter text-xs text-[#64748b]">Aceptadas</p><p className="font-poppins font-bold text-2xl text-green-600">{stats.accepted}</p></div>
          <div className="card p-4"><p className="font-inter text-xs text-[#64748b]">Rechazadas</p><p className="font-poppins font-bold text-2xl text-red-600">{stats.rejected}</p></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {loadingData ? (
            <div className="card p-12 text-center lg:col-span-2">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0d9488] mx-auto mb-4" />
              <p className="font-inter text-[#64748b]">Cargando proyectos...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="card p-12 text-center lg:col-span-2">
              <AlertCircle size={38} className="text-[#64748b] mx-auto mb-3" />
              <h3 className="font-poppins font-bold text-xl text-[#1f2937] mb-2">No hay proyectos disponibles</h3>
              <p className="font-inter text-[#64748b]">No encontramos proyectos en convocatoria por ahora.</p>
            </div>
          ) : projects.map((project) => (
            <div key={project.id} className="card p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-poppins font-bold text-xl text-[#1f2937]">{project.name}</h3>
                  <p className="font-inter text-sm text-[#64748b]">Estado: {project.status || 'Sin estado'}</p>
                </div>
                <div className="w-11 h-11 rounded-full bg-[#E0F2FE] flex items-center justify-center">
                  <FolderKanban size={20} className="text-[#0d9488]" />
                </div>
              </div>

              <p className="font-inter text-[#1f2937] mb-4">{project.description || 'Sin descripción disponible'}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-sm text-[#64748b]">
                <p className="flex items-center gap-2"><Calendar size={15} /> Inicio: {formatDate(project.startDate)}</p>
                <p className="flex items-center gap-2"><Calendar size={15} /> Fin: {formatDate(project.endDate)}</p>
                <p className="flex items-center gap-2"><Users size={15} /> Cupos: {project.slots || 'No definido'}</p>
              </div>

              <button onClick={() => handlePostulate(project.id)} disabled={loading} className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                <Send size={16} /> Postularme
              </button>
            </div>
          ))}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="font-poppins font-bold text-xl text-[#1f2937]">Mis Postulaciones</h3>
            <button onClick={() => navigate('/proyectos/aprobar')} className="btn-outline px-4 py-2">Ver gestión de postulaciones</button>
          </div>

          {myPostulations.length === 0 ? (
            <p className="font-inter text-[#64748b]">Aún no has enviado postulaciones.</p>
          ) : (
            <div className="divide-y divide-[#e2e8f0]">
              {myPostulations.map((postulation) => (
                <div key={postulation.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-poppins font-semibold text-[#1f2937]">{postulation.projectName}</p>
                    <p className="font-inter text-sm text-[#64748b] flex items-center gap-2">
                      <Clock size={14} /> {formatDate(postulation.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {postulation.status === 'aceptada' && <CheckCircle2 size={16} className="text-green-600" />}
                    {getStatusBadge(postulation.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InscribirseProyecto;