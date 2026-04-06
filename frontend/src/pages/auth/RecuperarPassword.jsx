import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function RecuperarPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() || '';
  
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Limpiar estados cuando cambie el token
  useEffect(() => {
    setError(null);
    setSuccess(false);
  }, [token]);

  // Función mejorada para leer errores de la respuesta
  const readErrorMessage = async (response, fallbackMessage) => {
    try {
      // Si la respuesta es exitosa, no hay error que leer
      if (response.ok) return null;
      
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const data = await response.json();
        // Priorizar mensajes amigables para el usuario
        return data?.error?.userMessage || data?.error?.message || data?.message || fallbackMessage;
      }
      
      const text = await response.text();
      return text?.trim() || fallbackMessage;
    } catch (err) {
      console.error('Error parsing error response:', err);
      return fallbackMessage;
    }
  };

  // Paso 1: Solicitar enlace de recuperación
  const handleRequestResetEmail = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('📤 Request forgot-password:', { email });
      
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      console.log('📥 Response status:', response.status);
      
      // ⚠️ IMPORTANTE: Por seguridad, el backend DEBE retornar 200 siempre
      // incluso si el email no está registrado. No mostramos errores de "usuario no encontrado".
      if (!response.ok) {
        const errorMsg = await readErrorMessage(response, 'No se pudo procesar la solicitud');
        console.error('❌ Error en forgot-password:', errorMsg);
        throw new Error(errorMsg);
      }

      // Éxito: mostrar mensaje genérico (sin revelar si el email existe)
      setSuccess(true);
      
    } catch (err) {
      console.error('❌ Exception en forgot-password:', err);
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Establecer nueva contraseña con token válido
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    // Validaciones locales
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      console.log('📤 Request reset-password:', { token: token ? '***' : 'empty' });
      
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: newPassword,
          passwordConfirm: confirmPassword,
        }),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorMsg = await readErrorMessage(response, 'Error al restablecer la contraseña');
        console.error('❌ Error en reset-password:', errorMsg);
        throw new Error(errorMsg);
      }

      setSuccess(true);
      
    } catch (err) {
      console.error('❌ Exception en reset-password:', err);
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  // Vista de éxito
  if (success) {
    const isResetFlow = Boolean(token);
    const successTitle = isResetFlow ? 'Contraseña actualizada' : 'Correo enviado';
    const successMessage = isResetFlow
      ? 'Tu contraseña ha sido restablecida exitosamente. Usa la nueva clave para iniciar sesión.'
      : 'Si el correo está registrado en nuestro sistema, recibirás un enlace para restablecer tu contraseña.';

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{successTitle}</h2>
            <p className="text-gray-600 mb-6">{successMessage}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20">
          
          {/* Header */}
          <div className="text-center mb-6">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <h1 className="text-2xl font-bold text-teal-600">
              Recuperar Contraseña
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              {token ? 'Define tu nueva contraseña' : 'Te enviaremos un enlace para restablecerla'}
            </p>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl border bg-red-50 border-red-200 text-red-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Paso 1: Solicitar enlace (sin token) */}
          {!token && !success && (
            <form onSubmit={handleRequestResetEmail} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-800 placeholder-gray-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando enlace...
                  </>
                ) : (
                  'Enviar enlace de recuperación'
                )}
              </button>
            </form>
          )}

          {/* Paso 2: Nueva Contraseña (con token) */}
          {token && !success && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nueva Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-800 placeholder-gray-400"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNew(!showNew)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" 
                    tabIndex="-1"
                    aria-label={showNew ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmar Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-800 placeholder-gray-400"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    required
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirm(!showConfirm)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex="-1"
                    aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Nueva Contraseña'
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default RecuperarPassword;