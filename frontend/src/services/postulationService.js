import { apiClient } from './apiClient';

export const createPostulation = (projectId) => apiClient.post(`/projects/${projectId}/postulations`);

export const getPostulationsByProject = (projectId) => apiClient.get(`/projects/${projectId}/postulations`);

export const updatePostulationStatus = (projectId, postulationId, payload) => apiClient.patch(
  `/projects/${projectId}/postulations/${postulationId}`,
  payload
);

export const getMyPostulations = () => apiClient.get('/postulations/me');

export default {
  createPostulation,
  getPostulationsByProject,
  updatePostulationStatus,
  getMyPostulations,
};