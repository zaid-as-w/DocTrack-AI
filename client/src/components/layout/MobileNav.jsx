import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Files, Sparkles, Users, Receipt } from 'lucide-react';

export default function MobileNav() {
  return (
    <nav className="mobile-bottom-nav">
      <div className="mobile-nav-items">
        <NavLink to="/" end className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Home</span>
        </NavLink>

        <NavLink to="/profiles" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Profiles</span>
        </NavLink>

        <NavLink to="/documents" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Files size={20} />
          <span>Docs</span>
        </NavLink>

        <NavLink to="/warranties" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Receipt size={20} />
          <span>Warranties</span>
        </NavLink>

        <NavLink to="/renewal-assistant" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Sparkles size={20} />
          <span>Assistant</span>
        </NavLink>
      </div>
    </nav>
  );
}
