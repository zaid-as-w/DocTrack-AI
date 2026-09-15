import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Request interceptor: attach Bearer token if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('doctrack_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for clean error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customError = {
      message: error.response?.data?.message || error.message || 'Network error occurred',
      status: error.response?.status || 500,
      data: error.response?.data || null
    };
    return Promise.reject(customError);
  }
);

// Health check endpoint caller
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Authentication API methods
export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const registerUser = async (name, email, password) => {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Dashboard API methods
export const getDashboardStats = async (profileId = 'all') => {
  const params = profileId && profileId !== 'all' ? { profileId } : {};
  const response = await api.get('/dashboard/stats', { params });
  return response.data;
};

export const getDashboardRecent = async (profileId = 'all', limit = 5) => {
  const params = { limit };
  if (profileId && profileId !== 'all') params.profileId = profileId;
  const response = await api.get('/dashboard/recent', { params });
  return response.data;
};

// Profile API methods
export const getProfiles = async () => {
  const response = await api.get('/profiles');
  return response.data;
};

export const getProfileById = async (id) => {
  const response = await api.get(`/profiles/${id}`);
  return response.data;
};

export const createProfile = async (profileData) => {
  const response = await api.post('/profiles', profileData);
  return response.data;
};

export const updateProfile = async (id, profileData) => {
  const response = await api.put(`/profiles/${id}`, profileData);
  return response.data;
};

export const deleteProfile = async (id) => {
  const response = await api.delete(`/profiles/${id}`);
  return response.data;
};

// Document API methods
export const getDocuments = async (params = {}) => {
  const response = await api.get('/documents', { params });
  return response.data;
};

export const getDocumentById = async (id) => {
  const response = await api.get(`/documents/${id}`);
  return response.data;
};

export const uploadDocument = async (formData) => {
  const response = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const updateDocument = async (id, data) => {
  const response = await api.put(`/documents/${id}`, data);
  return response.data;
};

export const deleteDocument = async (id) => {
  const response = await api.delete(`/documents/${id}`);
  return response.data;
};

// Expiry Engine API methods
export const getExpirySummary = async () => {
  const response = await api.get('/expiry/summary');
  return response.data;
};

export const triggerExpiryScan = async () => {
  const response = await api.post('/expiry/scan');
  return response.data;
};

export default api;

