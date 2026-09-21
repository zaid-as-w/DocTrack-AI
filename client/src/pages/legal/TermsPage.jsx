import React, { useEffect } from 'react';
import LegalHeader from './LegalHeader';
import Footer from '../../components/layout/Footer';
import { Scale, AlertTriangle, ShieldCheck, FileCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Terms and Conditions — DocTrack AI';
  }, []);

  return (
    <div className="legal-layout-container">
      <LegalHeader title="Terms and Conditions" />

      <main className="legal-article-container" id="main-content">
        <article className="legal-article-card">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary-accessible)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem' }}>
            <Scale size={16} />
            <span>Binding Legal Agreement</span>
          </div>

          <h1 className="legal-title">Terms & Conditions</h1>
          <div className="legal-meta">
            <span><strong>Effective Date:</strong> September 19, 2026</span>
            <span><strong>Version:</strong> 3.1</span>
            <span><strong>Governing Law:</strong> Republic of India (Belagavi Jurisdiction)</span>
          </div>

          {/* Critical AI Disclaimer Box */}
          <div className="legal-alert-box legal-alert-warning" style={{ borderLeft: '4px solid #DC2626' }}>
            <AlertTriangle size={24} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', color: '#991B1B', fontSize: '0.98rem', marginBottom: '0.3rem' }}>
                Important Legal Disclaimer: Automated Intelligence & OCR Verification
              </strong>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#7F1D1D', lineHeight: 1.55 }}>
                DocTrack AI provides optical character recognition (OCR), expiry calculations, renewal step suggestions, and chatbot
                responses strictly as <strong>informational assistive aids</strong>. While we endeavor to provide high algorithmic precision,
                automated extraction may occasionally misread characters, miscalculate grace periods, or miss amendments in statutory procedures.
                <strong> You are solely responsible for verifying critical statutory renewal deadlines, fees, and requirements directly with
                official government registries or authorized issuing authorities. DocTrack AI is not an official legal registry, law firm, or government agency.</strong>
              </p>
            </div>
          </div>

          {/* Section 1 */}
          <section className="legal-section">
            <h2 className="legal-section-title">1. Acceptance of Terms</h2>
            <p className="legal-text">
              By accessing, registering an account with, uploading documents to, or utilizing any feature of DocTrack AI
              (the &ldquo;Service&rdquo;), you (&ldquo;User&rdquo;, &ldquo;you&rdquo;) acknowledge that you have read, understood,
              and unconditionally agree to be bound by these Terms and Conditions (&ldquo;Terms&rdquo;) and our Privacy Policy.
              If you do not agree to all provisions herein, do not access or use the Service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="legal-section">
            <h2 className="legal-section-title">2. Eligibility & Account Security</h2>
            <p className="legal-text">
              You represent and warrant that you are at least eighteen (18) years of age or the age of majority in your jurisdiction.
              If you are managing family profiles or employee document records on behalf of others, you warrant that you hold legitimate
              parental authority, legal guardianship, or express written authorization to manage such records.
            </p>
            <p className="legal-text">
              You are responsible for maintaining the confidentiality of your master vault credentials and password. You agree to notify
              DocTrack AI immediately upon discovering any unauthorized breach or compromised session.
            </p>
          </section>

          {/* Section 3 */}
          <section className="legal-section">
            <h2 className="legal-section-title">3. User Warranties & Lawful Document Ingestion</h2>
            <p className="legal-text">
              When storing, uploading, or indexing documents (such as passports, driving licenses, vehicle records, insurance policies,
              or warranty receipts), you explicitly represent and warrant that:
            </p>
            <ul className="legal-list">
              <li className="legal-list-item">You are the lawful owner of the document or possess clear consent from the document subject;</li>
              <li className="legal-list-item">The document is genuine, un-falsified, and does not violate any applicable anti-counterfeiting or forgery legislation;</li>
              <li className="legal-list-item">The uploaded files contain no malicious viruses, malware, trojans, or destructive code;</li>
              <li className="legal-list-item">Your ingestion of the document does not infringe upon the intellectual property, trade secret, or privacy rights of any third party.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="legal-section">
            <h2 className="legal-section-title">4. Intellectual Property & Ownership Rights</h2>
            <p className="legal-text">
              <strong>Your Complete Document Ownership:</strong> You retain 100% intellectual property, legal title, and rights to all
              documents, records, and metadata uploaded to your vault. DocTrack AI asserts zero ownership claim over your files.
            </p>
            <p className="legal-text">
              <strong>DocTrack AI Project Assets:</strong> All software code, user interface designs, database schemas,
              classification algorithms, and documentation are developed by the DockTrack AI major project group , Jain college of engineering , Belagavi
              for educational and academic evaluation.
            </p>
          </section>

          {/* Section 5 */}
          <section className="legal-section">
            <h2 className="legal-section-title">5. Acceptable Use Policy</h2>
            <p className="legal-text">You agree that you will NOT:</p>
            <ul className="legal-list">
              <li className="legal-list-item">Reverse engineer, decompile, or disassemble any portion of the DocTrack AI binary or service layer;</li>
              <li className="legal-list-item">Bypass, disable, or circumvent authentication, rate limiters, or access restrictions;</li>
              <li className="legal-list-item">Perform unauthorized vulnerability scanning or denial-of-service stress tests without written permission;</li>
              <li className="legal-list-item">Use the Service to store child sexual abuse material (CSAM), non-consensual imagery, or terroristic materials.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="legal-section">
            <h2 className="legal-section-title">6. Limitation of Liability</h2>
            <p className="legal-text">
              TO THE FULLEST EXTENT PERMISSIBLE UNDER APPLICABLE LAW, IN NO EVENT SHALL DOCKTRACK AI MAJOR PROJECT GROUP, JAIN COLLEGE OF ENGINEERING, BELAGAVI,
              ITS STUDENT AUTHORS, FACULTY ADVISORS, OR AFFILIATED INSTITUTION BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              INCLUDING BUT NOT LIMITED TO: LOSS OF PROFITS, DATA LOSS, FINES OR PENALTIES INCURRED DUE TO MISSED EXPIRY DEADLINES, PASSPORT LAPSE, VEHICLE IMPOUNDMENT,
              OR DENIAL OF WARRANTY CLAIMS BY MANUFACTURERS.
            </p>
            <p className="legal-text">
              THIS PLATFORM IS AN ACADEMIC ENGINEERING DEMONSTRATOR PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTY OF ANY KIND,
              EXPRESS OR IMPLIED. USERS BEAR FULL RESPONSIBILITY FOR CALENDAR REVIEWS AND INDEPENDENT STATUTORY COMPLIANCE.
            </p>
          </section>

          {/* Section 7 */}
          <section className="legal-section">
            <h2 className="legal-section-title">7. Dispute Resolution & Governing Law</h2>
            <p className="legal-text">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of India, without regard to
              conflict of law doctrines. Any controversy, dispute, or claim arising out of or relating to these Terms shall be subject to the
              exclusive jurisdiction of the competent courts in Belagavi, Karnataka, India.
            </p>
          </section>

          {/* Section 8 */}
          <section className="legal-section">
            <h2 className="legal-section-title">8. Contact Information</h2>
            <p className="legal-text">
              For questions concerning these Terms, contact our legal counsel:
            </p>
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
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
