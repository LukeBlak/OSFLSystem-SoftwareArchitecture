import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, CreditCard } from 'lucide-react';
import { createMember } from '../../services/memberService';
import authService from '../../services/authService';

const RegistroMiembros = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        dui: '',
        nombre: '',
        email: '',
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
        const normalizedPhone = formData.telefono.replace(/\D/g, '');

        if (!/^\d{8}-\d$/.test(formData.dui.trim())) {
            newErrors.dui = 'Ingrese un DUI valido (formato 00000000-0)';
        }
        if (!formData.nombre.trim()) {
            newErrors.nombre = 'El nombre es obligatorio';
        }
        if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Ingrese un correo valido';
        }
        if (formData.telefono.trim() && normalizedPhone.length !== 8) {
            newErrors.telefono = 'El telefono debe tener 8 digitos';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const sessionUser = authService.getUser() || await authService.checkSession();
            const organizationId = sessionUser?.organizationId
                || sessionUser?.organizacionId
                || sessionUser?.organization_id
                || sessionUser?.organizacion_id
                || '';

            await createMember({
                dui: formData.dui.trim(),
                nombre: formData.nombre.trim(),
                email: formData.email.trim().toLowerCase(),
                telefono: formData.telefono.trim() ? formData.telefono.replace(/\D/g, '') : undefined,
                organizacionId: organizationId || undefined,
            });

            alert('Miembro registrado exitosamente.');
            navigate('/estructura/miembros');
        } catch (error) {
            alert(error?.message || 'Error al registrar miembro');
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
                    {/* DUI */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            DUI *
                        </label>
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type="text"
                                name="dui"
                                value={formData.dui}
                                onChange={handleChange}
                                className={`input-field pl-10 ${errors.dui ? 'border-red-500' : ''}`}
                                placeholder="00000000-0"
                            />
                        </div>
                        {errors.dui && <p className="mt-1 text-sm text-red-500">{errors.dui}</p>}
                    </div>

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
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`}
                                placeholder="juan@ejemplo.org"
                            />
                        </div>
                        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                        <p className="mt-1 text-xs text-text-secondary">
                            Se usara este correo para identificar al miembro
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
                                placeholder="70000000"
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