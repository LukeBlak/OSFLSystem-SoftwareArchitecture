import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
      // Aquí iría la llamada a la API
      // await api.post('/projects', formData);
      
      alert('Proyecto creado exitosamente');
      navigate('/operaciones');
    } catch (error) {
      alert('Error al crear el proyecto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-accent text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Planificar Nuevo Proyecto</h1>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="card p-8">
          <div className="space-y-6">
            {/* Nombre */}
            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Nombre del Proyecto *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Ej: Campaña de Reforestación 2026"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Descripción *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className={`input-field ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Describa los objetivos y alcance del proyecto..."
              />
              {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-text-primary font-semibold mb-2">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`input-field ${errors.startDate ? 'border-red-500' : ''}`}
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>}
              </div>

              <div>
                <label className="block text-text-primary font-semibold mb-2">
                  Fecha de Fin *
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={`input-field ${errors.endDate ? 'border-red-500' : ''}`}
                />
                {errors.endDate && <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>}
              </div>
            </div>

            {/* Presupuesto */}
            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Presupuesto Asignado *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-text-secondary">$</span>
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
              {errors.budget && <p className="mt-1 text-sm text-red-500">{errors.budget}</p>}
            </div>

            {/* Comité */}
            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Comité Responsable *
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
              {errors.committee && <p className="mt-1 text-sm text-red-500">{errors.committee}</p>}
            </div>
          </div>

          {/* Botones */}
          <div className="mt-8 flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/operaciones')}
              className="btn-outline flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-secondary flex-1"
            >
              {loading ? 'Guardando...' : 'Guardar Proyecto'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default PlanificarProyecto;