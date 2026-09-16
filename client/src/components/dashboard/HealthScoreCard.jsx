import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HealthScoreCard({ health, onRefresh, refreshing }) {
  const score = health?.score ?? 85;
  const grade = health?.grade || 'B';
  const label = health?.label || 'Good Standing';
  const description = health?.description || 'All core identity records active and monitored.';
  const breakdown = health?.breakdown || {
    expiredPenalty: 0,
    criticalPenalty: 0,
    expiringSoonPenalty: 0,
    unverifiedPenalty: 0
  };

  // Determine stroke color and background based on score
  let strokeColor = '#87AE73'; // Sage / Green
  let gradeBg = '#F2F7F0';
  let gradeBorder = '#C8DEC0';
  let gradeTextColor = '#587948';

  if (score >= 90) {
    strokeColor = '#10B981';
    gradeBg = '#ECFDF5';
    gradeBorder = '#A7F3D0';
    gradeTextColor = '#059669';
  } else if (score >= 75) {
    strokeColor = '#87AE73';
    gradeBg = '#F2F7F0';
    gradeBorder = '#C8DEC0';
    gradeTextColor = '#587948';
  } else if (score >= 50) {
    strokeColor = '#F59E0B';
    gradeBg = '#FFFBEB';
    gradeBorder = '#FDE68A';
    gradeTextColor = '#D97706';
  } else {
    strokeColor = '#EF4444';
    gradeBg = '#FEF2F2';
    gradeBorder = '#FECACA';
    gradeTextColor = '#DC2626';
  }

  // SVG circular gauge calculations
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

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
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background ambient accent */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          backgroundColor: `${strokeColor}10`,
          pointerEvents: 'none'
        }}
      />

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
            Portfolio Compliance Engine
          </span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Document Health Score
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: gradeBg,
              border: `1px solid ${gradeBorder}`,
              color: gradeTextColor
            }}
          >
            GRADE {grade}
          </span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="btn-ghost"
              style={{ padding: '4px', borderRadius: '50%', color: 'var(--text-muted)' }}
              title="Refresh Health Audit"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Center Gauge & Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {/* SVG Circular Progress Gauge */}
        <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
          <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke="#E2E8F0"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke={strokeColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {score}%
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>
              RATING
            </span>
          </div>
        </div>

        {/* Narrative Description */}
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {score >= 75 ? (
              <CheckCircle2 size={16} color={strokeColor} />
            ) : (
              <AlertTriangle size={16} color={strokeColor} />
            )}
            <span>{label}</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.45 }}>
            {description}
          </p>
        </div>
      </div>

      {/* Risk Deduction Breakdown Badges */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '0.9rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '0.5rem'
        }}
      >
        <div style={{ fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted)', display: 'block' }}>Expired Risk:</span>
          <span style={{ fontWeight: 700, color: breakdown.expiredPenalty > 0 ? '#DC2626' : '#059669' }}>
            {breakdown.expiredPenalty > 0 ? `-${breakdown.expiredPenalty}% penalty` : 'None (0%)'}
          </span>
        </div>

        <div style={{ fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted)', display: 'block' }}>Urgent Window:</span>
          <span style={{ fontWeight: 700, color: breakdown.criticalPenalty > 0 ? '#D97706' : '#059669' }}>
            {breakdown.criticalPenalty > 0 ? `-${breakdown.criticalPenalty}% penalty` : 'Clear (0%)'}
          </span>
        </div>

        <div style={{ fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted)', display: 'block' }}>{'Upcoming (<30d):'}</span>
          <span style={{ fontWeight: 700, color: breakdown.expiringSoonPenalty > 0 ? '#D97706' : '#059669' }}>
            {breakdown.expiringSoonPenalty > 0 ? `-${breakdown.expiringSoonPenalty}%` : 'Stable (0%)'}
          </span>
        </div>
      </div>

      {/* Footer Link */}
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <Link
          to="/expiry"
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--brand-dark)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <span>Audit in Expiry Radar</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
