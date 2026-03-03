import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Camera, Save, X } from 'lucide-react';

const Perfil = () => {
    const navigate = useNavigate();
    const [editando, setEditando] = useState(false);
    const [formData, setFormData] = useState({
        nombre: 'María González',
        correo: 'maria@esperanza.org',
        telefono: '7000-0000',
        rol: 'Líder de Organización',
        organizacion: 'Fundación Esperanza',
        foto: null
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                setErrors(prev => ({
                    ...prev,
                    foto: 'Solo se permiten archivos JPG o PNG'
                }));
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                setErrors(prev => ({
                    ...prev,
                    foto: 'El archivo no debe superar los 2MB'
                }));
                return;
            }
            setFormData(prev => ({ ...prev, foto: file }));
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
            alert('Perfil actualizado exitosamente');
            setEditando(false);
        } catch (error) {
            alert('Error al actualizar perfil: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="card p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-poppins font-bold text-2xl text-text-primary">
                        Mi Perfil
                    </h2>
                    {!editando ? (
                        <button
                            onClick={() => setEditando(true)}
                            className="btn-primary"
                        >
                            Editar Perfil
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setEditando(false);
                                setErrors({});
                            }}
                            className="btn-outline"
                        >
                            Cancelar
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Foto de Perfil */}
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-primary-lighter flex items-center justify-center">
                            {formData.foto ? (
                                <img
                                    src={URL.createObjectURL(formData.foto)}
                                    alt="Foto"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <User size={48} className="text-primary" />
                            )}
                        </div>
                        {editando && (
                            <div>
                                <label className="btn-outline flex items-center gap-2 cursor-pointer">
                                    <Camera size={18} />
                                    Cambiar Foto
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".jpg,.jpeg,.png"
                                        className="hidden"
                                    />
                                </label>
                                {errors.foto && <p className="mt-1 text-sm text-red-500">{errors.foto}</p>}
                            </div>
                        )}
                    </div>

                    {/* Campos */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-text-primary font-inter font-semibold mb-2">
                                Nombre Completo *
                            </label>
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                className={`input-field ${errors.nombre ? 'border-red-500' : ''}`}
                                disabled={!editando}
                            />
                            {errors.nombre && <p className="mt-1 text-sm text-red-500">{errors.nombre}</p>}
                        </div>

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
                                    disabled={!editando}
                                />
                            </div>
                            {errors.correo && <p className="mt-1 text-sm text-red-500">{errors.correo}</p>}
                        </div>

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
                                    disabled={!editando}
                                />
                            </div>
                            {errors.telefono && <p className="mt-1 text-sm text-red-500">{errors.telefono}</p>}
                        </div>

                        <div>
                            <label className="block text-text-primary font-inter font-semibold mb-2">
                                Rol
                            </label>
                            <input
                                type="text"
                                value={formData.rol}
                                className="input-field bg-gray-50"
                                disabled
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-text-primary font-inter font-semibold mb-2">
                                Organización
                            </label>
                            <input
                                type="text"
                                value={formData.organizacion}
                                className="input-field bg-gray-50"
                                disabled
                            />
                        </div>
                    </div>

                    {/* Botones */}
                    {editando && (
                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Save size={18} />
                                {loading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Perfil;