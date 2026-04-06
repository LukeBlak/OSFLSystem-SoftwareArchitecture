import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  UserCheck,
  UserX,
  Mail,
  Phone,
  FolderKanban,
  Calendar,
} from 'lucide-react';
import { getProjects } from '../../services/projectService';
import { getPostulationsByProject, updatePostulationStatus } from '../../services/postulationService';

const normalizeProjects = (response) => {
  const items = Array.isArray(response?.data)
    ? response.data
    : response?.data?.projects || response?.data || [];

  return items.map((project) => ({
    ...project,
    name: project.nombre || project.name,
  }));
};

const normalizePostulations = (response) => {
  const items = Array.isArray(response?.data)
    ? response.data
    : response?.data?.postulations || response?.data || [];

  return items.map((postulation) => ({
    ...postulation,
    status: (postulation.estado || postulation.status || 'Pendiente').toLowerCase(),
    appliedDate: postulation.fechapostulacion || postulation.appliedDate,
    member: {
      id: postulation.miembro?.id || postulation.member?.id,
      name: postulation.miembro?.nombre || postulation.member?.name || 'Sin nombre',
      email: postulation.miembro?.email || postulation.member?.email || 'Sin correo',
      phone: postulation.miembro?.telefono || postulation.member?.phone || 'Sin teléfono',
    },
  }));
};

