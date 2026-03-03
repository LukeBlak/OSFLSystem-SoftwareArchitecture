import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        correo: '',
        contrasena: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.correo.trim()) {
            newErrors.correo = 'El correo es obligatorio';
        } else if (!/\S+@\S+\.\S+/.test(formData.correo)) {
            newErrors.correo = 'Ingrese un correo válido';
        }
        if (!formData.contrasena) {
            newErrors.contrasena = 'La contraseña es obligatoria';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            // API call here
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('Inicio de sesión exitoso');
            navigate('/');
        } catch (error) {
            alert('Error al iniciar sesión: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="card w-full max-w-md p-8">
                {/* Logo y Título */}
                <div className="text-center mb-8">
                    <h1 className="font-poppins font-bold text-3xl text-primary-dark mb-2">
                        SIGEVOL
                    </h1>
                    <p className="font-inter text-text-secondary">
                        Sistema de Gestión de Voluntariados
                    </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Correo */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Correo Electrónico *
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                            <input
                                type="email"
                                name="correo"
                                value={formData.correo}
                                onChange={handleChange}
                                className={`input-field pl-10 ${errors.correo ? 'border-red-500' : ''}`}
                                placeholder="tu@organizacion.org"
                            />
                        </div>
                        {errors.correo && <p className="mt-1 text-sm text-red-500">{errors.correo}</p>}
                    </div>

                    {/* Contraseña */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Contraseña *
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="contrasena"
                                value={formData.contrasena}
                                onChange={handleChange}
                                className={`input-field pl-10 pr-10 ${errors.contrasena ? 'border-red-500' : ''}`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {errors.contrasena && <p className="mt-1 text-sm text-red-500">{errors.contrasena}</p>}
                    </div>

                    {/* Olvidaste contraseña */}
                    <div className="text-right">
                        <a href="#" className="text-sm text-primary hover:text-primary-dark font-inter">
                            ¿Olvidaste tu contraseña?
                        </a>
                    </div>

                    {/* Botón Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full"
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>

                {/* Datos de prueba */}
                <div className="mt-6 p-4 bg-stats-lighter rounded-lg">
                    <p className="text-xs text-text-secondary font-inter mb-2">📋 Datos de prueba:</p>
                    <p className="text-xs text-text-primary font-inter">
                        Correo: admin@sigevol.org<br />
                        Contraseña: admin123
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;