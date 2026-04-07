import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { getBalance, registerExpense } from '../../services/financeService';
import { getProjects } from '../../services/projectService';
import authService from '../../services/authService';

const resolveOrganizationId = (user) => (
  user?.organizationId
  || user?.organizacionId
  || user?.organization_id
  || user?.organizacion_id
  || user?.profile?.organizationId
  || user?.profile?.organizacionId
  || user?.profile?.organization_id
  || user?.profile?.organizacion_id
  || user?.user_metadata?.organizationId
  || user?.user_metadata?.organizacionId
  || user?.user_metadata?.organization_id
  || user?.user_metadata?.organizacion_id
  || ''
);

const categories = [
  { value: 'materiales', label: 'Materiales' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'alimentacion', label: 'Alimentación' },
  { value: 'publicidad', label: 'Publicidad' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'otro', label: 'Otro' },
];

const RegistroEgreso = () => {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const [organizationId, setOrganizationId] = useState(resolveOrganizationId(currentUser));

  const [formData, setFormData] = useState({
    monto: '',
    concepto: '',
    fecha: new Date().toISOString().split('T')[0],
    proyectoId: '',
    categoria: '',
    metodoPago: 'efectivo',
    numeroComprobante: '',
    comprobanteUrl: '',
    notas: '',
  });
  const [currentBalance, setCurrentBalance] = useState(null);
  const [projects, setProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const hydrateOrganizationId = async () => {
      if (organizationId) return;

      const sessionUser = await authService.checkSession();
      const fallbackOrganizationId = resolveOrganizationId(sessionUser);
      if (fallbackOrganizationId) {
        setOrganizationId(fallbackOrganizationId);
      }
    };

    hydrateOrganizationId();
    loadInitialData();
  }, [organizationId]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      let resolvedOrganizationId = organizationId;

      if (!resolvedOrganizationId) {
        const sessionUser = await authService.checkSession();
        resolvedOrganizationId = resolveOrganizationId(sessionUser);

        if (resolvedOrganizationId) {
          setOrganizationId(resolvedOrganizationId);
        }
      }

      const [balanceResponse, projectsResponse] = await Promise.all([
        getBalance(resolvedOrganizationId || undefined),
        getProjects({ limit: 100 }),
      ]);

      const balanceValue = balanceResponse?.data?.balance?.saldo
        ?? balanceResponse?.data?.balance?.saldoActualOrganizacion
        ?? balanceResponse?.data?.saldo
        ?? balanceResponse?.data?.balance
        ?? 0;
      setCurrentBalance(Number(balanceValue) || 0);

      const projectItems = Array.isArray(projectsResponse?.data)
        ? projectsResponse.data
        : projectsResponse?.data?.projects || projectsResponse?.data || [];

      setProjects(projectItems.map((project) => ({
        ...project,
        name: project.nombre || project.name,
        budget: project.presupuestoasignado ?? project.budget ?? 0,
      })));
    } catch (error) {
      setMessage(error.userMessage || error.message || 'No se pudieron cargar los datos iniciales');
    } finally {
      setLoadingData(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);

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
    if (Number(formData.monto) > currentBalance) nextErrors.monto = 'Fondos insuficientes en caja';
    if (!formData.concepto.trim()) nextErrors.concepto = 'El concepto es obligatorio';
    if (!formData.categoria) nextErrors.categoria = 'Seleccione una categoría';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setMessage('');

    try {
      await registerExpense({
        monto: Number(formData.monto),
        concepto: formData.concepto.trim(),
        fecha: formData.fecha,
        organizacionId: organizationId || undefined,
        categoria: formData.categoria,
        metodoPago: formData.metodoPago,
        numeroComprobante: formData.numeroComprobante || undefined,
        comprobanteUrl: formData.comprobanteUrl || undefined,
        proyectoId: formData.proyectoId || undefined,
        notas: formData.notas || undefined,
      });

      setMessage('Egreso registrado exitosamente');
      navigate('/finanzas/caja');
    } catch (error) {
      setMessage(error.userMessage || error.message || 'Error al registrar el egreso');
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = useMemo(() => projects.find((project) => String(project.id) === String(formData.proyectoId)), [projects, formData.proyectoId]);

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner title="Registrar Egreso" subtitle="Registro de salidas de fondos para la organización" />

      <main className="container mx-auto p-6 max-w-4xl pt-28">
        <div className="mb-8">
          <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">Registrar Egreso</h2>
          <p className="font-inter text-[#64748b]">El monto se valida contra el saldo real de la organización.</p>
        </div>

        {message && <div className="mb-6 rounded-lg border border-[#ffe2e2] bg-[#fff1f2] px-4 py-3 text-[#b91c1c] font-inter">{message}</div>}

        <div className="card bg-gradient-to-r from-red-500 to-red-600 p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm mb-1">Saldo Actual en Caja</p>
              <p className="text-4xl font-bold">{currentBalance === null ? 'Sin sesión' : formatCurrency(currentBalance)}</p>
            </div>
            <div className="text-6xl opacity-20">💰</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-6">
          <div>
            <label className="block text-text-primary font-semibold mb-2">Monto del Egreso *</label>
            <input type="number" name="monto" value={formData.monto} onChange={handleChange} className={`input-field ${errors.monto ? 'border-red-500' : ''}`} placeholder="0.00" min="0.01" step="0.01" />
            {errors.monto && <p className="mt-1 text-sm text-red-500">{errors.monto}</p>}
            <p className="mt-1 text-xs text-text-secondary">Saldo disponible: {currentBalance === null ? 'Sin sesión' : formatCurrency(currentBalance)}</p>
          </div>

          <div>
            <label className="block text-text-primary font-semibold mb-2">Concepto *</label>
            <input type="text" name="concepto" value={formData.concepto} onChange={handleChange} className={`input-field ${errors.concepto ? 'border-red-500' : ''}`} placeholder="Ej: Compra de materiales" />
            {errors.concepto && <p className="mt-1 text-sm text-red-500">{errors.concepto}</p>}
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
            <label className="block text-text-primary font-semibold mb-2">Proyecto Asociado <span className="text-text-secondary">(Opcional)</span></label>
            <select name="proyectoId" value={formData.proyectoId} onChange={handleChange} className="input-field">
              <option value="">Sin proyecto asociado</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name} (Presupuesto: {formatCurrency(project.budget)})</option>)}
            </select>
            {selectedProject && <p className="mt-1 text-xs text-text-secondary">Proyecto seleccionado: {selectedProject.name}</p>}
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

          <div className="flex gap-4 pt-6 border-t border-[#e2e8f0]">
            <button type="button" onClick={() => navigate('/finanzas/caja')} className="btn-outline flex-1">Cancelar</button>
            <button type="submit" disabled={loading || parseFloat(formData.monto || 0) > currentBalance} className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1">
              {loading ? 'Registrando...' : 'Registrar Egreso'}
            </button>
          </div>
        </form>

        {currentBalance < 1000 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <p className="text-yellow-800 font-semibold">⚠️ Saldo Bajo</p>
            <p className="text-yellow-700 text-sm mt-1">El saldo actual es inferior a $1,000. Considere registrar nuevos ingresos pronto.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default RegistroEgreso;