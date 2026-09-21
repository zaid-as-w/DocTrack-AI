import React, { useEffect } from 'react';
import LegalHeader from './LegalHeader';
import Footer from '../../components/layout/Footer';
import { Building2, ShieldCheck, Mail, Phone, MapPin, Scale, CheckCircle2, FileText } from 'lucide-react';

export default function LegalNoticePage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Legal Notice (Impressum) — DocTrack AI';
  }, []);

  return (
    <div className="legal-layout-container">
      <LegalHeader title="Legal Notice (Impressum)" />

      <main className="legal-article-container" id="main-content">
        <article className="legal-article-card">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary-accessible)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem' }}>
            <Building2 size={16} />
            <span>Corporate Transparency & Regulatory Disclosure</span>
          </div>

          <h1 className="legal-title">Legal Notice & Impressum</h1>
          <div className="legal-meta">
            <span><strong>Status:</strong> Academic Major Engineering Project</span>
            <span><strong>Jurisdiction:</strong> Belagavi, Karnataka, India</span>
          </div>

          {/* Section 1: Project Details */}
          <section className="legal-section">
            <h2 className="legal-section-title">1. Project & Institution Identification</h2>
            <p className="legal-text">
              The developers and operators of DocTrack AI are:
            </p>
            <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <table style={{ width: '100%', fontSize: '0.88rem', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.4rem 0', fontWeight: 700, width: '35%' }}>Project Entity:</td>
                    <td style={{ padding: '0.4rem 0', color: 'var(--text-primary)' }}>DockTrack AI major project group , Jain college of engineering , Belagavi</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.4rem 0', fontWeight: 700 }}>Academic Department:</td>
                    <td style={{ padding: '0.4rem 0' }}>Department of Computer Science & Engineering</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.4rem 0', fontWeight: 700 }}>College / Campus:</td>
                    <td style={{ padding: '0.4rem 0', lineHeight: 1.5 }}>
                      Jain College of Engineering<br />
                      T.S. Nagar, Hunchanatti Road, Machhe,<br />
                      Belagavi, Karnataka 590014, India
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.4rem 0', fontWeight: 700 }}>Student Project Lead:</td>
                    <td style={{ padding: '0.4rem 0' }}>Zaid Attar & Major Project Team</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.4rem 0', fontWeight: 700 }}>Direct Contact Phone:</td>
                    <td style={{ padding: '0.4rem 0' }}>+91 7019182324</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.4rem 0', fontWeight: 700 }}>Official Project Email:</td>
                    <td style={{ padding: '0.4rem 0' }}><a href="mailto:docktrack0@gmail.com" style={{ color: 'var(--accent-blue)' }}>docktrack0@gmail.com</a></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2: Statutory Grievance Redressal */}
          <section className="legal-section">
            <h2 className="legal-section-title">2. Statutory Grievance Redressal Officer</h2>
            <p className="legal-text">
              Pursuant to Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021
              and Section 8 of the Indian Digital Personal Data Protection Act, 2023, the designated Grievance Desk is:
            </p>
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              <strong>Privacy Compliance & Grievance Desk</strong><br />
              DockTrack AI major project group , Jain college of engineering , Belagavi<br />
              Email: <a href="mailto:docktrack0@gmail.com" style={{ color: 'var(--accent-blue)' }}>docktrack0@gmail.com</a><br />
              Telephone: +91 7019182324<br />
              Campus: Jain College of Engineering, Belagavi, Karnataka 590014, India<br />
              Response Period: Inquiries and grievances are acknowledged within 48 hours.
            </div>
          </section>

          {/* Section 3: Copyright & Licensing Disclosures */}
          <section className="legal-section">
            <h2 className="legal-section-title">3. Copyright, Media & Open Source Attribution</h2>
            <p className="legal-text">
              All proprietary system code, visual stylesheets, and algorithmic pipelines are &copy; 2026 DockTrack AI major project group , Jain college of engineering , Belagavi.
            </p>
            <p className="legal-text">
              <strong>Image & Icon Copyright Audit:</strong> The DocTrack AI frontend utilizes strictly original SVG iconography provided
              by the open-source Lucide React library (licensed under the permissive ISC License). No copyrighted third-party stock photography,
              unlicensed watermark images, or scraped commercial media assets are present in this software repository.
            </p>
            <p className="legal-text">
              <strong>Font Licensing:</strong> The platform typography relies on <em>Inter</em> and <em>Outfit</em> fonts, licensed under
              the SIL Open Font License (OFL 1.1).
            </p>
          </section>

          {/* Section 4: Academic Inquiries */}
          <section className="legal-section">
            <h2 className="legal-section-title">4. Inquiries & Feedback</h2>
            <p className="legal-text">
              For any feedback, academic evaluations, or compliance inquiries, contact the project team directly at{' '}
              <a href="mailto:docktrack0@gmail.com" style={{ color: 'var(--accent-blue)' }}>docktrack0@gmail.com</a>.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
