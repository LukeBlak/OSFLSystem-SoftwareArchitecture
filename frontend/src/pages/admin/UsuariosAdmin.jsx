import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import { Search, Users, Loader, ShieldCheck, Plus, Edit2, Trash2, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'lider_organizacion', label: 'Lider Organizacion' },
  { value: 'lider_comite', label: 'Lider Comite' },
  { value: 'miembro', label: 'Miembro' },
];

const emptyForm = {
  email: '',
  password: '',
  role: 'miembro',
  profile: {
    nombre: '',
    apellido: '',
    telefono: '',
    direccion: '',
  },
  organizationId: '',
  isActive: true,
};

const roleLabel = (role) => ROLES.find((item) => item.value === String(role || '').toLowerCase())?.label || role || 'Sin rol';

const UsuariosAdmin = () => {
  const DEFAULT_LIMIT = 15;
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 1,
  });
  const [form, setForm] = useState(emptyForm);
  const organizationNameById = (organizationId) => {
    if (!organizationId) return 'Sin organización';
    return organizations.find((organization) => organization.id === organizationId)?.nombre || organizationId;
  };

  const loadOrganizations = async () => {
    setOrganizationsLoading(true);

    try {
      const response = await fetch(`${API_URL}/organizations?page=1&limit=100`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('No se pudieron obtener las organizaciones');
      }

      const payload = await response.json();
      setOrganizations(payload?.data?.organizations || []);
    } catch (err) {
      setOrganizations([]);
    } finally {
      setOrganizationsLoading(false);
    }
  };

  const loadUsers = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/profile/users?page=${page}&limit=${DEFAULT_LIMIT}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || 'No se pudieron obtener los usuarios');
      }

      const payload = await response.json();
      const usersPayload = payload?.data?.users || [];
      const paginationPayload = payload?.data?.pagination || {};

      const normalized = usersPayload.map((user) => ({
        id: user.id,
        email: user.email || 'Sin email',
        role: user.role || 'miembro',
        estadoActivo: typeof user.isActive === 'boolean' ? user.isActive : true,
        organizacionId: user.organizationId || null,
        profile: user.profile || {},
      }));

      setUsers(normalized);
      setPagination({
        page: Number(paginationPayload.page || page),
        limit: Number(paginationPayload.limit || DEFAULT_LIMIT),
        total: Number(paginationPayload.total || normalized.length),
        totalPages: Math.max(1, Number(paginationPayload.totalPages || 1)),
      });
      setCurrentPage(Number(paginationPayload.page || page));
    } catch (err) {
      const isConnectionError = String(err.message || '').toLowerCase().includes('failed to fetch');
      setError(isConnectionError ? 'No se pudo conectar al backend. Verifica que el servidor esté iniciado en el puerto 3000.' : (err.message || 'Error al cargar usuarios'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
    loadOrganizations();
  }, []);

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === currentPage) {
      return;
    }
    loadUsers(nextPage);
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => (
      String(user.profile?.nombre || '').toLowerCase().includes(q)
      || String(user.email || '').toLowerCase().includes(q)
      || String(user.role || '').toLowerCase().includes(q)
    ));
  }, [users, search]);

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (user) => {
    setMode('edit');
    setEditingId(user.id);
    setForm({
      email: user.email || '',
      password: '',
      role: user.role || 'miembro',
      profile: {
        nombre: user.profile?.nombre || '',
        apellido: user.profile?.apellido || '',
        telefono: user.profile?.telefono || '',
        direccion: user.profile?.direccion || '',
      },
      organizationId: user.organizacionId || '',
      isActive: user.estadoActivo,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setSaving(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateProfileField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!String(form.profile?.nombre || '').trim()) {
        throw new Error('El nombre es obligatorio');
      }

      if (!form.organizationId) {
        throw new Error('La organización es obligatoria');
      }

      const payload = {
        email: form.email.trim().toLowerCase(),
        role: form.role,
        profile: form.profile,
        organizationId: form.organizationId || null,
        isActive: Boolean(form.isActive),
      };

      if (mode === 'create') {
        payload.password = form.password;
      } else if (form.password.trim()) {
        payload.password = form.password;
      }

      if (mode === 'create' && !payload.password) {
        throw new Error('La contraseña es requerida para crear usuarios');
      }

      const response = await fetch(
        mode === 'create' ? `${API_URL}/profile/users` : `${API_URL}/profile/users/${editingId}`,
        {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const payloadError = await response.json().catch(() => ({}));
        throw new Error(payloadError?.message || 'No se pudo guardar el usuario');
      }

      await loadUsers(currentPage);
      closeForm();
    } catch (err) {
      setError(err.message || 'Error al guardar usuario');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/profile/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const payloadError = await response.json().catch(() => ({}));
        throw new Error(payloadError?.message || 'No se pudo eliminar el usuario');
      }

      const shouldGoPrev = users.length === 1 && currentPage > 1;
      const nextPage = shouldGoPrev ? currentPage - 1 : currentPage;
      await loadUsers(nextPage);
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || 'Error al eliminar usuario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Navbar />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-7xl">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="font-poppins font-bold text-3xl text-text-primary mb-2">
              Usuarios del Sistema
            </h1>
            <p className="font-inter text-text-secondary">
              Crea, modifica y elimina usuarios desde el panel administrativo
            </p>
          </div>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-3 bg-[#0d9488] text-white rounded-lg
                     hover:bg-[#0a7a73] transition-colors duration-200 font-inter font-semibold"
          >
            <Plus size={18} />
            Nuevo Usuario
          </button>
        </div>

        <div className="card p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Buscar por nombre, email o rol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading && (
          <div className="card p-10 flex items-center justify-center gap-3">
            <Loader className="animate-spin text-[#0d9488]" size={24} />
            <span className="font-inter text-text-secondary">Cargando usuarios...</span>
          </div>
        )}

        {error && !loading && (
          <div className="card p-4 mb-6 bg-red-50 border border-red-200 text-red-700 font-inter">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left font-inter font-semibold text-text-primary text-sm">Nombre</th>
                    <th className="px-6 py-4 text-left font-inter font-semibold text-text-primary text-sm">Email</th>
                    <th className="px-6 py-4 text-left font-inter font-semibold text-text-primary text-sm">Rol</th>
                    <th className="px-6 py-4 text-left font-inter font-semibold text-text-primary text-sm">Estado</th>
                    <th className="px-6 py-4 text-right font-inter font-semibold text-text-primary text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-text-secondary font-inter">
                        No hay usuarios para mostrar
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-inter text-text-primary">
                          {user.profile?.nombre || 'Sin nombre'}
                        </td>
                        <td className="px-6 py-4 font-inter text-text-secondary">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e6fffb] text-[#0f766e] text-xs font-semibold">
                            <ShieldCheck size={14} />
                            {roleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                            user.estadoActivo ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'
                          }`}>
                            <Users size={14} />
                            {user.estadoActivo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(user)}
                              className="p-2 hover:bg-gray-100 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={18} className="text-[#3b82f6]" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(user)}
                              className="p-2 hover:bg-gray-100 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={18} className="text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="font-inter text-sm text-text-secondary">
                Mostrando página {pagination.page} de {pagination.totalPages} ({pagination.total} usuarios)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-inter font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.totalPages || loading}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-inter font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {formOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-poppins font-bold text-2xl text-text-primary">
                  {mode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
                </h2>
                <p className="font-inter text-text-secondary text-sm">
                  {mode === 'create' ? 'Crea un nuevo acceso al sistema' : 'Modifica los datos del usuario'}
                </p>
              </div>
              <button onClick={closeForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Email *</label>
                  <input
                    type="email"
                    className="input-field"
                    value={form.email}
                    onChange={(e) => updateFormField('email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Contraseña {mode === 'create' ? '*' : '(opcional)'}</label>
                  <input
                    type="password"
                    className="input-field"
                    value={form.password}
                    onChange={(e) => updateFormField('password', e.target.value)}
                    required={mode === 'create'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Rol *</label>
                  <select
                    className="input-field"
                    value={form.role}
                    onChange={(e) => updateFormField('role', e.target.value)}
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Organización *</label>
                  <select
                    className="input-field"
                    value={form.organizationId}
                    onChange={(e) => updateFormField('organizationId', e.target.value)}
                    disabled={organizationsLoading}
                    required
                  >
                    <option value="" disabled>Seleccione una organización</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Nombre *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.profile.nombre}
                    onChange={(e) => updateProfileField('nombre', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Apellido</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.profile.apellido}
                    onChange={(e) => updateProfileField('apellido', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Teléfono</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.profile.telefono}
                    onChange={(e) => updateProfileField('telefono', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Dirección</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.profile.direccion}
                    onChange={(e) => updateProfileField('direccion', e.target.value)}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm font-inter text-text-primary">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateFormField('isActive', e.target.checked)}
                />
                Usuario activo
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-inter font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-[#0d9488] text-white rounded-lg hover:bg-[#0a7a73] font-inter font-semibold disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : (mode === 'create' ? 'Crear usuario' : 'Guardar cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="font-poppins font-bold text-xl text-text-primary mb-3">
              Eliminar usuario
            </h2>
            <p className="font-inter text-text-secondary mb-6">
              ¿Deseas eliminar a {deleteTarget.email}? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-inter font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-inter font-semibold disabled:opacity-50"
              >
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosAdmin;
