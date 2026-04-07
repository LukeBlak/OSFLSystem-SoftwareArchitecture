import { apiClient } from './apiClient';

export const registerIncome = (incomeData) => apiClient.post('/finance/income', incomeData);

export const registerExpense = (expenseData) => apiClient.post('/finance/expense', expenseData);

export const getBalance = (organizacionId, params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();
  const basePath = organizacionId ? `/finance/balance/${organizacionId}` : '/finance/balance';
  return apiClient.get(`${basePath}${query ? `?${query}` : ''}`);
};

export const listTransactions = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return apiClient.get(`/finance/transactions${query ? `?${query}` : ''}`);
};

export const getFinancialSummary = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return apiClient.get(`/finance/summary${query ? `?${query}` : ''}`);
};

export default {
  registerIncome,
  registerExpense,
  getBalance,
  listTransactions,
  getFinancialSummary,
};