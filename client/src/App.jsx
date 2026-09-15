import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import ProfilesPage from './pages/ProfilesPage';
import RenewalAssistantPage from './pages/RenewalAssistantPage';
import WarrantiesPage from './pages/WarrantiesPage';
import ChatbotPage from './pages/ChatbotPage';
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell healthData={healthData} />}>
          <Route index element={<DashboardPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/:id" element={<DocumentDetailPage />} />
          <Route path="profiles" element={<ProfilesPage />} />
          <Route path="renewal-assistant" element={<RenewalAssistantPage />} />
          <Route path="warranties" element={<WarrantiesPage />} />
          <Route path="chatbot" element={<ChatbotPage />} />
          <Route path="health" element={<HealthPage healthData={healthData} onRefresh={fetchHealth} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
