import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Files, Sparkles, Users, Activity } from 'lucide-react';

export default function MobileNav() {
  return (
    <nav className="mobile-bottom-nav">
      <div className="mobile-nav-items">
        <NavLink to="/" end className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Home</span>
        </NavLink>

        <NavLink to="/documents" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Files size={20} />
          <span>Docs</span>
        </NavLink>

        <NavLink to="/renewal-assistant" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Sparkles size={20} />
          <span>Renew</span>
        </NavLink>

        <NavLink to="/profiles" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Profiles</span>
        </NavLink>

        <NavLink to="/health" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Activity size={20} />
          <span>Health</span>
        </NavLink>
      </div>
    </nav>
  );
}
