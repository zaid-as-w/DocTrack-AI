import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Plus,
  Shield,
  LogOut,
  User,
  X,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAlerts, getAlertSummary, snoozeAlert, dismissAlert, dismissAllAlerts } from '../../services/api';

export default function Navbar({ healthData, onOpenUpload }) {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const flyoutRef = useRef(null);

  const [showAlertFlyout, setShowAlertFlyout] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertSummary, setAlertSummary] = useState({ total: 0, critical: 0, warning: 0, unread: 0 });
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const isConnected = healthData?.status === 'ok';
  const initial = (user?.name || 'U').charAt(0).toUpperCase();

  const fetchAlertsData = async () => {
    try {
      const [alertsRes, summaryRes] = await Promise.all([
        getAlerts({ status: 'all', includeSnoozed: false }),
        getAlertSummary('all')
      ]);
      if (alertsRes.success && alertsRes.data) {
        setAlerts(alertsRes.data);
      }
      if (summaryRes.success && summaryRes.data) {
        setAlertSummary(summaryRes.data);
      }
    } catch (err) {
      console.warn('Alerts fetch failed in Navbar:', err);
    }
  };

  useEffect(() => {
    fetchAlertsData();
    const interval = setInterval(fetchAlertsData, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Close flyout when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target)) {
        setShowAlertFlyout(false);
      }
    };
    if (showAlertFlyout) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAlertFlyout]);

  const handleSnooze = async (alertId, e) => {
    e.stopPropagation();
    try {
      await snoozeAlert(alertId, 7);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      fetchAlertsData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = async (alertId, e) => {
    e.stopPropagation();
    try {
      await dismissAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      fetchAlertsData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissAll = async () => {
    try {
      await dismissAllAlerts('all');
      setAlerts([]);
      fetchAlertsData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const hasCritical = alerts.some(a => a.severity === 'CRITICAL');
  const unreadCount = alerts.length;

  return (
    <header className="top-navbar">
      {/* Mobile brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="brand-icon-wrapper" style={{ width: '34px', height: '34px' }}>
            <Shield size={20} strokeWidth={2.5} />
          </div>
          <span className="brand-title" style={{ fontSize: '1.15rem' }}>
            DocTrack <span>AI</span>
          </span>
          <span className="brand-badge">BETA</span>
        </Link>
      </div>

      {/* Global Search */}
      <div className="search-container">
        <Search size={16} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Search passport, RC, policy #..."
          className="search-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              navigate(`/documents?q=${encodeURIComponent(e.target.value.trim())}`);
            }
          }}
        />
        <span className="kbd-shortcut">Ctrl K</span>
      </div>

      {/* Top Navbar Actions */}
      <div className="navbar-actions">
        {/* Backend Health Badge */}
        <Link to="/health" className="health-badge" title="Click to view full-stack system diagnostics">
          <span className="pulse-dot" style={{ backgroundColor: isConnected ? 'var(--brand-primary)' : '#F59E0B' }}></span>
          <span>{isConnected ? 'API Live' : 'API Standby'}</span>
        </Link>

        {/* Quick Upload Button */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (onOpenUpload) onOpenUpload();
            else navigate('/documents');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Upload</span>
        </button>

        {/* Notifications / Alert Center Icon & Flyout */}
        <div style={{ position: 'relative' }} ref={flyoutRef}>
          <button
            type="button"
            className="btn-ghost"
            style={{
              position: 'relative',
              padding: '0.5rem',
              borderRadius: '50%',
              color: showAlertFlyout ? 'var(--brand-dark)' : 'var(--text-secondary)',
              backgroundColor: showAlertFlyout ? 'var(--brand-light)' : 'transparent'
            }}
            title="System Alert Center"
            onClick={() => {
              setShowAlertFlyout(prev => !prev);
              if (!showAlertFlyout) fetchAlertsData();
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  minWidth: '17px',
                  height: '17px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: hasCritical ? '#DC2626' : '#D97706',
                  color: '#FFFFFF',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  border: '2px solid #FFFFFF'
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Interactive Alert Center Flyout */}
          {showAlertFlyout && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '360px',
                maxWidth: '90vw',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease-out'
              }}
            >
              {/* Flyout Header */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    Alert Center
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: hasCritical ? '#FEE2E2' : '#FEF3C7',
                        color: hasCritical ? '#DC2626' : '#D97706',
                        padding: '1px 7px',
                        borderRadius: 'var(--radius-pill)'
                      }}
                    >
                      {unreadCount} Active
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleDismissAll}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Dismiss All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAlertFlyout(false)}
                    className="btn-ghost"
                    style={{ padding: '2px', borderRadius: '50%', color: 'var(--text-muted)' }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Flyout Alerts List */}
              <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '0.5rem' }}>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      All Caught Up!
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      No unread or urgent alerts requiring your attention.
                    </p>
                  </div>
                ) : (
                  alerts.slice(0, 5).map(a => {
                    const isCrit = a.severity === 'CRITICAL';
                    const isWarn = a.severity === 'WARNING';
                    const iconColor = isCrit ? '#DC2626' : isWarn ? '#D97706' : '#2563EB';

                    return (
                      <div
                        key={a.id}
                        style={{
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '0.35rem',
                          backgroundColor: isCrit ? '#FEF2F2' : isWarn ? '#FFFBEB' : '#F8FAFC',
                          border: `1px solid ${isCrit ? '#FECACA' : isWarn ? '#FDE68A' : '#E2E8F0'}`,
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setShowAlertFlyout(false);
                          if (a.actionUrl) navigate(a.actionUrl);
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {isCrit ? (
                              <ShieldAlert size={14} color={iconColor} />
                            ) : (
                              <AlertTriangle size={14} color={iconColor} />
                            )}
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                              {a.title}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: iconColor
                            }}
                          >
                            {a.severity}
                          </span>
                        </div>

                        <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '4px 0 6px 0', lineHeight: 1.35 }}>
                          {a.message}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {a.profileName}
                          </span>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button
                              type="button"
                              onClick={(e) => handleSnooze(a.id, e)}
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-xs)',
                                background: '#FFFFFF',
                                border: '1px solid var(--border-light)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer'
                              }}
                            >
                              Snooze 7d
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDismiss(a.id, e)}
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-xs)',
                                background: '#FFFFFF',
                                border: '1px solid var(--border-light)',
                                color: '#DC2626',
                                cursor: 'pointer'
                              }}
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Flyout Footer */}
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  borderTop: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowAlertFlyout(false);
                    navigate('/');
                  }}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--brand-dark)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem'
                  }}
                >
                  <span>Go to Alert Hub</span>
                  <ChevronRight size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAlertFlyout(false);
                    navigate('/renewal-assistant');
                  }}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Renewal Guide
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Authenticated User Pill & Logout */}
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link to="/profiles" className="user-profile-btn" title={`Signed in as ${user?.name} (${user?.email})`}>
              <div className="user-avatar">{initial}</div>
              <div className="user-info" style={{ display: 'block' }}>
                <div className="user-name">{user?.name || 'User'}</div>
                <div className="user-role">{user?.email}</div>
              </div>
            </Link>

            <button
              type="button"
              className="btn-ghost"
              onClick={handleLogout}
              title="Sign Out"
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)'
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-secondary btn-sm">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
