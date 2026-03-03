import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone } from 'lucide-react';

const RegistroMiembros = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nombre: '',
        correo: '',
        telefono: ''
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
        if (!formData.nombre.trim()) {
            newErrors.nombre = 'El nombre es obligatorio';
        }
        if (!formData.correo.trim() || !/\S+@\S+\.\S+/.test(formData.correo)) {
            newErrors.correo = 'Ingrese un correo válido';
        }
        if (!formData.telefono.trim()) {
            newErrors.telefono = 'El teléfono es obligatorio';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('Miembro registrado exitosamente. Se ha enviado un correo de bienvenida.');
            navigate('/estructura/miembros');
        } catch (error) {
            alert('Error al registrar miembro: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-3xl">
            <div className="mb-8">
                <h2 className="font-poppins font-bold text-2xl text-text-primary mb-2">
                    Registrar Nuevo Miembro
                </h2>
                <p className="font-inter text-text-secondary">
                    Complete los datos del voluntario para incorporarlo a la organización
                </p>
            </div>

            <form onSubmit={handleSubmit} className="card p-8">
                <div className="space-y-6">
                    {/* Nombre */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Nombre Completo *
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                className={`input-field pl-10 ${errors.nombre ? 'border-red-500' : ''}`}
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>
                        {errors.nombre && <p className="mt-1 text-sm text-red-500">{errors.nombre}</p>}
                    </div>

                    {/* Correo */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Correo Electrónico *
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type="email"
                                name="correo"
                                value={formData.correo}
                                onChange={handleChange}
                                className={`input-field pl-10 ${errors.correo ? 'border-red-500' : ''}`}
                                placeholder="juan@ejemplo.org"
                            />
                        </div>
                        {errors.correo && <p className="mt-1 text-sm text-red-500">{errors.correo}</p>}
                        <p className="mt-1 text-xs text-text-secondary">
                            Se enviarán las credenciales de acceso a este correo
                        </p>
                    </div>

                    {/* Teléfono */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Teléfono *
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type="tel"
                                name="telefono"
                                value={formData.telefono}
                                onChange={handleChange}
                                className={`input-field pl-10 ${errors.telefono ? 'border-red-500' : ''}`}
                                placeholder="7000-0000"
                            />
                        </div>
                        {errors.telefono && <p className="mt-1 text-sm text-red-500">{errors.telefono}</p>}
                    </div>
                </div>

                {/* Botones */}
                <div className="mt-8 flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/estructura/miembros')}
                        className="btn-outline flex-1"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary flex-1"
                    >
                        {loading ? 'Registrando...' : 'Registrar Miembro'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegistroMiembros;