import React from 'react';

export default function StatusPill({ status }) {
  const normalized = (status || '').toUpperCase();

  if (normalized === 'ACTIVE') {
    return (
      <span className="status-pill active">
        <span className="status-dot"></span>
        Active
      </span>
    );
  }

  if (normalized === 'EXPIRING_SOON') {
    return (
      <span className="status-pill expiring">
        <span className="status-dot"></span>
        Expiring Soon
      </span>
    );
  }

  if (normalized === 'EXPIRED') {
    return (
      <span className="status-pill expired">
        <span className="status-dot"></span>
        Expired
      </span>
    );
  }

  if (normalized === 'PROCESSING' || normalized === 'UPLOADING' || normalized === 'STORED') {
    return (
      <span className="status-pill" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
        <span className="status-dot animate-pulse" style={{ backgroundColor: '#3B82F6' }}></span>
        ⏳ Processing...
      </span>
    );
  }

  if (normalized === 'NO_EXPIRY') {
    return (
      <span className="status-pill" style={{ backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
        <span className="status-dot" style={{ backgroundColor: '#22C55E' }}></span>
        Perpetual / No Expiry
      </span>
    );
  }

  if (normalized === 'NEEDS_VERIFICATION' || normalized === 'NEEDS_REVIEW') {
    return (
      <span className="status-pill" style={{ backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
        <span className="status-dot" style={{ backgroundColor: '#F59E0B' }}></span>
        Needs Review
      </span>
    );
  }

  if (normalized === 'FAILED') {
    return (
      <span className="status-pill" style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
        <span className="status-dot" style={{ backgroundColor: '#EF4444' }}></span>
        Analysis Failed
      </span>
    );
  }

  return (
    <span className="status-pill">
      <span className="status-dot"></span>
      {status || 'Unknown'}
    </span>
  );
}
