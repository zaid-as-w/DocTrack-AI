import React from 'react';
import { Clock, Calendar, ChevronRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HorizonDistribution({ horizon, totalDocs = 0 }) {
  const h = horizon || {
    expired: 0,
    critical7d: 0,
    urgent30d: 0,
    approaching90d: 0,
    safe90dPlus: 0,
    perpetual: 0
  };

  const total = totalDocs > 0 ? totalDocs : Object.values(h).reduce((sum, v) => sum + v, 0) || 1;

  const getPercent = (count) => {
    return Math.round((count / total) * 100);
  };

  const buckets = [
    { label: 'Expired', count: h.expired, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', sub: '< 0 days' },
    { label: 'Critical', count: h.critical7d, color: '#EA580C', bg: '#FFF7ED', border: '#FFEDD5', sub: '0–7 days' },
    { label: 'Urgent', count: h.urgent30d, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', sub: '8–30 days' },
    { label: 'Approaching', count: h.approaching90d, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', sub: '31–90 days' },
    { label: 'Safe Horizon', count: h.safe90dPlus, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', sub: '90+ days' },
    { label: 'Perpetual', count: h.perpetual, color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE', sub: 'Lifetime' }
  ];

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)'
            }}
          >
            Lifecycle Timeline Analytics
          </span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Expiry Horizon Distribution
          </h3>
        </div>

        <Link
          to="/expiry"
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--brand-dark)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}
        >
          <span>Radar View</span>
          <ChevronRight size={15} />
        </Link>
      </div>

      {/* Multi-Segment Stacked Progress Bar */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            height: '14px',
            borderRadius: 'var(--radius-pill)',
            overflow: 'hidden',
            backgroundColor: '#F1F5F9',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
          }}
        >
          {buckets.map((b, idx) => {
            const pct = (b.count / total) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={idx}
                style={{
                  width: `${pct}%`,
                  backgroundColor: b.color,
                  transition: 'width 0.6s ease'
                }}
                title={`${b.label} (${b.sub}): ${b.count} documents (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '5px' }}>
          <span>Immediate Danger (&lt;7d)</span>
          <span>Mid-Range</span>
          <span>Indefinite / Safe</span>
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem'
        }}
      >
        {buckets.map((b, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: b.bg,
              border: `1px solid ${b.border}`,
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 0.75rem',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {b.label}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {b.sub}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '4px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: b.color }}>
                {b.count}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                ({getPercent(b.count)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
