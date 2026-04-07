import { apiClient } from './apiClient';

export const getProjects = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return apiClient.get(`/projects${query ? `?${query}` : ''}`);
};

export const getProjectById = (projectId) => apiClient.get(`/projects/${projectId}`);

export const createProject = (projectData) => apiClient.post('/projects', projectData);

export const updateProject = (projectId, projectData) => apiClient.put(`/projects/${projectId}`, projectData);

export const assignCommittee = (projectId, comiteId) => apiClient.patch(`/projects/${projectId}/committee`, {
  comiteId,
});

export const updateProjectStatus = (projectId, estado) => apiClient.patch(`/projects/${projectId}/status`, {
  estado,
});

export default {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  updateProjectStatus,
  assignCommittee,
};