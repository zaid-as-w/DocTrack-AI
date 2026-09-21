import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  FileText,
  Sliders,
  Scale,
  CreditCard,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function Footer() {
  const handleOpenCookieSettings = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open_cookie_preferences'));
  };

  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-content-grid">
        {/* Brand & Corporate Overview */}
        <div>
          <div className="footer-brand-title">
            <ShieldCheck size={20} color="var(--brand-primary-accessible)" />
            <span>DocTrack AI</span>
          </div>
          <p className="footer-desc">
            Offline-first intelligent document lifecycle management and proactive expiry tracking engine.
            Engineered for high data privacy, local disk storage, and compliance with global data sovereignty standards.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={14} /> DockTrack AI major project group , Jain college of engineering , Belagavi
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={14} /> <a href="mailto:docktrack0@gmail.com" style={{ color: 'inherit' }}>docktrack0@gmail.com</a>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Phone size={14} /> +91 7019182324
            </span>
          </div>
        </div>

        {/* Legal & Governance */}
        <div>
          <div className="footer-section-title">Legal & Trust</div>
          <ul className="footer-links-list">
            <li>
              <Link to="/privacy" className="footer-link">
                <FileText size={14} />
                <span>Privacy Policy</span>
              </Link>
            </li>
            <li>
              <Link to="/terms" className="footer-link">
                <Scale size={14} />
                <span>Terms & Conditions</span>
              </Link>
            </li>
            <li>
              <Link to="/cookie-policy" className="footer-link">
                <Lock size={14} />
                <span>Cookie Policy</span>
              </Link>
            </li>
            <li>
              <Link to="/refund-policy" className="footer-link">
                <CreditCard size={14} />
                <span>Refund & Billing Policy</span>
              </Link>
            </li>
            <li>
              <Link to="/legal" className="footer-link">
                <Building2 size={14} />
                <span>Legal Notice (Impressum)</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Privacy & User Rights */}
        <div>
          <div className="footer-section-title">Data Protection</div>
          <ul className="footer-links-list">
            <li>
              <button
                type="button"
                className="footer-link"
                onClick={handleOpenCookieSettings}
                aria-label="Open cookie preferences modal"
              >
                <Sliders size={14} />
                <span>Manage Cookie Preferences</span>
              </button>
            </li>
            <li>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4, display: 'block' }}>
                Under the Indian DPDP Act 2023 & GDPR, you have full rights to inspect, export, or erase your indexed documents and account records.
              </span>
            </li>
            <li>
              <a
                href="mailto:docktrack0@gmail.com"
                className="footer-link"
                style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}
              >
                Contact Student Project Group &rarr;
              </a>
            </li>
          </ul>
        </div>

        {/* Academic Project Campus & Location */}
        <div>
          <div className="footer-section-title">Academic Campus</div>
          <address style={{ fontStyle: 'normal', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <strong>DockTrack AI major project group</strong><br />
            Department of Computer Science & Engineering<br />
            Jain College of Engineering<br />
            T.S. Nagar, Hunchanatti Road, Machhe<br />
            Belagavi, Karnataka 590014, India
          </address>
        </div>
      </div>

      {/* Bottom Legal Badges & Copyright */}
      <div className="footer-bottom-bar">
        <div>
          &copy; {new Date().getFullYear()} DockTrack AI major project group , Jain college of engineering , Belagavi. All rights reserved.
        </div>

        <div className="compliance-badges-row">
          <span className="compliance-badge" title="Web Content Accessibility Guidelines 2.1 Level AA">
            <CheckCircle2 size={12} color="var(--brand-primary-accessible)" />
            <span>WCAG 2.1 AA Compliant</span>
          </span>
          <span className="compliance-badge" title="Aligned with EU GDPR & India DPDP Act 2023">
            <CheckCircle2 size={12} color="var(--brand-primary-accessible)" />
            <span>GDPR & DPDP Aligned</span>
          </span>
          <span className="compliance-badge" title="Zero Third-Party Advertising Pixels">
            <CheckCircle2 size={12} color="var(--brand-primary-accessible)" />
            <span>Zero Third-Party Ad Trackers</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
