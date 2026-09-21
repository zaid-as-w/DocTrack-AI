import axios from 'axios';

// Normalize API base URL: strip trailing slash and ensure /api endpoint suffix is present
const rawBaseUrl = (import.meta.env.VITE_API_URL || 'https://doctrack-ai.onrender.com/api').trim();
let cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
if (!cleanBaseUrl.endsWith('/api')) {
  cleanBaseUrl += '/api';
}

const api = axios.create({
  baseURL: cleanBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 25000 // 25s allows smooth Render free-tier container wake-ups (cold starts)
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
    const status = error.response?.status || 500;
    const data = error.response?.data || null;

    let message = data?.message || error.message || 'Network error occurred';

    if (status === 401) {
      // Clear token on authentication expiry
      if (data?.code === 'TOKEN_EXPIRED') {
        localStorage.removeItem('doctrack_token');
        message = 'Your session has expired. Please sign in again.';
      }
    } else if (status === 429) {
      message = data?.message || 'Rate limit exceeded. Please wait a moment before trying again.';
    } else if (status === 413) {
      message = 'Uploaded file exceeds the 15MB limit. Please choose a smaller file.';
    } else if (status === 403) {
      message = data?.message || 'Access denied: You do not have permission to access this resource.';
    }

    const customError = {
      message,
      status,
      code: data?.code || 'REQUEST_FAILED',
      errors: data?.errors || [],
      data
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

export const registerUser = async (name, email, password, phone) => {
  const response = await api.post('/auth/register', { name, email, password, phone });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const completeOnboarding = async () => {
  const response = await api.post('/auth/complete-onboarding');
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

export const uploadDocument = async (payload) => {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
  const response = await api.post('/documents/upload', payload, config);
  return response.data;
};

export const getDocumentStatus = async (id) => {
  const response = await api.get(`/documents/${id}/status`);
  return response.data;
};

export const retryDocumentOCR = async (id) => {
  const response = await api.post(`/documents/${id}/retry-ocr`);
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

// Alerts & Notification API methods
export const getAlerts = async (params = {}) => {
  const response = await api.get('/alerts', { params });
  return response.data;
};

export const getAlertSummary = async (profileId = 'all') => {
  const params = profileId && profileId !== 'all' ? { profileId } : {};
  const response = await api.get('/alerts/summary', { params });
  return response.data;
};

export const snoozeAlert = async (id, days = 7) => {
  const response = await api.post(`/alerts/${id}/snooze`, { days });
  return response.data;
};

export const dismissAlert = async (id) => {
  const response = await api.post(`/alerts/${id}/dismiss`);
  return response.data;
};

export const markAlertRead = async (id) => {
  const response = await api.post(`/alerts/${id}/read`);
  return response.data;
};

export const dismissAllAlerts = async (profileId = 'all') => {
  const response = await api.post('/alerts/dismiss-all', { profileId });
  return response.data;
};

export const triggerAlertScan = async () => {
  const response = await api.post('/alerts/scan');
  return response.data;
};

// OCR Engine API methods
export const processOCR = async (payload) => {
  if (payload instanceof FormData) {
    const response = await api.post('/ocr/process', payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
  const response = await api.post('/ocr/process', payload);
  return response.data;
};

export const getOCRTemplates = async () => {
  const response = await api.get('/ocr/templates');
  return response.data;
};

export const getOCRStatus = async () => {
  const response = await api.get('/ocr/status');
  return response.data;
};

// AI Classification API methods
export const classifyDocument = async (payload) => {
  const response = await api.post('/classification/classify', payload);
  return response.data;
};

export const getClassificationCategories = async () => {
  const response = await api.get('/classification/categories');
  return response.data;
};

export const getClassificationStatus = async () => {
  const response = await api.get('/classification/status');
  return response.data;
};

// Warranty Tracking API methods
export const getWarranties = async (params = {}) => {
  const response = await api.get('/warranties', { params });
  return response.data;
};

export const getWarrantyStats = async () => {
  const response = await api.get('/warranties/summary/stats');
  return response.data;
};

export const getWarrantyById = async (id) => {
  const response = await api.get(`/warranties/${id}`);
  return response.data;
};

export const createWarranty = async (warrantyData) => {
  const response = await api.post('/warranties', warrantyData);
  return response.data;
};

export const updateWarranty = async (id, warrantyData) => {
  const response = await api.put(`/warranties/${id}`, warrantyData);
  return response.data;
};

export const deleteWarranty = async (id) => {
  const response = await api.delete(`/warranties/${id}`);
  return response.data;
};

export const getWarrantyClaimGuide = async (id) => {
  const response = await api.get(`/warranties/${id}/claim-guide`);
  return response.data;
};

// Notification & Reminder API methods
export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params });
  return response.data;
};

export const getNotificationSummary = async () => {
  const response = await api.get('/notifications/summary');
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.post('/notifications/mark-all-read');
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

export const sendTestNotification = async (payload) => {
  const response = await api.post('/notifications/test', payload);
  return response.data;
};

export const getReminderHorizon = async () => {
  const response = await api.get('/reminders/horizon');
  return response.data;
};

export const triggerReminderScan = async () => {
  const response = await api.post('/reminders/scan-now');
  return response.data;
};

// AI Chatbot API methods
export const getChatHistory = async () => {
  const response = await api.get('/chat/history');
  return response.data;
};

export const sendChatMessage = async (message) => {
  const response = await api.post('/chat/message', { message });
  return response.data;
};

export const clearChatHistory = async () => {
  const response = await api.delete('/chat/history');
  return response.data;
};

export const getChatSuggestions = async () => {
  const response = await api.get('/chat/suggestions');
  return response.data;
};

// Renewal Assistant API methods
export const getRenewalItems = async () => {
  const response = await api.get('/renewals');
  return response.data;
};

export const getRenewalGuide = async (docId) => {
  const response = await api.get(`/renewals/${docId}`);
  return response.data;
};

export const toggleRenewalStep = async (docId, stepId, completed) => {
  const response = await api.post(`/renewals/${docId}/step-toggle`, { stepId, completed });
  return response.data;
};

// Security & Diagnostics API methods
export const getSecurityOverview = async () => {
  const response = await api.get('/security/overview');
  return response.data;
};

export const getSecurityAuditLogs = async (params = {}) => {
  const response = await api.get('/security/audit-logs', { params });
  return response.data;
};

export default api;





