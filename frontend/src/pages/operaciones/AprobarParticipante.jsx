import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AprobarParticipante = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    // Simulación de datos
    setApplications([
      {
        id: 1,
        projectId: 1,
        projectName: 'Campaña de Reforestación',
        member: {
          id: 101,
          name: 'María González',
          email: 'maria@email.com',
          phone: '7123-4567',
          committee: 'Medio Ambiente'
        },
        appliedDate: '2026-03-10',
        status: 'pending'
      },
      {
        id: 2,
        projectId: 1,
        projectName: 'Campaña de Reforestación',
        member: {
          id: 102,
          name: 'Juan Pérez',
          email: 'juan@email.com',
          phone: '7234-5678',
          committee: 'Medio Ambiente'
        },
        appliedDate: '2026-03-11',
        status: 'pending'
      },
      {
        id: 3,
        projectId: 2,
        projectName: 'Alfabetización Digital',
        member: {
          id: 103,
          name: 'Ana López',
          email: 'ana@email.com',
          phone: '7345-6789',
          committee: 'Educación'
        },
        appliedDate: '2026-03-09',
        status: 'approved'
      }
    ]);
  };

  const handleApprove = async (applicationId) => {
    setLoading(true);
    try {
      // API call: aprobar participante
      alert('Participante aprobado exitosamente');
      fetchApplications();
    } catch (error) {
      alert('Error al aprobar participante');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (applicationId) => {
    if (!confirm('¿Está seguro de rechazar esta postulación?')) return;
    
    setLoading(true);
    try {
      // API call: rechazar participante
      alert('Postulación rechazada');
      fetchApplications();
    } catch (error) {
      alert('Error al rechazar participante');
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: <span className="badge badge-warning">Pendiente</span>,
      approved: <span className="badge badge-success">Aprobado</span>,
      rejected: <span className="badge bg-red-100 text-red-800">Rechazado</span>
    };
    return badges[status] || badges.pending;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Aprobar Participantes</h1>
        </div>
      </header>

      <main className="container mx-auto p-6">
        {/* Filtros */}
        <div className="card p-4 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${filter === 'all' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-text-secondary'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg ${filter === 'pending' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-text-secondary'}`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg ${filter === 'approved' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-text-secondary'}`}
            >
              Aprobadas
            </button>
          </div>
        </div>

        {/* Lista de Postulaciones */}
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <div key={app.id} className="card p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-text-primary">
                      {app.member.name}
                    </h3>
                    {getStatusBadge(app.status)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-text-secondary">
                    <p>📧 {app.member.email}</p>
                    <p>📞 {app.member.phone}</p>
                    <p>🏢 Comité: {app.member.committee}</p>
                    <p>📋 Proyecto: {app.projectName}</p>
                    <p>📅 Postulado: {new Date(app.appliedDate).toLocaleDateString()}</p>
                  </div>
                </div>

                {app.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(app.id)}
                      disabled={loading}
                      className="px-6 py-2 bg-red-500 text-white rounded-lg 
                               font-semibold hover:bg-red-600 transition-colors
                               disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={loading}
                      className="px-6 py-2 bg-primary text-white rounded-lg 
                               font-semibold hover:bg-primary-dark transition-colors
                               disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredApplications.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-text-secondary text-lg">
                No hay postulaciones {filter !== 'all' && filter}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AprobarParticipante;