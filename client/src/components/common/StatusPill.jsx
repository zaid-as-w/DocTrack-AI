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

  return (
    <span className="status-pill">
      <span className="status-dot"></span>
      {status || 'Unknown'}
    </span>
  );
}
