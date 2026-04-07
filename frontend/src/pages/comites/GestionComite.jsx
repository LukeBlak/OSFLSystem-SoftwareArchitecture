import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, UserPlus, UserMinus, Crown, ArrowLeft } from 'lucide-react';
import {
    addMemberToCommittee,
    assignCommitteeLeader,
    getCommitteeById,
    getCommitteeMembers,
    removeMemberFromCommittee,
} from '../../services/committeeService';
import { getMembers } from '../../services/memberService';
import authService from '../../services/authService';

const GestionComite = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const currentUser = authService.getUser();
    const [comite, setComite] = useState(null);
    const [miembros, setMiembros] = useState([]);
    const [miembrosDisponibles, setMiembrosDisponibles] = useState([]);
    const [showAgregarModal, setShowAgregarModal] = useState(false);
    const [selectedMiembros, setSelectedMiembros] = useState([]);
    const [loading, setLoading] = useState(true);
    const role = String(authService.getUser()?.role || '').toLowerCase();
    const canAddMembers = ['admin', 'lider_organizacion'].includes(role);
    const canAssignLeader = ['admin', 'lider_organizacion', 'lider_comite'].includes(role);
    const canRemoveMembers = ['admin', 'lider_organizacion', 'lider_comite'].includes(role);

    const mapMember = (rawMember, liderId = null) => {
        const member = rawMember?.miembro || rawMember;
        const memberId = member?.id || rawMember?.id || null;
        return {
            id: memberId,
            nombre: member?.nombre || member?.name || 'Sin nombre',
            correo: member?.email || member?.correo || 'Sin correo',
            esLider: memberId === liderId,
        };
    };

    useEffect(() => {
        loadComiteData();
    }, [id]);

    const loadComiteData = async () => {
        setLoading(true);
        try {
            const [committeeResponse, membersResponse] = await Promise.all([
                getCommitteeById(id),
                getCommitteeMembers(id, { limit: 100 }),
            ]);

            const committeePayload = committeeResponse?.data?.committee || committeeResponse?.data || {};
            const membersPayload = membersResponse?.data?.miembros
                || membersResponse?.data?.members
                || membersResponse?.data
                || [];

            const liderId = committeePayload.liderComiteId
                || committeePayload.lidercomiteid
                || committeePayload.lider_comite_id
                || null;
            const currentUserName = currentUser?.profile?.nombre
                || currentUser?.nombre
                || currentUser?.email
                || 'Líder asignado';
            const isCurrentUserLeader = Boolean(liderId) && String(liderId) === String(currentUser?.id);

            setComite({
                id: committeePayload.id || id,
                nombre: committeePayload.nombre || 'Sin nombre',
                descripcion: committeePayload.descripcion || 'Sin descripción',
                areaEnfoque: committeePayload.areaResponsabilidad || committeePayload.arearesponsabilidad || 'Sin área',
                lider: committeePayload.lider?.nombre || committeePayload.liderNombre || (isCurrentUserLeader ? currentUserName : 'No asignado'),
                organizacionId: committeePayload.organizacionId || committeePayload.organizacionid || null,
                fechaCreacion: committeePayload.createdAt || committeePayload.fechaCreacion || committeePayload.fechacreacion || null,
            });

            const normalizedMembers = (Array.isArray(membersPayload) ? membersPayload : [])
                .map((rawMember) => mapMember(rawMember, liderId))
                .filter((member) => !!member.id);

            setMiembros(normalizedMembers);

            const membersResponseAll = await getMembers({
                limit: 100,
                organizacionId: committeePayload.organizacionId || committeePayload.organizacionid || null,
            });

            const allMembersPayload = membersResponseAll?.data?.members
                || membersResponseAll?.data?.miembros
                || membersResponseAll?.data
                || [];

            const assignedIds = new Set(normalizedMembers.map((member) => member.id));
            const availableMembers = (Array.isArray(allMembersPayload) ? allMembersPayload : [])
                .map((rawMember) => mapMember(rawMember, liderId))
                .filter((member) => member.id && !assignedIds.has(member.id));

            setMiembrosDisponibles(availableMembers);
        } catch (error) {
            alert(error?.userMessage || error?.message || 'Error al cargar datos del comité');
        } finally {
            setLoading(false);
        }
    };

    const handleAgregarMiembros = async () => {
        if (!canAddMembers) {
            alert('No tienes permisos para agregar miembros al comité');
            return;
        }

        if (selectedMiembros.length === 0) {
            alert('Seleccione al menos un miembro');
            return;
        }
        try {
            await Promise.all(selectedMiembros.map((memberId) => addMemberToCommittee(id, memberId)));
            setSelectedMiembros([]);
            setShowAgregarModal(false);
            await loadComiteData();
            alert('Miembros agregados exitosamente');
        } catch (error) {
            alert(error?.userMessage || error?.message || 'Error al agregar miembros al comité');
        }
    };

    const handleRemoverMiembro = async (miembroId) => {
        if (!canRemoveMembers) {
            alert('No tienes permisos para remover miembros del comité');
            return;
        }

        const miembro = miembros.find(m => m.id === miembroId);
        if (miembro.esLider) {
            alert('No se puede remover al líder del comité. Designe un nuevo líder primero.');
            return;
        }
        if (confirm(`¿Está seguro de remover a ${miembro.nombre} del comité?`)) {
            try {
                await removeMemberFromCommittee(id, miembroId);
                await loadComiteData();
                alert('Miembro removido exitosamente');
            } catch (error) {
                alert(error?.userMessage || error?.message || 'Error al remover miembro del comité');
            }
        }
    };

    const handleDesignarLider = async (miembroId) => {
        if (!canAssignLeader) {
            alert('No tienes permisos para designar líder del comité');
            return;
        }

        const miembro = miembros.find(m => m.id === miembroId);
        if (!miembro) {
            alert('No se encontró el miembro seleccionado');
            return;
        }

        if (confirm(`¿Designar a ${miembro.nombre} como líder del comité?`)) {
            try {
                await assignCommitteeLeader(id, miembroId);
                await loadComiteData();
                alert('Líder designado exitosamente');
            } catch (error) {
                alert(error?.userMessage || error?.message || 'Error al designar líder del comité');
            }
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
                    {canAddMembers && (
                        <button
                            onClick={() => setShowAgregarModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <UserPlus size={18} />
                            Agregar Miembros
                        </button>
                    )}
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
                                {!miembro.esLider && canAssignLeader && (
                                    <button
                                        onClick={() => handleDesignarLider(miembro.id)}
                                        className="text-primary hover:text-primary-dark text-sm font-inter"
                                    >
                                        Designar Líder
                                    </button>
                                )}
                                {canRemoveMembers && (
                                    <button
                                        onClick={() => handleRemoverMiembro(miembro.id)}
                                        className="text-red-500 hover:text-red-600 text-sm font-inter"
                                    >
                                        Remover
                                    </button>
                                )}
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
            {showAgregarModal && canAddMembers && (
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