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
  ShieldAlert,
  Plus,
  Compass,
  Layers,
  ArrowUpRight,
  Receipt
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import ProfileChip from '../components/common/ProfileChip';
import StatusPill from '../components/common/StatusPill';
import AlertsFeed from '../components/dashboard/AlertsFeed';
import UploadModal from '../components/document/UploadModal';
import { useProfiles } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
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
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const [selectedProfileId, setSelectedProfileId] = useState('all');

  const [statsData, setStatsData] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');

  // Greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

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
      console.warn('Dashboard API error:', err);
      if (user?.email === 'zaid@doctrack.ai') {
        const fallbackDocs = profileId === 'all'
          ? DEMO_DOCUMENTS
          : DEMO_DOCUMENTS.filter(d => d.profileId === profileId);

        const expiredDocs = fallbackDocs.filter(d => d.status === 'EXPIRED');
        const expiringSoonDocs = fallbackDocs.filter(d => d.status === 'EXPIRING_SOON');
        const criticalDocs = fallbackDocs.filter(d => typeof d.daysLeft === 'number' && d.daysLeft >= 0 && d.daysLeft <= 7);
        const perpetualDocs = fallbackDocs.filter(d => d.daysLeft === 9999);

        // Compute dynamic health score
        let penalty = expiredDocs.length * 25 + criticalDocs.length * 12 + expiringSoonDocs.filter(d => d.daysLeft > 7).length * 6;
        const healthScore = Math.max(0, Math.min(100, 100 - penalty));
        const healthGrade = healthScore >= 90 ? 'A' : healthScore >= 75 ? 'B' : healthScore >= 50 ? 'C' : 'D';
        const healthLabel = healthScore >= 90 ? 'Excellent Protection' : healthScore >= 75 ? 'Good Standing' : healthScore >= 50 ? 'Attention Required' : 'Critical Risk';
        const healthDesc = expiredDocs.length > 0
          ? `${expiredDocs.length} document(s) expired; ${expiringSoonDocs.length} renewal window(s) active.`
          : expiringSoonDocs.length > 0
          ? `${expiringSoonDocs.length} document(s) in renewal window. Take action soon.`
          : 'All documents valid and monitored.';

        // Compute dynamic alerts from fallbackDocs
        const dynamicAlerts = [...expiredDocs, ...expiringSoonDocs].slice(0, 3).map((d, i) => ({
          id: `demo-alert-${i + 1}`,
          documentTitle: d.title,
          profileName: d.profileName,
          severity: d.status === 'EXPIRED' ? 'CRITICAL' : 'WARNING',
          title: d.status === 'EXPIRED' ? `${d.title} — Expired` : `${d.title} — Expiry Approaching`,
          message: d.status === 'EXPIRED'
            ? `Expired on ${d.expiryDate}. Immediate renewal required.`
            : `Expires in ${d.daysLeft} days (${d.expiryDate}). Renewal window active.`,
          actionUrl: '/renewal-assistant',
          actionLabel: 'Renewal Guide'
        }));

        setStatsData({
          metrics: {
            total: fallbackDocs.length,
            active: fallbackDocs.filter(d => d.status === 'ACTIVE').length,
            expiringSoon: expiringSoonDocs.length,
            expired: expiredDocs.length
          },
          health: {
            score: healthScore,
            grade: healthGrade,
            rating: healthScore >= 75 ? 'GOOD' : healthScore >= 50 ? 'NEEDS_ATTENTION' : 'HIGH_RISK',
            label: healthLabel,
            description: healthDesc,
            breakdown: { expiredPenalty: expiredDocs.length * 25, criticalPenalty: criticalDocs.length * 12, expiringSoonPenalty: expiringSoonDocs.filter(d => d.daysLeft > 7).length * 6, unverifiedPenalty: 0 }
          },
          horizon: {
            expired: expiredDocs.length,
            critical7d: criticalDocs.length,
            urgent30d: expiringSoonDocs.filter(d => d.daysLeft > 7 && d.daysLeft <= 30).length,
            approaching90d: fallbackDocs.filter(d => typeof d.daysLeft === 'number' && d.daysLeft > 30 && d.daysLeft <= 90).length,
            safe90dPlus: fallbackDocs.filter(d => typeof d.daysLeft === 'number' && d.daysLeft > 90 && d.daysLeft < 9999).length,
            perpetual: perpetualDocs.length
          },
          urgentDocuments: [...expiredDocs, ...expiringSoonDocs],
          alerts: dynamicAlerts,
          categorySummary: DEMO_CATEGORIES.map(c => ({
            name: c.name,
            docCount: c.docCount,
            percentage: Math.round((c.docCount / (fallbackDocs.length || 1)) * 100)
          })),
          recentActivity: [
            { id: '1', type: 'EXPIRY_ALERT', title: 'Expiry Audit Run Complete', description: `${expiringSoonDocs.length} document(s) in renewal window`, timestamp: new Date().toISOString() },
            ...expiredDocs.slice(0, 1).map(d => ({ id: '2', type: 'EXPIRED', title: `${d.title} — Status: Expired`, description: `Expired on ${d.expiryDate}. Action recommended.`, timestamp: new Date(Date.now() - 86400000).toISOString() }))
          ]
        });
        setRecentDocs(fallbackDocs.slice(0, 5));
      } else {
        setStatsData({
          metrics: { total: 0, active: 0, expiringSoon: 0, expired: 0 },
          health: { score: 100, grade: 'A', rating: 'EXCELLENT', label: 'All Clear', description: 'No documents uploaded yet.' },
          horizon: { expired: 0, critical7d: 0, urgent30d: 0, approaching90d: 0, safe90dPlus: 0, perpetual: 0 },
          urgentDocuments: [],
          alerts: [],
          categorySummary: [],
          recentActivity: []
        });
        setRecentDocs([]);
      }
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

  const health = statsData?.health;
  const horizon = statsData?.horizon;
  const urgentDocs = statsData?.urgentDocuments || [];
  const alerts = statsData?.alerts || [];
  const activities = statsData?.recentActivity || [];
  const categorySummary = statsData?.categorySummary || [];

  // Available profiles list (from ProfileContext or DEMO_PROFILES only for demo account)
  const activeProfilesList =
    profiles && profiles.length > 0
      ? profiles
      : user?.email === 'zaid@doctrack.ai'
      ? DEMO_PROFILES
      : [];

  const filteredActivities = activities.filter(act => {
    if (activityFilter === 'all') return true;
    if (activityFilter === 'alerts') return act.type === 'EXPIRY_ALERT' || act.type === 'EXPIRED';
    if (activityFilter === 'uploads') return act.type === 'UPLOAD';
    if (activityFilter === 'status') return act.type === 'STATUS_CHANGE' || act.type === 'VERIFIED';
    return true;
  });

  if (loading && !statsData) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '55vh',
          gap: '1rem',
          color: 'var(--text-secondary)'
        }}
      >
        <RefreshCw size={28} className="animate-spin" color="var(--brand-primary)" />
        <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
          Loading document intelligence dashboard...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Greeting & Operational Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {getGreeting()}, {user?.name || 'Zaid'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '3px' }}>
            Centralized document intelligence, multi-tier alerts, and compliance horizon monitoring.
          </p>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsUploadModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Quick Upload</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchDashboardData(selectedProfileId)}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          {/* Profile Switcher Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '0.2rem' }}>
              PROFILE:
            </span>
            <button
              type="button"
              onClick={() => setSelectedProfileId('all')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.75rem',
                fontWeight: selectedProfileId === 'all' ? 700 : 500,
                backgroundColor: selectedProfileId === 'all' ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                color: selectedProfileId === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                border: selectedProfileId === 'all' ? '1px solid var(--brand-primary)' : '1px solid var(--border-light)',
                cursor: 'pointer'
              }}
            >
              All Profiles
            </button>
            {activeProfilesList.map(profile => (
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
                {urgentDocs.map(d => `${d.title} (${d.status === 'EXPIRED' ? 'Expired' : `${d.daysLeft}d left`})`).join(' • ')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={() => navigate('/expiry')}
            >
              <Compass size={15} />
              <span>Expiry Radar</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={() => navigate('/warranties')}
            >
              <Receipt size={15} />
              <span>Warranties</span>
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                backgroundColor: '#92400E',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              onClick={() => navigate('/renewal-assistant')}
            >
              <Sparkles size={15} />
              <span>Renewal Guide</span>
            </button>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Documents"
          value={metrics.total}
          subtext="Derived from live document store"
          icon={FileText}
          accentColor="var(--brand-classic)"
          iconBg="var(--brand-light)"
          iconColor="var(--brand-primary)"
        />

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
          label="Expired Documents"
          value={metrics.expired}
          subtext="Immediate renewal required"
          icon={AlertTriangle}
          accentColor="#EF4444"
          iconBg="#FEE2E2"
          iconColor="#DC2626"
        />
      </div>

      {metrics.total === 0 ? (
        /* Empty State for Fresh Accounts / Empty Profiles */
        <div
          className="card"
          style={{
            padding: '3.75rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-xl)'
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: 'rgba(135, 174, 115, 0.12)',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}
          >
            <FileUp size={32} strokeWidth={2.2} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            No documents yet
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              maxWidth: '460px',
              lineHeight: 1.5,
              marginBottom: '1.75rem'
            }}
          >
            Upload your first document to start tracking expiry dates and renewal reminders.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsUploadModalOpen(true)}
            style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem', fontWeight: 700 }}
          >
            <Plus size={18} />
            <span>Upload First Document</span>
          </button>
        </div>
      ) : (
        <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: '1.5rem' }}>
        {/* Left: Alerts Feed / Attention Hub */}
        <AlertsFeed
          alerts={alerts}
          profileId={selectedProfileId}
          onAlertUpdated={() => fetchDashboardData(selectedProfileId)}
        />

        {/* Right: Indexed Records & Filterable Activity Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Indexed Documents Quick Preview */}
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
                <span>Full Library</span>
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="doc-table-wrapper">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocs.map(doc => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--brand-light)',
                              color: 'var(--brand-dark)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <FileText size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                              {doc.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {doc.docNumber || doc.profileName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            backgroundColor: 'var(--bg-subtle)',
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-xs)'
                          }}
                        >
                          {doc.category}
                        </span>
                      </td>
                      <td>
                        <StatusPill status={doc.status} daysLeft={doc.daysLeft} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/documents/${doc.id}`} className="btn-table-action" title="View Document Details">
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Stream with Filter Chips */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Audit Activity Stream</h2>
                <p className="card-subtitle">Automated background events & logs</p>
              </div>

              {/* Activity Filter Chips */}
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'alerts', label: 'Alerts' },
                  { id: 'uploads', label: 'Uploads' }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActivityFilter(f.id)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.72rem',
                      fontWeight: activityFilter === f.id ? 700 : 500,
                      backgroundColor: activityFilter === f.id ? 'var(--brand-light)' : 'transparent',
                      color: activityFilter === f.id ? 'var(--brand-dark)' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="activity-list">
              {filteredActivities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No activities recorded in this category.
                </div>
              ) : (
                filteredActivities.slice(0, 4).map(activity => {
                  const Icon = ACTIVITY_ICONS[activity.type] || Activity;
                  return (
                    <div key={activity.id} className="activity-item">
                      <div
                        className="activity-icon-wrapper"
                        style={{
                          backgroundColor:
                            activity.type === 'EXPIRED'
                              ? '#FEE2E2'
                              : activity.type === 'EXPIRY_ALERT'
                              ? '#FEF3C7'
                              : 'var(--brand-light)',
                          color:
                            activity.type === 'EXPIRED'
                              ? '#DC2626'
                              : activity.type === 'EXPIRY_ALERT'
                              ? '#D97706'
                              : 'var(--brand-dark)'
                        }}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">{activity.title}</div>
                        <div className="activity-desc">{activity.description}</div>
                        <div className="activity-time">
                          {new Date(activity.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 Category Distribution Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Category Portfolio Breakdown</h2>
            <p className="card-subtitle">Document distribution and storage allocation across categories</p>
          </div>
          <Link
            to="/documents"
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--brand-dark)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            <span>Manage Categories</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', padding: '0.5rem 0' }}>
          {categorySummary.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => navigate(`/documents?category=${encodeURIComponent(cat.name)}`)}
              style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--brand-border)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-light)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  {cat.name}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-dark)', backgroundColor: 'var(--brand-light)', padding: '2px 7px', borderRadius: 'var(--radius-pill)' }}>
                  {cat.docCount}
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: '6px',
                  backgroundColor: '#E2E8F0',
                  borderRadius: 'var(--radius-pill)',
                  overflow: 'hidden',
                  marginTop: '0.5rem'
                }}
              >
                <div
                  style={{
                    width: `${cat.percentage || 15}%`,
                    height: '100%',
                    backgroundColor: 'var(--brand-primary)',
                    borderRadius: 'var(--radius-pill)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                <span>{cat.percentage || 0}% of portfolio</span>
                <span>View docs &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      )}

      {/* Direct Upload Modal on Dashboard */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          fetchDashboardData(selectedProfileId);
        }}
      />
    </div>
  );
}
