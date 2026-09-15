import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, Shield, Activity } from 'lucide-react';

export default function Navbar({ healthData }) {
  const navigate = useNavigate();

  const isConnected = healthData?.status === 'ok';

  return (
    <header className="top-navbar">
      {/* Mobile brand (hidden on desktop where sidebar is present) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="brand-icon-wrapper" style={{ width: '34px', height: '34px' }}>
            <Shield size={20} strokeWidth={2.5} />
          </div>
          <span className="brand-title" style={{ fontSize: '1.15rem' }}>
            DocTrack <span>AI</span>
          </span>
          <span className="brand-badge">PROTOTYPE</span>
        </Link>
      </div>

      {/* Global Search */}
      <div className="search-container">
        <Search size={16} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Search passport, RC, policy #..."
          className="search-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              navigate(`/documents?q=${encodeURIComponent(e.target.value.trim())}`);
            }
          }}
        />
        <span className="kbd-shortcut">Ctrl K</span>
      </div>

      {/* Top Navbar Actions */}
      <div className="navbar-actions">
        {/* Backend Health Badge */}
        <Link to="/health" className="health-badge" title="Click to view full-stack system diagnostics">
          <span className="pulse-dot" style={{ backgroundColor: isConnected ? 'var(--brand-primary)' : '#F59E0B' }}></span>
          <span>{isConnected ? 'API Live' : 'API Standby'}</span>
        </Link>

        {/* Quick Upload Button */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/documents')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Upload</span>
        </button>

        {/* Notifications Icon */}
        <button
          type="button"
          className="btn-ghost"
          style={{
            position: 'relative',
            padding: '0.5rem',
            borderRadius: '50%',
            color: 'var(--text-secondary)'
          }}
          title="Notifications"
          onClick={() => navigate('/renewal-assistant')}
        >
          <Bell size={20} />
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--status-expiring-text)',
              border: '2px solid #FFFFFF'
            }}
          />
        </button>

        {/* Profile Pill */}
        <Link to="/profiles" className="user-profile-btn" title="Manage Profiles">
          <div className="user-avatar">Z</div>
          <div className="user-info" style={{ display: 'none' /* visible on desktop via media or layout */ }}>
            <div className="user-name">Zaid</div>
            <div className="user-role">Primary Owner</div>
          </div>
        </Link>
      </div>
    </header>
  );
}
