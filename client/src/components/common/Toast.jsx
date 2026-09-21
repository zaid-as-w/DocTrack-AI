import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({
  message,
  type = 'info',
  onClose,
  duration = 4000
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const styles = {
    success: {
      bg: '#ECFDF5',
      border: '#A7F3D0',
      color: '#065F46',
      icon: <CheckCircle size={18} color="#059669" />
    },
    error: {
      bg: '#FEF2F2',
      border: '#FECACA',
      color: '#991B1B',
      icon: <AlertCircle size={18} color="#DC2626" />
    },
    warning: {
      bg: '#FFFBEB',
      border: '#FDE68A',
      color: '#92400E',
      icon: <AlertTriangle size={18} color="#D97706" />
    },
    info: {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      color: '#1E40AF',
      icon: <Info size={18} color="#2563EB" />
    }
  }[type] || {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    color: '#1E40AF',
    icon: <Info size={18} color="#2563EB" />
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.85rem 1.25rem',
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: '10px',
        color: styles.color,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        fontWeight: 500,
        fontSize: '0.9rem',
        maxWidth: '420px'
      }}
    >
      <div style={{ flexShrink: 0 }}>{styles.icon}</div>
      <div style={{ flex: 1, lineHeight: 1.4 }}>{message}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            opacity: 0.7,
            marginLeft: '0.25rem'
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
