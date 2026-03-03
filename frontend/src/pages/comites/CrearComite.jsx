import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, FileText, Target } from 'lucide-react';

const CrearComite = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        areaEnfoque: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const areasEnfoque = [
        'Operaciones',
        'Marketing',
        'Administración',
        'Educación',
        'Salud',
        'Medio Ambiente',
        'Desarrollo Comunitario',
        'Otros'
    ];

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
        if (!formData.areaEnfoque) {
            newErrors.areaEnfoque = 'Seleccione un área de enfoque';
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
            alert('Comité creado exitosamente');
            navigate('/estructura/comites');
        } catch (error) {
            alert('Error al crear comité: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-3xl">
            <div className="mb-8">
                <h2 className="font-poppins font-bold text-2xl text-text-primary mb-2">
                    Crear Nuevo Comité
                </h2>
                <p className="font-inter text-text-secondary">
                    Configure un nuevo equipo de trabajo especializado
                </p>
            </div>

            <form onSubmit={handleSubmit} className="card p-8">
                <div className="space-y-6">
                    {/* Nombre */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Nombre del Comité *
                        </label>
                        <div className="relative">
                            <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                className={`input-field pl-10 ${errors.nombre ? 'border-red-500' : ''}`}
                                placeholder="Ej: Logística"
                            />
                        </div>
                        {errors.nombre && <p className="mt-1 text-sm text-red-500">{errors.nombre}</p>}
                        <p className="mt-1 text-xs text-text-secondary">
                            El nombre debe ser único dentro de la organización
                        </p>
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Descripción *
                        </label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 text-text-secondary" size={18} />
                            <textarea
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleChange}
                                rows="4"
                                className={`input-field pl-10 ${errors.descripcion ? 'border-red-500' : ''}`}
                                placeholder="Describa los objetivos y funciones del comité..."
                            />
                        </div>
                        {errors.descripcion && <p className="mt-1 text-sm text-red-500">{errors.descripcion}</p>}
                    </div>

                    {/* Área de Enfoque */}
                    <div>
                        <label className="block text-text-primary font-inter font-semibold mb-2">
                            Área de Enfoque *
                        </label>
                        <div className="relative">
                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                            <select
                                name="areaEnfoque"
                                value={formData.areaEnfoque}
                                onChange={handleChange}
                                className={`input-field pl-10 ${errors.areaEnfoque ? 'border-red-500' : ''}`}
                            >
                                <option value="">Seleccione un área</option>
                                {areasEnfoque.map((area) => (
                                    <option key={area} value={area}>{area}</option>
                                ))}
                            </select>
                        </div>
                        {errors.areaEnfoque && <p className="mt-1 text-sm text-red-500">{errors.areaEnfoque}</p>}
                    </div>
                </div>

                {/* Botones */}
                <div className="mt-8 flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/estructura/comites')}
                        className="btn-outline flex-1"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary flex-1"
                    >
                        {loading ? 'Creando...' : 'Crear Comité'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CrearComite;