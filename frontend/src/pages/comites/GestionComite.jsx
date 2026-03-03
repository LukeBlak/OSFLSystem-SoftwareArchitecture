import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, UserPlus, UserMinus, Crown, ArrowLeft } from 'lucide-react';

const GestionComite = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [comite, setComite] = useState(null);
    const [miembros, setMiembros] = useState([]);
    const [miembrosDisponibles, setMiembrosDisponibles] = useState([]);
    const [showAgregarModal, setShowAgregarModal] = useState(false);
    const [selectedMiembros, setSelectedMiembros] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadComiteData();
    }, [id]);

    const loadComiteData = async () => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            setComite({
                id: parseInt(id),
                nombre: 'Logística',
                descripcion: 'Coordinación de eventos y recursos',
                areaEnfoque: 'Operaciones',
                lider: 'Juan Pérez',
                fechaCreacion: '2025-01-25'
            });
            setMiembros([
                { id: 1, nombre: 'Juan Pérez', correo: 'juan@esperanza.org', esLider: true },
                { id: 2, nombre: 'Laura Sánchez', correo: 'laura@esperanza.org', esLider: false },
                { id: 3, nombre: 'Carlos Ruiz', correo: 'carlos@esperanza.org', esLider: false }
            ]);
            setMiembrosDisponibles([
                { id: 4, nombre: 'Ana López', correo: 'ana@esperanza.org' },
                { id: 5, nombre: 'Pedro Díaz', correo: 'pedro@esperanza.org' },
                { id: 6, nombre: 'Sofia Torres', correo: 'sofia@esperanza.org' }
            ]);
        } catch (error) {
            alert('Error al cargar datos del comité');
        } finally {
            setLoading(false);
        }
    };

    const handleAgregarMiembros = () => {
        if (selectedMiembros.length === 0) {
            alert('Seleccione al menos un miembro');
            return;
        }
        const nuevosMiembros = miembrosDisponibles
            .filter(m => selectedMiembros.includes(m.id))
            .map(m => ({ ...m, esLider: false }));
        setMiembros([...miembros, ...nuevosMiembros]);
        setMiembrosDisponibles(miembrosDisponibles.filter(m => !selectedMiembros.includes(m.id)));
        setSelectedMiembros([]);
        setShowAgregarModal(false);
        alert('Miembros agregados exitosamente');
    };

    const handleRemoverMiembro = (miembroId) => {
        const miembro = miembros.find(m => m.id === miembroId);
        if (miembro.esLider) {
            alert('No se puede remover al líder del comité. Designe un nuevo líder primero.');
            return;
        }
        if (confirm(`¿Está seguro de remover a ${miembro.nombre} del comité?`)) {
            setMiembros(miembros.filter(m => m.id !== miembroId));
            setMiembrosDisponibles([...miembrosDisponibles, miembro]);
            alert('Miembro removido exitosamente');
        }
    };

    const handleDesignarLider = (miembroId) => {
        const miembro = miembros.find(m => m.id === miembroId);
        if (confirm(`¿Designar a ${miembro.nombre} como líder del comité?`)) {
            setMiembros(miembros.map(m => ({
                ...m,
                esLider: m.id === miembroId
            })));
            alert('Líder designado exitosamente');
        }
    };

    if (loading || !comite) {
        return (
            <div className="container mx-auto p-6 max-w-6xl">
                <div className="card p-12 text-center">
                    <p className="text-text-secondary">Cargando datos del comité...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/estructura/comites')}
                    className="flex items-center gap-2 text-text-secondary hover:text-primary mb-4"
                >
                    <ArrowLeft size={18} />
                    Volver a Comités
                </button>
                <h2 className="font-poppins font-bold text-2xl text-text-primary mb-2">
                    Gestión de Comité: {comite.nombre}
                </h2>
                <p className="font-inter text-text-secondary">
                    {comite.descripcion}
                </p>
            </div>

            {/* Info del Comité */}
            <div className="card p-6 mb-6">
                <div className="grid md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-text-secondary text-sm">Área de Enfoque</p>
                        <p className="font-inter text-text-primary font-semibold">{comite.areaEnfoque}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary text-sm">Líder Actual</p>
                        <p className="font-inter text-text-primary font-semibold">{comite.lider}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary text-sm">Total Miembros</p>
                        <p className="font-inter text-text-primary font-semibold">{miembros.length}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary text-sm">Fecha de Creación</p>
                        <p className="font-inter text-text-primary font-semibold">
                            {new Date(comite.fechaCreacion).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Miembros del Comité */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-poppins font-bold text-lg text-text-primary flex items-center gap-2">
                        <Users size={20} />
                        Miembros del Comité
                    </h3>
                    <button
                        onClick={() => setShowAgregarModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <UserPlus size={18} />
                        Agregar Miembros
                    </button>
                </div>

                <div className="divide-y divide-border">
                    {miembros.map((miembro) => (
                        <div key={miembro.id} className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${miembro.esLider ? 'bg-primary-lighter' : 'bg-gray-100'
                                    }`}>
                                    {miembro.esLider ? (
                                        <Crown size={20} className="text-primary" />
                                    ) : (
                                        <Users size={20} className="text-text-secondary" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-inter font-semibold text-text-primary">
                                        {miembro.nombre}
                                        {miembro.esLider && (
                                            <span className="ml-2 px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                                                Líder
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-sm text-text-secondary">{miembro.correo}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {!miembro.esLider && (
                                    <button
                                        onClick={() => handleDesignarLider(miembro.id)}
                                        className="text-primary hover:text-primary-dark text-sm font-inter"
                                    >
                                        Designar Líder
                                    </button>
                                )}
                                <button
                                    onClick={() => handleRemoverMiembro(miembro.id)}
                                    className="text-red-500 hover:text-red-600 text-sm font-inter"
                                >
                                    Remover
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {miembros.length === 0 && (
                    <div className="text-center py-8 text-text-secondary">
                        <p>No hay miembros en este comité</p>
                    </div>
                )}
            </div>

            {/* Modal Agregar Miembros */}
            {showAgregarModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-md p-6">
                        <h3 className="font-poppins font-bold text-lg text-text-primary mb-4">
                            Agregar Miembros al Comité
                        </h3>

                        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                            {miembrosDisponibles.length > 0 ? (
                                miembrosDisponibles.map((miembro) => (
                                    <label
                                        key={miembro.id}
                                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${selectedMiembros.includes(miembro.id)
                                                ? 'border-primary bg-primary-lighter'
                                                : 'border-border hover:border-secondary'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedMiembros.includes(miembro.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedMiembros([...selectedMiembros, miembro.id]);
                                                } else {
                                                    setSelectedMiembros(selectedMiembros.filter(id => id !== miembro.id));
                                                }
                                            }}
                                            className="w-5 h-5 text-primary focus:ring-primary"
                                        />
                                        <div className="ml-3">
                                            <p className="font-inter font-semibold text-text-primary">{miembro.nombre}</p>
                                            <p className="text-sm text-text-secondary">{miembro.correo}</p>
                                        </div>
                                    </label>
                                ))
                            ) : (
                                <p className="text-center text-text-secondary py-4">
                                    No hay miembros disponibles para agregar
                                </p>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setShowAgregarModal(false);
                                    setSelectedMiembros([]);
                                }}
                                className="btn-outline flex-1"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAgregarMiembros}
                                disabled={selectedMiembros.length === 0}
                                className="btn-primary flex-1"
                            >
                                Agregar ({selectedMiembros.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionComite;