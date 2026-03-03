import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';

const PlanificarProyecto = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: '',
    committee: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const committees = [
    'Medio Ambiente',
    'Educación',
    'Salud',
    'Desarrollo Comunitario'
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
    
    if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!formData.description.trim()) newErrors.description = 'La descripción es obligatoria';
    
    if (!formData.startDate) {
      newErrors.startDate = 'La fecha de inicio es obligatoria';
    } else if (new Date(formData.startDate) < new Date()) {
      newErrors.startDate = 'La fecha debe ser igual o posterior a hoy';
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'La fecha de fin es obligatoria';
    } else if (formData.startDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'La fecha de fin debe ser posterior a la de inicio';
    }
    
    if (!formData.budget || formData.budget <= 0) {
      newErrors.budget = 'El presupuesto debe ser mayor a 0';
    }
    
    if (!formData.committee) newErrors.committee = 'Debe seleccionar un comité';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    
    try {
      // API call here
      alert('Proyecto creado exitosamente');
      navigate('/');
    } catch (error) {
      alert('Error al crear el proyecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner 
        title="Planificar Nuevo Proyecto"
        subtitle="Crea un nuevo proyecto de voluntariado"
      />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-4xl">
        {/* Header de la página */}
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">
            Información del Proyecto
          </h2>
          <p className="font-inter text-[#64748b]">
            Completa todos los campos para registrar el proyecto en el sistema
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          <div className="space-y-6">
            {/* Nombre del Proyecto */}
            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">
                Nombre del Proyecto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Ej: Campaña de Reforestación 2026"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500 font-inter">{errors.name}</p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className={`input-field ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Describa los objetivos y alcance del proyecto..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500 font-inter">{errors.description}</p>
              )}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-poppins font-semibold text-[#1f2937] mb-2">
                  Fecha de Inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`input-field ${errors.startDate ? 'border-red-500' : ''}`}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-500 font-inter">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block font-poppins font-semibold text-[#1f2937] mb-2">
                  Fecha de Fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={`input-field ${errors.endDate ? 'border-red-500' : ''}`}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-500 font-inter">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Presupuesto */}
            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">
                Presupuesto Asignado <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-[#64748b]">$</span>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  className={`input-field pl-8 ${errors.budget ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.budget && (
                <p className="mt-1 text-sm text-red-500 font-inter">{errors.budget}</p>
              )}
              <p className="mt-1 text-xs text-[#64748b] font-inter">
                Presupuesto total disponible para el proyecto
              </p>
            </div>

            {/* Comité Responsable */}
            <div>
              <label className="block font-poppins font-semibold text-[#1f2937] mb-2">
                Comité Responsable <span className="text-red-500">*</span>
              </label>
              <select
                name="committee"
                value={formData.committee}
                onChange={handleChange}
                className={`input-field ${errors.committee ? 'border-red-500' : ''}`}
              >
                <option value="">Seleccione un comité</option>
                {committees.map((committee) => (
                  <option key={committee} value={committee}>
                    {committee}
                  </option>
                ))}
              </select>
              {errors.committee && (
                <p className="mt-1 text-sm text-red-500 font-inter">{errors.committee}</p>
              )}
              <p className="mt-1 text-xs text-[#64748b] font-inter">
                Comité que estará a cargo de la ejecución del proyecto
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mt-8 flex gap-4 pt-6 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-outline flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Guardando...
                </span>
              ) : (
                'Guardar Proyecto'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default PlanificarProyecto;