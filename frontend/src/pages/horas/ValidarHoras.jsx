import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  FolderKanban, 
  User,
  AlertCircle,
  Save,
  Search
} from 'lucide-react';

const ValidarHoras = () => {
  const [selectedProject, setSelectedProject] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);

  const projects = [
    { 
      id: 1, 
      name: 'Campaña de Reforestación', 
      maxHoursPerDay: 8,
      committee: 'Medio Ambiente'
    },
    { 
      id: 2, 
      name: 'Alfabetización Digital', 
      maxHoursPerDay: 6,
      committee: 'Educación'
    },
    { 
      id: 3, 
      name: 'Jornada de Salud Preventiva', 
      maxHoursPerDay: 8,
      committee: 'Salud'
    }
  ];

  useEffect(() => {
    if (selectedProject) {
      loadAttendanceRecords();
      const project = projects.find(p => p.id === parseInt(selectedProject));
      setProjectDetails(project || null);
    } else {
      setRecords([]);
      setProjectDetails(null);
    }
  }, [selectedProject]);

  const loadAttendanceRecords = async () => {
    // Simulación de datos - En producción sería llamada a API
    setRecords([
      {
        id: 1,
        memberId: 101,
        memberName: 'María González',
        memberEmail: 'maria@email.com',
        date: '2026-03-15',
        attendanceStatus: 'present',
        hours: '',
        validated: false
      },
      {
        id: 2,
        memberId: 102,
        memberName: 'Juan Pérez',
        memberEmail: 'juan@email.com',
        date: '2026-03-15',
        attendanceStatus: 'present',
        hours: '',
        validated: false
      },
      {
        id: 3,
        memberId: 103,
        memberName: 'Ana López',
        memberEmail: 'ana@email.com',
        date: '2026-03-15',
        attendanceStatus: 'absent',
        hours: '0',
        validated: true
      },
      {
        id: 4,
        memberId: 104,
        memberName: 'Carlos Ruiz',
        memberEmail: 'carlos@email.com',
        date: '2026-03-15',
        attendanceStatus: 'present',
        hours: '',
        validated: false
      }
    ]);
  };

  const handleHoursChange = (recordId, hours) => {
    const numHours = parseFloat(hours);
    const project = projects.find(p => p.id === parseInt(selectedProject));
    
    if (hours === '') {
      setRecords(prev =>
        prev.map(record =>
          record.id === recordId ? { ...record, hours } : record
        )
      );
      return;
    }

    if (numHours > project.maxHoursPerDay) {
      alert(`El máximo de horas por día es ${project.maxHoursPerDay}`);
      return;
    }

    if (numHours < 0 || numHours > 24) {
      alert('Ingrese una cantidad válida de horas (0-24)');
      return;
    }

    setRecords(prev =>
      prev.map(record =>
        record.id === recordId ? { ...record, hours } : record
      )
    );
  };

  const handleValidate = async (recordId) => {
    const record = records.find(r => r.id === recordId);
    
    if (!record.hours || parseFloat(record.hours) <= 0) {
      alert('Ingrese una cantidad válida de horas');
      return;
    }

    setLoading(true);
    try {
      // API call: validar horas
      setRecords(prev =>
        prev.map(r =>
          r.id === recordId ? { ...r, validated: true } : r
        )
      );
      alert(`Horas validadas exitosamente para ${record.memberName}`);
    } catch (error) {
      alert('Error al validar horas');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (recordId, recordName) => {
    const reason = prompt(`Motivo del rechazo para ${recordName}:`);
    if (!reason) {
      alert('Debe ingresar una justificación para rechazar las horas');
      return;
    }

    setLoading(true);
    try {
      // API call: rechazar horas
      setRecords(prev =>
        prev.map(r =>
          r.id === recordId ? { ...r, validated: true, hours: '0' } : r
        )
      );
      alert('Horas marcadas como no válidas');
    } catch (error) {
      alert('Error al rechazar horas');
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

  const getStats = () => {
    const total = records.filter(r => r.attendanceStatus === 'present').length;
    const validated = records.filter(r => r.validated && r.attendanceStatus === 'present').length;
    const pending = total - validated;
    return { total, validated, pending };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner 
        title="Validar Horas Sociales"
        subtitle="Acredita las horas trabajadas por los voluntarios en las actividades"
      />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-5xl">
        {/* Header de la página */}
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">
            Validación de Horas
          </h2>
          <p className="font-inter text-[#64748b]">
            Revise y valide las horas sociales de los voluntarios con asistencia presente
          </p>
        </div>

        {/* Selector de Proyecto */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderKanban size={20} className="text-[#0d9488]" />
            <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
              Seleccionar Proyecto
            </h3>
          </div>
          
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="input-field"
          >
            <option value="">Seleccione un proyecto</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name} (Máx: {project.maxHoursPerDay} hrs/día)
              </option>
            ))}
          </select>

          {projectDetails && (
            <div className="mt-4 p-4 bg-[#E0F2FE] border border-[#7dd3fc] rounded-lg">
              <div className="flex items-center gap-2 text-[#64748b] text-sm">
                <AlertCircle size={16} />
                <span className="font-inter">
                  Límite máximo: <strong className="text-[#0d9488]">{projectDetails.maxHoursPerDay} horas por día</strong> por voluntario
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Estadísticas */}
        {selectedProject && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center">
                  <User size={20} className="text-[#0d9488]" />
                </div>
                <div>
                  <p className="font-inter text-xs text-[#64748b]">Total Presentes</p>
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
                  <p className="font-inter text-xs text-[#64748b]">Validadas</p>
                  <p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.validated}</p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock size={20} className="text-yellow-600" />
                </div>
                <div>
                  <p className="font-inter text-xs text-[#64748b]">Pendientes</p>
                  <p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.pending}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Registros de Asistencia */}
        {selectedProject && (
          <div className="space-y-4">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock size={20} className="text-[#0d9488]" />
                  <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                    Registros Pendientes de Validación
                  </h3>
                </div>
                <div className="text-sm text-[#64748b] font-inter">
                  {stats.pending} registros pendientes
                </div>
              </div>

              {records
                .filter(r => r.attendanceStatus === 'present' && !r.validated)
                .map((record) => (
                  <div 
                    key={record.id} 
                    className="border border-[#e2e8f0] rounded-lg p-6 mb-4 hover:bg-[#f8faf9] transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-[#0d9488] flex items-center justify-center">
                            <User size={24} className="text-white" />
                          </div>
                          <div>
                            <h4 className="font-poppins font-bold text-lg text-[#1f2937]">
                              {record.memberName}
                            </h4>
                            <p className="font-inter text-sm text-[#64748b]">
                              {record.memberEmail}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-[#64748b]">
                            <Calendar size={16} />
                            <span className="font-inter">
                              {formatDate(record.date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[#64748b]">
                            <CheckCircle size={16} className="text-green-600" />
                            <span className="font-inter">Asistencia: Presente</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col lg:flex-col gap-3 lg:w-64">
                        <div>
                          <label className="block text-sm font-poppins font-semibold text-[#1f2937] mb-2">
                            Horas Trabajadas *
                          </label>
                          <div className="relative">
                            <Clock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748b]" />
                            <input
                              type="number"
                              value={record.hours}
                              onChange={(e) => handleHoursChange(record.id, e.target.value)}
                              min="0"
                              max="24"
                              step="0.5"
                              placeholder="0.0"
                              className="input-field pl-10 pr-4"
                            />
                          </div>
                          <p className="text-xs text-[#64748b] font-inter mt-1">
                            Máximo: {projectDetails?.maxHoursPerDay} hrs
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleValidate(record.id)}
                            disabled={loading || !record.hours || parseFloat(record.hours) <= 0}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0d9488] text-white rounded-lg 
                                     font-inter font-semibold hover:bg-[#0f766e] transition-colors
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle size={18} />
                            Validar
                          </button>
                          <button
                            onClick={() => handleReject(record.id, record.memberName)}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg 
                                     font-inter font-semibold hover:bg-red-600 transition-colors
                                     disabled:opacity-50"
                          >
                            <XCircle size={18} />
                            Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {records.filter(r => r.attendanceStatus === 'present' && !r.validated).length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={40} className="text-green-600" />
                  </div>
                  <h3 className="font-poppins font-bold text-xl text-[#1f2937] mb-2">
                    ¡Todo validado!
                  </h3>
                  <p className="font-inter text-[#64748b]">
                    No hay registros pendientes de validación para este proyecto
                  </p>
                </div>
              )}
            </div>

            {/* Historial de Validaciones */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Save size={20} className="text-[#0d9488]" />
                <h3 className="font-poppins font-bold text-xl text-[#1f2937]">
                  Historial de Validaciones
                </h3>
              </div>

              {records
                .filter(r => r.validated && r.attendanceStatus === 'present')
                .map((record) => (
                  <div 
                    key={record.id} 
                    className="border border-[#e2e8f0] rounded-lg p-4 mb-3 bg-green-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="font-poppins font-semibold text-[#1f2937]">
                            {record.memberName}
                          </p>
                          <p className="font-inter text-sm text-[#64748b]">
                            {formatDate(record.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-poppins font-bold text-lg text-[#0d9488]">
                          {record.hours} hrs
                        </p>
                        <p className="font-inter text-xs text-green-600">
                          ✓ Validado
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

              {records.filter(r => r.validated && r.attendanceStatus === 'present').length === 0 && (
                <p className="text-center text-[#64748b] font-inter py-4">
                  No hay validaciones registradas aún
                </p>
              )}
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay proyecto seleccionado */}
        {!selectedProject && (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-[#E0F2FE] flex items-center justify-center mx-auto mb-4">
              <Clock size={40} className="text-[#0d9488]" />
            </div>
            <h3 className="font-poppins font-bold text-xl text-[#1f2937] mb-2">
              Seleccione un proyecto
            </h3>
            <p className="font-inter text-[#64748b] mb-4">
              Elija un proyecto para comenzar a validar las horas sociales de los voluntarios
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ValidarHoras;