import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  FileText,
  Calendar,
  Eye,
  Download,
  Share2,
  Trash2
} from 'lucide-react';
import StatusPill from '../components/common/StatusPill';
import EmptyState from '../components/common/EmptyState';
import { DEMO_DOCUMENTS, DEMO_CATEGORIES } from '../data/demoData';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialSearch = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'all';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredDocuments = useMemo(() => {
    return DEMO_DOCUMENTS.filter(doc => {
      // Category filter
      if (selectedCategory !== 'all' && doc.categoryId !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && doc.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesNumber = (doc.docNumber || '').toLowerCase().includes(q);
        const matchesOwner = doc.profileName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNumber && !matchesOwner) return false;
      }
      return true;
    });
  }, [searchQuery, selectedCategory, statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Title & Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Documents Library
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '3px' }}>
            Browse, inspect, and manage all indexed personal and family records.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => alert('Document upload modal will be introduced in Iteration 5 (Document CRUD + Upload).')}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Upload Document</span>
        </button>
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
            {['ALL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED'].map(status => (
              <button
                key={status}
                type="button"
                className={`btn btn-sm ${statusFilter === status ? 'btn-secondary' : 'btn-ghost'}`}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: statusFilter === status ? '#FFFFFF' : 'transparent',
                  boxShadow: statusFilter === status ? 'var(--shadow-sm)' : 'none'
                }}
                onClick={() => setStatusFilter(status)}
              >
                {status.replace('_', ' ')}
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
            <option value="all">All Categories ({DEMO_DOCUMENTS.length})</option>
            {DEMO_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.docCount})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Document Records List */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          title="No documents match your query"
          description="Try broadening your search term or switching the category and status filters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedCategory('all');
            setStatusFilter('ALL');
          }}
        />
      ) : (
        <div className="doc-table-wrapper">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Document Details</th>
                <th>Category</th>
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
                          color: 'var(--brand-primary)',
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
                          {doc.docNumber} • {doc.fileSize}
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
                    <StatusPill status={doc.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <Eye size={14} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
