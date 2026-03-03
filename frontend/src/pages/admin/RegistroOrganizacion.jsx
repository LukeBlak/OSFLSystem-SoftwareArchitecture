import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Phone, MapPin, User } from 'lucide-react';

const RegistroOrganizacion = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nombreLegal: '',
        descripcion: '',
        direccion: '',
        telefono: '',
        correoLider: '',
        dominio: ''
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
        if (!formData.nombreLegal.trim()) {
            newErrors.nombreLegal = 'El nombre legal es obligatorio';
        }
        if (!formData.descripcion.trim()) {
            newErrors.descripcion = 'La descripción es obligatoria';
        }
        if (!formData.direccion.trim()) {
            newErrors.direccion = 'La dirección es obligatoria';
        }
        if (!formData.telefono.trim()) {
            newErrors.telefono = 'El teléfono es obligatorio';
        }
        if (!formData.correoLider.trim() || !/\S+@\S+\.\S+/.test(formData.correoLider)) {
            newErrors.correoLider = 'Ingrese un correo válido';
        }
        if (!formData.dominio.trim()) {
            newErrors.dominio = 'El dominio es obligatorio';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            alert('Organización registrada exitosamente. Se ha enviado un correo al líder designado.');
            navigate('/estructura/organizaciones');
        } catch (error) {
            alert('Error al registrar organización: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-3xl">
            <div className="mb-8">
                <h2 className="font-poppins font-bold text-2xl text-text-primary mb-2">
                    Registrar Nueva Organización
                </h2>
                <p className="font-inter text-text-secondary">
                    Complete los datos legales y de contacto de la organización
                </p>
            </div>

            <form onSubmit={handleSubmit} className="card p-8">
                <div className="space-y-6">
                    {/* Nombre Legal */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Nombre Legal *
                        </label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type="text"
                                name="nombreLegal"
                                value={formData.nombreLegal}
                                onChange={handleChange}
                                className={`input-field pl-10 ${errors.nombreLegal ? 'border-red-500' : ''}`}
                                placeholder="Ej: Fundación Esperanza"
                            />
                        </div>
                        {errors.nombreLegal && <p className="mt-1 text-sm text-red-500">{errors.nombreLegal}</p>}
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Descripción *
                        </label>
                        <textarea
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={handleChange}
                            rows="4"
                            className={`input-field ${errors.descripcion ? 'border-red-500' : ''}`}
                            placeholder="Describa la misión y objetivos de la organización..."
                        />
                        {errors.descripcion && <p className="mt-1 text-sm text-red-500">{errors.descripcion}</p>}
                    </div>

                    {/* Dirección */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Dirección *
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type="text"
                                name="direccion"
                                value={formData.direccion}
                                onChange={handleChange}
                                className={`input-field pl-10 ${errors.direccion ? 'border-red-500' : ''}`}
                                placeholder="Dirección física completa"
                            />
                        </div>
                        {errors.direccion && <p className="mt-1 text-sm text-red-500">{errors.direccion}</p>}
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

                    {/* Correo Líder */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Correo del Líder *
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type="email"
                                name="correoLider"
                                value={formData.correoLider}
                                onChange={handleChange}
                                className={`input-field pl-10 ${errors.correoLider ? 'border-red-500' : ''}`}
                                placeholder="lider@organizacion.org"
                            />
                        </div>
                        {errors.correoLider && <p className="mt-1 text-sm text-red-500">{errors.correoLider}</p>}
                        <p className="mt-1 text-xs text-text-secondary">
                            Se enviarán las credenciales de acceso a este correo
                        </p>
                    </div>

                    {/* Dominio */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Dominio Asignado *
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type="text"
                                name="dominio"
                                value={formData.dominio}
                                onChange={handleChange}
                                className={`input-field pl-10 ${errors.dominio ? 'border-red-500' : ''}`}
                                placeholder="esperanza"
                            />
                            <span className="absolute right-3 top-1/2 text-text-secondary text-sm">.sigevol.org</span>
                        </div>
                        {errors.dominio && <p className="mt-1 text-sm text-red-500">{errors.dominio}</p>}
                    </div>
                </div>

                {/* Botones */}
                <div className="mt-8 flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/estructura/organizaciones')}
                        className="btn-outline flex-1"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary flex-1"
                    >
                        {loading ? 'Registrando...' : 'Registrar Organización'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegistroOrganizacion;