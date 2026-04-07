import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { FileText, Download, Calendar, PieChart, BarChart3, FileSpreadsheet, Printer, AlertCircle, Clock, DollarSign, TrendingUp, Search, RefreshCcw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getFinancialSummary, listTransactions } from '../../services/financeService';
import authService from '../../services/authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

const ReportesFinancieros = () => {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const [organizationId, setOrganizationId] = useState(resolveOrganizationId(currentUser));

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('general');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [format, setFormat] = useState('pdf');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    setError('');

    try {
      let resolvedOrganizationId = organizationId;

      if (!resolvedOrganizationId) {
        const sessionUser = await authService.checkSession();
        resolvedOrganizationId = resolveOrganizationId(sessionUser);

        if (!resolvedOrganizationId) {
          const profileResponse = await fetch(`${API_URL}/profile`, {
            method: 'GET',
            headers: authService.authHeaders(),
          });

          if (profileResponse.ok) {
            const profilePayload = await profileResponse.json().catch(() => ({}));
            resolvedOrganizationId = profilePayload?.data?.profile?.organizationId
              || profilePayload?.data?.profile?.organization_id
              || '';
          }
        }

        if (resolvedOrganizationId && resolvedOrganizationId !== organizationId) {
          setOrganizationId(resolvedOrganizationId);
        }
      }

      if (!resolvedOrganizationId) {
        throw new Error('No se pudo resolver la organización para cargar el reporte');
      }

      const [summaryResponse, transactionsResponse] = await Promise.all([
        getFinancialSummary({ organizacionId: resolvedOrganizationId }),
        listTransactions({ organizacionId: resolvedOrganizationId, limit: 200 }),
      ]);

      setSummary(summaryResponse?.data?.summary || summaryResponse?.summary || summaryResponse?.data || null);

      const transactionItems = Array.isArray(transactionsResponse?.data?.transacciones)
        ? transactionsResponse.data.transacciones
        : Array.isArray(transactionsResponse?.data)
          ? transactionsResponse.data
          : [];

      setTransactions(transactionItems.map((transaction) => ({
        ...transaction,
        type: transaction.tipo || transaction.type,
        description: transaction.concepto || transaction.description,
        amount: Number(transaction.monto || transaction.amount || 0),
        date: transaction.fecha || transaction.date,
        category: transaction.categoria || transaction.category || 'Sin categoría',
      })));
    } catch (apiError) {
      setError(apiError.userMessage || apiError.message || 'No fue posible cargar el resumen financiero');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount || 0));

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredTransactions = useMemo(() => transactions.filter((transaction) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;
    return (transaction.description || '').toLowerCase().includes(search)
      || (transaction.category || '').toLowerCase().includes(search);
  }), [transactions, searchTerm]);

  const summaryCards = useMemo(() => {
    const ingresos = summary?.ingresos ?? summary?.totalIngresos ?? summary?.income ?? 0;
    const egresos = summary?.egresos ?? summary?.totalEgresos ?? summary?.expenses ?? 0;
    const balance = summary?.balance ?? summary?.saldo ?? summary?.saldoActual ?? (ingresos - egresos);
    return [
      { title: 'Ingresos', value: formatCurrency(ingresos), icon: TrendingUp, color: 'bg-green-100 text-green-600' },
      { title: 'Egresos', value: formatCurrency(egresos), icon: ArrowDownRight, color: 'bg-red-100 text-red-600' },
      { title: 'Saldo', value: formatCurrency(balance), icon: DollarSign, color: 'bg-teal-100 text-teal-600' },
      { title: 'Movimientos', value: String(summary?.movimientos ?? summary?.transactions ?? transactions.length), icon: BarChart3, color: 'bg-sky-100 text-sky-600' },
    ];
  }, [summary, transactions]);

  const handleGenerateReport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      setError('Seleccione un rango de fechas para generar el reporte');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const payload = {
        organizationId,
        reportType,
        dateRange,
        format,
        generatedAt: new Date().toISOString(),
        summary,
        transactions: filteredTransactions,
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-financiero-${reportType}-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-financiero-${reportType}-${new Date().toISOString().slice(0, 10)}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (apiError) {
      setError(apiError.userMessage || apiError.message || 'Error al generar el reporte');
    } finally {
      setGenerating(false);
    }
  };

  const reportTitle = reportType === 'general'
    ? 'Reporte Financiero General'
    : reportType === 'member'
      ? 'Reporte Financiero por Miembro'
      : 'Reporte Financiero por Proyecto';

  const reportDescription = reportType === 'general'
    ? 'Resumen consolidado de ingresos, egresos y saldo actual.'
    : reportType === 'member'
      ? 'Vista de apoyo para reportar la participación de un voluntario.'
      : 'Resumen de movimientos asociados a un proyecto específico.';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#0d9488] mx-auto mb-4" />
          <p className="font-inter text-[#64748b]">Cargando reporte financiero...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner title="Generar Reportes" subtitle="Crea reportes financieros con los datos reales de caja" />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-6xl">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">Centro de Reportes</h2>
            <p className="font-inter text-[#64748b]">Resumen y exportación de movimientos financieros de la organización</p>
          </div>
          <div className="flex gap-3">
            <button onClick={loadReportData} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e2e8f0] rounded-lg font-inter font-semibold text-[#64748b] hover:bg-[#f8faf9] transition-colors"><RefreshCcw size={18} />Actualizar</button>
            <button onClick={handleGenerateReport} className="flex items-center gap-2 px-4 py-2 bg-[#0d9488] text-white rounded-lg font-inter font-semibold hover:bg-[#0f766e] transition-colors" disabled={generating}><Download size={18} />{generating ? 'Generando...' : 'Descargar'}</button>
          </div>
        </div>

        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-inter">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {summaryCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div key={card.title} className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-inter text-sm text-[#64748b]">{card.title}</p>
                    <p className="font-poppins font-bold text-2xl text-[#1f2937] mt-1">{card.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${card.color}`}><IconComponent size={22} /></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4"><FileText size={20} className="text-[#0d9488]" /><h3 className="font-poppins font-bold text-xl text-[#1f2937]">Configuración del Reporte</h3></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className="block font-poppins font-semibold text-[#1f2937] mb-2">Fecha inicial</span>
                  <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange((current) => ({ ...current, startDate: e.target.value }))} className="input-field" />
                </label>
                <label className="block">
                  <span className="block font-poppins font-semibold text-[#1f2937] mb-2">Fecha final</span>
                  <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange((current) => ({ ...current, endDate: e.target.value }))} className="input-field" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <label className="block">
                  <span className="block font-poppins font-semibold text-[#1f2937] mb-2">Tipo</span>
                  <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="input-field">
                    <option value="general">General</option>
                    <option value="member">Por Miembro</option>
                    <option value="project">Por Proyecto</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block font-poppins font-semibold text-[#1f2937] mb-2">Formato</span>
                  <select value={format} onChange={(e) => setFormat(e.target.value)} className="input-field">
                    <option value="pdf">PDF</option>
                    <option value="xlsx">Excel</option>
                    <option value="json">JSON</option>
                  </select>
                </label>
                <div className="block">
                  <span className="block font-poppins font-semibold text-[#1f2937] mb-2">Organización</span>
                  <div className="input-field bg-[#f8faf9] flex items-center gap-2 text-[#64748b]"><Clock size={16} />{organizationId || (loading ? 'Resolviendo...' : 'No disponible')}</div>
                </div>
              </div>

              <div className="border-t border-[#e2e8f0] pt-4">
                <div className="flex items-center gap-2 mb-2"><Calendar size={16} className="text-[#0d9488]" /><span className="font-poppins font-semibold text-[#1f2937]">Vista previa</span></div>
                <h4 className="font-poppins font-bold text-lg text-[#1f2937]">{reportTitle}</h4>
                <p className="font-inter text-[#64748b] mt-1">{reportDescription}</p>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><PieChart size={20} className="text-[#0d9488]" /><h3 className="font-poppins font-bold text-xl text-[#1f2937]">Movimientos recientes</h3></div>
                <span className="font-inter text-sm text-[#64748b]">{filteredTransactions.length} registros</span>
              </div>

              <div className="relative w-full md:w-72 mb-4">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                <input type="text" placeholder="Buscar movimiento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-10" />
              </div>

              <div className="divide-y divide-[#e2e8f0]">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${transaction.type === 'ingreso' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {transaction.type === 'ingreso' ? <ArrowUpRight size={20} className="text-green-600" /> : <ArrowDownRight size={20} className="text-red-600" />}
                      </div>
                      <div>
                        <p className="font-poppins font-semibold text-[#1f2937]">{transaction.description}</p>
                        <p className="font-inter text-sm text-[#64748b]">{transaction.category} · {formatDate(transaction.date)}</p>
                      </div>
                    </div>
                    <div className={`font-poppins font-bold ${transaction.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'ingreso' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>

              {filteredTransactions.length === 0 && (
                <div className="py-10 text-center text-[#64748b] font-inter">No hay transacciones que coincidan con el filtro actual.</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4"><FileSpreadsheet size={20} className="text-[#0d9488]" /><h3 className="font-poppins font-bold text-xl text-[#1f2937]">Exportar</h3></div>
              <p className="font-inter text-sm text-[#64748b] mb-4">Genera una copia del resumen financiero para archivo o presentación.</p>
              <button onClick={handleGenerateReport} className="w-full btn-primary py-3 flex items-center justify-center gap-2" disabled={generating}><Download size={18} />{generating ? 'Generando...' : 'Descargar reporte'}</button>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4"><AlertCircle size={20} className="text-[#0d9488]" /><h3 className="font-poppins font-bold text-xl text-[#1f2937]">Notas</h3></div>
              <ul className="space-y-3 text-sm font-inter text-[#64748b]">
                <li>El reporte se arma con el resumen financiero real del backend.</li>
                <li>El archivo descargado usa el rango de fechas seleccionado como contexto.</li>
                <li>Si no se puede resolver la organización, el módulo muestra el identificador disponible en sesión.</li>
              </ul>
            </div>

            <div className="card p-6 bg-gradient-to-br from-[#0d9488] to-[#0f766e] text-white">
              <div className="flex items-center gap-2 mb-3"><TrendingUp size={20} /><h3 className="font-poppins font-bold text-xl">Acceso rápido</h3></div>
              <p className="font-inter text-sm text-teal-100 mb-4">Ir a caja o registrar un nuevo movimiento desde aquí.</p>
              <div className="space-y-2">
                <button onClick={() => navigate('/finanzas/caja')} className="w-full rounded-lg bg-white/15 px-4 py-2 text-left hover:bg-white/25 transition-colors">Consultar caja</button>
                <button onClick={() => navigate('/finanzas/ingreso/nuevo')} className="w-full rounded-lg bg-white/15 px-4 py-2 text-left hover:bg-white/25 transition-colors">Registrar ingreso</button>
                <button onClick={() => navigate('/finanzas/egreso/nuevo')} className="w-full rounded-lg bg-white/15 px-4 py-2 text-left hover:bg-white/25 transition-colors">Registrar egreso</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportesFinancieros;