import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RegistroEgreso = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    amount: '',
    recipient: '',
    date: new Date().toISOString().split('T')[0],
    project: '',
    category: '',
    description: '',
    receipt: null
  });
  const [currentBalance, setCurrentBalance] = useState(0);
  const [projects, setProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const categories = [
    'Materiales',
    'Infraestructura',
    'Transporte',
    'Alimentación',
    'Publicidad',
    'Servicios',
    'Otros'
  ];

  useEffect(() => {
    loadCurrentBalance();
    loadProjects();
  }, []);

  const loadCurrentBalance = async () => {
    // Simulación - En producción sería llamada a API
    setCurrentBalance(12450);
  };

  const loadProjects = async () => {
    // Simulación de datos
    setProjects([
      { id: 1, name: 'Campaña de Reforestación', budget: 5000 },
      { id: 2, name: 'Alfabetización Digital', budget: 3000 }
    ]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Validación en tiempo real del saldo
    if (name === 'amount') {
      const amount = parseFloat(value);
      if (amount > currentBalance) {
        setErrors(prev => ({
          ...prev,
          amount: `El monto excede el saldo disponible ($${currentBalance.toLocaleString()})`
        }));
      }
    }
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
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          receipt: 'El archivo no debe superar los 5MB'
        }));
        return;
      }
      setFormData(prev => ({ ...prev, receipt: file }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    } else if (parseFloat(formData.amount) > currentBalance) {
      newErrors.amount = 'Fondos insuficientes en caja';
    }

    if (!formData.recipient.trim()) {
      newErrors.recipient = 'El destinatario o concepto es obligatorio';
    }

    if (!formData.date) {
      newErrors.date = 'La fecha es obligatoria';
    }

    if (!formData.category) {
      newErrors.category = 'Seleccione una categoría';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    
    try {
      // Preparar datos para envío
      const expenseData = {
        amount: parseFloat(formData.amount),
        recipient: formData.recipient,
        date: formData.date,
        projectId: formData.project || null,
        category: formData.category,
        description: formData.description,
        receiptUrl: formData.receipt ? 'url_del_archivo' : null
      };

      // API call here
      // const formDataToSend = new FormData();
      // Object.keys(expenseData).forEach(key => formDataToSend.append(key, expenseData[key]));
      // if (formData.receipt) formDataToSend.append('receipt', formData.receipt);
      // await api.post('/expenses', formDataToSend);

      alert('Egreso registrado exitosamente');
      navigate('/finanzas/caja');
    } catch (error) {
      alert('Error al registrar el egreso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-red-500 text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Registrar Egreso</h1>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-4xl">
        {/* Saldo Actual */}
        <div className="card bg-gradient-to-r from-red-500 to-red-600 p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm mb-1">Saldo Actual en Caja</p>
              <p className="text-4xl font-bold">{formatCurrency(currentBalance)}</p>
            </div>
            <div className="text-6xl opacity-20">💰</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          <div className="space-y-6">
            {/* Monto */}
            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Monto del Egreso *
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
                  min="0.01"
                  step="0.01"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  ⚠️ {errors.amount}
                </p>
              )}
              <p className="mt-1 text-xs text-text-secondary">
                Saldo disponible: {formatCurrency(currentBalance)}
              </p>
            </div>

            {/* Destinatario/Concepto */}
            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Destinatario o Concepto *
              </label>
              <input
                type="text"
                name="recipient"
                value={formData.recipient}
                onChange={handleChange}
                className={`input-field ${errors.recipient ? 'border-red-500' : ''}`}
                placeholder="Ej: Compra de materiales, Pago de servicio, etc."
              />
              {errors.recipient && (
                <p className="mt-1 text-sm text-red-500">{errors.recipient}</p>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Fecha *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={`input-field ${errors.date ? 'border-red-500' : ''}`}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-500">{errors.date}</p>
              )}
            </div>

            {/* Categoría */}
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
              {errors.category && (
                <p className="mt-1 text-sm text-red-500">{errors.category}</p>
              )}
            </div>

            {/* Proyecto Asociado (Opcional) */}
            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Proyecto Asociado <span className="text-text-secondary">(Opcional)</span>
              </label>
              <select
                name="project"
                value={formData.project}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Sin proyecto asociado</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} (Presupuesto: ${project.budget.toLocaleString()})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-secondary">
                Vincule este gasto a un proyecto específico si aplica
              </p>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Descripción Detallada <span className="text-text-secondary">(Opcional)</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="input-field"
                placeholder="Proporcione más detalles sobre el gasto..."
              />
            </div>

            {/* Comprobante */}
            <div>
              <label className="block text-text-primary font-semibold mb-2">
                Comprobante de Gasto <span className="text-text-secondary">(Opcional)</span>
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="receipt"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.pdf"
                  className="hidden"
                />
                <label htmlFor="receipt" className="cursor-pointer">
                  <div className="text-4xl mb-2">📎</div>
                  <p className="text-text-primary font-semibold mb-1">
                    {formData.receipt ? formData.receipt.name : 'Arrastra o haz clic para subir'}
                  </p>
                  <p className="text-sm text-text-secondary">
                    Formatos permitidos: JPG, PDF (Máx. 5MB)
                  </p>
                </label>
                {errors.receipt && (
                  <p className="mt-2 text-sm text-red-500">{errors.receipt}</p>
                )}
              </div>
            </div>

            {/* Resumen */}
            {formData.amount && !errors.amount && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-semibold mb-1">
                  Resumen de la transacción:
                </p>
                <p className="text-red-700">
                  Se restará <strong>{formatCurrency(parseFloat(formData.amount))}</strong> del saldo actual
                </p>
                <p className="text-red-600 text-sm mt-1">
                  Saldo después del egreso: {formatCurrency(currentBalance - parseFloat(formData.amount))}
                </p>
              </div>
            )}
          </div>

          {/* Botones */}
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
              disabled={loading || parseFloat(formData.amount || 0) > currentBalance}
              className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold 
                       hover:bg-red-600 transition-colors disabled:opacity-50 
                       disabled:cursor-not-allowed flex-1"
            >
              {loading ? 'Registrando...' : 'Registrar Egreso'}
            </button>
          </div>
        </form>

        {/* Alerta de Fondos */}
        {currentBalance < 1000 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <p className="text-yellow-800 font-semibold flex items-center gap-2">
              ⚠️ Saldo Bajo
            </p>
            <p className="text-yellow-700 text-sm mt-1">
              El saldo actual es inferior a $1,000. Considere registrar nuevos ingresos pronto.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default RegistroEgreso;