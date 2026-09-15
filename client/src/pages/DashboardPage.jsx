import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
  AlertCircle,
  ArrowRight,
  UploadCloud,
  ChevronRight,
  Calendar,
  Sparkles
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import ProfileChip from '../components/common/ProfileChip';
import StatusPill from '../components/common/StatusPill';
import CategoryCard from '../components/common/CategoryCard';
import { DEMO_PROFILES, DEMO_CATEGORIES, DEMO_DOCUMENTS } from '../data/demoData';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [selectedProfileId, setSelectedProfileId] = useState('all');

  // Filter documents by selected profile
  const filteredDocs = selectedProfileId === 'all'
    ? DEMO_DOCUMENTS
    : DEMO_DOCUMENTS.filter(d => d.profileId === selectedProfileId);

  // Compute live statistics based on active filter
  const activeCount = filteredDocs.filter(d => d.status === 'ACTIVE').length;
  const expiringCount = filteredDocs.filter(d => d.status === 'EXPIRING_SOON').length;
  const expiredCount = filteredDocs.filter(d => d.status === 'EXPIRED').length;
  const totalCount = filteredDocs.length;

  const urgentDocs = filteredDocs.filter(d => d.status === 'EXPIRING_SOON' || d.status === 'EXPIRED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Greeting & Profile Selector Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Document Overview
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
            Monitor lifecycle statuses, expiry deadlines, and identity documents.
          </p>
        </div>

        {/* Profile Switcher Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '0.25rem' }}>
            PROFILE:
          </span>
          {DEMO_PROFILES.map(profile => (
            <ProfileChip
              key={profile.id}
              profile={profile}
              active={selectedProfileId === profile.id}
              onClick={setSelectedProfileId}
            />
          ))}
        </div>
      </div>

      {/* Action Required Banner (Attention Engine) */}
      {urgentDocs.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '1px solid #FDE68A',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#F59E0B',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertCircle size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#92400E', fontSize: '1rem' }}>
                Action Required: {urgentDocs.length} {urgentDocs.length === 1 ? 'document requires' : 'documents require'} your attention
              </div>
              <div style={{ fontSize: '0.85rem', color: '#B45309', marginTop: '2px' }}>
                {urgentDocs.map(d => `${d.title} (${d.status === 'EXPIRED' ? 'Expired' : `${d.daysLeft} days left`})`).join(' • ')}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm"
            style={{
              backgroundColor: '#92400E',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600
            }}
            onClick={() => navigate('/renewal-assistant')}
          >
            <Sparkles size={15} />
            <span>Launch Renewal Assistant</span>
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="stats-grid">
        <StatCard
          label="Active Documents"
          value={activeCount}
          subtext="Valid and in good standing"
          icon={ShieldCheck}
          accentColor="var(--brand-primary)"
          iconBg="var(--brand-light)"
          iconColor="var(--brand-primary)"
        />

        <StatCard
          label="Expiring Soon"
          value={expiringCount}
          subtext="Renewal window active (<30 days)"
          icon={Clock}
          accentColor="#F59E0B"
          iconBg="#FEF3C7"
          iconColor="#D97706"
        />

        <StatCard
          label="Expired"
          value={expiredCount}
          subtext="Immediate renewal needed"
          icon={AlertTriangle}
          accentColor="#EF4444"
          iconBg="#FEE2E2"
          iconColor="#DC2626"
        />

        <StatCard
          label="Total Tracked"
          value={totalCount}
          subtext={`Across ${DEMO_PROFILES.length - 1} profile entities`}
          icon={FileText}
          accentColor="#3B82F6"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
        />
      </div>

      {/* Category Explorer */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 className="card-title">Document Categories</h2>
            <p className="card-subtitle">Browse organized records by classification</p>
          </div>
          <Link
            to="/documents"
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="category-grid">
          {DEMO_CATEGORIES.map(category => (
            <CategoryCard
              key={category.id}
              category={category}
              onClick={() => navigate(`/documents?category=${category.id}`)}
            />
          ))}
        </div>
      </div>

      {/* Recent Document Registry Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Document Registry</h2>
            <p className="card-subtitle">Showing documents tracked under current profile filter</p>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/documents')}
          >
            <span>Full Document Library</span>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="doc-table-wrapper">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Category</th>
                <th>Owner / Profile</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--brand-light)',
                          color: 'var(--brand-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <FileText size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.docNumber}</div>
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
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {doc.profileName}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                      <Calendar size={14} color="var(--text-muted)" />
                      <span>{doc.expiryDate}</span>
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
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
