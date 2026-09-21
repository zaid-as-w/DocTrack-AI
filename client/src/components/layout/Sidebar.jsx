import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Files,
  Users,
  Sparkles,
  ShieldCheck,
  Receipt,
  MessageSquareText,
  Activity,
  ShieldAlert,
  Clock,
  Bell
} from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <ShieldCheck size={24} strokeWidth={2.5} />
        </div>
        <div>
          <div className="brand-title">
            DocTrack <span>AI</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">Overview</div>
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={19} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/profiles" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Users size={19} />
          <span>Profiles</span>
        </NavLink>

        <NavLink to="/documents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Files size={19} />
          <span>Documents</span>
        </NavLink>

        <NavLink to="/warranties" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Receipt size={19} />
          <span>Warranties</span>
        </NavLink>

        <div className="nav-section-title">Intelligence</div>
        <NavLink to="/expiry" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Clock size={19} />
          <span>Expiry Radar</span>
        </NavLink>

        <NavLink to="/renewal-assistant" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Sparkles size={19} />
          <span>Doc Renewal Assistant</span>
        </NavLink>
      </nav>

      {/* Sidebar Footer with Storage Meter */}
      <div className="sidebar-footer">
        <div className="storage-meter">
          <div className="storage-header">
            <span>Secure Storage</span>
            <span>Local Disk</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: '4.2%' }}></div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Files stored on local server disk
          </div>
        </div>
      </div>
    </aside>
  );
}
