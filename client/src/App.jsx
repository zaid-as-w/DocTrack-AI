import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import ProfilesPage from './pages/ProfilesPage';
import RenewalAssistantPage from './pages/RenewalAssistantPage';
import WarrantiesPage from './pages/WarrantiesPage';
import ChatbotPage from './pages/ChatbotPage';
import ExpiryRadarPage from './pages/ExpiryRadarPage';
import HealthPage from './pages/HealthPage';
import NotFoundPage from './pages/NotFoundPage';
import { checkHealth } from './services/api';

export default function App() {
  const [healthData, setHealthData] = useState(null);

  const fetchHealth = async () => {
    try {
      const data = await checkHealth();
      setHealthData(data);
    } catch {
      setHealthData({ status: 'disconnected', database: 'disconnected' });
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <AuthProvider>
      <ProfileProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Application Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell healthData={healthData} />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="documents/:id" element={<DocumentDetailPage />} />
              <Route path="profiles" element={<ProfilesPage />} />
              <Route path="expiry" element={<ExpiryRadarPage />} />
              <Route path="renewal-assistant" element={<RenewalAssistantPage />} />
              <Route path="warranties" element={<WarrantiesPage />} />
              <Route path="chatbot" element={<ChatbotPage />} />
              <Route path="health" element={<HealthPage healthData={healthData} onRefresh={fetchHealth} />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ProfileProvider>
    </AuthProvider>
  );
}
