import React, { useEffect } from 'react';
import LegalHeader from './LegalHeader';
import Footer from '../../components/layout/Footer';
import { ShieldCheck, Lock, Eye, FileText, Database, UserCheck, AlertCircle, Building2, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Privacy Policy — DocTrack AI';
  }, []);

  return (
    <div className="legal-layout-container">
      <LegalHeader title="Privacy Policy" />

      <main className="legal-article-container" id="main-content">
        <article className="legal-article-card">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary-accessible)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem' }}>
            <ShieldCheck size={16} />
            <span>GDPR, DPDP Act 2023 & CCPA Compliant</span>
          </div>

          <h1 className="legal-title">Privacy Policy</h1>
          <div className="legal-meta">
            <span><strong>Effective Date:</strong> September 19, 2026</span>
            <span><strong>Version:</strong> 2.4</span>
            <span><strong>Entity:</strong> DockTrack AI major project group , Jain college of engineering , Belagavi</span>
          </div>

          {/* Quick Summary Alert */}
          <div className="legal-alert-box">
            <Lock size={20} color="var(--brand-primary-accessible)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', color: 'var(--brand-primary-accessible)', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                Summary of our Privacy Commitments
              </strong>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                DocTrack AI operates on an offline-first, local-persistence model. We never sell, rent, or monetize your personal
                documents or metadata. Your files are stored directly on your designated local or private server disk and are never
                used to train public artificial intelligence models without your consent.
              </p>
            </div>
          </div>

          {/* Section 1 */}
          <section className="legal-section">
            <h2 className="legal-section-title">1. Introduction & Scope</h2>
            <p className="legal-text">
              DockTrack AI major project group , Jain college of engineering , Belagavi (&ldquo;DockTrack AI&rdquo;, &ldquo;Project Group&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;)
              is committed to protecting your privacy, data sovereignty, and fundamental rights. This Privacy Policy governs your access to
              and use of the DocTrack AI web application, REST APIs, local document vault, OCR pipelines, and related services.
            </p>
            <p className="legal-text">
              This policy is structured to comply with applicable data protection legislation worldwide, including:
            </p>
            <ul className="legal-list">
              <li className="legal-list-item">The <strong>General Data Protection Regulation (GDPR)</strong> (Regulation (EU) 2016/679) and UK GDPR;</li>
              <li className="legal-list-item">The <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> of the Republic of India;</li>
              <li className="legal-list-item">The <strong>California Consumer Privacy Act (CCPA)</strong> as amended by the California Privacy Rights Act (CPRA).</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="legal-section">
            <h2 className="legal-section-title">2. Information We Collect (Data Minimization)</h2>
            <p className="legal-text">
              Under the principle of <em>Data Minimization</em> (GDPR Art. 5(1)(c)), we collect only information that is strictly necessary
              to deliver our document intelligence and expiry tracking capabilities:
            </p>

            <table className="legal-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Data Elements Collected</th>
                  <th>Purpose of Collection</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Account Credentials</strong></td>
                  <td>Full name, email address, salted bcrypt password hash, optional mobile number.</td>
                  <td>Account authentication, credential verification, and delivery of requested SMS/WhatsApp expiry alerts.</td>
                </tr>
                <tr>
                  <td><strong>Document Metadata</strong></td>
                  <td>Document title, identifier number (e.g. passport or license number), issue date, expiry date, issuing authority, category tag, and sensitivity rating.</td>
                  <td>Computing proactive expiry horizons, generating renewal reminders, and organizing multi-profile vaults.</td>
                </tr>
                <tr>
                  <td><strong>Uploaded Binary Files</strong></td>
                  <td>PDF, JPEG, and PNG document scans uploaded by you to <code>server/uploads/</code>.</td>
                  <td>Local optical character recognition (OCR) and document preview within your secure session.</td>
                </tr>
                <tr>
                  <td><strong>Technical Session Data</strong></td>
                  <td>Local storage tokens (<code>doctrack_token</code>), user-agent, IP address for rate-limiting, and error telemetry.</td>
                  <td>Maintaining secure JWT sessions, defending against brute-force attacks, and enforcing rate limiting.</td>
                </tr>
              </tbody>
            </table>
            <p className="legal-text">
              <strong>Notice on Optional Phone Numbers:</strong> You are not required to provide a phone number to register or operate your vault.
              Mobile numbers are collected only if you choose to receive direct SMS or WhatsApp renewal reminders.
            </p>
          </section>

          {/* Section 3 */}
          <section className="legal-section">
            <h2 className="legal-section-title">3. Lawful Bases for Processing (GDPR Art. 6 & DPDP Act)</h2>
            <p className="legal-text">We process personal data only when an established lawful basis applies:</p>
            <ul className="legal-list">
              <li className="legal-list-item"><strong>Contractual Necessity:</strong> To create your account, isolate your multi-profile vaults, index documents, and calculate expiry alerts requested by you.</li>
              <li className="legal-list-item"><strong>Consent:</strong> When you voluntarily upload document files, check our form consent checkboxes, or opt in to functional/diagnostic storage. You may withdraw consent at any time.</li>
              <li className="legal-list-item"><strong>Legitimate Interests:</strong> To detect malicious intrusion, prevent NoSQL/XSS attacks, maintain API rate limits, and audit infrastructure integrity.</li>
              <li className="legal-list-item"><strong>Legal Compliance:</strong> To comply with statutory accounting, tax, or lawful government record-keeping requirements when compelled by a valid legal subpoena.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="legal-section">
            <h2 className="legal-section-title">4. Local-First Architecture & Zero Model Training</h2>
            <p className="legal-text">
              Unlike cloud-hosted AI tools that send user documents to shared multi-tenant cloud models, DocTrack AI is engineered
              with a local-first philosophy:
            </p>
            <ul className="legal-list">
              <li className="legal-list-item"><strong>On-Device / Local Storage:</strong> Uploaded documents reside strictly in your isolated server file system directory (<code>server/uploads/</code>).</li>
              <li className="legal-list-item"><strong>No Public Model Training:</strong> Your documents, identities, serial numbers, and OCR extractions are NEVER used to train, fine-tune, or calibrate public AI foundational models.</li>
              <li className="legal-list-item"><strong>No Third-Party Brokers:</strong> We do not sell, rent, monetize, or trade personal data or document contents with data brokers, ad networks, or commercial affiliates.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="legal-section">
            <h2 className="legal-section-title">5. Data Retention & Right to Erasure</h2>
            <p className="legal-text">
              We retain personal data only for as long as your account remains active or as necessary to fulfill document management purposes:
            </p>
            <ul className="legal-list">
              <li className="legal-list-item"><strong>Individual Document Deletion:</strong> When you delete a document from your vault, its database record and binary file on disk are immediately and permanently erased.</li>
              <li className="legal-list-item"><strong>Account Deletion:</strong> Upon receiving an account closure request, all associated profiles, documents, alerts, and authentication hashes are purged within thirty (30) days.</li>
              <li className="legal-list-item"><strong>Transient Logs:</strong> Rate-limiting security logs and temporary server traces are overwritten on a rolling 14-day cycle.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="legal-section">
            <h2 className="legal-section-title">6. Your Legal Privacy Rights</h2>
            <p className="legal-text">
              Depending on your jurisdiction, you have specific enforceable rights regarding your personal information:
            </p>
            <ul className="legal-list">
              <li className="legal-list-item"><strong>Right of Access & Portability:</strong> You may request a complete export of your indexed document metadata in standard JSON/CSV format.</li>
              <li className="legal-list-item"><strong>Right to Rectification:</strong> You may correct or edit inaccurate document numbers, names, or expiry dates directly within the interface.</li>
              <li className="legal-list-item"><strong>Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</strong> You may demand deletion of your account and all stored documents without undue delay.</li>
              <li className="legal-list-item"><strong>Right to Restrict Processing & Withdraw Consent:</strong> You may toggle off optional notifications or withdraw consent without affecting the lawfulness of prior processing.</li>
              <li className="legal-list-item"><strong>CCPA &lsquo;Do Not Sell or Share&rsquo;:</strong> We do not sell or share personal data. California residents may confirm this status or request information under Cal. Civ. Code &sect; 1798.100.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="legal-section">
            <h2 className="legal-section-title">7. Data Protection Officer & Grievance Redressal</h2>
            <p className="legal-text">
              In accordance with Section 8(1) of the Indian DPDP Act, 2023 and GDPR Article 37, we have appointed a dedicated
              Grievance Officer and Data Protection Officer (DPO):
            </p>
            <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginTop: '1rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Data Protection Officer / Grievance Redressal Cell
              </div>
              <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong>Attention:</strong> Privacy Compliance & Grievance Desk<br />
                <strong>Entity:</strong> DockTrack AI major project group , Jain college of engineering , Belagavi<br />
                <strong>Address:</strong> Department of Computer Science & Engineering, Jain College of Engineering, T.S. Nagar, Hunchanatti Road, Machhe, Belagavi, Karnataka 590014, India<br />
                <strong>Direct Email:</strong> <a href="mailto:docktrack0@gmail.com" style={{ color: 'var(--accent-blue)' }}>docktrack0@gmail.com</a><br />
                <strong>Contact Number:</strong> +91 7019182324<br />
                <strong>Response Window:</strong> Grievances are acknowledged within 48 hours and resolved promptly.
              </div>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
