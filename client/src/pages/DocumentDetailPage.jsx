import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  X
} from 'lucide-react';
import StatusPill from '../components/common/StatusPill';
import { DEMO_DOCUMENTS, RENEWAL_GUIDES } from '../data/demoData';
import { getDocumentById, updateDocument, deleteDocument } from '../services/api';

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDocNumber, setEditDocNumber] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editAuthority, setEditAuthority] = useState('');
  const [editPlace, setEditPlace] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDoc = async () => {
    setLoading(true);
    try {
      const res = await getDocumentById(id);
      if (res.success && res.data) {
        setDoc(res.data);
      } else {
        const found = DEMO_DOCUMENTS.find(d => d.id === id) || DEMO_DOCUMENTS[0];
        setDoc(found);
      }
    } catch {
      const found = DEMO_DOCUMENTS.find(d => d.id === id) || DEMO_DOCUMENTS[0];
      setDoc(found);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoc();
  }, [id]);

  const openEdit = () => {
    if (!doc) return;
    setEditTitle(doc.title);
    setEditDocNumber(doc.docNumber || '');
    setEditExpiryDate(doc.expiryDate || '');
    setEditAuthority(doc.issuingAuthority || '');
    setEditPlace(doc.placeOfIssue || '');
    setEditSummary(doc.summary || '');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateDocument(doc.id, {
        title: editTitle.trim(),
        docNumber: editDocNumber.trim(),
        expiryDate: editExpiryDate.trim(),
        issuingAuthority: editAuthority.trim(),
        placeOfIssue: editPlace.trim(),
        summary: editSummary.trim()
      });
      if (res.success && res.data) {
        setDoc(res.data);
      }
      setIsEditOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to update document.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${doc.title}"?`)) {
      try {
        await deleteDocument(doc.id);
        navigate('/documents');
      } catch (err) {
        alert(err.message || 'Failed to delete document.');
      }
    }
  };

  if (loading && !doc) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading document records...
      </div>
    );
  }

  if (!doc) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Document not found</h2>
        <Link to="/documents" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Documents
        </Link>
      </div>
    );
  }

  const renewalGuide = RENEWAL_GUIDES[doc.id];
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {doc.fileUrl ? (
            <a
              href={`http://localhost:5000${doc.fileUrl}`}
              target="_blank"
              rel="noreferrer"
              download
              className="btn btn-secondary btn-sm"
            >
              <Download size={15} />
              <span>Download File</span>
            </a>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => alert(`Simulated downloading: ${doc.fileName || 'document.pdf'}`)}
            >
              <Download size={15} />
              <span>Download</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => alert(`Secure verification share token generated for: ${doc.title}`)}
          >
            <Share2 size={15} />
            <span>Share</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={openEdit}
          >
            <Edit3 size={15} />
            <span>Edit Metadata</span>
          </button>

          <button
            type="button"
            className="btn btn-sm"
            style={{ color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
            onClick={handleDelete}
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
              {isExpired ? `Expired (${Math.abs(doc.daysLeft || 0)} days ago)` : isExpiring ? `Expires in ${doc.daysLeft} days` : `Valid until ${doc.expiryDate}`}
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
          { id: 'overview', label: 'Overview & Security' },
          { id: 'extracted', label: 'Extracted Metadata' },
          { id: 'reminders', label: 'Reminder Timeline' },
          { id: 'history', label: 'Audit Log' }
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
                <Shield size={20} color="var(--brand-primary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--brand-primary)' }}>
                  DOCTRACK SECURE CARD
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                ID: {doc.id}
              </span>
            </div>

            <div style={{ margin: '2rem 0' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Official Identifier
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.08em', marginTop: '4px' }}>
                {doc.docNumber || 'NOT APPLICABLE'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Owner Profile</div>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{doc.profileName}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Valid Until</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#38BDF8' }}>{doc.expiryDate}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Issuing Authority</div>
                <div style={{ fontSize: '0.88rem' }}>{doc.issuingAuthority || 'Standard Authority'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Place of Issue</div>
                <div style={{ fontSize: '0.88rem' }}>{doc.placeOfIssue || 'Registered Node'}</div>
              </div>
            </div>
          </div>

          {/* Document Summary Card */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              Document Intelligence
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {doc.summary || 'Verified document stored on secure local disk storage.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Category:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Storage Location:</span>
                <code style={{ fontSize: '0.78rem', color: 'var(--brand-dark)' }}>
                  {doc.fileUrl ? doc.fileUrl : 'server/uploads/ (Local Disk)'}
                </code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Indexed Date:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Verification:</span>
                <span style={{ fontWeight: 600, color: 'var(--brand-dark)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={15} /> Confirmed
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'extracted' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
            Structured Metadata Attributes
          </h3>
          <p className="card-subtitle" style={{ marginBottom: '1.25rem' }}>
            Normalized attributes ready for OCR and automated classification.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Official Number</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>{doc.docNumber || 'None'}</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Issuing Authority</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>{doc.issuingAuthority || 'None'}</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Issue Date</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>{doc.issueDate || 'None'}</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expiry Date</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>{doc.expiryDate || 'None'}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
            Scheduled Expiry Checkpoints
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {['90 Days Threshold', '30 Days Threshold', '7 Days Threshold', '1 Day Final Notice'].map((t, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Clock size={18} color="var(--brand-primary)" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t}</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automated Monitor Active</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
            Ingestion & Modification Audit Log
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--brand-primary)', marginTop: '6px' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Document Verified & Saved to Local Storage</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {new Date(doc.uploadedAt).toLocaleString()} • Owner: {doc.profileName}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '550px',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--shadow-lg)',
              padding: '2rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Edit Document Metadata</h2>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="btn-ghost"
                style={{ padding: '0.35rem', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Document Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="search-container"
                  style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Document Number
                </label>
                <input
                  type="text"
                  value={editDocNumber}
                  onChange={(e) => setEditDocNumber(e.target.value)}
                  className="search-container"
                  style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="search-container"
                  style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Issuing Authority
                </label>
                <input
                  type="text"
                  value={editAuthority}
                  onChange={(e) => setEditAuthority(e.target.value)}
                  className="search-container"
                  style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Summary / Notes
                </label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
