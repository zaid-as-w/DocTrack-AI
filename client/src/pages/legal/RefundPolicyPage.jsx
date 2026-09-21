import React, { useEffect } from 'react';
import LegalHeader from './LegalHeader';
import Footer from '../../components/layout/Footer';
import { CreditCard, CheckCircle2, AlertCircle, RefreshCw, Mail } from 'lucide-react';

export default function RefundPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Refund and Billing Policy — DocTrack AI';
  }, []);

  return (
    <div className="legal-layout-container">
      <LegalHeader title="Refund & Billing Policy" />

      <main className="legal-article-container" id="main-content">
        <article className="legal-article-card">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary-accessible)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem' }}>
            <CreditCard size={16} />
            <span>Fair Consumer Protection</span>
          </div>

          <h1 className="legal-title">Refund & Billing Policy</h1>
          <div className="legal-meta">
            <span><strong>Effective Date:</strong> September 19, 2026</span>
            <span><strong>Version:</strong> 2.1</span>
            <span><strong>Entity:</strong> DockTrack AI major project group , Jain college of engineering , Belagavi</span>
          </div>

          {/* Guarantee Alert */}
          <div className="legal-alert-box">
            <CheckCircle2 size={22} color="var(--brand-primary-accessible)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', color: 'var(--brand-primary-accessible)', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                Academic Major Project — 100% Free Educational Platform
              </strong>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                DocTrack AI is developed as a final year academic major project at Jain College of Engineering, Belagavi.
                The entire platform, including document OCR, smart categorization, multi-profile vaults, and expiry reminders,
                is provided completely free of charge for demonstration, academic review, and non-commercial evaluation.
              </p>
            </div>
          </div>

          {/* Section 1 */}
          <section className="legal-section">
            <h2 className="legal-section-title">1. No Financial Transactions or Billing</h2>
            <p className="legal-text">
              Because DocTrack AI is an educational project operated by the DockTrack AI major project group at Jain College of Engineering,
              Belagavi, <strong>we do not charge subscription fees, license costs, or maintenance payments</strong>.
              No credit card, debit card, UPI, or banking information is collected or processed anywhere on this platform.
            </p>
          </section>

          {/* Section 2 */}
          <section className="legal-section">
            <h2 className="legal-section-title">2. Applicability of Refunds</h2>
            <p className="legal-text">
              Since zero fees are collected from users:
            </p>
            <ul className="legal-list">
              <li className="legal-list-item"><strong>No Monetary Refunds Applicable:</strong> As there are no payments, monetary refund requests are neither processed nor applicable.</li>
              <li className="legal-list-item"><strong>Free Data Export & Account Deletion:</strong> Any user wishing to discontinue using the platform may export their indexed document data or request complete account erasure at any time without fee or financial penalty.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="legal-section">
            <h2 className="legal-section-title">3. Hypothetical Commercial Deployment Disclosures</h2>
            <p className="legal-text">
              In the event that DocTrack AI or a spin-off system is deployed as a commercial software product in the future:
            </p>
            <ul className="legal-list">
              <li className="legal-list-item">A statutory fourteen (14) day right of withdrawal and cooling-off period will be provided pursuant to the Consumer Protection Act, 2019 (India) and applicable e-Commerce rules.</li>
              <li className="legal-list-item">Transparent prorated refund mechanisms will be published prior to accepting any commercial payment gateway integrations.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="legal-section">
            <h2 className="legal-section-title">4. Project Support & Inquiries</h2>
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong>DockTrack AI major project group , Jain college of engineering , Belagavi</strong><br />
              Department of Computer Science & Engineering<br />
              Jain College of Engineering, T.S. Nagar, Hunchanatti Road, Machhe, Belagavi, Karnataka 590014, India<br />
              Email: <a href="mailto:docktrack0@gmail.com" style={{ color: 'var(--accent-blue)' }}>docktrack0@gmail.com</a><br />
              Phone: +91 7019182324
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
