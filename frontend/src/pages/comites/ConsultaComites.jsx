import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, Users, FolderKanban } from 'lucide-react';

const ConsultaComites = () => {
    const navigate = useNavigate();
    const [comites, setComites] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroArea, setFiltroArea] = useState('todas');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadComites();
    }, []);

    const loadComites = async () => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            setComites([
                {
                    id: 1,
                    nombre: 'Logística',
                    descripcion: 'Coordinación de eventos y recursos',
                    areaEnfoque: 'Operaciones',
                    lider: 'Juan Pérez',
                    miembros: 8,
                    fechaCreacion: '2025-01-25'
                },
                {
                    id: 2,
                    nombre: 'Comunicación',
                    descripcion: 'Gestión de redes y difusión',
                    areaEnfoque: 'Marketing',
                    lider: 'Sofia Torres',
                    miembros: 5,
                    fechaCreacion: '2025-02-01'
                },
                {
                    id: 3,
                    nombre: 'Finanzas',
                    descripcion: 'Control presupuestario',
                    areaEnfoque: 'Administración',
                    lider: 'Laura Sánchez',
                    miembros: 3,
                    fechaCreacion: '2025-01-30'
                }
            ]);
        } catch (error) {
            alert('Error al cargar comités');
        } finally {
            setLoading(false);
        }
    };

    const areasEnfoque = ['todas', 'Operaciones', 'Marketing', 'Administración', 'Educación', 'Salud'];

    const comitesFiltrados = comites.filter(comite => {
        const coincideBusqueda = comite.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            comite.descripcion.toLowerCase().includes(busqueda.toLowerCase());
        const coincideArea = filtroArea === 'todas' || comite.areaEnfoque === filtroArea;
        return coincideBusqueda && coincideArea;
    });

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <h2 className="font-poppins font-bold text-2xl text-text-primary mb-2">
                    Comités de Trabajo
                </h2>
                <p className="font-inter text-text-secondary">
                    Gestiona los equipos especializados de tu organización
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
                            placeholder="Buscar por nombre o descripción..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                        <select
                            className="input-field pl-10 pr-8 appearance-none"
                            value={filtroArea}
                            onChange={(e) => setFiltroArea(e.target.value)}
                        >
                            {areasEnfoque.map((area) => (
                                <option key={area} value={area}>
                                    {area === 'todas' ? 'Todas las áreas' : area}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => navigate('/estructura/comites/nuevo')}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Nuevo Comité
                    </button>
                </div>
            </div>

            {/* Grid de Comités */}
            {loading ? (
                <div className="card p-12 text-center">
                    <p className="text-text-secondary">Cargando comités...</p>
                </div>
            ) : comitesFiltrados.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {comitesFiltrados.map((comite) => (
                        <div
                            key={comite.id}
                            className="card p-6 cursor-pointer hover:shadow-medium transition-shadow"
                            onClick={() => navigate(`/estructura/comites/${comite.id}/gestion`)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-lg bg-primary-lighter flex items-center justify-center">
                                    <FolderKanban size={24} className="text-primary" />
                                </div>
                                <span className="px-2 py-1 bg-stats-lighter text-primary text-xs rounded-full">
                                    {comite.areaEnfoque}
                                </span>
                            </div>

                            <h3 className="font-poppins font-bold text-lg text-text-primary mb-2">
                                {comite.nombre}
                            </h3>
                            <p className="font-inter text-text-secondary text-sm mb-4 line-clamp-2">
                                {comite.descripcion}
                            </p>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <Users size={14} />
                                    <span>{comite.miembros} miembros</span>
                                </div>
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <Users size={14} /> {/* ✅ Aquí estaba UserX, ahora es Users */}
                                    <span>Líder: {comite.lider}</span>
                                </div>
                                <div className="text-text-secondary text-xs">
                                    Creado: {new Date(comite.fechaCreacion).toLocaleDateString()}
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/estructura/comites/${comite.id}/gestion`);
                                }}
                                className="w-full mt-4 btn-outline text-sm py-2"
                            >
                                Gestionar Comité
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card p-12 text-center">
                    <FolderKanban size={48} className="mx-auto text-text-secondary mb-4" />
                    <p className="text-text-secondary font-inter">No se encontraron comités</p>
                </div>
            )}
        </div>
    );
};

export default ConsultaComites;