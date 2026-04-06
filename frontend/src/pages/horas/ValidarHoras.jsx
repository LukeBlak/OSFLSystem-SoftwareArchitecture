import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { Clock, CheckCircle, XCircle, Calendar, FolderKanban, User, AlertCircle, Save, Search } from 'lucide-react';
import { getMembers, validateHours as validateMemberHours } from '../../services/memberService';
import { getMemberHistory } from '../../services/hoursService';
import authService from '../../services/authService';

const normalizeMembers = (response) => {
  const items = Array.isArray(response?.data)
    ? response.data
    : response?.data?.members || response?.data || [];

  return items.map((member) => ({
    ...member,
    name: member.nombre || member.name,
    email: member.email || member.correo || '',
  }));
};

const normalizeHistory = (response) => {
  const items = Array.isArray(response?.data?.registros)
    ? response.data.registros
    : Array.isArray(response?.data)
      ? response.data
      : response?.data?.records || [];

  return items.map((record) => ({
    ...record,
    status: (record.estado || record.status || 'pendiente').toLowerCase(),
    hours: record.cantidadHoras ?? record.hours ?? 0,
    date: record.fecha || record.date,
    projectName: record.proyecto?.nombre || record.projectName || 'Proyecto',
    memberName: record.miembro?.nombre || record.memberName || 'Miembro',
    memberEmail: record.miembro?.email || record.memberEmail || '',
  }));
};

const ValidarHoras = () => {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const organizationId = currentUser?.organizationId || currentUser?.organizacionId || '';

  const [selectedMember, setSelectedMember] = useState('');
  const [members, setMembers] = useState([]);
  const [records, setRecords] = useState([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [projectDetails, setProjectDetails] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      loadHistory(selectedMember);
    } else {
      setRecords([]);
    }
  }, [selectedMember]);

  const loadMembers = async () => {
    setLoadingData(true);
    try {
      const response = await getMembers({ organizacionId: organizationId || undefined, limit: 100 });
      const items = normalizeMembers(response);
      setMembers(items);

      if (items.length > 0) {
        setSelectedMember(String(items[0].id));
      }
    } catch (error) {
      setMessage(error.userMessage || error.message || 'No se pudieron cargar los miembros');
    } finally {
      setLoadingData(false);
    }
  };

  const loadHistory = async (memberId) => {
    setLoadingData(true);
    try {
      const response = await getMemberHistory(memberId, { limit: 100 });
      const items = normalizeHistory(response);
      setRecords(items);
      setProjectFilter('');
      setProjectDetails(null);
    } catch (error) {
      setMessage(error.userMessage || error.message || 'No se pudo cargar el historial del miembro');
      setRecords([]);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const pending = records.filter((record) => record.status === 'pendiente');
    if (!projectFilter) return pending;
    return pending.filter((record) => String(record.proyectoId || record.projectId || '') === String(projectFilter));
  }, [records, projectFilter]);

  const stats = useMemo(() => {
    const total = records.filter((record) => record.status === 'pendiente').length;
    const validated = records.filter((record) => record.status === 'validada').length;
    const rejected = records.filter((record) => record.status === 'rechazada').length;
    return { total, validated, rejected, pending: total };
  }, [records]);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleValidate = async (recordId, approved, observaciones = null) => {
    try {
      const member = members.find((item) => String(item.id) === String(selectedMember));
      await validateMemberHours(selectedMember, recordId, {
        aprobado: approved,
        observaciones: observaciones || undefined,
      });

      setMessage(approved ? 'Horas validadas exitosamente' : 'Horas rechazadas correctamente');
      await loadHistory(selectedMember);
      setProjectDetails(member ? { name: member.name } : null);
    } catch (error) {
      setMessage(error.userMessage || error.message || 'Error al validar las horas');
    }
  };

  const getProjectName = (record) => record.projectName || record.proyecto?.nombre || 'Proyecto';

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner title="Validar Horas Sociales" subtitle="Acredita las horas trabajadas por los voluntarios" />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-5xl">
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">Validación de Horas</h2>
          <p className="font-inter text-[#64748b]">Selecciona un miembro y revisa sus registros pendientes de aprobación.</p>
        </div>

        {message && (
          <div className="mb-6 rounded-lg border border-[#c7f9e2] bg-[#ecfdf5] px-4 py-3 text-[#0f766e] font-inter">
            {message}
          </div>
        )}

        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Search size={20} className="text-[#0d9488]" />
            <h3 className="font-poppins font-bold text-xl text-[#1f2937]">Seleccionar Miembro</h3>
          </div>
          <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="input-field" disabled={loadingData}>
            <option value="">Seleccione un miembro</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} {member.email ? `(${member.email})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center"><User size={20} className="text-[#0d9488]" /></div>
              <div><p className="font-inter text-xs text-[#64748b]">Pendientes</p><p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.pending}</p></div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle size={20} className="text-green-600" /></div>
              <div><p className="font-inter text-xs text-[#64748b]">Validadas</p><p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.validated}</p></div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><XCircle size={20} className="text-red-600" /></div>
              <div><p className="font-inter text-xs text-[#64748b]">Rechazadas</p><p className="font-poppins font-bold text-xl text-[#1f2937]">{stats.rejected}</p></div>
            </div>
          </div>
        </div>

        {selectedMember && (
          <div className="space-y-4">
            {loadingData && records.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0d9488] mx-auto mb-4" />
                <p className="font-inter text-[#64748b]">Cargando historial...</p>
              </div>
            ) : filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <div key={record.id} className="card p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-[#0d9488] flex items-center justify-center">
                          <User size={24} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-poppins font-bold text-lg text-[#1f2937]">{record.memberName}</h4>
                          <p className="font-inter text-sm text-[#64748b]">{record.memberEmail}</p>
                        </div>
                        <div className="ml-auto lg:ml-4 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                          <Clock size={14} /> Pendiente
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-[#64748b]"><Calendar size={16} /><span className="font-inter">{formatDate(record.date)}</span></div>
                        <div className="flex items-center gap-2 text-[#64748b]"><FolderKanban size={16} /><span className="font-inter">{getProjectName(record)}</span></div>
                        <div className="flex items-center gap-2 text-[#64748b]"><Clock size={16} /><span className="font-inter">{Number(record.hours).toFixed(1)} horas</span></div>
                        <div className="flex items-center gap-2 text-[#64748b]"><AlertCircle size={16} /><span className="font-inter">{record.descripcion || 'Sin descripción'}</span></div>
                      </div>
                    </div>

                    <div className="flex flex-col lg:flex-col gap-3 lg:w-64">
                      <button onClick={() => handleValidate(record.id, true)} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0d9488] text-white rounded-lg font-inter font-semibold hover:bg-[#0f766e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <CheckCircle size={18} /> Validar
                      </button>
                      <button
                        onClick={() => {
                          const reason = window.prompt('Motivo del rechazo');
                          if (!reason) return;
                          handleValidate(record.id, false, reason);
                        }}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg font-inter font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={18} /> Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="card p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Clock size={40} className="text-[#64748b]" />
                </div>
                <h3 className="font-poppins font-bold text-xl text-[#1f2937] mb-2">No hay horas pendientes</h3>
                <p className="font-inter text-[#64748b]">Este miembro no tiene registros pendientes de validación.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ValidarHoras;