import axios from 'axios';

// API Base URL - can be overridden by environment variable
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle API responses
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    
    if (error.response?.status === 401) {
      // Clear auth and redirect to home
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
    
    // Create a proper error object with all details
    const errorObj = {
      message: error.response?.data?.message || error.message || 'Network error',
      status: error.response?.status,
      data: error.response?.data,
      ...error.response?.data // Spread any additional error fields
    };
    
    return Promise.reject(errorObj);
  }
);

// User/Handle API
export const userAPI = {
  checkHandle: (handle) => api.get(`/users/check/${handle}`),
  createHandle: (handle) => api.post('/users/create', { handle }),
  authenticate: (handle, secretKey) => api.post('/users/auth', { handle, secretKey }),
  getDirectory: () => api.get('/users/directory'),
};

// Questions API
export const questionsAPI = {
  ask: (handle, text) => api.post(`/questions/${handle}`, { text }),
  getUnanswered: (handle) => api.get(`/questions/${handle}/unanswered`),
  answer: (questionId, answerText) => api.post(`/questions/${questionId}/answer`, { answerText }),
  delete: (questionId) => api.delete(`/questions/${questionId}`),
};

// Answers API
export const answersAPI = {
  getByHandle: (handle, page = 1, limit = 20) => 
    api.get(`/answers/${handle}`, { params: { page, limit } }),
  delete: (answerId) => api.delete(`/answers/${answerId}`),
};

// Stats API
export const statsAPI = {
  getHandleStats: (handle) => api.get(`/stats/${handle}`),
};

export default api; 