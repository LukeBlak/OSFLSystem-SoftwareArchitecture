import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function Perfil() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastAccess, setLastAccess] = useState(null);
  const [profileForm, setProfileForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    direccion: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    loadUserProfile();
    updateLastAccess();
  }, []);

  const loadUserProfile = async () => {
    try {
      const currentUser = authService.getUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      const response = await fetch(`${API_URL}/profile`, {
        method: 'GET',
        headers: authService.authHeaders(),
      });

      const payload = await response.json().catch(() => ({}));

      const profileData = payload?.data?.profile;
      const mergedUser = profileData
        ? {
            ...currentUser,
            id: profileData.id || currentUser.id,
            email: profileData.email || currentUser.email,
            role: profileData.role || currentUser.role,
            profile: profileData.profile || currentUser.profile || {},
            organizationId: profileData.organizationId || currentUser.organizationId || null,
            organizationName: profileData.organizationName || currentUser.organizationName || null,
            isActive: typeof profileData.isActive === 'boolean' ? profileData.isActive : currentUser.isActive,
            createdAt: profileData.createdAt || currentUser.createdAt,
            updatedAt: profileData.updatedAt || currentUser.updatedAt,
          }
        : currentUser;

      setUser(mergedUser);
      localStorage.setItem('user', JSON.stringify(mergedUser));
      
      //Recuperar último acceso guardado en localStorage
      const storedLastAccess = localStorage.getItem(`lastAccess_${currentUser.id || currentUser.email}`);
      if (storedLastAccess) {
        setLastAccess(storedLastAccess);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  // Función para guardar el último acceso en localStorage
  const updateLastAccess = () => {
    const currentUser = authService.getUser();
    if (!currentUser) return;
    
    const now = new Date().toISOString();
    const storageKey = `lastAccess_${currentUser.id || currentUser.email}`;
    
    localStorage.setItem(storageKey, now);
    setLastAccess(now); // ← Guardamos el string ISO directamente
  };

  const openEditForm = () => {
    setActionError('');
    setActionSuccess('');
    setShowPasswordForm(false);
    setProfileForm({
      nombre: user?.profile?.nombre || '',
      apellido: user?.profile?.apellido || '',
      telefono: user?.profile?.telefono || '',
      direccion: user?.profile?.direccion || '',
    });
    setShowEditForm(true);
  };

  const openPasswordForm = () => {
    setActionError('');
    setActionSuccess('');
    setShowEditForm(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      newPasswordConfirm: '',
    });
    setShowPasswordForm(true);
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setActionError('');
    setActionSuccess('');

    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: authService.authHeaders(),
        body: JSON.stringify({ profile: profileForm }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || payload?.message || 'No se pudo actualizar el perfil');
      }

      const updatedProfile = payload?.data?.profile?.profile || profileForm;
      const updatedUser = {
        ...user,
        profile: {
          ...(user?.profile || {}),
          ...updatedProfile,
        },
      };

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setShowEditForm(false);
      setActionSuccess('Perfil actualizado correctamente.');
    } catch (err) {
      setActionError(err.message || 'Error al actualizar el perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    setActionError('');
    setActionSuccess('');

    try {
      if (!authService.getToken()) {
        authService.clearSession();
        navigate('/login');
        throw new Error('Tu sesión no es válida. Inicia sesión nuevamente.');
      }

      if (passwordForm.newPassword !== passwordForm.newPasswordConfirm) {
        throw new Error('Las nuevas contraseñas no coinciden.');
      }

      const response = await fetch(`${API_URL}/profile/change-password`, {
        method: 'PUT',
        headers: authService.authHeaders(),
        body: JSON.stringify(passwordForm),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const backendMessage = payload?.error?.userMessage || payload?.error?.message || payload?.message || '';
        const firstValidationDetail = payload?.error?.details?.errors?.[0]?.message || '';

        if (response.status === 401) {
          const normalizedMessage = String(backendMessage || '').toLowerCase();

          if (normalizedMessage.includes('contraseña actual')) {
            throw new Error('La contraseña actual es incorrecta.');
          }

          authService.clearSession();
          navigate('/login');
          throw new Error('Tu sesión expiró. Inicia sesión nuevamente para cambiar tu contraseña.');
        }

        throw new Error(backendMessage || firstValidationDetail || 'No se pudo cambiar la contraseña');
      }

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        newPasswordConfirm: '',
      });
      setShowPasswordForm(false);
      setActionSuccess('Contraseña actualizada correctamente.');
    } catch (err) {
      setActionError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  // formatear la fecha de último acceso (EXACTO)
  const formatLastAccess = (date) => {
    if (!date) return 'Nunca';
    
    const last = new Date(date);
    
    if (isNaN(last.getTime())) return 'Nunca';
    
    return last.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(',', '');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      authService.clearSession();
      navigate('/login');
    }
  };

  const handleBack = () => {
    const homePath = authService.getHomeByRole(user?.role) || '/';
    navigate(homePath, { replace: true });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full">
          <p className="text-red-600 font-medium mb-4"> {error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  // colores de badges según rol
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'super_admin': return 'bg-amber-100 text-amber-700';
      case 'miembro': return 'bg-blue-100 text-blue-700';
      case 'lider_organizacion':
      case 'lider_comite': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isUserActive = typeof user?.isActive === 'boolean'
    ? user.isActive
    : typeof user?.estadoActivo === 'boolean'
      ? user.estadoActivo
      : true;

  const shouldShowOrganizationCard = String(user?.role || '').toLowerCase() !== 'super_admin';

  return (
    <div className="min-h-screen p-6 md:p-10">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg text-teal-600 hover:bg-teal-100 transition-all duration-300"
            aria-label="Volver a la página anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-teal-600">Mi Perfil</h1>
        </div>
        
        <button
          onClick={handleLogout}
          className="bg-teal-600 hover:bg-white hover:text-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg border-2 border-white backdrop-blur-sm transition-all duration-300"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10 max-w-3xl mx-auto mb-8">
        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <div className="w-28 h-28 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-4xl font-bold text-white border-4 border-gray-100 shadow-lg">
            {user?.profile?.nombre?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-gray-50 p-4 rounded-xl">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</label>
            <p className="text-lg font-medium text-gray-800 mt-1">{user?.profile?.nombre || 'No especificado'}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Apellido</label>
            <p className="text-lg font-medium text-gray-800 mt-1">{user?.profile?.apellido || 'No especificado'}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
            <p className="text-lg font-medium text-gray-800 mt-1 break-all">{user?.email}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</label>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${getRoleBadgeClass(user?.role)}`}>
              {user?.role || 'Sin rol'}
            </span>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</label>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${isUserActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {isUserActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          {shouldShowOrganizationCard && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Organización</label>
              <p className="text-lg font-medium text-gray-800 mt-1 break-words">
                {user?.organizationName || user?.organizationId || 'No asignada'}
              </p>
            </div>
          )}

          {/* Último acceso - FORMATO EXACTO */}
          <div className="bg-gray-50 p-4 rounded-xl md:col-span-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Último acceso
            </label>
            <p className="text-lg font-mono font-medium text-gray-800 mt-1">
              {formatLastAccess(lastAccess)}
            </p>
          </div>
        </div>
      </div>
      {/* Actions */}
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4 justify-center">
        <button
          type="button"
          onClick={openEditForm}
          className="flex-1 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
        >
          Editar Perfil
        </button>
        <button
          type="button"
          onClick={openPasswordForm}
          className="flex-1 bg-white hover:bg-teal-50 text-teal-600 border-2 border-teal-600 font-semibold py-3 px-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
        >
          Cambiar Contraseña
        </button>
      </div>

      {(actionError || actionSuccess) && (
        <div className="max-w-3xl mx-auto mt-4">
          {actionError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-medium">
              {actionError}
            </div>
          )}
          {actionSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 font-medium">
              {actionSuccess}
            </div>
          )}
        </div>
      )}

      {showEditForm && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center px-4">
          <form onSubmit={handleProfileSave} className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-2xl space-y-4">
            <h2 className="text-xl font-bold text-teal-700">Editar Perfil</h2>
            {actionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-medium">
                {actionError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nombre"
                value={profileForm.nombre}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, nombre: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
              />
              <input
                type="text"
                placeholder="Apellido"
                value={profileForm.apellido}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, apellido: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
              />
              <input
                type="text"
                placeholder="Teléfono (8 dígitos)"
                value={profileForm.telefono}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, telefono: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
              />
              <input
                type="text"
                placeholder="Dirección"
                value={profileForm.direccion}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, direccion: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowEditForm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white font-semibold disabled:opacity-60"
              >
                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showPasswordForm && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center px-4">
          <form onSubmit={handlePasswordSave} className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-2xl space-y-4">
            <h2 className="text-xl font-bold text-teal-700">Cambiar Contraseña</h2>
            {actionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-medium">
                {actionError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4">
              <input
                type="password"
                placeholder="Contraseña actual"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                required
              />
              <input
                type="password"
                placeholder="Nueva contraseña"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                required
              />
              <input
                type="password"
                placeholder="Confirmar nueva contraseña"
                value={passwordForm.newPasswordConfirm}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPasswordConfirm: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                required
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white font-semibold disabled:opacity-60"
              >
                {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </div>
      )}

      </div>
  );
}

export default Perfil;