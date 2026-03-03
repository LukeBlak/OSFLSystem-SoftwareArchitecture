import React, { useState, useEffect } from 'react';

const HistorialHoras = () => {
  const [totalHours, setTotalHours] = useState(0);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistorialData();
  }, []);

  const loadHistorialData = async () => {
    setLoading(true);
    try {
      // Simulación de datos
      const mockData = {
        totalHours: 48,
        projects: [
          { id: 1, name: 'Campaña de Reforestación', hours: 20 },
          { id: 2, name: 'Alfabetización Digital', hours: 15 },
          { id: 3, name: 'Salud Preventiva', hours: 13 }
        ],
        activities: [
          {
            id: 1,
            projectName: 'Campaña de Reforestación',
            date: '2026-03-15',
            hours: 4,
            description: 'Plantación de árboles en zona urbana'
          },
          {
            id: 2,
            projectName: 'Alfabetización Digital',
            date: '2026-03-18',
            hours: 3,
            description: 'Clase de introducción a computación'
          },
          {
            id: 3,
            projectName: 'Salud Preventiva',
            date: '2026-03-20',
            hours: 5,
            description: 'Jornada de vacunación'
          }
        ]
      };

      setTotalHours(mockData.totalHours);
      setProjects(mockData.projects);
      setActivities(mockData.activities);
    } catch (error) {
      console.error('Error loading historial:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-text-secondary">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Mi Historial de Horas Sociales</h1>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-6xl">
        {/* Total Hours Card */}
        <div className="card bg-gradient-to-r from-primary to-primary-dark p-8 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-lg mb-2">Total de Horas Acumuladas</p>
              <p className="text-6xl font-bold">{totalHours} hrs</p>
            </div>
            <div className="text-8xl opacity-20">⏱️</div>
          </div>
        </div>

        {totalHours === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              Aún no tienes horas registradas
            </h2>
            <p className="text-text-secondary mb-6">
              ¡Inscríbete en proyectos disponibles y comienza a acumular horas sociales!
            </p>
            <button className="btn-primary">
              Ver Proyectos Disponibles
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hours by Project */}
            <div className="card p-6">
              <h2 className="text-xl font-bold text-text-primary mb-6">
                Horas por Proyecto
              </h2>
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-text-primary">{project.name}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ 
                            width: `${(project.hours / totalHours) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-primary ml-4">
                      {project.hours} hrs
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activities */}
            <div className="card p-6">
              <h2 className="text-xl font-bold text-text-primary mb-6">
                Últimas Actividades
              </h2>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="border-l-4 border-primary pl-4 py-2">
                    <p className="font-semibold text-text-primary">{activity.projectName}</p>
                    <p className="text-sm text-text-secondary mt-1">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-text-secondary">{activity.description}</p>
                    <p className="text-primary font-bold mt-2">+{activity.hours} hrs</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistorialHoras;