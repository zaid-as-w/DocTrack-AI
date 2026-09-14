import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function Layout({ healthStatus }) {
  const isHealthy = healthStatus?.status === 'ok';

  return (
    <div className="app-container">
      {/* Sidebar Placeholder */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-badge">DT</div>
          <div>
            <div className="logo-title">DocTrack AI</div>
          </div>
          <span className="logo-tag">v0.1</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            id="nav-dashboard"
          >
            <span>📊</span>
            <span>Dashboard</span>
          </NavLink>
          <div className="nav-item" style={{ opacity: 0.6 }} title="Coming in Iteration 5">
            <span>📁</span>
            <span>Documents (v5)</span>
          </div>
          <div className="nav-item" style={{ opacity: 0.6 }} title="Coming in Iteration 4">
            <span>👥</span>
            <span>Profiles (v4)</span>
          </div>
          <div className="nav-item" style={{ opacity: 0.6 }} title="Coming in Iteration 11">
            <span>🔔</span>
            <span>Notifications (v11)</span>
          </div>
          <div className="nav-item" style={{ opacity: 0.6 }} title="Coming in Iteration 12">
            <span>💬</span>
            <span>Assistant (v12)</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div>Local-First Mode</div>
          <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Offline / No Cloud APIs</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">DocTrack AI — Architecture Skeleton</h1>
          </div>
          <div className="topbar-right">
            <div
              id="connection-badge"
              className={`badge ${isHealthy ? 'badge-success' : 'badge-danger'}`}
            >
              <span className="status-dot"></span>
              <span>{isHealthy ? 'Backend Connected' : 'Connecting / Disconnected'}</span>
            </div>
            <div className="badge badge-warning" style={{ fontWeight: 500 }}>
              Iteration 0: Foundation
            </div>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
