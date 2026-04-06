import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    AlertTriangle,
    ClipboardList,
    Loader2,
    ShieldCheck
} from 'lucide-react';
import authService from '../../services/authService';

function Login() {
    const navigate = useNavigate();

    // ✅ Estados del componente
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // ✅ Manejar submit del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Intentar login
            await authService.login(email, password);

            // Login exitoso - obtener usuario y redirigir
            const user = authService.getUser();
            const homePath = authService.getHomeByRole(user?.role) || '/perfil';

            navigate(homePath);

        } catch (err) {
            console.error('Login error:', err);

            // ✅ Mostrar mensaje amigable (userMessage) o técnico (message)
            const displayMessage = err.userMessage || err.message || 'Error al iniciar sesión';
            setError(displayMessage);

        } finally {
            setLoading(false);
        }
    };

    // ✅ Toggle para mostrar/ocultar contraseña
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="min-h-screen  flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                {/* Card Principal */}
                <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg mb-4">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent">
                            SIGEVOL
                        </h1>
                        <p className="text-gray-500 mt-2 text-sm">
                            Sistema de Gestión de Voluntariados
                        </p>
                    </div>

                    {/* Mensaje de error */}
                    {error && (
                        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${error.includes('desactivada')
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span className="flex-1 text-sm font-medium">{error}</span>
                            {error.includes('desactivada') && (
                                <button
                                    onClick={() => window.location.href = '/contacto'}
                                    className="text-xs font-semibold underline hover:no-underline flex-shrink-0 ml-2"
                                >
                                    Contactar
                                </button>
                            )}
                        </div>
                    )}

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Campo Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                Correo Electrónico <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    id="email"
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-800 placeholder-gray-400"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    required
                                    autoComplete="email"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Campo Contraseña */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                                Contraseña <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-800 placeholder-gray-400"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    tabIndex="-1"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Olvidaste tu contraseña */}
                        <div className="flex justify-end">
                            <a
                                href="/recuperar-password"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate('/recuperar-password');
                                }}
                                className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </a>
                        </div>

                        {/* Botón de login */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Iniciando sesión...
                                </>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </form>

                </div>

            </div>
        </div>
    );
}

export default Login;