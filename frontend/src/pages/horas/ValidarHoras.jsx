import React, { useState, useEffect } from 'react';

const ValidarHoras = () => {
  const [selectedProject, setSelectedProject] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const projects = [
    { id: 1, name: 'Campaña de Reforestación', maxHoursPerDay: 8 },
    { id: 2, name: 'Alfabetización Digital', maxHoursPerDay: 6 }
  ];

  useEffect(() => {
    if (selectedProject) {
      loadAttendanceRecords();
    }
  }, [selectedProject]);

  const loadAttendanceRecords = async () => {
    // Simulación de datos
    setRecords([
      {
        id: 1,
        memberId: 101,
        memberName: 'María González',
        date: '2026-03-15',
        attendanceStatus: 'present',
        hours: '',
        validated: false
      },
      {
        id: 2,
        memberId: 102,
        memberName: 'Juan Pérez',
        date: '2026-03-15',
        attendanceStatus: 'present',
        hours: '',
        validated: false
      },
      {
        id: 3,
        memberId: 103,
        memberName: 'Ana López',
        date: '2026-03-15',
        attendanceStatus: 'absent',
        hours: '0',
        validated: true
      }
    ]);
  };

  const handleHoursChange = (recordId, hours) => {
    const numHours = parseFloat(hours);
    const project = projects.find(p => p.id === parseInt(selectedProject));
    
    if (numHours > project.maxHoursPerDay) {
      alert(`El máximo de horas por día es ${project.maxHoursPerDay}`);
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
    
    if (!record.hours || record.hours <= 0) {
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
      alert('Horas validadas exitosamente');
    } catch (error) {
      alert('Error al validar horas');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (recordId, reason) => {
    if (!reason) {
      alert('Debe ingresar una justificación para rechazar las horas');
      return;
    }

    setLoading(true);
    try {
      // API call: rechazar horas
      alert('Horas marcadas como no válidas');
    } catch (error) {
      alert('Error al rechazar horas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-accent text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Validar Horas Sociales</h1>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-5xl">
        {/* Selector de Proyecto */}
        <div className="card p-6 mb-6">
          <label className="block text-text-primary font-semibold mb-2">
            Proyecto
          </label>
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
        </div>

        {/* Registros de Asistencia */}
        {selectedProject && (
          <div className="space-y-4">
            {records
              .filter(r => r.attendanceStatus === 'present' && !r.validated)
              .map((record) => (
                <div key={record.id} className="card p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-text-primary">
                        {record.memberName}
                      </h3>
                      <p className="text-text-secondary text-sm">
                        Fecha: {new Date(record.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Asistencia: Presente
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-text-primary mb-1">
                          Horas Trabajadas
                        </label>
                        <input
                          type="number"
                          value={record.hours}
                          onChange={(e) => handleHoursChange(record.id, e.target.value)}
                          min="0"
                          max="24"
                          step="0.5"
                          className="input-field w-32"
                          placeholder="0.0"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleValidate(record.id)}
                          disabled={loading || !record.hours}
                          className="px-6 py-2 bg-primary text-white rounded-lg 
                                   font-semibold hover:bg-primary-dark transition-colors
                                   disabled:opacity-50"
                        >
                          Validar
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Motivo del rechazo:');
                            handleReject(record.id, reason);
                          }}
                          disabled={loading}
                          className="px-6 py-2 bg-red-500 text-white rounded-lg 
                                   font-semibold hover:bg-red-600 transition-colors
                                   disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {records.filter(r => r.attendanceStatus === 'present' && !r.validated).length === 0 && (
              <div className="card p-12 text-center">
                <p className="text-text-secondary">
                  No hay registros pendientes de validación
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ValidarHoras;