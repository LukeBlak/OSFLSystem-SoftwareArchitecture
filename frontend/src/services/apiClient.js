const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthToken = () => localStorage.getItem('token');

const buildHeaders = (options = {}) => {
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const token = getAuthToken();
  if (token && options.withAuth !== false) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseErrorPayload = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return {
    message: text || 'Error inesperado del servidor',
  };
};

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers: buildHeaders(options),
    body: options.body instanceof FormData
      ? options.body
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  if (!response.ok) {
    const errorPayload = await parseErrorPayload(response);
    const error = new Error(
      errorPayload?.error?.message || errorPayload?.message || 'Error en la petición'
    );

    error.status = response.status;
    error.code = errorPayload?.error?.code || errorPayload?.code || 'API_ERROR';
    error.details = errorPayload?.error?.details || errorPayload?.details || null;
    error.payload = errorPayload;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json();
};

export const apiClient = {
  get: (path, options = {}) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => apiRequest(path, { ...options, method: 'DELETE' }),
};

export default apiClient;