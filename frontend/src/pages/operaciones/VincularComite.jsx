import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const VincularComite = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [committees, setCommittees] = useState([]);
  const [selectedCommittee, setSelectedCommittee] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjectData();
    fetchCommittees();
  }, [projectId]);

  const fetchProjectData = async () => {
    // Simulación de datos
    setProject({
      id: projectId,
      name: 'Campaña de Reforestación 2026',
      description: 'Proyecto de reforestación en áreas urbanas',
      startDate: '2026-03-15',
      endDate: '2026-06-30',
      budget: 5000
    });
  };

  const fetchCommittees = async () => {
    // Simulación de datos
    setCommittees([
      { id: 1, name: 'Medio Ambiente', description: 'Proyectos ecológicos', members: 12 },
      { id: 2, name: 'Educación', description: 'Alfabetización y capacitación', members: 8 },
      { id: 3, name: 'Salud', description: 'Promoción de salud preventiva', members: 15 }
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCommittee) {
      alert('Seleccione un comité');
      return;
    }

    setLoading(true);
    
    try {
      // API call: vincular proyecto a comité
      alert('Comité vinculado exitosamente');
      navigate('/operaciones');
    } catch (error) {
      alert('Error al vincular el comité');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-accent text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Vincular Comité al Proyecto</h1>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-4xl">
        {/* Información del Proyecto */}
        {project && (
          <div className="card p-6 mb-6">
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Proyecto: {project.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-secondary">
                  <span className="font-semibold">Descripción:</span> {project.description}
                </p>
              </div>
              <div>
                <p className="text-text-secondary">
                  <span className="font-semibold">Presupuesto:</span> ${project.budget.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-text-secondary">
                  <span className="font-semibold">Inicio:</span> {new Date(project.startDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-text-secondary">
                  <span className="font-semibold">Fin:</span> {new Date(project.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Selección de Comité */}
        <div className="card p-8">
          <h3 className="text-lg font-bold text-text-primary mb-6">
            Seleccione el Comité Responsable
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              {committees.map((committee) => (
                <label
                  key={committee.id}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${selectedCommittee === committee.id.toString()
                      ? 'border-primary bg-primary-lighter'
                      : 'border-border hover:border-secondary'
                    }`}
                >
                  <input
                    type="radio"
                    name="committee"
                    value={committee.id}
                    checked={selectedCommittee === committee.id.toString()}
                    onChange={(e) => setSelectedCommittee(e.target.value)}
                    className="w-5 h-5 text-primary focus:ring-primary"
                  />
                  <div className="ml-4 flex-1">
                    <p className="font-semibold text-text-primary">{committee.name}</p>
                    <p className="text-sm text-text-secondary">{committee.description}</p>
                    <p className="text-sm text-text-secondary mt-1">
                      {committee.members} miembros
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/operaciones')}
                className="btn-outline flex-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !selectedCommittee}
                className="btn-secondary flex-1"
              >
                {loading ? 'Vinculando...' : 'Vincular Comité'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default VincularComite;