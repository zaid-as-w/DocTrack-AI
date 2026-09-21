import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Calendar,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  Layers,
  ChevronRight
} from 'lucide-react';
import StatusPill from '../components/common/StatusPill';
import StatCard from '../components/common/StatCard';
import { getExpirySummary, triggerExpiryScan } from '../services/api';
import Toast from '../components/common/Toast';

const STAGE_CONFIG = {
  EXPIRED: {
    label: 'EXPIRED',
    color: '#EF4444',
    bg: '#FEE2E2',
    border: '#FECACA'
  },
  CRITICAL_1_DAY: {
    label: 'CRITICAL (≤1 Day)',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FCA5A5'
  },
  URGENT_7_DAYS: {
    label: 'URGENT (≤7 Days)',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A'
  },
  WARNING_30_DAYS: {
    label: 'WARNING (≤30 Days)',
    color: '#B45309',
    bg: '#FFFBEB',
    border: '#FCD34D'
  },
  NOTICE_90_DAYS: {
    label: 'NOTICE (≤90 Days)',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE'
  },
  ADVANCE_180_DAYS: {
    label: 'ADVANCE (≤180 Days)',
    color: '#4F46E5',
    bg: '#EEF2FF',
    border: '#C7D2FE'
  },
  HEALTHY: {
    label: 'HEALTHY (>180 Days)',
    color: 'var(--brand-dark)',
    bg: 'var(--brand-light)',
    border: 'var(--brand-border)'
  },
  PERPETUAL: {
    label: 'PERPETUAL (No Expiry)',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0'
  }
};

