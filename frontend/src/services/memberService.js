import { apiClient } from './apiClient';

export const getMembers = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return apiClient.get(`/members${query ? `?${query}` : ''}`);
};

export const createMember = (payload) => apiClient.post('/members', payload);

export const validateHours = (memberId, hourId, payload) => apiClient.patch(
  `/members/${memberId}/horas/${hourId}/validate`,
  payload
);

export default {
  getMembers,
  createMember,
  validateHours,
};