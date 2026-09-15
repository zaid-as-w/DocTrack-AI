import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MobileNav from './MobileNav';

export default function AppShell({ healthData }) {
  return (
    <div className="app-container">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="main-viewport">
        {/* Top Navbar */}
        <Navbar healthData={healthData} />

        {/* Dynamic Viewport Content */}
        <main className="page-container">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation (Visible on mobile viewports) */}
        <MobileNav />
      </div>
    </div>
  );
}
