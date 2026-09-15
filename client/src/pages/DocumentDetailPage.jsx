import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Shield,
  Download,
  Share2,
  Edit3,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import StatusPill from '../components/common/StatusPill';
import { DEMO_DOCUMENTS, RENEWAL_GUIDES } from '../data/demoData';

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Locate the requested document or fallback to first document
  const doc = DEMO_DOCUMENTS.find(d => d.id === id) || DEMO_DOCUMENTS[0];
  const renewalGuide = RENEWAL_GUIDES[doc.id];

  // Calculate timeline percentage (e.g. for a 10-year document)
  const isExpiring = doc.status === 'EXPIRING_SOON';
  const isExpired = doc.status === 'EXPIRED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back link & Top Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Documents</span>
        </button>

        {/* Document Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => alert(`Simulated downloading: ${doc.fileName}`)}
          >
            <Download size={15} />
            <span>Download</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => alert(`Simulated secure share link generated for: ${doc.title}`)}
          >
            <Share2 size={15} />
            <span>Share</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => alert('Document editing will be enabled in Iteration 5 (Document CRUD).')}
          >
            <Edit3 size={15} />
            <span>Edit</span>
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
            onClick={() => alert('Document deletion will be enabled in Iteration 5.')}
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Primary Header Card */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div
              style={{
                width: '58px',
                height: '58px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--gradient-brand)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-brand)',
                flexShrink: 0
              }}
            >
              <FileText size={28} strokeWidth={2.2} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {doc.title}
                </h1>
                <StatusPill status={doc.status} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px', flexWrap: 'wrap' }}>
                <span><strong>Profile:</strong> {doc.profileName}</span>
                <span>•</span>
                <span><strong>Category:</strong> {doc.category}</span>
                <span>•</span>
                <span><strong>File:</strong> {doc.fileName} ({doc.fileSize})</span>
              </div>
            </div>
          </div>

          {renewalGuide && (
            <Link
              to="/renewal-assistant"
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Sparkles size={16} />
              <span>Renewal Guide</span>
            </Link>
          )}
        </div>

        {/* Expiry Lifecycle Timeline */}
        <div
          style={{
            marginTop: '1.75rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-light)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Issued: {doc.issueDate}
            </span>
            <span style={{ color: isExpired ? 'var(--status-expired-text)' : isExpiring ? 'var(--status-expiring-text)' : 'var(--status-active-text)' }}>
              {isExpired ? `Expired (${Math.abs(doc.daysLeft)} days ago)` : isExpiring ? `Expires in ${doc.daysLeft} days` : `Valid until ${doc.expiryDate}`}
            </span>
          </div>
          <div className="progress-bar-bg" style={{ height: '8px' }}>
            <div
              className="progress-bar-fill"
              style={{
                width: isExpired ? '100%' : isExpiring ? '88%' : '35%',
                background: isExpired ? 'var(--status-expired-text)' : isExpiring ? 'var(--status-expiring-text)' : 'var(--brand-primary)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'overview', label: 'Overview & Preview' },
          { id: 'extracted', label: 'Extracted Metadata (OCR)' },
          { id: 'reminders', label: 'Reminder Schedule' },
          { id: 'history', label: 'Lifecycle Audit History' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-pill)', padding: '0.45rem 1rem' }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Areas */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1.5rem' }}>
          {/* Document Preview Card */}
          <div className="doc-preview-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={20} color="#10B981" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', color: '#10B981' }}>
                  DOCTRACK VERIFIED DOCUMENT
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                ID: {doc.id}
              </span>
            </div>

            <div style={{ margin: '2rem 0' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Document Identifier
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.08em', marginTop: '4px' }}>
                {doc.docNumber}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Owner Name</div>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{doc.profileName}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Valid Until</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#38BDF8' }}>{doc.expiryDate}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Issuing Authority</div>
                <div style={{ fontSize: '0.88rem' }}>{doc.issuingAuthority}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Place of Issue</div>
                <div style={{ fontSize: '0.88rem' }}>{doc.placeOfIssue}</div>
              </div>
            </div>
          </div>

          {/* Document Summary Card */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              Document Intelligence
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {doc.summary}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Classification:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>OCR Verified:</span>
                <span style={{ fontWeight: 600, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={15} /> Yes
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Uploaded:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Renewal Support:</span>
                <span style={{ fontWeight: 600, color: doc.renewalRequired ? 'var(--status-expiring-text)' : 'var(--text-muted)' }}>
                  {doc.renewalRequired ? 'Action Guided' : 'Not Required'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'extracted' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
            Structured Metadata (Tesseract / AI Normalized)
          </h3>
          <p className="card-subtitle" style={{ marginBottom: '1.25rem' }}>
            These values were extracted and verified during the ingestion lifecycle.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Official Number</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>{doc.docNumber}</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Issuing Authority</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>{doc.issuingAuthority}</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Issue Date</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>{doc.issueDate}</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expiry Date</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>{doc.expiryDate}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
            Configured Expiry Reminder Triggers
          </h3>
          <p className="card-subtitle" style={{ marginBottom: '1.25rem' }}>
            Standard lifecycle notification thresholds for this document category.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { days: '90 Days Before Expiry', status: 'Delivered', date: 'Passed' },
              { days: '30 Days Before Expiry', status: 'Triggered (Active Alert)', date: 'Current window' },
              { days: '7 Days Before Expiry', status: 'Scheduled', date: 'Pending' },
              { days: '1 Day Before Expiry', status: 'Scheduled', date: 'Pending' }
            ].map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Clock size={18} color="var(--brand-primary)" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.days}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{r.date}</span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: r.status.includes('Active') ? 'var(--status-expiring-bg)' : 'var(--bg-surface)',
                      color: r.status.includes('Active') ? 'var(--status-expiring-text)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
            Audit Log & Ingestion Trail
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--brand-primary)', marginTop: '6px' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Document Verified & Saved to Local Storage</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(doc.uploadedAt).toLocaleString()} • User: Zaid</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6', marginTop: '6px' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>OCR Metadata Extracted & Normalized</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Extracted doc number, issue date, and expiry date</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
