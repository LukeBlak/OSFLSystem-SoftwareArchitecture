import React, { useState, useEffect } from 'react';

const ConsultarCaja = () => {
  const [balance, setBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadFinancialData();
    // Update every 30 seconds
    const interval = setInterval(loadFinancialData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // Simulación de datos
      const income = 12500;
      const expenses = 4200;
      
      setTotalIncome(income);
      setTotalExpenses(expenses);
      setBalance(income - expenses);
      setLastUpdate(new Date());

      setRecentTransactions([
        {
          id: 1,
          type: 'income',
          description: 'Donación Fundación XYZ',
          amount: 2500,
          date: '2026-03-15',
          category: 'Donación'
        },
        {
          id: 2,
          type: 'expense',
          description: 'Compra de Materiales',
          amount: 450,
          date: '2026-03-14',
          category: 'Gastos Operativos'
        },
        {
          id: 3,
          type: 'income',
          description: 'Evento de Recaudación',
          amount: 1800,
          date: '2026-03-12',
          category: 'Evento'
        },
        {
          id: 4,
          type: 'expense',
          description: 'Alquiler de Espacio',
          amount: 300,
          date: '2026-03-10',
          category: 'Infraestructura'
        }
      ]);
    } catch (error) {
      console.error('Error loading financial data:', error);
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
      <header className="bg-accent text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Consulta de Caja</h1>
          <p className="mt-2 text-purple-200">
            Saldo en tiempo real
          </p>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-6xl">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 border-l-4 border-primary">
            <p className="text-text-secondary text-sm mb-2">Saldo Actual en Caja</p>
            <p className={`text-4xl font-bold ${balance >= 0 ? 'text-primary' : 'text-red-500'}`}>
              {formatCurrency(balance)}
            </p>
            {lastUpdate && (
              <p className="text-xs text-text-secondary mt-2">
                Actualizado: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="card p-6 border-l-4 border-green-500">
            <p className="text-text-secondary text-sm mb-2">Total Ingresos</p>
            <p className="text-4xl font-bold text-green-500">
              {formatCurrency(totalIncome)}
            </p>
          </div>

          <div className="card p-6 border-l-4 border-red-500">
            <p className="text-text-secondary text-sm mb-2">Total Egresos</p>
            <p className="text-4xl font-bold text-red-500">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="card p-6 mb-8">
          <h3 className="text-lg font-bold text-text-primary mb-4">
            Distribución de Fondos
          </h3>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                  Ingresos
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-green-600">
                  {totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-green-200">
              <div 
                style={{ width: `${totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500 transition-all duration-500"
              ></div>
            </div>
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Disponible: {formatCurrency(balance)}</span>
              <span>Ejecutado: {formatCurrency(totalExpenses)}</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-text-primary">
              Últimos Movimientos
            </h2>
          </div>

          <div className="divide-y divide-border">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                      transaction.type === 'income' 
                        ? 'bg-green-100' 
                        : 'bg-red-100'
                    }`}>
                      {transaction.type === 'income' ? '📥' : '📤'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">
                        {transaction.description}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {transaction.category} • {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${
                    transaction.type === 'income' 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConsultarCaja;