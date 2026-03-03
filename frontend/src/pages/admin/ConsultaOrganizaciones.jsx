import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, Plus } from 'lucide-react';

const ConsultaOrganizaciones = () => {
    const navigate = useNavigate();
    const [organizaciones, setOrganizaciones] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrganizaciones();
    }, []);

    const loadOrganizaciones = async () => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            setOrganizaciones([
                {
                    id: 1,
                    nombre: 'Fundación Esperanza',
                    lider: 'María González',
                    correo: 'maria@esperanza.org',
                    fechaRegistro: '2025-01-15',
                    estado: 'Activa',
                    miembros: 45
                },
                {
                    id: 2,
                    nombre: 'Manos Unidas',
                    lider: 'Carlos Ramírez',
                    correo: 'carlos@manosunidas.org',
                    fechaRegistro: '2025-02-20',
                    estado: 'Activa',
                    miembros: 32
                },
                {
                    id: 3,
                    nombre: 'Jóvenes por el Cambio',
                    lider: 'Ana Martínez',
                    correo: 'ana@jovenescambio.org',
                    fechaRegistro: '2025-03-01',
                    estado: 'Inactiva',
                    miembros: 18
                }
            ]);
        } catch (error) {
            alert('Error al cargar organizaciones');
        } finally {
            setLoading(false);
        }
    };

    const organizacionesFiltradas = organizaciones.filter(org => {
        const coincideBusqueda = org.nombre.toLowerCase().includes(busqueda.toLowerCase());
        const coincideEstado = filtroEstado === 'todos' || org.estado === filtroEstado;
        return coincideBusqueda && coincideEstado;
    });

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <h2 className="font-poppins font-bold text-2xl text-text-primary mb-2">
                    Organizaciones Registradas
                </h2>
                <p className="font-inter text-text-secondary">
                    Gestiona y monitorea las organizaciones en la plataforma
                </p>
            </div>

            {/* Filtros */}
            <div className="card p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                        <input
                            type="text"
                            className="input-field pl-10"
                            placeholder="Buscar por nombre..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                        <select
                            className="input-field pl-10 pr-8 appearance-none"
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="Activa">Activas</option>
                            <option value="Inactiva">Inactivas</option>
                        </select>
                    </div>
                    <button
                        onClick={() => navigate('/estructura/organizaciones/nueva')}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Nueva Organización
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className="card overflow-hidden">
                <table className="w-full">
                    <thead className="bg-stats-lighter">
                        <tr>
                            <th className="text-left p-4 font-poppins font-semibold text-text-primary">Nombre</th>
                            <th className="text-left p-4 font-poppins font-semibold text-text-primary">Líder</th>
                            <th className="text-left p-4 font-poppins font-semibold text-text-primary">Miembros</th>
                            <th className="text-left p-4 font-poppins font-semibold text-text-primary">Fecha Registro</th>
                            <th className="text-left p-4 font-poppins font-semibold text-text-primary">Estado</th>
                            <th className="text-center p-4 font-poppins font-semibold text-text-primary">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-text-secondary">
                                    Cargando organizaciones...
                                </td>
                            </tr>
                        ) : organizacionesFiltradas.length > 0 ? (
                            organizacionesFiltradas.map((org) => (
                                <tr key={org.id} className="border-t border-border hover:bg-gray-50">
                                    <td className="p-4 font-inter text-text-primary">{org.nombre}</td>
                                    <td className="p-4 font-inter text-text-secondary">{org.lider}</td>
                                    <td className="p-4 font-inter text-text-primary">{org.miembros}</td>
                                    <td className="p-4 font-inter text-text-secondary">{org.fechaRegistro}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-inter font-medium ${org.estado === 'Activa'
                                                ? 'bg-stats-volunteers/20 text-stats-volunteers'
                                                : 'bg-gray-200 text-gray-600'
                                            }`}>
                                            {org.estado}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => alert(`Ver expediente de ${org.nombre}`)}
                                            className="text-primary hover:text-primary-dark"
                                        >
                                            <Eye size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-text-secondary font-inter">
                                    No se encontraron organizaciones
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ConsultaOrganizaciones;