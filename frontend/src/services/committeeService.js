import { apiClient } from './apiClient';

export const getCommittees = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return apiClient.get(`/committees${query ? `?${query}` : ''}`);
};

export const getCommitteeMembers = (committeeId, params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return apiClient.get(`/committees/${committeeId}/members${query ? `?${query}` : ''}`);
};

export const createCommittee = (committeeData) => apiClient.post('/committees', committeeData);

export default {
  getCommittees,
  getCommitteeMembers,
  createCommittee,
};