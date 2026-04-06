import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

function Perfil() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const currentUser = authService.getUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
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

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // 🚨 Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full">
          <p className="text-red-600 font-medium mb-4">⚠️ {error}</p>
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

  // 🎨 Helper para colores de badges según rol
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 p-6 md:p-10">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Mi Perfil</h1>
        <button
          onClick={handleLogout}
          className="bg-white/20 hover:bg-white hover:text-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg border-2 border-white backdrop-blur-sm transition-all duration-300"
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
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${user?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {user?.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          {user?.organizationId && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Organización</label>
              <p className="text-lg font-medium text-gray-800 mt-1">{user.organizationId}</p>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-xl md:col-span-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Último acceso</label>
            <p className="text-lg font-medium text-gray-800 mt-1">
              {user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString('es-ES') : 'Nunca'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4 justify-center">
        <button className="flex-1 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
          Editar Perfil
        </button>
        <button className="flex-1 bg-white hover:bg-teal-50 text-teal-600 border-2 border-teal-600 font-semibold py-3 px-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
          Cambiar Contraseña
        </button>
      </div>
    </div>
  );
}

export default Perfil;