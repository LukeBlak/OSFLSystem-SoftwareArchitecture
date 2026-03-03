import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, UserX, Edit } from 'lucide-react';

const ListadoMiembros = () => {
    const navigate = useNavigate();
    const [miembros, setMiembros] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMiembros();
    }, []);

    const loadMiembros = async () => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            setMiembros([
                {
                    id: 1,
                    nombre: 'Juan Pérez',
                    correo: 'juan@esperanza.org',
                    telefono: '7000-1234',
                    estado: 'Activo',
                    fechaIngreso: '2025-01-20',
                    comites: ['Logística', 'Comunicación']
                },
                {
                    id: 2,
                    nombre: 'Laura Sánchez',
                    correo: 'laura@esperanza.org',
                    telefono: '7000-5678',
                    estado: 'Activo',
                    fechaIngreso: '2025-02-10',
                    comites: ['Finanzas']
                },
                {
                    id: 3,
                    nombre: 'Pedro Díaz',
                    correo: 'pedro@esperanza.org',
                    telefono: '7000-9012',
                    estado: 'Inactivo',
                    fechaIngreso: '2024-11-05',
                    comites: []
                }
            ]);
        } catch (error) {
            alert('Error al cargar miembros');
        } finally {
            setLoading(false);
        }
    };

    const miembrosFiltrados = miembros.filter(miembro => {
        const coincideBusqueda = miembro.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            miembro.correo.toLowerCase().includes(busqueda.toLowerCase());
        const coincideEstado = filtroEstado === 'todos' || miembro.estado === filtroEstado;
        return coincideBusqueda && coincideEstado;
    });

    const handleBaja = (id) => {
        if (confirm('¿Está seguro de dar de baja a este miembro?')) {
            navigate(`/estructura/miembros/baja/${id}`);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <h2 className="font-poppins font-bold text-2xl text-text-primary mb-2">
                    Miembros de la Organización
                </h2>
                <p className="font-inter text-text-secondary">
                    Gestiona los voluntarios registrados en tu organización
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
                            placeholder="Buscar por nombre o correo..."
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
                            <option value="Activo">Activos</option>
                            <option value="Inactivo">Inactivos</option>
                        </select>
                    </div>
                    <button
                        onClick={() => navigate('/estructura/miembros/nuevo')}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Nuevo Miembro
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className="card overflow-hidden">
                <table className="w-full">
                    <thead className="bg-stats-lighter">
                        <tr>
                            <th className="text-left p-4 font-poppins font-semibold text-text-primary">Nombre</th>
                            <th className="text-left p-4 font-poppins font-semibold text-text-primary">Correo</th>
                            <th className="text-left p-4 font-poppins font-semibold text-text-primary">Teléfono</th>
                            <th className="text-left p-4 font-poppins font-semibold text-text-primary">Comités</th>
                            <th className="text-left p-4 font-poppins font-semibold text-text-primary">Estado</th>
                            <th className="text-center p-4 font-poppins font-semibold text-text-primary">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-text-secondary">
                                    Cargando miembros...
                                </td>
                            </tr>
                        ) : miembrosFiltrados.length > 0 ? (
                            miembrosFiltrados.map((miembro) => (
                                <tr key={miembro.id} className="border-t border-border hover:bg-gray-50">
                                    <td className="p-4 font-inter text-text-primary">{miembro.nombre}</td>
                                    <td className="p-4 font-inter text-text-secondary">{miembro.correo}</td>
                                    <td className="p-4 font-inter text-text-secondary">{miembro.telefono}</td>
                                    <td className="p-4 font-inter text-text-secondary">
                                        {miembro.comites.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {miembro.comites.map((comite, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-primary-lighter text-primary text-xs rounded-full">
                                                        {comite}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-text-secondary text-sm">Sin comité</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-inter font-medium ${miembro.estado === 'Activo'
                                                ? 'bg-stats-volunteers/20 text-stats-volunteers'
                                                : 'bg-gray-200 text-gray-600'
                                            }`}>
                                            {miembro.estado}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => alert(`Editar ${miembro.nombre}`)}
                                                className="text-primary hover:text-primary-dark"
                                                title="Editar"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            {miembro.estado === 'Activo' && (
                                                <button
                                                    onClick={() => handleBaja(miembro.id)}
                                                    className="text-red-500 hover:text-red-600"
                                                    title="Dar de baja"
                                                >
                                                    <UserX size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-text-secondary font-inter">
                                    No se encontraron miembros
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ListadoMiembros;