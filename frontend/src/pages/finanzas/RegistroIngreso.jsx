import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RegistroIngreso = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    source: '',
    comment: '',
    receipt: null
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const categories = ['Donación', 'Evento', 'Subvención', 'Otro'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({ 
          ...prev, 
          receipt: 'Solo se permiten archivos JPG o PDF' 
        }));
        return;
      }
      setFormData(prev => ({ ...prev, receipt: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || formData.amount <= 0) {
      setErrors(prev => ({ ...prev, amount: 'El monto debe ser mayor a 0' }));
      return;
    }
    
    if (!formData.category) {
      setErrors(prev => ({ ...prev, category: 'Seleccione una categoría' }));
      return;
    }

    setLoading(true);
    
    try {
      alert('Ingreso registrado exitosamente');
      navigate('/finanzas/caja');
    } catch (error) {
      alert('Error al registrar ingreso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Registrar Ingreso</h1>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="card p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Monto *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-text-secondary">$</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className={`input-field pl-8 ${errors.amount ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Fecha *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Categoría *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`input-field ${errors.category ? 'border-red-500' : ''}`}
              >
                <option value="">Seleccione una categoría</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Fuente {formData.category === 'Otro' && '*'}
              </label>
              <input
                type="text"
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="input-field"
                placeholder="Nombre del donante o actividad"
              />
            </div>

            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Comentario
              </label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                rows="3"
                className="input-field"
                placeholder="Información adicional..."
              />
            </div>

            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Comprobante (Opcional)
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.pdf"
                className="input-field"
              />
              {errors.receipt && <p className="mt-1 text-sm text-red-500">{errors.receipt}</p>}
              <p className="mt-1 text-sm text-text-secondary">
                Formatos permitidos: JPG, PDF
              </p>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/finanzas/caja')}
              className="btn-outline flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Guardando...' : 'Guardar Ingreso'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default RegistroIngreso;
