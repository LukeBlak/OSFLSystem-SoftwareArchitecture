import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { Building2, Mail, Phone, MapPin, ArrowLeft, Loader } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const RegistroOrganizacion = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        nombre: '',
        tipo: 'ONG',
        descripcion: '',
        direccion: '',
        telefono: '',
        email: ''
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditing);

    useEffect(() => {
        if (isEditing) {
            loadOrganizationData();
        }
    }, [id]);

    const loadOrganizationData = async () => {
        try {
            const response = await fetch(`${API_URL}/organizations/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar los datos de la organización');
            }

            const data = await response.json();
            const org = data.data?.organization || data.data;
            setFormData({
                nombre: org.nombre || '',
                tipo: org.tipo || 'ONG',
                descripcion: org.descripcion || '',
                direccion: org.direccion || '',
                telefono: org.telefono || '',
                email: org.email || ''
            });
        } catch (error) {
            alert('Error: ' + error.message);
            navigate('/admin/organizaciones');
        } finally {
            setPageLoading(false);
        }
    };

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
        if (!formData.descripcion.trim()) {
            newErrors.descripcion = 'La descripción es obligatoria';
        }
        if (!formData.direccion.trim()) {
            newErrors.direccion = 'La dirección es obligatoria';
        }
        if (!formData.telefono.trim()) {
            newErrors.telefono = 'El teléfono es obligatorio';
        }
        if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Ingrese un correo válido';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing ? `${API_URL}/organizations/${id}` : `${API_URL}/organizations`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error en la operación');
            }

            const message = isEditing 
                ? 'Organización actualizada exitosamente'
                : 'Organización registrada exitosamente';
            
            alert(message);
            navigate('/admin/organizaciones');
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen bg-[#f8faf9]">
                <Navbar />
                <main className="container mx-auto px-6 pt-28 pb-12">
                    <div className="flex items-center justify-center py-12">
                        <Loader className="animate-spin text-[#0d9488]" size={32} />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8faf9]">
            <Navbar />

            <main className="container mx-auto px-6 pt-28 pb-12 max-w-3xl">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/admin/organizaciones')}
                    className="flex items-center gap-2 text-[#0d9488] hover:text-[#0a7a73] mb-6 font-inter font-semibold"
                >
                    <ArrowLeft size={18} />
                    Volver
                </button>

                {/* Header */}
                <div className="mb-8">
                    <h2 className="font-poppins font-bold text-2xl text-text-primary mb-2">
                        {isEditing ? 'Editar Organización' : 'Registrar Nueva Organización'}
                    </h2>
                    <p className="font-inter text-text-secondary">
                        {isEditing 
                            ? 'Actualiza los datos de la organización'
                            : 'Complete los datos de la nueva organización'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="card p-8">
                    <div className="space-y-6">
                        {/* Nombre */}
                        <div>
                            <label className="block text-text-primary font-inter font-semibold mb-2">
                                Nombre *
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    className={`input-field pl-10 ${errors.nombre ? 'border-red-500' : ''}`}
                                    placeholder="Ej: Fundación Esperanza"
                                />
                            </div>
                            {errors.nombre && <p className="mt-1 text-sm text-red-500">{errors.nombre}</p>}
                        </div>

                        {/* Tipo */}
                        <div>
                            <label className="block text-text-primary font-inter font-semibold mb-2">
                                Tipo de Organización
                            </label>
                            <select
                                name="tipo"
                                value={formData.tipo}
                                onChange={handleChange}
                                className="input-field"
                            >
                                <option value="ONG">ONG</option>
                                <option value="asociacion">Asociación</option>
                                <option value="fundacion">Fundación</option>
                                <option value="cooperativa">Cooperativa</option>
                            </select>
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

                        {/* Email */}
                        <div>
                            <label className="block text-text-primary font-inter font-semibold mb-2">
                                Email *
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`}
                                    placeholder="contacto@organizacion.org"
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="mt-8 flex gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/organizaciones')}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50
                                     transition-colors font-inter font-semibold text-text-primary"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-[#0d9488] text-white rounded-lg hover:bg-[#0a7a73]
                                     transition-colors font-inter font-semibold disabled:opacity-50 disabled:cursor-not-allowed
                                     flex items-center justify-center gap-2"
                        >
                            {loading && <Loader size={18} className="animate-spin" />}
                            {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Registrar')}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default RegistroOrganizacion;
