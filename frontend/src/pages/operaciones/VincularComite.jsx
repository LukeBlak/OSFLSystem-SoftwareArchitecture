import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { Users, Leaf, GraduationCap, Heart, Building2, Check } from 'lucide-react';
import { getProjects, assignCommittee } from '../../services/projectService';
import { getCommittees } from '../../services/committeeService';
import authService from '../../services/authService';

const VincularComite = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [projects, setProjects] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [selectedCommittee, setSelectedCommittee] = useState('');
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const committeeIcons = useMemo(() => ({
    'Medio Ambiente': Leaf,
    'Educación': GraduationCap,
    'Salud': Heart,
    'Desarrollo Comunitario': Building2,
    default: Users,
  }), []);

  useEffect(() => {
    loadProjects();
    loadCommittees();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      const project = projects.find((item) => String(item.id) === String(selectedProject));
      setProjectDetails(project || null);
    } else {
      setProjectDetails(null);
    }
  }, [selectedProject, projects]);

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
      budget: project.presupuestoasignado ?? project.budget ?? 0,
      status: project.estado || project.status,
      committeeId: project.comiteid || project.comiteId || '',
    }));
  };

  const normalizeCommittees = (response) => {
    const items = Array.isArray(response?.data)
      ? response.data
      : response?.data?.committees || response?.data || [];

    return items.map((committee) => ({
      ...committee,
      name: committee.nombre || committee.name,
      description: committee.descripcion || committee.description,
      members: committee.totalMiembros || committee.members || 0,
    }));
  };

  const loadProjects = async () => {
    try {
      const currentUser = authService.getUser();
      const organizationId = currentUser?.organizationId
        || currentUser?.organizacionId
        || currentUser?.organization_id
        || currentUser?.organizacion_id
        || undefined;

      const response = await getProjects({
        limit: 100,
        organizacionid: organizationId,
      });
      const items = normalizeProjects(response);
      setProjects(items);

      if (projectId) {
        setSelectedProject(String(projectId));
      } else if (items.length > 0) {
        setSelectedProject(String(items[0].id));
      }
    } catch (apiError) {
      setError(apiError.userMessage || apiError.message || 'No se pudieron cargar los proyectos');
    }
  };

  const loadCommittees = async () => {
    try {
      const currentUser = authService.getUser();
      const organizationId = currentUser?.organizationId
        || currentUser?.organizacionId
        || currentUser?.organization_id
        || currentUser?.organizacion_id
        || null;

      const response = await getCommittees({
        limit: 100,
        organizacionId: organizationId || undefined,
      });
      setCommittees(normalizeCommittees(response));
    } catch (apiError) {
      setError(apiError.userMessage || apiError.message || 'No se pudieron cargar los comités');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedProject) {
      setError('Seleccione un proyecto');
      return;
    }

    if (!selectedCommittee) {
      setError('Seleccione un comité');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await assignCommittee(selectedProject, selectedCommittee);
      navigate(`/proyectos/aprobar/${selectedProject}`);
    } catch (apiError) {
      setError(apiError.userMessage || apiError.message || 'Error al vincular el comité');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getCommitteeIcon = (committeeName) => committeeIcons[committeeName] || committeeIcons.default;

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner
        title="Vincular Comité al Proyecto"
        subtitle="Asigna un comité responsable para la ejecución del proyecto"
      />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-5xl">
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">Información del Proyecto y Comité</h2>
          <p className="font-inter text-[#64748b]">Seleccione un proyecto y asigne el comité que lo ejecutará.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-inter">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="card p-8">
            <h3 className="font-poppins font-bold text-xl text-[#1f2937] mb-6">1. Seleccionar Proyecto</h3>

            <div className="mb-6">
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">
                Proyecto <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="input-field"
              >
                <option value="">Seleccione un proyecto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {projectDetails && (
              <div className="bg-[#E0F2FE] border border-[#7dd3fc] rounded-lg p-6 animate-fade-in">
                <h4 className="font-poppins font-bold text-lg text-[#0f766e] mb-4">Detalles del Proyecto</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="font-inter text-sm text-[#64748b] mb-1">Descripción</p>
                    <p className="font-inter text-[#1f2937]">{projectDetails.description || 'Sin descripción'}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="font-inter text-sm text-[#64748b] mb-1">Presupuesto</p>
                      <p className="font-poppins font-bold text-[#0d9488] text-lg">{formatCurrency(projectDetails.budget)}</p>
                    </div>

                    <div>
                      <p className="font-inter text-sm text-[#64748b] mb-1">Fecha de Inicio</p>
                      <p className="font-inter text-[#1f2937]">📅 {formatDate(projectDetails.startDate)}</p>
                    </div>

                    <div>
                      <p className="font-inter text-sm text-[#64748b] mb-1">Fecha de Fin</p>
                      <p className="font-inter text-[#1f2937]">📅 {formatDate(projectDetails.endDate)}</p>
                    </div>

                    <div>
                      <p className="font-inter text-sm text-[#64748b] mb-1">Estado</p>
                      <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-[#0d9488] text-white">
                        {projectDetails.status || 'Sin estado'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card p-8">
            <h3 className="font-poppins font-bold text-xl text-[#1f2937] mb-6">2. Seleccionar Comité Responsable</h3>

            <div className="space-y-4">
              {committees.map((committee, index) => {
                const colorClass = ['bg-[#6d28d9]', 'bg-[#0d9488]', 'bg-[#7dd3fc]', 'bg-[#8B5CF6]', 'bg-[#2dd4bf]', 'bg-[#14b8a6]'][index % 6];
                const isSelected = selectedCommittee === String(committee.id);
                const IconComponent = getCommitteeIcon(committee.name);

                return (
                  <label
                    key={committee.id}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      isSelected ? 'border-[#0d9488] bg-[#ccfbf1]' : 'border-[#e2e8f0] hover:border-[#0f766e]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="committee"
                      value={committee.id}
                      checked={isSelected}
                      onChange={(e) => setSelectedCommittee(e.target.value)}
                      className="w-5 h-5 text-[#0d9488] focus:ring-[#0d9488]"
                    />

                    <div className={`${colorClass} w-12 h-12 rounded-lg flex items-center justify-center ml-4 mr-4`}>
                      <IconComponent size={24} className="text-white" />
                    </div>

                    <div className="flex-1">
                      <p className="font-poppins font-semibold text-[#1f2937]">{committee.name}</p>
                      <p className="font-inter text-sm text-[#64748b]">{committee.description}</p>
                      <p className="font-inter text-xs text-[#64748b] mt-1">{committee.members} miembros activos</p>
                    </div>

                    {isSelected && (
                      <div className="text-[#0d9488]"><Check size={24} /></div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4">
            <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1">Cancelar</button>
            <button
              type="submit"
              disabled={loading || !selectedProject || !selectedCommittee}
              className="btn-primary flex-1"
            >
              {loading ? 'Vinculando...' : 'Vincular Comité'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default VincularComite;