import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarInner from '../../components/NavbarInner';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Calendar, Download, RefreshCcw, ArrowUpRight, ArrowDownRight, PiggyBank, FileText, Search } from 'lucide-react';
import { getBalance, listTransactions } from '../../services/financeService';
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

const ConsultarCaja = () => {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const [organizationId, setOrganizationId] = useState(resolveOrganizationId(currentUser));

  const [balance, setBalance] = useState(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [error, setError] = useState('');

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
    loadFinancialData();
    const interval = setInterval(loadFinancialData, 30000);
    return () => clearInterval(interval);
  }, [organizationId]);

  const loadFinancialData = async () => {
    setLoading(true);
    setError('');
    try {
      let resolvedOrganizationId = organizationId;

      if (!resolvedOrganizationId) {
        const sessionUser = await authService.checkSession();
        resolvedOrganizationId = resolveOrganizationId(sessionUser);

        if (resolvedOrganizationId) {
          setOrganizationId(resolvedOrganizationId);
        }
      }

      const [balanceResponse, transactionsResponse] = await Promise.all([
        getBalance(resolvedOrganizationId || undefined),
        listTransactions({ organizacionId: resolvedOrganizationId || undefined, limit: 100 }),
      ]);

      const balanceData = balanceResponse?.data?.balance || balanceResponse?.data || {};
      const saldo = Number(balanceData.saldo ?? balanceData.balance ?? 0);
      const ingresos = Number(balanceData.ingresos ?? 0);
      const egresos = Number(balanceData.egresos ?? 0);

      setBalance(Number.isFinite(saldo) ? saldo : 0);
      setTotalIncome(ingresos);
      setTotalExpenses(egresos);

      const transactions = Array.isArray(transactionsResponse?.data?.transacciones)
        ? transactionsResponse.data.transacciones
        : Array.isArray(transactionsResponse?.data)
          ? transactionsResponse.data
          : [];

      setRecentTransactions(transactions.map((transaction) => ({
        ...transaction,
        type: transaction.tipo || transaction.type,
        description: transaction.concepto || transaction.description,
        amount: Number(transaction.monto || transaction.amount || 0),
        date: transaction.fecha || transaction.date,
        category: transaction.categoria || transaction.category || 'Sin categoría',
        project: transaction.proyecto?.nombre || transaction.project || '',
        receipt: Boolean(transaction.comprobanteUrl || transaction.receipt),
      })));

      setLastUpdate(new Date());
    } catch (apiError) {
      setError(apiError.userMessage || apiError.message || 'Error al cargar los datos financieros');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const filteredTransactions = useMemo(() => recentTransactions.filter((transaction) => {
    const normalizedType = (transaction.type || '').toLowerCase();
    const matchesFilter = filterType === 'all' || normalizedType === filterType;
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
      || (transaction.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [recentTransactions, filterType, searchTerm]);

  const getPercentage = () => {
    if (totalIncome === 0) return 0;
    return Math.round((totalExpenses / totalIncome) * 100);
  };

  const handleDownloadReport = () => {
    const report = {
      balance,
      totalIncome,
      totalExpenses,
      transactions: recentTransactions,
      updatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `caja-financiera-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && recentTransactions.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#0d9488] mx-auto mb-4"></div>
          <p className="font-inter text-[#64748b]">Cargando datos financieros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <NavbarInner title="Consultar Caja" subtitle="Visualiza el saldo y movimientos financieros de la organización en tiempo real" />

      <main className="container mx-auto px-6 pt-28 pb-12 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-poppins font-bold text-3xl text-[#1f2937] mb-2">Estado Financiero</h2>
              <p className="font-inter text-[#64748b]">Consulta el saldo disponible y el historial de transacciones</p>
            </div>
            <div className="flex gap-3">
              <button onClick={loadFinancialData} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e2e8f0] rounded-lg font-inter font-semibold text-[#64748b] hover:bg-[#f8faf9] transition-colors"><RefreshCcw size={18} />Actualizar</button>
              <button onClick={handleDownloadReport} className="flex items-center gap-2 px-4 py-2 bg-[#0d9488] text-white rounded-lg font-inter font-semibold hover:bg-[#0f766e] transition-colors"><Download size={18} />Reporte</button>
            </div>
          </div>
          {lastUpdate && <p className="font-inter text-xs text-[#64748b] mt-2">Última actualización: {lastUpdate.toLocaleTimeString()}</p>}
        </div>

        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-inter">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 bg-gradient-to-br from-[#0d9488] to-[#0f766e] text-white">
            <div className="flex items-center justify-between mb-4"><div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center"><Wallet size={24} className="text-white" /></div><span className="text-xs font-inter text-teal-100 bg-white/10 px-2 py-1 rounded-full">Tiempo Real</span></div>
            <p className="text-teal-100 text-sm font-inter mb-1">Saldo Actual en Caja</p>
            <p className="font-poppins font-bold text-4xl mb-2">{balance === null ? 'Sin sesión' : formatCurrency(balance)}</p>
            <div className="flex items-center gap-2 text-sm text-teal-100"><PiggyBank size={16} /><span>Disponible para gastos</span></div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4"><div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center"><TrendingUp size={24} className="text-green-600" /></div><span className="text-xs font-inter text-green-600 bg-green-50 px-2 py-1 rounded-full">Este Mes</span></div>
            <p className="text-[#64748b] text-sm font-inter mb-1">Total Ingresos</p>
            <p className="font-poppins font-bold text-4xl text-green-600 mb-2">+{formatCurrency(totalIncome)}</p>
            <div className="flex items-center gap-2 text-sm text-[#64748b]"><ArrowUpRight size={16} /><span>Entradas registradas</span></div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4"><div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center"><TrendingDown size={24} className="text-red-600" /></div><span className="text-xs font-inter text-red-600 bg-red-50 px-2 py-1 rounded-full">Este Mes</span></div>
            <p className="text-[#64748b] text-sm font-inter mb-1">Total Egresos</p>
            <p className="font-poppins font-bold text-4xl text-red-600 mb-2">-{formatCurrency(totalExpenses)}</p>
            <div className="flex items-center gap-2 text-sm text-[#64748b]"><ArrowDownRight size={16} /><span>Salidas registradas</span></div>
          </div>
        </div>

        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><DollarSign size={20} className="text-[#0d9488]" /><h3 className="font-poppins font-bold text-xl text-[#1f2937]">Ejecución Presupuestaria</h3></div>
            <span className="font-inter text-sm text-[#64748b]">{getPercentage()}% del total ingresado</span>
          </div>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between"><span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-teal-600 bg-teal-200">Ingresos</span><span className="text-xs font-semibold inline-block text-teal-600">{getPercentage()}%</span></div>
            <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-teal-200"><div style={{ width: `${getPercentage()}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500 transition-all duration-500" /></div>
            <div className="flex justify-between text-sm text-[#64748b] font-inter"><span>Disponible: {balance === null ? 'Sin sesión' : formatCurrency(balance)}</span><span>Ejecutado: {formatCurrency(totalExpenses)}</span></div>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded-lg font-inter text-sm font-semibold transition-colors ${filterType === 'all' ? 'bg-[#0d9488] text-white' : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'}`}>Todos</button>
              <button onClick={() => setFilterType('ingreso')} className={`px-4 py-2 rounded-lg font-inter text-sm font-semibold transition-colors ${filterType === 'ingreso' ? 'bg-[#0d9488] text-white' : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'}`}>Ingresos</button>
              <button onClick={() => setFilterType('egreso')} className={`px-4 py-2 rounded-lg font-inter text-sm font-semibold transition-colors ${filterType === 'egreso' ? 'bg-[#0d9488] text-white' : 'bg-gray-100 text-[#64748b] hover:bg-gray-200'}`}>Egresos</button>
            </div>

            <div className="relative w-full md:w-64">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748b]" />
              <input type="text" placeholder="Buscar transacción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-10" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6 border-b border-[#e2e8f0]"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><FileText size={20} className="text-[#0d9488]" /><h3 className="font-poppins font-bold text-xl text-[#1f2937]">Últimos Movimientos</h3></div><span className="font-inter text-sm text-[#64748b]">{filteredTransactions.length} transacciones</span></div></div>

          <div className="divide-y divide-[#e2e8f0]">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-[#f8faf9] transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${transaction.type === 'ingreso' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {transaction.type === 'ingreso' ? <ArrowUpRight size={24} className="text-green-600" /> : <ArrowDownRight size={24} className="text-red-600" />}
                    </div>
                    <div>
                      <h4 className="font-poppins font-semibold text-[#1f2937]">{transaction.description}</h4>
                      <div className="flex items-center gap-3 text-sm text-[#64748b] mt-1 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar size={14} />{formatDate(transaction.date)}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{transaction.category}</span>
                        {transaction.project && <span className="flex items-center gap-1"><FileText size={14} />{transaction.project}</span>}
                        {transaction.receipt && <span className="flex items-center gap-1 text-[#0d9488]"><Download size={14} />Comprobante</span>}
                      </div>
                    </div>
                  </div>

                  <div className={`text-right ${transaction.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    <p className="font-poppins font-bold text-2xl">{transaction.type === 'ingreso' ? '+' : '-'}{formatCurrency(transaction.amount)}</p>
                    <p className="font-inter text-xs text-[#64748b]">{transaction.type === 'ingreso' ? 'Ingreso' : 'Egreso'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><Search size={40} className="text-[#64748b]" /></div>
              <h3 className="font-poppins font-bold text-xl text-[#1f2937] mb-2">No se encontraron transacciones</h3>
              <p className="font-inter text-[#64748b] mb-4">Intenta con otro término de búsqueda o cambia el filtro.</p>
            </div>
          )}
        </div>

        {balance < 1000 && (
          <div className="card p-6 mt-6 bg-yellow-50 border border-yellow-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0"><Wallet size={24} className="text-yellow-600" /></div>
              <div className="flex-1">
                <h4 className="font-poppins font-bold text-[#1f2937] mb-1">⚠️ Saldo Bajo</h4>
                <p className="font-inter text-sm text-[#64748b]">El saldo actual es inferior a {formatCurrency(1000)}. Considere registrar nuevos ingresos pronto.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <button onClick={() => navigate('/finanzas/ingreso/nuevo')} className="card p-6 hover:bg-green-50 transition-colors border-2 border-transparent hover:border-green-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center"><ArrowUpRight size={24} className="text-green-600" /></div>
              <div className="text-left"><h4 className="font-poppins font-bold text-[#1f2937]">Registrar Ingreso</h4><p className="font-inter text-sm text-[#64748b]">Nueva entrada de fondos o donación</p></div>
            </div>
          </button>

          <button onClick={() => navigate('/finanzas/egreso/nuevo')} className="card p-6 hover:bg-red-50 transition-colors border-2 border-transparent hover:border-red-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center"><ArrowDownRight size={24} className="text-red-600" /></div>
              <div className="text-left"><h4 className="font-poppins font-bold text-[#1f2937]">Registrar Egreso</h4><p className="font-inter text-sm text-[#64748b]">Nueva salida de fondos o gasto</p></div>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};

export default ConsultarCaja;