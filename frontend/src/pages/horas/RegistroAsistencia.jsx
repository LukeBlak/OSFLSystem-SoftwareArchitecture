import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { Calendar, FolderKanban, Clock, UserCheck, Save } from 'lucide-react';
import { getProjects } from '../../services/projectService';
import { getMembers } from '../../services/memberService';
import { registerHours } from '../../services/hoursService';
import authService from '../../services/authService';

const normalizeProjects = (response) => {
  const items = Array.isArray(response?.data)
    ? response.data
    : response?.data?.projects || response?.data || [];

  return items.map((project) => ({
    ...project,
    name: project.nombre || project.name,
    committee: project.comite?.nombre || project.committee || 'Sin comité',
  }));
};

const normalizeMembers = (response) => {
  const items = Array.isArray(response?.data)
    ? response.data
    : response?.data?.members || response?.data || [];

  return items
    .map((member) => ({
      ...member,
      id:
        member.id
        || member.miembroId
        || member.miembroid
        || member.memberId
        || member.miembro?.id
        || member.member?.id
        || null,
      name:
        member.nombre
        || member.name
        || member.miembro?.nombre
        || member.member?.name
        || member.member?.nombre
        || 'Sin nombre',
      email:
        member.email
        || member.correo
        || member.miembro?.email
        || member.member?.email
        || '',
    }))
    .filter((member) => Boolean(member.id));
};

const RegistroAsistencia = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const currentUser = authService.getUser();
  const organizationId = currentUser?.organizationId || currentUser?.organizacionId || '';

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [activityDate, setActivityDate] = useState(today);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [projectsResponse, membersResponse] = await Promise.all([
        getProjects({ limit: 100 }),
        getMembers({ organizacionId: organizationId || undefined, limit: 100 }),
      ]);

      const projectItems = normalizeProjects(projectsResponse);
      const memberItems = normalizeMembers(membersResponse);

      setProjects(projectItems);
      setMembers(memberItems);

      if (projectItems.length > 0) setSelectedProject(String(projectItems[0].id));
      if (memberItems.length > 0) setSelectedMember(String(memberItems[0].id));
    } catch (error) {
      setMessage(error.userMessage || error.message || 'No se pudieron cargar los datos iniciales');
    } finally {
      setLoadingData(false);
    }
  };

  const selectedProjectDetails = useMemo(() => projects.find((project) => String(project.id) === String(selectedProject)), [projects, selectedProject]);

  const validate = () => {
    const nextErrors = {};

    if (!selectedProject || selectedProject === 'undefined') nextErrors.selectedProject = 'Seleccione un proyecto';
    if (!selectedMember || selectedMember === 'undefined') nextErrors.selectedMember = 'Seleccione un miembro';
    if (!activityDate) nextErrors.activityDate = 'Seleccione una fecha';
    if (!hours || Number(hours) < 0.5 || Number(hours) > 24) nextErrors.hours = 'Ingrese horas entre 0.5 y 24';
    if (!description.trim()) nextErrors.description = 'Agregue una breve descripción';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setMessage('');

    try {
      await registerHours({
        miembroId: selectedMember,
        proyectoId: selectedProject,
        fecha: activityDate,
        cantidadHoras: Number(hours),
        descripcion: description.trim(),
      });

      setMessage('Asistencia registrada exitosamente');
      setHours('');
      setDescription('');
    } catch (error) {
      setMessage(error.userMessage || error.message || 'Error al registrar asistencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner
        title="Registro de Asistencia"
        subtitle="Registra horas sociales por miembro y proyecto"
      />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-4xl">
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">Registrar Horas Sociales</h2>
          <p className="font-inter text-[#64748b]">El backend registra una asistencia por miembro, proyecto y fecha.</p>
        </div>

        {message && (
          <div className="mb-6 rounded-lg border border-[#c7f9e2] bg-[#ecfdf5] px-4 py-3 text-[#0f766e] font-inter">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Proyecto <span className="text-red-500">*</span></label>
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className={`input-field ${errors.selectedProject ? 'border-red-500' : ''}`} disabled={loadingData}>
                <option value="">Seleccione un proyecto</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              {errors.selectedProject && <p className="mt-1 text-sm text-red-500 font-inter">{errors.selectedProject}</p>}
            </div>

            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Miembro <span className="text-red-500">*</span></label>
              <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className={`input-field ${errors.selectedMember ? 'border-red-500' : ''}`} disabled={loadingData}>
                <option value="">Seleccione un miembro</option>
                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
              {errors.selectedMember && <p className="mt-1 text-sm text-red-500 font-inter">{errors.selectedMember}</p>}
            </div>
          </div>

          {selectedProjectDetails && (
            <div className="bg-[#E0F2FE] border border-[#7dd3fc] rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#64748b]">
                <span className="flex items-center gap-2"><FolderKanban size={14} />{selectedProjectDetails.committee}</span>
                <span className="flex items-center gap-2"><Clock size={14} />Cupos del proyecto: {selectedProjectDetails.cupos || 'N/D'}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Fecha de la Actividad <span className="text-red-500">*</span></label>
              <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className={`input-field ${errors.activityDate ? 'border-red-500' : ''}`} />
              {errors.activityDate && <p className="mt-1 text-sm text-red-500 font-inter">{errors.activityDate}</p>}
            </div>

            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Horas <span className="text-red-500">*</span></label>
              <input type="number" min="0.5" max="24" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} className={`input-field ${errors.hours ? 'border-red-500' : ''}`} placeholder="4.0" />
              {errors.hours && <p className="mt-1 text-sm text-red-500 font-inter">{errors.hours}</p>}
            </div>
          </div>

          <div>
            <label className="block font-poppins font-semibold text-[#1f2937] mb-2">Descripción <span className="text-red-500">*</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="4" className={`input-field ${errors.description ? 'border-red-500' : ''}`} placeholder="Detalle breve de la actividad realizada" />
            {errors.description && <p className="mt-1 text-sm text-red-500 font-inter">{errors.description}</p>}
          </div>

          <div className="flex gap-4 pt-6 border-t border-[#e2e8f0]">
            <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1">Cancelar</button>
            <button type="submit" disabled={loading || loadingData} className="btn-primary flex-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>Guardando...</span>
              ) : (
                <span className="flex items-center justify-center gap-2"><Save size={18} />Guardar Asistencia</span>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 card p-4 bg-[#f8faf9]">
          <div className="flex items-center gap-2 text-[#64748b] font-inter text-sm">
            <UserCheck size={16} />
            {loadingData ? 'Cargando proyectos y miembros...' : `${projects.length} proyectos y ${members.length} miembros disponibles`}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegistroAsistencia;