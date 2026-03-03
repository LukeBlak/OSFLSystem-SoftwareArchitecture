import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  UserCheck,
  UserX,
  Mail,
  Phone,
  FolderKanban,
  Calendar
} from 'lucide-react';

const AprobarParticipante = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    // Simulación de datos - En producción sería llamada a API
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
      },
      {
        id: 4,
        projectId: 2,
        projectName: 'Alfabetización Digital',
        member: {
          id: 104,
          name: 'Carlos Ruiz',
          email: 'carlos@email.com',
          phone: '7456-7890',
          committee: 'Educación'
        },
        appliedDate: '2026-03-08',
        status: 'rejected'
      }
    ]);
  };

  const handleApprove = async (applicationId) => {
    setLoading(true);
    try {
      // API call: aprobar participante
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId ? { ...app, status: 'approved' } : app
        )
      );
      alert('Participante aprobado exitosamente');
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
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId ? { ...app, status: 'rejected' } : app
        )
      );
      alert('Postulación rechazada');
    } catch (error) {
      alert('Error al rechazar participante');
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesFilter = filter === 'all' || app.status === filter;
    const matchesSearch = app.member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
          <Clock size={14} />
          Pendiente
        </span>
      ),
      approved: (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-300">
          <CheckCircle size={14} />
          Aprobado
        </span>
      ),
      rejected: (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 border border-red-300">
          <XCircle size={14} />
          Rechazado
        </span>
      )
    };
    return badges[status] || badges.pending;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStats = () => {
    const total = applications.length;
    const pending = applications.filter(a => a.status === 'pending').length;
    const approved = applications.filter(a => a.status === 'approved').length;
    const rejected = applications.filter(a => a.status === 'rejected').length;
    return { total, pending, approved, rejected };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner 
        title="Aprobar Participantes"
        subtitle="Gestiona las postulaciones de voluntarios a los proyectos"
      />

      <main className="container mx-auto px-6 pt-28 pb-12">
        {/* Header de la página */}
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">
            Gestión de Postulaciones
          </h2>
          <p className="font-inter text-[#64748b]">
            Revisa y aprueba las solicitudes de participación en proyectos
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="font-inter text-xs text-[#64748b]">Pendientes</p>
                <p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-inter text-xs text-[#64748b]">Aprobados</p>
                <p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="font-inter text-xs text-[#64748b]">Rechazados</p>
                <p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Filtros */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-inter text-sm font-semibold transition-colors ${
                  filter === 'all'
                    ? 'bg-[#0d9488] text-white'
                    : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg font-inter text-sm font-semibold transition-colors ${
                  filter === 'pending'
                    ? 'bg-[#0d9488] text-white'
                    : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-lg font-inter text-sm font-semibold transition-colors ${
                  filter === 'approved'
                    ? 'bg-[#0d9488] text-white'
                    : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'
                }`}
              >
                Aprobadas
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-lg font-inter text-sm font-semibold transition-colors ${
                  filter === 'rejected'
                    ? 'bg-[#0d9488] text-white'
                    : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'
                }`}
              >
                Rechazadas
              </button>
            </div>

            {/* Búsqueda */}
            <div className="relative w-full md:w-64">
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

        {/* Lista de Postulaciones */}
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <div key={app.id} className="card p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-[#0d9488] flex items-center justify-center">
                      <Users size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-poppins font-bold text-lg text-[#1f2937]">
                        {app.member.name}
                      </h3>
                      <p className="font-inter text-sm text-[#64748b]">
                        {app.member.committee}
                      </p>
                    </div>
                    <div className="ml-auto lg:ml-4">
                      {getStatusBadge(app.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-[#64748b]">
                      <Mail size={16} />
                      <span className="font-inter">{app.member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#64748b]">
                      <Phone size={16} />
                      <span className="font-inter">{app.member.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#64748b]">
                      <FolderKanban size={16} />
                      <span className="font-inter">{app.projectName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#64748b]">
                      <Calendar size={16} />
                      <span className="font-inter">Postulado: {formatDate(app.appliedDate)}</span>
                    </div>
                  </div>
                </div>

                {app.status === 'pending' && (
                  <div className="flex gap-2 lg:flex-shrink-0">
                    <button
                      onClick={() => handleReject(app.id)}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-lg 
                               font-inter font-semibold hover:bg-red-600 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserX size={18} />
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#0d9488] text-white rounded-lg 
                               font-inter font-semibold hover:bg-[#0f766e] transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserCheck size={18} />
                      Aprobar
                    </button>
                  </div>
                )}

                {app.status !== 'pending' && (
                  <div className="text-[#64748b] font-inter text-sm">
                    {app.status === 'approved' ? '✓ Aprobado' : '✗ Rechazado'}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredApplications.length === 0 && (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Search size={40} className="text-[#64748b]" />
              </div>
              <h3 className="font-poppins font-bold text-xl text-[#1f2937] mb-2">
                No se encontraron postulaciones
              </h3>
              <p className="font-inter text-[#64748b] mb-4">
                {searchTerm 
                  ? 'Intenta con otro término de búsqueda' 
                  : `No hay postulaciones ${filter !== 'all' ? filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : 'rechazadas' : ''}`
                }
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="btn-primary"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AprobarParticipante;