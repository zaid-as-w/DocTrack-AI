import React from 'react';

export default function StatCard({ label, value, subtext, icon: Icon, accentColor, iconBg, iconColor }) {
  return (
    <div
      className="stat-card"
      style={{
        '--card-accent': accentColor || 'var(--brand-primary)',
        '--icon-bg': iconBg || 'var(--brand-light)',
        '--icon-color': iconColor || 'var(--brand-primary)'
      }}
    >
      <div className="stat-icon-wrapper">
        {Icon && <Icon size={24} strokeWidth={2.2} />}
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {subtext && <div className="stat-subtext">{subtext}</div>}
      </div>
    </div>
  );
}
