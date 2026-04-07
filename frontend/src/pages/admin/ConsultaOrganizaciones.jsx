import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import InstitutionCard from '../../components/InstitutionCard.jsx';
import { apiClient } from '../../services/apiClient';

const OrganizationsListPage = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para filtros y paginación (basados en el controlador backend)
  const [filters, setFilters] = useState({
    search: '',
    tipo: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1
  });

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: filters.page,
        limit: filters.limit,
        estado: 'activa' // Enum válido en backend
      }).toString();

      if (filters.search?.trim()) {
        queryParams.set('search', filters.search.trim());
      }

      if (filters.tipo) {
        queryParams.set('tipo', filters.tipo);
      }

      const result = await apiClient.get(`/organizations?${queryParams}`);
      setOrganizations(result?.data?.organizations || []);
      setPagination(result?.data?.pagination || { total: 0, totalPages: 1, page: filters.page });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [filters.page, filters.tipo]); // Recargar al cambiar página o tipo

  // Función para manejar la búsqueda (debounce manual al presionar Enter o botón)
  const handleSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      setFilters(prev => ({ ...prev, page: 1 }));
      fetchOrganizations();
    }
  };

  // Callback cuando se elimina una organización desde la Card
  const handleDeleteRefresh = (id) => {
    setOrganizations(prev => prev.filter(org => org.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Encabezado de la página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="font-['Poppins'] text-3xl font-bold text-[#1F2937]">
              Gestión de Organizaciones
            </h1>
            <p className="font-['Inter'] text-[#64748B] mt-1">
              Administra y supervisa todas las instituciones registradas en el sistema.
            </p>
          </div>

          <Link
            to="/RegistroOrganizacion"
            className="flex items-center justify-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#FFFFFF] px-6 py-3 rounded-xl font-['Inter'] font-semibold transition-all shadow-lg shadow-green-100"
          >
            <Plus className="w-5 h-5" />
            Nueva Organización
          </Link>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#38BDF8] font-['Inter'] text-[#1F2937]"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={handleSearch}
            />
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] w-4 h-4" />
              <select
                className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg appearance-none focus:outline-none focus:border-[#38BDF8] font-['Inter'] text-[#64748B] bg-white"
                value={filters.tipo}
                onChange={(e) => setFilters({ ...filters, tipo: e.target.value, page: 1 })}
              >
                <option value="">Todos los tipos</option>
                <option value="asociacion">Asociación</option>
                <option value="fundacion">Fundación</option>
                <option value="ong">ONG</option>
                <option value="cooperativa">Cooperativa</option>
                <option value="grupo_comunitario">Grupo comunitario</option>
                <option value="religiosa">Religiosa</option>
                <option value="estudiantil">Estudiantil</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            
            <button 
              onClick={fetchOrganizations}
              className="bg-[#DCECE7] text-[#22C55E] p-2 rounded-lg hover:bg-[#22C55E] hover:text-white transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lista de Organizaciones */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[#22C55E] animate-spin" />
            <p className="mt-4 font-['Inter'] text-[#64748B]">Cargando organizaciones...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center font-['Inter']">
            {error}
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-[#E2E8F0]">
            <p className="font-['Poppins'] text-[#64748B] text-lg">No se encontraron organizaciones.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {organizations.map((org) => (
              <InstitutionCard 
                key={org.id} 
                organization={org} 
                onDelete={handleDeleteRefresh}
                onUpdate={(updatedOrg) => console.log('Update direct:', updatedOrg)}
              />
            ))}
          </div>
        )}

        {/* Paginación */}
        {!loading && organizations.length > 0 && (
          <div className="mt-10 flex items-center justify-between border-t border-[#E2E8F0] pt-6">
            <p className="font-['Inter'] text-sm text-[#64748B]">
              Mostrando página <span className="font-bold text-[#1F2937]">{pagination.page}</span> de <span className="font-bold text-[#1F2937]">{pagination.totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                disabled={filters.page === 1}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                className="p-2 border border-[#E2E8F0] rounded-lg hover:bg-[#E0F2FE] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-[#1F2937]" />
              </button>
              <button
                disabled={filters.page === pagination.totalPages}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                className="p-2 border border-[#E2E8F0] rounded-lg hover:bg-[#E0F2FE] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[#1F2937]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationsListPage;
