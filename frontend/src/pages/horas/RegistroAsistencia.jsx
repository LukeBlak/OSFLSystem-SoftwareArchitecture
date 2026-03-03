import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  MinusCircle, 
  Calendar, 
  FolderKanban,
  Save,
  Clock,
  UserCheck
} from 'lucide-react';

const RegistroAsistencia = () => {
  const [selectedProject, setSelectedProject] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);

  const projects = [
    { 
      id: 1, 
      name: 'Campaña de Reforestación', 
      startDate: '2026-03-15', 
      endDate: '2026-06-30',
      committee: 'Medio Ambiente'
    },
    { 
      id: 2, 
      name: 'Alfabetización Digital', 
      startDate: '2026-03-20', 
      endDate: '2026-05-15',
      committee: 'Educación'
    },
    { 
      id: 3, 
      name: 'Jornada de Salud Preventiva', 
      startDate: '2026-04-01', 
      endDate: '2026-04-30',
      committee: 'Salud'
    }
  ];

  useEffect(() => {
    if (selectedProject) {
      loadProjectMembers();
      const project = projects.find(p => p.id === parseInt(selectedProject));
      setProjectDetails(project || null);
    } else {
      setMembers([]);
      setProjectDetails(null);
    }
  }, [selectedProject]);

  const loadProjectMembers = async () => {
    // Simulación de datos - En producción sería llamada a API
    setMembers([
      { id: 101, name: 'María González', email: 'maria@email.com', status: 'present' },
      { id: 102, name: 'Juan Pérez', email: 'juan@email.com', status: 'present' },
      { id: 103, name: 'Ana López', email: 'ana@email.com', status: 'absent' },
      { id: 104, name: 'Carlos Ruiz', email: 'carlos@email.com', status: 'justified' },
      { id: 105, name: 'Laura Martínez', email: 'laura@email.com', status: 'present' }
    ]);
  };

  const handleStatusChange = (memberId, status) => {
    setMembers(prev =>
      prev.map(member =>
        member.id === memberId ? { ...member, status } : member
      )
    );
  };

  const handleSubmit = async () => {
    if (!selectedProject) {
      alert('Seleccione un proyecto');
      return;
    }

    if (!activityDate) {
      alert('Seleccione una fecha');
      return;
    }

    setLoading(true);
    try {
      // API call: registrar asistencia
      const attendanceData = {
        projectId: selectedProject,
        date: activityDate,
        members: members.map(m => ({
          memberId: m.id,
          status: m.status
        }))
      };
      
      console.log('Registrando asistencia:', attendanceData);
      alert('Asistencia registrada exitosamente');
      
      // Reset form
      setSelectedProject('');
      setActivityDate('');
      setMembers([]);
    } catch (error) {
      alert('Error al registrar asistencia');
    } finally {
      setLoading(false);
    }
  };

  const getStatusButtonClass = (currentStatus, buttonStatus) => {
    const baseClass = 'px-4 py-2 rounded-lg font-inter text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ';
    
    if (currentStatus === buttonStatus) {
      if (buttonStatus === 'present') 
        return baseClass + 'bg-[#0d9488] text-white shadow-md';
      if (buttonStatus === 'absent') 
        return baseClass + 'bg-red-500 text-white shadow-md';
      if (buttonStatus === 'justified') 
        return baseClass + 'bg-yellow-500 text-white shadow-md';
    }
    
    return baseClass + 'bg-gray-100 text-[#64748b] hover:bg-gray-200';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStats = () => {
    const present = members.filter(m => m.status === 'present').length;
    const absent = members.filter(m => m.status === 'absent').length;
    const justified = members.filter(m => m.status === 'justified').length;
    return { present, absent, justified, total: members.length };
  };

  const stats = getStats();

  const getStatusIcon = (status) => {
    switch(status) {
      case 'present': return <CheckCircle size={16} />;
      case 'absent': return <XCircle size={16} />;
      case 'justified': return <MinusCircle size={16} />;
      default: return <Users size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'present': return 'text-[#0d9488]';
      case 'absent': return 'text-red-500';
      case 'justified': return 'text-yellow-600';
      default: return 'text-[#64748b]';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner 
        title="Registro de Asistencia"
        subtitle="Marca la asistencia de los voluntarios a las actividades del proyecto"
      />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-6xl">
        {/* Header de la página */}
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">
            Control de Asistencia
          </h2>
          <p className="font-inter text-[#64748b]">
            Registre la presencia de los voluntarios aprobados en las actividades
          </p>
        </div>

        {/* Filtros */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">
                Proyecto <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="input-field"
              >
                <option value="">Seleccione un proyecto</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {projectDetails && (
                <div className="mt-3 p-3 bg-[#E0F2FE] border border-[#7dd3fc] rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-[#64748b]">
                      <FolderKanban size={14} />
                      <span className="font-inter">{projectDetails.committee}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#64748b]">
                      <Calendar size={14} />
                      <span className="font-inter">
                        {formatDate(projectDetails.startDate)} - {formatDate(projectDetails.endDate)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">
                Fecha de la Actividad <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                className="input-field"
              />
              {activityDate && (
                <p className="mt-2 text-sm text-[#64748b] font-inter flex items-center gap-2">
                  <Clock size={14} />
                  {formatDate(activityDate)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Estadísticas de Asistencia */}
        {members.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center">
                  <Users size={20} className="text-[#0d9488]" />
                </div>
                <div>
                  <p className="font-inter text-xs text-[#64748b]">Total</p>
                  <p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="font-inter text-xs text-[#64748b]">Presentes</p>
                  <p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.present}</p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="font-inter text-xs text-[#64748b]">Ausentes</p>
                  <p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.absent}</p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <MinusCircle size={20} className="text-yellow-600" />
                </div>
                <div>
                  <p className="font-inter text-xs text-[#64748b]">Justificados</p>
                  <p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.justified}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Miembros */}
        {selectedProject && (
          <div className="card border border-[#e2e8f0] overflow-hidden">
            <div className="p-6 border-b border-[#e2e8f0] bg-[#f8faf9]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                    Miembros del Proyecto
                  </h3>
                  <p className="font-inter text-sm text-[#64748b] mt-1">
                    Marque el estado de asistencia para cada voluntario
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[#64748b]">
                  <UserCheck size={18} />
                  <span className="font-inter text-sm">{members.length} voluntarios</span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#e2e8f0]">
              {members.map((member) => (
                <div key={member.id} className="p-6 hover:bg-[#f8faf9] transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center">
                          <Users size={20} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-poppins font-semibold text-[#1f2937]">
                            {member.name}
                          </h4>
                          <p className="font-inter text-sm text-[#64748b]">{member.email}</p>
                        </div>
                        <div className="ml-4 flex items-center gap-1.5">
                          {getStatusIcon(member.status)}
                          <span className={`font-inter text-sm font-semibold ${getStatusColor(member.status)}`}>
                            {member.status === 'present' ? 'Presente' : 
                             member.status === 'absent' ? 'Ausente' : 'Justificado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleStatusChange(member.id, 'present')}
                        className={getStatusButtonClass(member.status, 'present')}
                      >
                        <CheckCircle size={16} />
                        Presente
                      </button>
                      <button
                        onClick={() => handleStatusChange(member.id, 'absent')}
                        className={getStatusButtonClass(member.status, 'absent')}
                      >
                        <XCircle size={16} />
                        Ausente
                      </button>
                      <button
                        onClick={() => handleStatusChange(member.id, 'justified')}
                        className={getStatusButtonClass(member.status, 'justified')}
                      >
                        <MinusCircle size={16} />
                        Justificado
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-[#f8faf9] border-t border-[#e2e8f0]">
              <button
                onClick={handleSubmit}
                disabled={loading || members.length === 0}
                className="w-full bg-[#0d9488] text-white py-3.5 rounded-lg 
                           font-poppins font-semibold hover:bg-[#0f766e] transition-colors 
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Guardar Asistencia
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay proyecto seleccionado */}
        {!selectedProject && (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-[#E0F2FE] flex items-center justify-center mx-auto mb-4">
              <Calendar size={40} className="text-[#0d9488]" />
            </div>
            <h3 className="font-poppins font-bold text-xl text-[#1f2937] mb-2">
              Seleccione un proyecto
            </h3>
            <p className="font-inter text-[#64748b] mb-4">
              Elija un proyecto y una fecha para comenzar a registrar la asistencia
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default RegistroAsistencia;