const AprobarParticipante = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [projects, setProjects] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadApplications(selectedProject);
    } else {
      setApplications([]);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const response = await getProjects({ limit: 100 });
      const items = normalizeProjects(response);
      setProjects(items);

      if (projectId) {
        setSelectedProject(String(projectId));
      } else if (items.length > 0) {
        setSelectedProject(String(items[0].id));
      }
    } catch (error) {
      setPageError(error.userMessage || error.message || 'No se pudieron cargar los proyectos');
    }
  };

  const loadApplications = async (currentProjectId) => {
    setLoading(true);
    setPageError('');
    try {
      const response = await getPostulationsByProject(currentProjectId);
      setApplications(normalizePostulations(response));
    } catch (error) {
      setPageError(error.userMessage || error.message || 'No se pudieron cargar las postulaciones');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedProjectName = useMemo(() => {
    const project = projects.find((item) => String(item.id) === String(selectedProject));
    return project?.name || 'Proyecto seleccionado';
  }, [projects, selectedProject]);

  const handleApprove = async (applicationId) => {
    setLoading(true);
    try {
      await updatePostulationStatus(selectedProject, applicationId, {
        estado: 'Aceptada',
      });

      await loadApplications(selectedProject);
    } catch (error) {
      setPageError(error.userMessage || error.message || 'Error al aprobar participante');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (applicationId) => {
    const reason = window.prompt('Motivo del rechazo:');
    if (!reason) return;

    setLoading(true);
    try {
      await updatePostulationStatus(selectedProject, applicationId, {
        estado: 'Rechazada',
        observaciones: reason,
      });

      await loadApplications(selectedProject);
    } catch (error) {
      setPageError(error.userMessage || error.message || 'Error al rechazar participante');
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = applications.filter((application) => {
    const status = application.status;
    const matchesFilter = filter === 'all' || status === filter;
    const matchesSearch = application.member.name.toLowerCase().includes(searchTerm.toLowerCase())
      || selectedProjectName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const normalized = (status || '').toLowerCase();
    const badges = {
      pendiente: (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
          <Clock size={14} />
          Pendiente
        </span>
      ),
      aceptada: (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-300">
          <CheckCircle size={14} />
          Aprobada
        </span>
      ),
      rechazada: (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 border border-red-300">
          <XCircle size={14} />
          Rechazada
        </span>
      ),
    };

    return badges[normalized] || badges.pendiente;
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter((item) => item.status === 'pendiente').length,
    approved: applications.filter((item) => item.status === 'aceptada').length,
    rejected: applications.filter((item) => item.status === 'rechazada').length,
  }), [applications]);

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner
        title="Aprobar Participantes"
        subtitle="Gestiona las postulaciones de voluntarios a los proyectos"
      />

      <main className="container mx-auto px-6 pt-28 pb-12">
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">Gestión de Postulaciones</h2>
          <p className="font-inter text-[#64748b]">Revisa y aprueba las solicitudes de participación en proyectos.</p>
        </div>

        {pageError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-inter">
            {pageError}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center"><Users size={20} className="text-[#0d9488]" /></div><div><p className="font-inter text-xs text-[#64748b]">Total</p><p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.total}</p></div></div></div>
          <div className="card p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center"><Clock size={20} className="text-yellow-600" /></div><div><p className="font-inter text-xs text-[#64748b]">Pendientes</p><p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.pending}</p></div></div></div>
          <div className="card p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle size={20} className="text-green-600" /></div><div><p className="font-inter text-xs text-[#64748b]">Aprobados</p><p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.approved}</p></div></div></div>
          <div className="card p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><XCircle size={20} className="text-red-600" /></div><div><p className="font-inter text-xs text-[#64748b]">Rechazados</p><p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.rejected}</p></div></div></div>
        </div>

        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-between">
            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Proyecto</label>
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="input-field">
                <option value="">Seleccione un proyecto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div className="relative w-full md:w-64 justify-self-end">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748b]" />
              <input
                type="text"
                placeholder="Buscar por nombre o proyecto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-inter text-sm font-semibold transition-colors ${filter === 'all' ? 'bg-[#0d9488] text-white' : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'}`}>Todas</button>
            <button onClick={() => setFilter('pendiente')} className={`px-4 py-2 rounded-lg font-inter text-sm font-semibold transition-colors ${filter === 'pendiente' ? 'bg-[#0d9488] text-white' : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'}`}>Pendientes</button>
            <button onClick={() => setFilter('aceptada')} className={`px-4 py-2 rounded-lg font-inter text-sm font-semibold transition-colors ${filter === 'aceptada' ? 'bg-[#0d9488] text-white' : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'}`}>Aprobadas</button>
            <button onClick={() => setFilter('rechazada')} className={`px-4 py-2 rounded-lg font-inter text-sm font-semibold transition-colors ${filter === 'rechazada' ? 'bg-[#0d9488] text-white' : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'}`}>Rechazadas</button>
          </div>
        </div>

        <div className="space-y-4">
          {loading && applications.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0d9488] mx-auto mb-4" />
              <p className="font-inter text-[#64748b]">Cargando postulaciones...</p>
            </div>
          ) : (
            filteredApplications.map((application) => (
              <div key={application.id} className="card p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-[#0d9488] flex items-center justify-center">
                        <Users size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-poppins font-bold text-lg text-[#1f2937]">{application.member.name}</h3>
                        <p className="font-inter text-sm text-[#64748b]">{selectedProjectName}</p>
                      </div>
                      <div className="ml-auto lg:ml-4">{getStatusBadge(application.status)}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-[#64748b]"><Mail size={16} /><span className="font-inter">{application.member.email}</span></div>
                      <div className="flex items-center gap-2 text-[#64748b]"><Phone size={16} /><span className="font-inter">{application.member.phone}</span></div>
                      <div className="flex items-center gap-2 text-[#64748b]"><FolderKanban size={16} /><span className="font-inter">{selectedProjectName}</span></div>
                      <div className="flex items-center gap-2 text-[#64748b]"><Calendar size={16} /><span className="font-inter">Postulado: {formatDate(application.appliedDate)}</span></div>
                    </div>
                  </div>

                  {application.status === 'pendiente' ? (
                    <div className="flex gap-2 lg:flex-shrink-0">
                      <button onClick={() => handleReject(application.id)} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-lg font-inter font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <UserX size={18} /> Rechazar
                      </button>
                      <button onClick={() => handleApprove(application.id)} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-[#0d9488] text-white rounded-lg font-inter font-semibold hover:bg-[#0f766e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <UserCheck size={18} /> Aprobar
                      </button>
                    </div>
                  ) : (
                    <div className="text-[#64748b] font-inter text-sm">
                      {application.status === 'aceptada' ? '✓ Aprobado' : '✗ Rechazado'}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {!loading && filteredApplications.length === 0 && (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Search size={40} className="text-[#64748b]" />
              </div>
              <h3 className="font-poppins font-bold text-xl text-[#1f2937] mb-2">No se encontraron postulaciones</h3>
              <p className="font-inter text-[#64748b] mb-4">Intenta cambiar el filtro o seleccionar otro proyecto.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AprobarParticipante;