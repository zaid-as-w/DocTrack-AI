import React, { useEffect } from 'react';
import LegalHeader from './LegalHeader';
import Footer from '../../components/layout/Footer';
import { Lock, Sliders, ShieldCheck, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function CookiePolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Cookie Policy — DocTrack AI';
  }, []);

  const handleOpenPreferences = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open_cookie_preferences'));
  };

  return (
    <div className="legal-layout-container">
      <LegalHeader title="Cookie Policy" />

      <main className="legal-article-container" id="main-content">
        <article className="legal-article-card">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary-accessible)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem' }}>
            <Lock size={16} />
            <span>ePrivacy Directive & GDPR Compliant</span>
          </div>

          <h1 className="legal-title">Cookie & Local Storage Policy</h1>
          <div className="legal-meta">
            <span><strong>Effective Date:</strong> September 19, 2026</span>
            <span><strong>Version:</strong> 2.0</span>
            <span><strong>Applicable Standard:</strong> EU ePrivacy Directive (Directive 2002/58/EC) & GDPR Art. 5(3)</span>
          </div>

          {/* Action Callout */}
          <div className="legal-alert-box" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Sliders size={20} color="var(--brand-primary-accessible)" />
              <div>
                <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>Your Privacy Choices Matter</strong>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>You can review and adjust your storage preferences at any time.</div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenPreferences}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Sliders size={15} />
              <span>Open Cookie Preferences</span>
            </button>
          </div>

          {/* Section 1 */}
          <section className="legal-section">
            <h2 className="legal-section-title">1. What are Cookies and Local Storage?</h2>
            <p className="legal-text">
              Cookies and local browser storage (such as HTML5 <code>localStorage</code>) are small text files or key-value entries
              placed on your computer or mobile device by websites that you visit. They are widely used to make web applications
              function securely, remember your user settings, and preserve session state without re-authenticating on every page transition.
            </p>
          </section>

          {/* Section 2 */}
          <section className="legal-section">
            <h2 className="legal-section-title">2. How DocTrack AI Uses Storage</h2>
            <p className="legal-text">
              DocTrack AI prioritizes user privacy. We do not use third-party advertising cookies or cross-site tracking pixels.
              All local storage items utilized by DocTrack AI are strictly mapped below:
            </p>

            <table className="legal-table">
              <thead>
                <tr>
                  <th>Storage Key</th>
                  <th>Category</th>
                  <th>Duration</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>doctrack_token</code></td>
                  <td>Strictly Necessary</td>
                  <td>Session / 7 Days</td>
                  <td>Encrypted JSON Web Token (JWT) authorizing API requests to your private document vault.</td>
                </tr>
                <tr>
                  <td><code>doctrack_active_profile</code></td>
                  <td>Functional / Preferences</td>
                  <td>Persistent</td>
                  <td>Remembers your currently active vault profile (e.g. personal, family member, or vehicle) across page reloads.</td>
                </tr>
                <tr>
                  <td><code>doctrack_cookie_consent</code></td>
                  <td>Preferences / Compliance</td>
                  <td>1 Year</td>
                  <td>Stores your granular privacy consent choices so you are not prompted with the consent banner on every return visit.</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Section 3 */}
          <section className="legal-section">
            <h2 className="legal-section-title">3. Do We Need Your Consent?</h2>
            <p className="legal-text">
              Under Article 5(3) of the EU ePrivacy Directive and corresponding international laws:
            </p>
            <ul className="legal-list">
              <li className="legal-list-item">
                <strong>Strictly Necessary Storage:</strong> Does <em>not</em> require prior consent because it is technically required to provide the service requested by you (e.g., maintaining your authenticated vault session).
              </li>
              <li className="legal-list-item">
                <strong>Functional & Diagnostic Storage:</strong> Requires transparent disclosure and opt-in consent. We do not enable optional diagnostic telemetry unless you explicitly grant permission in our Cookie Consent Center.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="legal-section">
            <h2 className="legal-section-title">4. Managing Storage in Your Web Browser</h2>
            <p className="legal-text">
              In addition to our on-site Cookie Preferences Modal, modern browsers provide controls to view, block, or delete cookies and local storage.
              Refer to your browser&rsquo;s official documentation:
            </p>
            <ul className="legal-list">
              <li className="legal-list-item"><strong>Google Chrome:</strong> Settings &gt; Privacy and Security &gt; Third-party cookies & Site data</li>
              <li className="legal-list-item"><strong>Mozilla Firefox:</strong> Settings &gt; Privacy & Security &gt; Cookies and Site Data</li>
              <li className="legal-list-item"><strong>Apple Safari:</strong> Settings &gt; Safari &gt; Advanced &gt; Website Data</li>
              <li className="legal-list-item"><strong>Microsoft Edge:</strong> Settings &gt; Cookies and site permissions</li>
            </ul>
            <p className="legal-text" style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              <em>Note: Clearing or disabling strictly necessary storage will log you out of your vault session and reset active profile selections.</em>
            </p>
          </section>

          {/* Section 5 */}
          <section className="legal-section">
            <h2 className="legal-section-title">5. Contact Our Privacy Team</h2>
            <p className="legal-text">
              If you have any questions regarding our storage practices, contact the DockTrack AI major project group at{' '}
              <a href="mailto:docktrack0@gmail.com" style={{ color: 'var(--accent-blue)' }}>docktrack0@gmail.com</a> or call{' '}
              <a href="tel:+917019182324" style={{ color: 'var(--accent-blue)' }}>+91 7019182324</a>.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
