import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MobileNav from './MobileNav';
import FloatingChatWidget from '../common/FloatingChatWidget';

export default function AppShell({ healthData }) {
  return (
    <div className="app-container">
      {/* Skip to Main Content Link for Keyboard and Screen Reader Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Desktop & Tablet Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="main-viewport" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', flex: 1 }}>
        {/* Top Navbar */}
        <Navbar healthData={healthData} />

        {/* Dynamic Viewport Content */}
        <main id="main-content" className="page-container" tabIndex="-1" style={{ flex: 1 }}>
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation (Visible on mobile viewports) */}
        <MobileNav />

        {/* Floating AI Assistant Widget */}
        <FloatingChatWidget />
      </div>
    </div>
  );
}

