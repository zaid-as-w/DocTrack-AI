import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  FileText,
  Calendar,
  Eye,
  Trash2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import StatusPill from '../components/common/StatusPill';
import EmptyState from '../components/common/EmptyState';
import UploadModal from '../components/document/UploadModal';
import { DEMO_CATEGORIES, DEMO_DOCUMENTS } from '../data/demoData';
import Toast from '../components/common/Toast';
import { getDocuments, deleteDocument } from '../services/api';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialSearch = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'all';

  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sensitivityFilter, setSensitivityFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDocuments();
      if (res.success && Array.isArray(res.data)) {
        setDocuments(res.data);
      } else {
        setDocuments([]);
        setError(res.message || 'Failed to retrieve documents.');
      }
    } catch (err) {
      setDocuments([]);
      setError(err.message || 'Failed to retrieve documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    if (searchParams.get('upload') === 'true') {
      setIsUploadOpen(true);
    }
    const qParam = searchParams.get('q');
    if (qParam !== null) {
      setSearchQuery(qParam);
    }
    const catParam = searchParams.get('category');
    if (catParam !== null) {
      setSelectedCategory(catParam);
    }
  }, [searchParams]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      setDeletingId(null);
      setToast({ message: 'Document deleted successfully.', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete document', type: 'error' });
    }
  };

  const handleUploadSuccess = (newDoc) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Category filter
      if (selectedCategory !== 'all' && doc.categoryId !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && doc.status !== statusFilter) {
        return false;
      }
      // Sensitivity filter
      if (sensitivityFilter !== 'ALL') {
        const docSens = doc.sensitivity || doc.classification?.sensitivity || 'STANDARD';
        if (docSens !== sensitivityFilter) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = doc.title?.toLowerCase().includes(q);
        const matchesNumber = (doc.docNumber || '').toLowerCase().includes(q);
        const matchesOwner = (doc.profileName || '').toLowerCase().includes(q);
        const matchesTags = (doc.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesNumber && !matchesOwner && !matchesTags) return false;
      }
      return true;
    });
  }, [documents, searchQuery, selectedCategory, statusFilter, sensitivityFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Title & Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Document Repository
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '3px' }}>
            Inspect, upload, manage, and delete indexed personal and asset records.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchDocs}
            disabled={loading}
            title="Refresh documents list"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsUploadOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search box */}
          <div className="search-container" style={{ width: '300px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by title, number, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--bg-subtle)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            {[
              { key: 'ALL', label: 'All' },
              { key: 'ACTIVE', label: 'Active' },
              { key: 'EXPIRING_SOON', label: 'Expiring Soon' },
              { key: 'EXPIRED', label: 'Expired' }
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`btn btn-sm ${statusFilter === key ? 'btn-secondary' : 'btn-ghost'}`}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: statusFilter === key ? '#FFFFFF' : 'transparent',
                  boxShadow: statusFilter === key ? 'var(--shadow-sm)' : 'none'
                }}
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
              fontWeight: 500
            }}
          >
            <option value="all">All Categories ({documents.length})</option>
            {DEMO_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Sensitivity Filter Dropdown */}
          <select
            value={sensitivityFilter}
            onChange={(e) => setSensitivityFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
              fontWeight: 500
            }}
          >
            <option value="ALL">All Sensitivities</option>
            <option value="HIGH">High (Restricted PII)</option>
            <option value="MEDIUM">Medium Sensitivity</option>
            <option value="LOW">Low (Standard)</option>
          </select>
        </div>
      </div>

      {/* Error state banner */}
      {error && (
        <div style={{ padding: '1rem 1.25rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={18} color="#DC2626" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{error}</span>
          </div>
          <button type="button" onClick={fetchDocs} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* Document Records List */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          title="No documents found"
          description="There are currently no records matching your active search, category, or sensitivity filters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedCategory('all');
            setStatusFilter('ALL');
            setSensitivityFilter('ALL');
          }}
        />
      ) : (
        <div className="doc-table-wrapper">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Document Details</th>
                <th>Category</th>
                <th>Sensitivity</th>
                <th>Profile Owner</th>
                <th>Issue Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--brand-light)',
                          color: 'var(--brand-dark)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <FileText size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {doc.docNumber || 'No official #'} • {doc.fileSize || 'Stored'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--bg-subtle)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-xs)'
                      }}
                    >
                      {doc.category}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor:
                          (doc.sensitivity || doc.classification?.sensitivity) === 'HIGH'
                            ? '#FEE2E2'
                            : (doc.sensitivity || doc.classification?.sensitivity) === 'MEDIUM'
                            ? '#FFFBEB'
                            : '#ECFDF5',
                        color:
                          (doc.sensitivity || doc.classification?.sensitivity) === 'HIGH'
                            ? '#DC2626'
                            : (doc.sensitivity || doc.classification?.sensitivity) === 'MEDIUM'
                            ? '#D97706'
                            : '#059669',
                        border: `1px solid ${
                          (doc.sensitivity || doc.classification?.sensitivity) === 'HIGH'
                            ? '#FECACA'
                            : (doc.sensitivity || doc.classification?.sensitivity) === 'MEDIUM'
                            ? '#FDE68A'
                            : '#A7F3D0'
                        }`
                      }}
                    >
                      {doc.sensitivity || doc.classification?.sensitivity || 'STANDARD'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {doc.profileName}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {doc.issueDate}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                      <Calendar size={14} color="var(--text-muted)" />
                      <span style={{ fontWeight: 600, color: doc.status === 'EXPIRED' ? 'var(--status-expired-text)' : 'var(--text-primary)' }}>
                        {doc.expiryDate}
                      </span>
                    </div>
                  </td>
                  <td>
                    <StatusPill status={doc.processingStatus === 'processing' ? 'PROCESSING' : doc.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/documents/${doc.id}`)}
                      >
                        <Eye size={14} />
                        <span>Inspect</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="Delete Document"
                        onClick={() => setDeletingId(doc.id)}
                        style={{ color: '#DC2626', padding: '0.45rem' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Inline Delete confirmation popover */}
                    {deletingId === doc.id && (
                      <div
                        style={{
                          position: 'absolute',
                          right: '2rem',
                          marginTop: '0.5rem',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #FECACA',
                          boxShadow: 'var(--shadow-lg)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.75rem',
                          zIndex: 10,
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Confirm delete document?
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ backgroundColor: '#DC2626', color: '#FFFFFF', padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                            onClick={(e) => handleDelete(doc.id, e)}
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                            onClick={() => setDeletingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Document Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
