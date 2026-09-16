import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  Clock,
  CheckCircle2,
  BellOff,
  ChevronDown,
  Sparkles,
  ExternalLink,
  RefreshCw,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { snoozeAlert, dismissAlert, dismissAllAlerts, triggerAlertScan } from '../../services/api';

export default function AlertsFeed({ alerts: initialAlerts = [], onAlertUpdated, profileId = 'all' }) {
  const navigate = useNavigate();
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [alerts, setAlerts] = useState(initialAlerts);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeSnoozeMenu, setActiveSnoozeMenu] = useState(null);

  React.useEffect(() => {
    setAlerts(initialAlerts);
  }, [initialAlerts]);

  const filteredAlerts = alerts.filter(a => {
    if (filterSeverity === 'all') return true;
    return a.severity === filterSeverity;
  });

  const handleSnooze = async (alertId, days) => {
    setActionLoading(alertId);
    setActiveSnoozeMenu(null);
    try {
      await snoozeAlert(alertId, days);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      if (onAlertUpdated) onAlertUpdated();
    } catch (err) {
      console.error('Failed to snooze alert:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (alertId) => {
    setActionLoading(alertId);
    try {
      await dismissAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      if (onAlertUpdated) onAlertUpdated();
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismissAll = async () => {
    if (!window.confirm('Dismiss all active alerts for this view?')) return;
    try {
      await dismissAllAlerts(profileId);
      setAlerts([]);
      if (onAlertUpdated) onAlertUpdated();
    } catch (err) {
      console.error('Failed to dismiss all alerts:', err);
    }
  };

  const handleScan = async () => {
    try {
      const res = await triggerAlertScan();
      if (res.success && res.data) {
        setAlerts(res.data);
      }
      if (onAlertUpdated) onAlertUpdated();
    } catch (err) {
      console.error('Failed to trigger scan:', err);
    }
  };

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
        gap: '1.25rem'
      }}
    >
      {/* Header with Severity Tabs & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
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
            Real-Time Alert Hub
          </span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            System Attention Alerts
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleScan}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}
            title="Scan documents for new alerts"
          >
            <RefreshCw size={13} />
            <span>Audit Scan</span>
          </button>

          {alerts.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDismissAll}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#DC2626' }}
            >
              <BellOff size={13} />
              <span>Dismiss All</span>
            </button>
          )}
        </div>
      </div>

      {/* Severity Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        {[
          { id: 'all', label: 'All Alerts', count: alerts.length },
          { id: 'CRITICAL', label: 'Critical', count: alerts.filter(a => a.severity === 'CRITICAL').length, color: '#DC2626' },
          { id: 'WARNING', label: 'Warning', count: alerts.filter(a => a.severity === 'WARNING').length, color: '#D97706' },
          { id: 'INFO', label: 'Info', count: alerts.filter(a => a.severity === 'INFO').length, color: '#2563EB' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterSeverity(tab.id)}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              border: filterSeverity === tab.id ? '1px solid var(--brand-primary)' : '1px solid transparent',
              backgroundColor: filterSeverity === tab.id ? 'var(--brand-light)' : 'transparent',
              color: filterSeverity === tab.id ? 'var(--brand-dark)' : 'var(--text-secondary)',
              fontWeight: filterSeverity === tab.id ? 700 : 500,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: tab.color ? `${tab.color}15` : '#E2E8F0',
                color: tab.color || 'var(--text-secondary)',
                fontWeight: 700
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredAlerts.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-light)'
            }}
          >
            <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              No Active Alerts
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
              {filterSeverity === 'all'
                ? 'All monitored documents are in healthy standing.'
                : `No ${filterSeverity.toLowerCase()} alerts requiring immediate attention.`}
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            let badgeBg = '#FEF2F2';
            let badgeBorder = '#FECACA';
            let badgeColor = '#DC2626';
            let IconComponent = ShieldAlert;

            if (alert.severity === 'WARNING') {
              badgeBg = '#FFFBEB';
              badgeBorder = '#FDE68A';
              badgeColor = '#D97706';
              IconComponent = AlertTriangle;
            } else if (alert.severity === 'INFO') {
              badgeBg = '#EFF6FF';
              badgeBorder = '#BFDBFE';
              badgeColor = '#2563EB';
              IconComponent = Info;
            }

            return (
              <div
                key={alert.id}
                style={{
                  border: `1px solid ${badgeBorder}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem 1.25rem',
                  backgroundColor: badgeBg,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  position: 'relative'
                }}
              >
                {/* Top Row: Icon, Title, Severity Pill, Dismiss Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: badgeColor,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <IconComponent size={15} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {alert.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1px' }}>
                        <span>{alert.documentTitle}</span>
                        <span>•</span>
                        <span style={{ fontWeight: 600 }}>{alert.profileName}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: '#FFFFFF',
                        border: `1px solid ${badgeBorder}`,
                        color: badgeColor,
                        textTransform: 'uppercase'
                      }}
                    >
                      {alert.severity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDismiss(alert.id)}
                      disabled={actionLoading === alert.id}
                      className="btn-ghost"
                      style={{ padding: '4px', borderRadius: '50%', color: 'var(--text-muted)' }}
                      title="Dismiss alert"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Narrative Message */}
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {alert.message}
                </p>

                {/* Bottom Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem' }}>
                  {/* Snooze Trigger */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setActiveSnoozeMenu(activeSnoozeMenu === alert.id ? null : alert.id)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Clock size={12} />
                      <span>Snooze</span>
                      <ChevronDown size={11} />
                    </button>

                    {activeSnoozeMenu === alert.id && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: '4px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: 'var(--shadow-md)',
                          zIndex: 20,
                          minWidth: '130px',
                          padding: '4px 0'
                        }}
                      >
                        {[
                          { label: 'Snooze 1 Day', days: 1 },
                          { label: 'Snooze 7 Days', days: 7 },
                          { label: 'Snooze 14 Days', days: 14 },
                          { label: 'Snooze 30 Days', days: 30 }
                        ].map(opt => (
                          <button
                            key={opt.days}
                            type="button"
                            onClick={() => handleSnooze(alert.id, opt.days)}
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: 'var(--text-primary)'
                            }}
                            onMouseEnter={e => (e.target.style.backgroundColor = '#F8FAFC')}
                            onMouseLeave={e => (e.target.style.backgroundColor = 'transparent')}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Primary Link Action */}
                  <button
                    type="button"
                    onClick={() => {
                      if (alert.actionUrl) navigate(alert.actionUrl);
                    }}
                    style={{
                      backgroundColor: badgeColor,
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>{alert.actionLabel || 'Take Action'}</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
