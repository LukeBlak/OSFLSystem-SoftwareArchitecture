import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { registerIncome } from '../../services/financeService';
import authService from '../../services/authService';

const categories = [
  { value: 'cuota_miembro', label: 'Cuota de miembro' },
  { value: 'donacion', label: 'Donación' },
  { value: 'evento', label: 'Evento' },
  { value: 'venta', label: 'Venta' },
  { value: 'subvencion', label: 'Subvención' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'otro', label: 'Otro' },
];

const RegistroIngreso = () => {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const [organizationId, setOrganizationId] = useState(currentUser?.organizationId || currentUser?.organizacionId || '');

  const [formData, setFormData] = useState({
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    categoria: '',
    concepto: '',
    metodoPago: 'efectivo',
    numeroComprobante: '',
    comprobanteUrl: '',
    notas: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [hydratingOrganization, setHydratingOrganization] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const hydrateOrganizationId = async () => {
      if (organizationId) return;

      const sessionUser = await authService.checkSession();
      const fallbackOrganizationId = sessionUser?.organizationId || sessionUser?.organizacionId || '';
      if (fallbackOrganizationId) {
        setOrganizationId(fallbackOrganizationId);
      }

      setHydratingOrganization(false);
    };

    hydrateOrganizationId();
    if (organizationId) {
      setHydratingOrganization(false);
    }
  }, [organizationId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));

    if (errors[name]) {
      setErrors((previous) => ({ ...previous, [name]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.monto || Number(formData.monto) <= 0) nextErrors.monto = 'El monto debe ser mayor a 0';
    if (!formData.categoria) nextErrors.categoria = 'Seleccione una categoría';
    if (!formData.concepto.trim()) nextErrors.concepto = 'El concepto es obligatorio';
    if (!organizationId) nextErrors.organizacionId = 'No se pudo identificar la organización del usuario';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setMessage('');

    try {
      await registerIncome({
        monto: Number(formData.monto),
        concepto: formData.concepto.trim(),
        categoria: formData.categoria,
        fecha: formData.fecha,
        organizacionId,
        metodoPago: formData.metodoPago,
        numeroComprobante: formData.numeroComprobante || undefined,
        comprobanteUrl: formData.comprobanteUrl || undefined,
        notas: formData.notas || undefined,
      });

      setMessage('Ingreso registrado exitosamente');
    } catch (error) {
      setMessage(error.userMessage || error.message || 'Error al registrar ingreso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner title="Registrar Ingreso" subtitle="Registro de entradas de fondos para la organización" />

      <main className="container mx-auto p-6 max-w-3xl pt-28">
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">Registrar Ingreso</h2>
          <p className="font-inter text-[#64748b]">El formulario envía los datos exactos que valida el backend.</p>
        </div>

        {hydratingOrganization && (
          <div className="mb-6 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-[#1d4ed8] font-inter">
            Cargando la organización asociada al usuario...
          </div>
        )}

        {errors.organizacionId && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-inter">
            {errors.organizacionId}
          </div>
        )}

        {message && <div className="mb-6 rounded-lg border border-[#c7f9e2] bg-[#ecfdf5] px-4 py-3 text-[#0f766e] font-inter">{message}</div>}

        <form onSubmit={handleSubmit} className="card p-8 space-y-6">
          <div>
            <label className="block text-text-primary font-semibold mb-2">Monto *</label>
            <input type="number" name="monto" value={formData.monto} onChange={handleChange} className={`input-field ${errors.monto ? 'border-red-500' : ''}`} placeholder="0.00" min="0.01" step="0.01" />
            {errors.monto && <p className="mt-1 text-sm text-red-500">{errors.monto}</p>}
          </div>

          <div>
            <label className="block text-text-primary font-semibold mb-2">Fecha *</label>
            <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} className="input-field" />
          </div>

          <div>
            <label className="block text-text-primary font-semibold mb-2">Categoría *</label>
            <select name="categoria" value={formData.categoria} onChange={handleChange} className={`input-field ${errors.categoria ? 'border-red-500' : ''}`}>
              <option value="">Seleccione una categoría</option>
              {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
            {errors.categoria && <p className="mt-1 text-sm text-red-500">{errors.categoria}</p>}
          </div>

          <div>
            <label className="block text-text-primary font-semibold mb-2">Concepto *</label>
            <input type="text" name="concepto" value={formData.concepto} onChange={handleChange} className={`input-field ${errors.concepto ? 'border-red-500' : ''}`} placeholder="Descripción del ingreso" />
            {errors.concepto && <p className="mt-1 text-sm text-red-500">{errors.concepto}</p>}
          </div>

          <div>
            <label className="block text-text-primary font-semibold mb-2">Método de pago</label>
            <select name="metodoPago" value={formData.metodoPago} onChange={handleChange} className="input-field">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="cheque">Cheque</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-text-primary font-semibold mb-2">Número de comprobante</label>
              <input type="text" name="numeroComprobante" value={formData.numeroComprobante} onChange={handleChange} className="input-field" placeholder="000123" />
            </div>

            <div>
              <label className="block text-text-primary font-semibold mb-2">URL del comprobante</label>
              <input type="url" name="comprobanteUrl" value={formData.comprobanteUrl} onChange={handleChange} className="input-field" placeholder="https://..." />
            </div>
          </div>

          <div>
            <label className="block text-text-primary font-semibold mb-2">Notas</label>
            <textarea name="notas" value={formData.notas} onChange={handleChange} rows="3" className="input-field" placeholder="Información adicional..." />
          </div>

          <div className="flex gap-4">
            <button type="button" onClick={() => navigate('/finanzas/caja')} className="btn-outline flex-1">Cancelar</button>
            <button type="submit" disabled={loading || hydratingOrganization} className="btn-primary flex-1">{loading ? 'Guardando...' : hydratingOrganization ? 'Cargando...' : 'Guardar Ingreso'}</button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default RegistroIngreso;