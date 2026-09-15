import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Calendar,
  Sparkles,
  RefreshCw,
  Activity,
  CheckCircle2,
  FileUp,
  ShieldAlert
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import ProfileChip from '../components/common/ProfileChip';
import StatusPill from '../components/common/StatusPill';
import CategoryCard from '../components/common/CategoryCard';
import { DEMO_PROFILES, DEMO_CATEGORIES, DEMO_DOCUMENTS } from '../data/demoData';
import { getDashboardStats, getDashboardRecent } from '../services/api';

const ACTIVITY_ICONS = {
  EXPIRY_ALERT: AlertTriangle,
  EXPIRED: ShieldAlert,
  VERIFIED: CheckCircle2,
  UPLOAD: FileUp,
  STATUS_CHANGE: Activity
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [selectedProfileId, setSelectedProfileId] = useState('all');

  const [statsData, setStatsData] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = async (profileId) => {
    setRefreshing(true);
    try {
      const [statsRes, recentRes] = await Promise.all([
        getDashboardStats(profileId),
        getDashboardRecent(profileId, 5)
      ]);

      if (statsRes.success) {
        setStatsData(statsRes.data);
      }
      if (recentRes.success) {
        setRecentDocs(recentRes.data);
      }
      setError(null);
    } catch (err) {
      console.warn('Dashboard API fallback to local fixtures:', err);
      // Fallback calculation from local fixtures if backend unreachable
      const fallbackDocs = profileId === 'all'
        ? DEMO_DOCUMENTS
        : DEMO_DOCUMENTS.filter(d => d.profileId === profileId);

      setStatsData({
        metrics: {
          total: fallbackDocs.length,
          active: fallbackDocs.filter(d => d.status === 'ACTIVE').length,
          expiringSoon: fallbackDocs.filter(d => d.status === 'EXPIRING_SOON').length,
          expired: fallbackDocs.filter(d => d.status === 'EXPIRED').length
        },
        urgentDocuments: fallbackDocs.filter(d => d.status === 'EXPIRING_SOON' || d.status === 'EXPIRED'),
        categorySummary: DEMO_CATEGORIES.map(c => ({ name: c.name, docCount: c.docCount })),
        recentActivity: [
          { id: '1', type: 'EXPIRY_ALERT', title: 'Passport Expiry Approaching', description: '27 days remaining', timestamp: new Date().toISOString() },
          { id: '2', type: 'EXPIRED', title: 'Driving License Expired', description: 'Action recommended', timestamp: new Date().toISOString() }
        ]
      });
      setRecentDocs(fallbackDocs.slice(0, 5));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedProfileId);
  }, [selectedProfileId]);

  const metrics = statsData?.metrics || {
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0
  };

  const urgentDocs = statsData?.urgentDocuments || [];
  const activities = statsData?.recentActivity || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Greeting & Profile Selector Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--brand-dark)',
                backgroundColor: 'var(--brand-light)',
                border: '1px solid var(--brand-border)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                textTransform: 'uppercase'
              }}
            >
              Iteration 3: Live Backend Engine
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Document Lifecycle Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '3px' }}>
            Real-time calculations derived from your backend database and document models.
          </p>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchDashboardData(selectedProfileId)}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Backend'}</span>
          </button>

          {/* Profile Switcher Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '0.2rem' }}>
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
                Attention Engine: {urgentDocs.length} {urgentDocs.length === 1 ? 'document requires' : 'documents require'} renewal action
              </div>
              <div style={{ fontSize: '0.85rem', color: '#B45309', marginTop: '2px' }}>
                {urgentDocs.map(d => `${d.title} (${d.status === 'EXPIRED' ? 'Expired' : `${d.daysLeft} days remaining`})`).join(' • ')}
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
            <span>Open Renewal Checklist</span>
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="stats-grid">
        <StatCard
          label="Active Documents"
          value={metrics.active}
          subtext="Valid and in good standing"
          icon={ShieldCheck}
          accentColor="var(--brand-primary)"
          iconBg="var(--brand-light)"
          iconColor="var(--brand-dark)"
        />

        <StatCard
          label="Expiring Soon"
          value={metrics.expiringSoon}
          subtext="Action window active (<30 days)"
          icon={Clock}
          accentColor="#F59E0B"
          iconBg="#FEF3C7"
          iconColor="#D97706"
        />

        <StatCard
          label="Expired"
          value={metrics.expired}
          subtext="Immediate renewal required"
          icon={AlertTriangle}
          accentColor="#EF4444"
          iconBg="#FEE2E2"
          iconColor="#DC2626"
        />

        <StatCard
          label="Total Documents"
          value={metrics.total}
          subtext="Derived from backend collection"
          icon={FileText}
          accentColor="var(--brand-classic)"
          iconBg="var(--brand-light)"
          iconColor="var(--brand-primary)"
        />
      </div>

      {/* Main Split View: Recent Documents + Activity Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 0.9fr)', gap: '1.5rem' }}>
        {/* Recent Documents Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Indexed Records</h2>
              <p className="card-subtitle">Live documents under selected profile</p>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/documents')}
            >
              <span>Library</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="doc-table-wrapper">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {recentDocs.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--brand-light)',
                            color: 'var(--brand-dark)',
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
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.docNumber || doc.profileName}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.78rem',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
                        <Calendar size={13} color="var(--text-muted)" />
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

        {/* Live Activity Stream (Audit Feed) */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent Lifecycle Activity</h2>
              <p className="card-subtitle">Automated event stream & status audits</p>
            </div>
            <Activity size={18} color="var(--brand-primary)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {activities.map((act) => {
              const Icon = ACTIVITY_ICONS[act.type] || Activity;
              const isAlert = act.type === 'EXPIRY_ALERT' || act.type === 'EXPIRED';

              return (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isAlert ? '#FFFBEB' : 'var(--bg-subtle)',
                    border: '1px solid',
                    borderColor: isAlert ? '#FDE68A' : 'transparent'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: isAlert ? '#FEF3C7' : 'var(--brand-light)',
                      color: isAlert ? '#D97706' : 'var(--brand-dark)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={16} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {act.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                      {act.description}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(act.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Explorer Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 className="card-title">Document Categories</h2>
            <p className="card-subtitle">Aggregated distribution across document classifications</p>
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
    </div>
  );
}
