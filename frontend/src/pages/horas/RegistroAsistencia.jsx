import React, { useState, useEffect } from 'react';

const RegistroAsistencia = () => {
  const [selectedProject, setSelectedProject] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const projects = [
    { id: 1, name: 'Campaña de Reforestación', startDate: '2026-03-15', endDate: '2026-06-30' },
    { id: 2, name: 'Alfabetización Digital', startDate: '2026-03-20', endDate: '2026-05-15' }
  ];

  useEffect(() => {
    if (selectedProject) {
      loadProjectMembers();
    }
  }, [selectedProject]);

  const loadProjectMembers = async () => {
    // Simulación de datos
    setMembers([
      { id: 101, name: 'María González', email: 'maria@email.com', status: 'present' },
      { id: 102, name: 'Juan Pérez', email: 'juan@email.com', status: 'present' },
      { id: 103, name: 'Ana López', email: 'ana@email.com', status: 'absent' },
      { id: 104, name: 'Carlos Ruiz', email: 'carlos@email.com', status: 'justified' }
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
    if (!selectedProject || !activityDate) {
      alert('Seleccione un proyecto y una fecha');
      return;
    }

    setLoading(true);
    try {
      // API call: registrar asistencia
      alert('Asistencia registrada exitosamente');
      // Reset form
      setSelectedProject('');
      setActivityDate('');
    } catch (error) {
      alert('Error al registrar asistencia');
    } finally {
      setLoading(false);
    }
  };

  const getStatusButtonClass = (currentStatus, buttonStatus) => {
    const baseClass = 'px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors ';
    
    if (currentStatus === buttonStatus) {
      if (buttonStatus === 'present') return baseClass + 'bg-primary text-white';
      if (buttonStatus === 'absent') return baseClass + 'bg-red-500 text-white';
      if (buttonStatus === 'justified') return baseClass + 'bg-yellow-500 text-white';
    }
    
    return baseClass + 'bg-gray-200 text-text-secondary hover:bg-gray-300';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Registro de Asistencia</h1>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-6xl">
        {/* Filtros */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Proyecto *
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
            </div>

            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Fecha de la Actividad *
              </label>
              <input
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Lista de Miembros */}
        {selectedProject && (
          <div className="card border border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-gray-50">
              <h2 className="text-xl font-bold text-text-primary">
                Miembros del Proyecto
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Marque el estado de asistencia para cada voluntario
              </p>
            </div>

            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.id} className="p-6 hover:bg-gray-50">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-primary text-lg">
                        {member.name}
                      </h3>
                      <p className="text-text-secondary text-sm">{member.email}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleStatusChange(member.id, 'present')}
                        className={getStatusButtonClass(member.status, 'present')}
                      >
                        ✓ Presente
                      </button>
                      <button
                        onClick={() => handleStatusChange(member.id, 'absent')}
                        className={getStatusButtonClass(member.status, 'absent')}
                      >
                        ✗ Ausente
                      </button>
                      <button
                        onClick={() => handleStatusChange(member.id, 'justified')}
                        className={getStatusButtonClass(member.status, 'justified')}
                      >
                        ⚠ Justificado
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-gray-50 border-t border-border">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-secondary text-white py-3 rounded-lg 
                           font-semibold hover:bg-secondary-light transition-colors 
                           disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar Asistencia'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RegistroAsistencia;