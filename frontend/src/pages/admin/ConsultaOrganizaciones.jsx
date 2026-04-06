import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { Search, Filter, Plus, Edit2, Trash2, Loader } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const ConsultaOrganizaciones = () => {
    const navigate = useNavigate();
    const [organizaciones, setOrganizaciones] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

    useEffect(() => {
        loadOrganizaciones();
    }, []);

    const loadOrganizaciones = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/organizations`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar organizaciones');
            }

            const data = await response.json();
            setOrganizaciones(data.data?.organizations || []);
        } catch (error) {
            setError(error.message);
            console.error('Error loading organizations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            const response = await fetch(`${API_URL}/organizations/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al eliminar organización');
            }

            setOrganizaciones(organizaciones.filter(org => org.id !== id));
            setDeleteModal({ show: false, id: null });
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const organizacionesFiltradas = organizaciones.filter(org => {
        const coincideBusqueda = org.nombre?.toLowerCase().includes(busqueda.toLowerCase());
        const coincideEstado = filtroEstado === 'todos';
        return coincideBusqueda && coincideEstado;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8faf9]">
                <Navbar />
                <main className="container mx-auto px-6 pt-28 pb-12">
                    <div className="flex items-center justify-center py-12">
                        <Loader className="animate-spin text-[#0d9488]" size={32} />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8faf9]">
            <Navbar />
            
            <main className="container mx-auto px-6 pt-28 pb-12 max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <h2 className="font-poppins font-bold text-2xl text-text-primary mb-2">
                        Gestionar Organizaciones
                    </h2>
                    <p className="font-inter text-text-secondary">
                        Administra y monitorea todas las organizaciones en la plataforma
                    </p>
                </div>

                {error && (
                    <div className="card p-4 mb-6 bg-red-50 border border-red-200">
                        <p className="text-red-700 font-inter">{error}</p>
                        <button
                            onClick={loadOrganizaciones}
                            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

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
                                <option value="activa">Activas</option>
                                <option value="inactiva">Inactivas</option>
                            </select>
                        </div>
                        <button
                            onClick={() => navigate('/admin/organizaciones/nueva')}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0d9488] text-white rounded-lg
                                     hover:bg-[#0a7a73] transition-colors duration-200 font-inter font-semibold whitespace-nowrap"
                        >
                            <Plus size={18} />
                            Nueva
                        </button>
                    </div>
                </div>

                {/* Tabla de Organizaciones */}
                {organizacionesFiltradas.length === 0 ? (
                    <div className="card p-12 text-center">
                        <p className="font-inter text-text-secondary mb-4">
                            No hay organizaciones registradas
                        </p>
                        <button
                            onClick={() => navigate('/admin/organizaciones/nueva')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0d9488] text-white rounded-lg
                                     hover:bg-[#0a7a73] transition-colors duration-200 font-inter font-semibold"
                        >
                            <Plus size={18} />
                            Crear Primera Organización
                        </button>
                    </div>
                ) : (
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="px-6 py-4 text-left font-inter font-semibold text-text-primary text-sm">
                                            Nombre
                                        </th>
                                        <th className="px-6 py-4 text-left font-inter font-semibold text-text-primary text-sm">
                                            Tipo
                                        </th>
                                        <th className="px-6 py-4 text-left font-inter font-semibold text-text-primary text-sm">
                                            Email
                                        </th>
                                        <th className="px-6 py-4 text-left font-inter font-semibold text-text-primary text-sm">
                                            Fecha Creación
                                        </th>
                                        <th className="px-6 py-4 text-right font-inter font-semibold text-text-primary text-sm">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {organizacionesFiltradas.map((org, idx) => (
                                        <tr key={org.id || idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-inter text-text-primary">
                                                {org.nombre}
                                            </td>
                                            <td className="px-6 py-4 font-inter text-text-secondary text-sm">
                                                {org.tipo || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 font-inter text-text-secondary text-sm">
                                                {org.email || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 font-inter text-text-secondary text-sm">
                                                {org.fechaCreacion ? new Date(org.fechaCreacion).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/admin/organizaciones/${org.id}/editar`)}
                                                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={18} className="text-[#3b82f6]" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModal({ show: true, id: org.id })}
                                                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} className="text-red-500" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Delete Modal */}
                {deleteModal.show && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="card p-6 max-w-sm mx-4">
                            <h3 className="font-poppins font-bold text-lg text-text-primary mb-4">
                                Eliminar Organización
                            </h3>
                            <p className="font-inter text-text-secondary mb-6">
                                ¿Estás seguro de que deseas eliminar esta organización? Esta acción no se puede deshacer.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setDeleteModal({ show: false, id: null })}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50
                                             transition-colors font-inter font-semibold text-text-primary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteModal.id)}
                                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600
                                             transition-colors font-inter font-semibold"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ConsultaOrganizaciones;
