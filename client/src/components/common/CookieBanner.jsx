import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sliders, Check, X } from 'lucide-react';
import CookiePreferencesModal from './CookiePreferencesModal';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('doctrack_cookie_consent');
      if (!consent) {
        // Small delay for smooth entry animation
        const timer = setTimeout(() => setShowBanner(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // Fallback
    }
  }, []);

  // Listen for custom trigger from footer or policy page
  useEffect(() => {
    const handleOpenPreferences = () => {
      setShowModal(true);
    };

    window.addEventListener('open_cookie_preferences', handleOpenPreferences);
    return () => window.removeEventListener('open_cookie_preferences', handleOpenPreferences);
  }, []);

  const handleAcceptAll = () => {
    const consent = {
      essential: true,
      functional: true,
      analytics: true,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    localStorage.setItem('doctrack_cookie_consent', JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent('cookie_consent_updated', { detail: consent }));
    setShowBanner(false);
  };

  const handleRejectNonEssential = () => {
    const consent = {
      essential: true,
      functional: false,
      analytics: false,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    localStorage.setItem('doctrack_cookie_consent', JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent('cookie_consent_updated', { detail: consent }));
    setShowBanner(false);
  };

  return (
    <>
      {showBanner && (
        <div
          className="cookie-banner-container"
          role="region"
          aria-label="Cookie and storage consent notice"
        >
          <div className="cookie-banner-header">
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--brand-light)',
                color: 'var(--brand-primary-accessible)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="cookie-banner-title">
                We respect your privacy and data sovereignty
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                GDPR, DPDP Act 2023 & CCPA Compliant Storage
              </div>
            </div>
          </div>

          <div className="cookie-banner-body">
            DocTrack AI stores authentication tokens and cryptographic keys in your local browser to enable offline-first
            document tracking. We do not use third-party advertising tracking. Optional functional and diagnostic storage requires
            your opt-in consent. Review our{' '}
            <Link to="/privacy" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link to="/cookie-policy" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
              Cookie Policy
            </Link>.
          </div>

          <div className="cookie-banner-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Sliders size={14} />
              <span>Customize</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRejectNonEssential}
            >
              Reject Non-Essential
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleAcceptAll}
            >
              <Check size={15} />
              <span>Accept All</span>
            </button>
          </div>
        </div>
      )}

      {/* Granular Preferences Modal */}
      <CookiePreferencesModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={() => setShowBanner(false)}
      />
    </>
  );
}
