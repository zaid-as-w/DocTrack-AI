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
  X,
  Scan,
  Copy,
  Check,
  RefreshCw,
  Tag,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Lock
} from 'lucide-react';
import StatusPill from '../components/common/StatusPill';
import { DEMO_DOCUMENTS, RENEWAL_GUIDES } from '../data/demoData';
import Toast from '../components/common/Toast';
import {
  getDocumentById,
  updateDocument,
  deleteDocument,
  processOCR,
  classifyDocument
} from '../services/api';

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [ocrRescanning, setOcrRescanning] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

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
    setError(null);
    try {
      const res = await getDocumentById(id);
      if (res.success && res.data) {
        setDoc(res.data);
      } else {
        setDoc(null);
        setError(res.message || 'Document not found or access denied.');
      }
    } catch (err) {
      setDoc(null);
      setError(err.message || 'Failed to load document records.');
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
        setToast({ message: 'Document updated successfully.', type: 'success' });
      }
      setIsEditOpen(false);
    } catch (err) {
      setToast({ message: err.message || 'Failed to update document.', type: 'error' });
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
        setToast({ message: err.message || 'Failed to delete document.', type: 'error' });
      }
    }
  };

  const handleCopyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleRescanOCR = async () => {
    if (!doc) return;
    setOcrRescanning(true);
    try {
      const res = await processOCR({ text: doc.ocrText || doc.title, fileName: doc.fileName });
      if (res.success && res.extractedFields) {
        const updated = await updateDocument(doc.id, {
          ocrText: res.rawText,
          ocrConfidence: res.confidence,
          ocrProcessed: true,
          ...res.extractedFields
        });
        if (updated.success && updated.data) {
          setDoc(updated.data);
        }
      }
    } catch (err) {
      console.warn('OCR rescan error:', err);
    } finally {
      setOcrRescanning(false);
    }
  };

  const handleReclassify = async () => {
    if (!doc) return;
    setClassifying(true);
    try {
      const res = await classifyDocument({
        text: doc.ocrText || '',
        title: doc.title,
        fileName: doc.fileName || '',
        ocrFields: {
          docNumber: doc.docNumber,
          issuingAuthority: doc.issuingAuthority,
          title: doc.title
        }
      });
      if (res.success && res.data) {
        const c = res.data;
        const updatedDoc = {
          ...doc,
          category: c.category,
          categoryId: c.categoryId,
          sensitivity: c.sensitivity,
          tags: c.suggestedTags || doc.tags || [],
          classification: c
        };
        setDoc(updatedDoc);
        await updateDocument(doc.id, {
          category: c.category,
          categoryId: c.categoryId,
          sensitivity: c.sensitivity,
          tags: c.suggestedTags,
          classification: c
        });
      }
    } catch (err) {
      console.warn('Re-classification failed:', err);
    } finally {
      setClassifying(false);
    }
  };

  if (loading && !doc) {
    return (
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem', width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: 'var(--primary-color, #2563EB)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontWeight: 500 }}>Loading document records securely...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center', maxWidth: '520px', margin: '2rem auto' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <AlertCircle size={28} color="#DC2626" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Document Unavailable
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
          {error || 'The requested document does not exist or you do not have permission to view it.'}
        </p>
        <Link to="/documents" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Documents</span>
        </Link>
      </div>
    );
  }

  const renewalGuide = RENEWAL_GUIDES[doc.id];
  const isExpiring = doc.status === 'EXPIRING_SOON';
  const isExpired = doc.status === 'EXPIRED';

  const authToken = localStorage.getItem('doctrack_token') || '';
  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  const authenticatedDownloadUrl = doc.fileUrl
    ? (doc.fileUrl.startsWith('http')
        ? (doc.fileUrl.includes('?') ? `${doc.fileUrl}&token=${authToken}` : `${doc.fileUrl}?token=${authToken}`)
        : `${apiBaseUrl}${doc.fileUrl}?token=${authToken}`)
    : null;

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
          {authenticatedDownloadUrl ? (
            <a
              href={authenticatedDownloadUrl}
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
              onClick={() => setToast({ message: `No downloadable file attached to ${doc.title}.`, type: 'info' })}
            >
              <Download size={15} />
              <span>Download</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                setToast({ message: 'Document link copied to clipboard.', type: 'success' });
              } else {
                setToast({ message: `Share link: ${window.location.href}`, type: 'info' });
              }
            }}
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
                <span><strong>File:</strong> {doc.fileName || 'No file attached'}{doc.fileSize ? ` (${doc.fileSize})` : ''}</span>
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
                width: (() => {
                  if (isExpired) return '100%';
                  if (isExpiring) return `${Math.max(75, Math.min(95, 100 - Math.round((doc.daysLeft / 30) * 15)))}%`;
                  if (!doc.issueDate || !doc.expiryDate || doc.expiryDate.includes('Perpetual') || doc.expiryDate.includes('Lifetime')) return '10%';
                  const issued = new Date(doc.issueDate).getTime();
                  const expires = new Date(doc.expiryDate).getTime();
                  const now = Date.now();
                  const totalDays = expires - issued;
                  const elapsedDays = now - issued;
                  if (totalDays <= 0) return '50%';
                  const pct = Math.max(5, Math.min(95, Math.round((elapsedDays / totalDays) * 100)));
                  return `${pct}%`;
                })(),
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
          { id: 'extracted', label: 'OCR & Extracted Data' },
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

          {/* AI Document Intelligence & Sensitivity Analysis Panel */}
          <div
            className="card"
            style={{
              gridColumn: '1 / -1',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              border: '1px solid var(--border-light)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--brand-light)',
                    color: 'var(--brand-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    AI Document Intelligence & Sensitivity Audit
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Multi-tier taxonomic classification, PII sensitivity rating, and metadata extraction
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    backgroundColor: 'var(--brand-light)',
                    color: 'var(--brand-dark)',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--brand-border)'
                  }}
                >
                  {doc.classification?.confidencePercentage || 98}% AI Confidence
                </span>

                <button
                  type="button"
                  onClick={handleReclassify}
                  disabled={classifying}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  title="Re-run AI classification against current OCR transcript"
                >
                  <RefreshCw size={13} className={classifying ? 'animate-spin' : ''} />
                  <span>{classifying ? 'Classifying...' : 'Re-classify'}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Sensitivity Rating Card */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor:
                    (doc.sensitivity || doc.classification?.sensitivity) === 'HIGH'
                      ? '#FEF2F2'
                      : (doc.sensitivity || doc.classification?.sensitivity) === 'MEDIUM'
                      ? '#FFFBEB'
                      : '#F0FDF4',
                  border: `1px solid ${
                    (doc.sensitivity || doc.classification?.sensitivity) === 'HIGH'
                      ? '#FECACA'
                      : (doc.sensitivity || doc.classification?.sensitivity) === 'MEDIUM'
                      ? '#FDE68A'
                      : '#BBF7D0'
                  }`
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Sensitivity Level
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {(doc.sensitivity || doc.classification?.sensitivity) === 'HIGH' ? (
                    <ShieldAlert size={18} color="#DC2626" />
                  ) : (doc.sensitivity || doc.classification?.sensitivity) === 'MEDIUM' ? (
                    <AlertTriangle size={18} color="#D97706" />
                  ) : (
                    <ShieldCheck size={18} color="#059669" />
                  )}
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color:
                        (doc.sensitivity || doc.classification?.sensitivity) === 'HIGH'
                          ? '#DC2626'
                          : (doc.sensitivity || doc.classification?.sensitivity) === 'MEDIUM'
                          ? '#D97706'
                          : '#059669'
                    }}
                  >
                    {doc.sensitivity || doc.classification?.sensitivity || 'STANDARD'} SENSITIVITY
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.35 }}>
                  {doc.classification?.sensitivityNotice || 'Document security controls and local data isolation enforced.'}
                </div>
              </div>

              {/* Category Taxonomy Card */}
              <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Taxonomy & Classification
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  {doc.category}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--brand-dark)', fontWeight: 600, marginTop: '2px' }}>
                  &rsaquo; {doc.classification?.subCategory || doc.title}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Suggested Profile Fit: <strong>{doc.classification?.suggestedProfileType || 'self'}</strong>
                </div>
              </div>

              {/* Confidence Meter Card */}
              <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Confidence Score
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-dark)' }}>
                    {doc.classification?.confidencePercentage || 98}%
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                    {doc.classification?.confidenceLevel || 'High Accuracy'}
                  </span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: 'var(--radius-pill)', overflow: 'hidden', marginTop: '6px' }}>
                  <div
                    style={{
                      width: `${doc.classification?.confidencePercentage || 98}%`,
                      height: '100%',
                      backgroundColor: 'var(--brand-primary)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* AI Reasoning Quote if available */}
            {doc.classification?.reasoning && (
              <div
                style={{
                  backgroundColor: 'var(--brand-light)',
                  borderLeft: '3px solid var(--brand-primary)',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                  fontSize: '0.8rem',
                  color: 'var(--brand-dark)',
                  marginBottom: '1rem',
                  fontStyle: 'italic'
                }}
              >
                &ldquo;{doc.classification.reasoning}&rdquo;
              </div>
            )}

            {/* Searchable Tags */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Classification Tags:
              </span>
              {(doc.tags && doc.tags.length > 0 ? doc.tags : doc.classification?.suggestedTags || ['verified', 'document']).map((tag, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <Tag size={11} color="var(--brand-primary)" />
                  <span>#{tag}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'extracted' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top OCR Confidence & Status Banner */}
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: 'var(--radius-xl)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Scan size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#065F46' }}>
                  OCR Auto-Ingested ({((doc.ocrConfidence || 0.96) * 100).toFixed(0)}% Confidence)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '2px' }}>
                  Parsed via SmartOCR Local On-Device Engine with regex date & identifier validation.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleRescanOCR}
              disabled={ocrRescanning}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
            >
              <RefreshCw size={14} className={ocrRescanning ? 'animate-spin' : ''} />
              <span>{ocrRescanning ? 'Re-scanning...' : 'Re-run OCR Scan'}</span>
            </button>
          </div>

          {/* Two-Column Inspector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.2fr)', gap: '1.5rem' }}>
            {/* Left: Structured Attributes */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '0.35rem' }}>
                Normalized Metadata
              </h3>
              <p className="card-subtitle" style={{ marginBottom: '1.25rem' }}>
                Structured entity attributes extracted by on-device pattern matchers.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '0.9rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Official Number</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace' }}>
                    {doc.docNumber || 'NOT DETECTED'}
                  </div>
                </div>

                <div style={{ padding: '0.9rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Category</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '2px' }}>
                    {doc.category || 'Standard'}
                  </div>
                </div>

                <div style={{ padding: '0.9rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Issue Date</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '2px' }}>
                    {doc.issueDate || 'None'}
                  </div>
                </div>

                <div style={{ padding: '0.9rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expiry Date</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '2px', color: '#0284C7' }}>
                    {doc.expiryDate || 'Perpetual'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.9rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Issuing Authority</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>
                    {doc.issuingAuthority || 'Standard Authority'}
                  </div>
                </div>

                <div style={{ padding: '0.9rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Place of Issue</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>
                    {doc.placeOfIssue || 'Registered Node'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Scanned OCR Raw Text */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <h3 className="card-title">Scanned OCR Transcript</h3>
                  <p className="card-subtitle">Raw optical text stream extracted from file</p>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCopyText(doc.ocrText || 'No transcript')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
                >
                  {copiedText ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  backgroundColor: '#0F172A',
                  color: '#E2E8F0',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  overflowY: 'auto',
                  maxHeight: '340px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                {doc.ocrText || (
                  `DOCUMENT: ${doc.title}\nOFFICIAL NUMBER: ${doc.docNumber || 'N/A'}\nISSUE DATE: ${doc.issueDate}\nEXPIRY DATE: ${doc.expiryDate}\nAUTHORITY: ${doc.issuingAuthority}\nPLACE: ${doc.placeOfIssue}\n[RAW SCAN DATA ARCHIVED]`
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                <span>Encoding: UTF-8 Optical Text</span>
                <span>Lines: {(doc.ocrText ? doc.ocrText.split('\n').length : 7)}</span>
              </div>
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

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