export default function ExpiryRadarPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanNotification, setScanNotification] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getExpirySummary();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load expiry records.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load expiry records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleTriggerScan = async () => {
    try {
      setScanning(true);
      const res = await triggerExpiryScan();
      if (res.success) {
        setToast({ message: res.message || 'Audit scan finished successfully.', type: 'success' });
        await fetchSummary();
      }
    } catch (err) {
      setToast({ message: err.message || 'Audit scan failed.', type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const summary = data?.summary || {
    total: 0,
    expiredCount: 0,
    criticalCount: 0,
    warningCount: 0,
    approachingCount: 0,
    futureCount: 0,
    perpetualCount: 0,
    attentionRequired: 0
  };

  const buckets = data?.buckets || {
    expired: [],
    critical: [],
    warning: [],
    approaching: [],
    future: [],
    perpetual: []
  };

  // Compile all documents with their evaluation data
  const allDocs = [
    ...(buckets.expired || []),
    ...(buckets.critical || []),
    ...(buckets.warning || []),
    ...(buckets.approaching || []),
    ...(buckets.future || []),
    ...(buckets.perpetual || [])
  ];

  // Filter documents based on active tab
  const filteredDocs = allDocs.filter((doc) => {
    const evalData = doc.evaluation || {};
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'ATTENTION') {
      return (
        evalData.stage === 'EXPIRED' ||
        evalData.stage === 'CRITICAL_1_DAY' ||
        evalData.stage === 'URGENT_7_DAYS' ||
        evalData.stage === 'WARNING_30_DAYS'
      );
    }
    if (selectedFilter === 'EXPIRED') return evalData.stage === 'EXPIRED';
    if (selectedFilter === 'CRITICAL') {
      return evalData.stage === 'CRITICAL_1_DAY' || evalData.stage === 'URGENT_7_DAYS';
    }
    if (selectedFilter === 'WARNING') return evalData.stage === 'WARNING_30_DAYS';
    if (selectedFilter === 'PERPETUAL') return evalData.stage === 'PERPETUAL';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-dark)', backgroundColor: 'var(--brand-light)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--brand-border)' }}>
              ● Background Scheduler: Active (6h interval)
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Expiry Radar & Audit Engine
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '3px' }}>
            Single source of truth for document lifecycle math, standardized thresholds, and automated audits.
          </p>
        </div>

        {/* Scan Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleTriggerScan}
            disabled={scanning}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow-brand)' }}
          >
            <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
            <span>{scanning ? 'Auditing All Documents...' : 'Run Audit Scan Now'}</span>
          </button>
        </div>
      </div>

      {/* Audit Notification Banner */}
      {scanNotification && (
        <div
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            border: '1px solid #6EE7B7',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#065F46',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <CheckCircle2 size={20} color="#059669" />
          <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{scanNotification}</div>
        </div>
      )}

      {/* Threshold Pipeline Visualizer Card */}
      <div className="card" style={{ padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Standardized Expiry Threshold Checkpoints
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              System audit pipeline automatically classifies records into chronological notice intervals
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-dark)', backgroundColor: 'var(--brand-light)', padding: '3px 8px', borderRadius: 'var(--radius-pill)' }}>
            Thresholds: 180d • 90d • 60d • 30d • 15d • 7d • 1d
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            marginTop: '0.75rem'
          }}
        >
          {[
            { label: 'Advance Notice', range: '91 - 180 Days', color: '#4F46E5', bg: '#EEF2FF', count: summary.futureCount },
            { label: 'General Notice', range: '31 - 90 Days', color: '#2563EB', bg: '#EFF6FF', count: summary.approachingCount },
            { label: 'Warning Window', range: '8 - 30 Days', color: '#B45309', bg: '#FFFBEB', count: summary.warningCount },
            { label: 'Critical / Urgent', range: '0 - 7 Days', color: '#D97706', bg: '#FEF3C7', count: summary.criticalCount },
            { label: 'Expired Records', range: 'Past Due', color: '#DC2626', bg: '#FEF2F2', count: summary.expiredCount },
            { label: 'Perpetual / Lifetime', range: 'No Expiry', color: '#059669', bg: '#ECFDF5', count: summary.perpetualCount }
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: item.bg,
                border: `1px solid ${item.color}33`,
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem'
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: item.color, textTransform: 'uppercase' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: item.color }}>
                {item.count}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {item.range}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid">
        <StatCard
          label="Attention Engine"
          value={summary.attentionRequired}
          subtext="Expired + Critical + Warning"
          icon={AlertCircle}
          accentColor="#EF4444"
          iconBg="#FEE2E2"
          iconColor="#DC2626"
        />

        <StatCard
          label="Expired Documents"
          value={summary.expiredCount}
          subtext="Standard 30-day grace period"
          icon={AlertTriangle}
          accentColor="#DC2626"
          iconBg="#FEF2F2"
          iconColor="#B91C1C"
        />

        <StatCard
          label="Urgent & Critical"
          value={summary.criticalCount}
          subtext="Requires action within 7 days"
          icon={Clock}
          accentColor="#F59E0B"
          iconBg="#FEF3C7"
          iconColor="#D97706"
        />

        <StatCard
          label="Perpetual Records"
          value={summary.perpetualCount}
          subtext="Aadhaar, degrees, lifetime IDs"
          icon={ShieldCheck}
          accentColor="var(--brand-primary)"
          iconBg="var(--brand-light)"
          iconColor="var(--brand-dark)"
        />
      </div>

      {/* Document Lifecycle Audit Table */}
      <div className="card">
        {/* Filter Controls Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="card-title">Document Lifecycle Audit Log</h2>
            <p className="card-subtitle">
              Showing {filteredDocs.length} of {allDocs.length} total indexed documents
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'ATTENTION', label: 'Attention Required' },
              { id: 'EXPIRED', label: 'Expired' },
              { id: 'CRITICAL', label: 'Critical (≤7d)' },
              { id: 'WARNING', label: 'Warning (≤30d)' },
              { id: 'PERPETUAL', label: 'Perpetual' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`btn btn-sm ${selectedFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={() => setSelectedFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading lifecycle audit metrics...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No documents match this lifecycle filter.
          </div>
        ) : (
          <div className="doc-table-wrapper">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Document & Profile</th>
                  <th>Category</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Threshold Stage</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => {
                  const ev = doc.evaluation || {};
                  const stageCfg = STAGE_CONFIG[ev.stage] || STAGE_CONFIG.HEALTHY;
                  const isNegative = ev.daysLeft < 0;

                  return (
                    <tr key={doc.id || doc._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: stageCfg.bg,
                              color: stageCfg.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <FileText size={19} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {doc.profileName} • {doc.docNumber || 'No ID'}
                            </div>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.84rem' }}>
                          <Calendar size={13} color="var(--text-muted)" />
                          <span>{doc.expiryDate}</span>
                        </div>
                      </td>

                      <td>
                        {ev.daysLeft === 9999 ? (
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#059669' }}>
                            Perpetual
                          </span>
                        ) : isNegative ? (
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#DC2626' }}>
                            {Math.abs(ev.daysLeft)} days ago
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: ev.daysLeft <= 30 ? '#D97706' : 'var(--text-primary)' }}>
                            {ev.daysLeft} days
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: stageCfg.color,
                              backgroundColor: stageCfg.bg,
                              border: `1px solid ${stageCfg.border}`,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-xs)',
                              display: 'inline-block',
                              width: 'fit-content'
                            }}
                          >
                            {stageCfg.label}
                          </span>
                          {ev.gracePeriodActive && (
                            <span style={{ fontSize: '0.68rem', color: '#B91C1C', fontWeight: 600 }}>
                              • Grace Period Active (≤30d)
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          {doc.renewalRequired && (
                            <Link
                              to="/renewal-assistant"
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--brand-dark)', fontSize: '0.78rem' }}
                            >
                              <Sparkles size={14} />
                              <span>Renew</span>
                            </Link>
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/documents/${doc.id || doc._id}`)}
                          >
                            <span>Inspect</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
