import { apiClient } from './apiClient';

export const registerHours = (hoursData) => apiClient.post('/hours/attendance', hoursData);

export const getHoursHistory = (userId, params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return apiClient.get(`/hours/history/${userId}${query ? `?${query}` : ''}`);
};

export const getMyHistory = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return apiClient.get(`/hours/my-history${query ? `?${query}` : ''}`);
};

export const getMemberHistory = (memberId, params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return apiClient.get(`/hours/member/${memberId}/history${query ? `?${query}` : ''}`);
};

export default {
  registerHours,
  getHoursHistory,
  getMyHistory,
  getMemberHistory,
};