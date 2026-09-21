import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import ProfilesPage from './pages/ProfilesPage';
import DocRenewalAssistantPage from './pages/DocRenewalAssistantPage';
import WarrantiesPage from './pages/WarrantiesPage';
import ExpiryRadarPage from './pages/ExpiryRadarPage';
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage';
import TermsPage from './pages/legal/TermsPage';
import CookiePolicyPage from './pages/legal/CookiePolicyPage';
import RefundPolicyPage from './pages/legal/RefundPolicyPage';
import LegalNoticePage from './pages/legal/LegalNoticePage';
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

            {/* Public Legal & Compliance Routes */}
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/terms-and-conditions" element={<TermsPage />} />
            <Route path="/cookie-policy" element={<CookiePolicyPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            <Route path="/refunds" element={<RefundPolicyPage />} />
            <Route path="/legal" element={<LegalNoticePage />} />
            <Route path="/impressum" element={<LegalNoticePage />} />

            {/* Onboarding Wizard Route */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

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
              <Route path="warranties" element={<WarrantiesPage />} />
              <Route path="profiles" element={<ProfilesPage />} />
              <Route path="expiry" element={<ExpiryRadarPage />} />
              <Route path="renewal-assistant" element={<DocRenewalAssistantPage />} />
              <Route path="chatbot" element={<DocRenewalAssistantPage />} />
              <Route path="assistant" element={<DocRenewalAssistantPage />} />
              <Route path="reminders" element={<Navigate to="/" replace />} />
              <Route path="notifications" element={<Navigate to="/" replace />} />
              <Route path="health" element={<Navigate to="/" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ProfileProvider>
    </AuthProvider>
  );
}
