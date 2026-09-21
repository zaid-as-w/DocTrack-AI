import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, Check, Sliders, Lock, Info, CheckCircle2 } from 'lucide-react';

export default function CookiePreferencesModal({ isOpen, onClose, onSave }) {
  const modalRef = useRef(null);
  const [functionalEnabled, setFunctionalEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('doctrack_cookie_consent');
      if (stored) {
        const parsed = JSON.parse(stored);
        setFunctionalEnabled(parsed.functional ?? true);
        setAnalyticsEnabled(parsed.analytics ?? false);
      }
    } catch {
      // Default state
    }
  }, [isOpen]);

  // Keyboard accessibility: ESC key to close & focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (saveAll = false) => {
    const preferences = {
      essential: true,
      functional: saveAll ? true : functionalEnabled,
      analytics: saveAll ? true : analyticsEnabled,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    localStorage.setItem('doctrack_cookie_consent', JSON.stringify(preferences));
    window.dispatchEvent(new CustomEvent('cookie_consent_updated', { detail: preferences }));

    if (onSave) onSave(preferences);
    onClose();
  };

  return (
    <div
      className="cookie-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cookie-modal-card" ref={modalRef}>
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-light)',
                color: 'var(--brand-primary-accessible)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sliders size={20} />
            </div>
            <div>
              <h2 id="cookie-modal-title" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Cookie & Storage Preferences
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Customize your privacy choices under GDPR, DPDP Act 2023 & CCPA
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cookie preferences modal"
            style={{
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            DocTrack AI is built on local-first principles. We use local browser storage to keep you securely signed in,
            remember your active profiles, and enforce document isolation. You can review and control each storage category below.
          </p>

          {/* Category 1: Strictly Necessary */}
          <div
            style={{
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.1rem',
              backgroundColor: 'var(--bg-subtle)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={16} color="var(--brand-primary-accessible)" />
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Strictly Necessary Storage
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  backgroundColor: '#E2E8F0',
                  color: 'var(--text-secondary)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  textTransform: 'uppercase'
                }}
              >
                Always Active
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
              Essential for core functions like JWT authentication session (<code>doctrack_token</code>), security headers, and
              tamper verification. Under Art. 5(3) of the ePrivacy Directive, strictly necessary storage does not require prior consent.
            </p>
          </div>

          {/* Category 2: Functional & Preferences */}
          <div
            style={{
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.1rem',
              backgroundColor: '#FFFFFF'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} color="var(--accent-blue)" />
                <label
                  htmlFor="toggle-functional-storage"
                  style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Functional & Profile Preferences
                </label>
              </div>

              <input
                type="checkbox"
                id="toggle-functional-storage"
                checked={functionalEnabled}
                onChange={(e) => setFunctionalEnabled(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: 'var(--brand-primary-accessible)'
                }}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
              Enables the vault to remember your active profile selection (<code>doctrack_active_profile</code>), sidebar layout,
              and category filters across browsing sessions without resetting every page refresh.
            </p>
          </div>

          {/* Category 3: Diagnostic & Analytics */}
          <div
            style={{
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.1rem',
              backgroundColor: '#FFFFFF'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={16} color="var(--accent-indigo)" />
                <label
                  htmlFor="toggle-analytics-storage"
                  style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Diagnostic Telemetry & Error Reporting
                </label>
              </div>

              <input
                type="checkbox"
                id="toggle-analytics-storage"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: 'var(--brand-primary-accessible)'
                }}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
              Optional anonymous performance metrics and client crash reports used solely to improve document processing stability.
              No document contents or personal credentials are ever collected. Disabled by default.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderTop: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-page)',
            borderBottomLeftRadius: 'var(--radius-xl)',
            borderBottomRightRadius: 'var(--radius-xl)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <a
            href="/cookie-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', textDecoration: 'underline' }}
          >
            Read Full Cookie Policy &rarr;
          </a>

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleSave(false)}
            >
              Save My Preferences
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleSave(true)}
            >
              <Check size={15} />
              <span>Accept All Storage</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
