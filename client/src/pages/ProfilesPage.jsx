import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Users,
  Car,
  Briefcase,
  Layers,
  Plus,
  ArrowRight,
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  Calendar,
  Sparkles,
  Upload,
  RefreshCw,
  FolderLock,
  Tag,
  ChevronRight,
  Compass,
  AlertCircle
} from 'lucide-react';
import { useProfiles } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { getDocuments } from '../services/api';
import { DEMO_DOCUMENTS } from '../data/demoData';
import StatCard from '../components/common/StatCard';
import StatusPill from '../components/common/StatusPill';
import Toast from '../components/common/Toast';
import UploadModal from '../components/document/UploadModal';

const PROFILE_TYPE_META = {
  self: {
    label: 'Self',
    icon: User,
    color: 'var(--brand-primary)',
    bg: 'rgba(135, 174, 115, 0.12)',
    border: 'rgba(135, 174, 115, 0.25)'
  },
  family: {
    label: 'Family Member',
    icon: Users,
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.25)'
  },
  vehicle: {
    label: 'Vehicle',
    icon: Car,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.25)'
  },
  employee: {
    label: 'Employee',
    icon: Briefcase,
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.25)'
  },
  custom: {
    label: 'Custom',
    icon: Layers,
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.12)',
    border: 'rgba(236, 72, 153, 0.25)'
  }
};

export default function ProfilesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    profiles,
    activeProfileId,
    selectProfile,
    addProfile,
    editProfile,
    removeProfile,
    loading: profilesLoading,
    refreshProfiles
  } = useProfiles();

  // Active Profile Resolution
  const activeProfile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    const found = profiles.find((p) => p.id === activeProfileId);
    return found || profiles[0];
  }, [profiles, activeProfileId]);

  // Profile Documents State
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form States for Create/Edit
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('family');
  const [formRelation, setFormRelation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Keyboard accessibility: ESC key to close open profile modals
  useEffect(() => {
    if (!isCreateOpen && !isEditOpen && !isSwitchOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setIsSwitchOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCreateOpen, isEditOpen, isSwitchOpen, submitting]);

  // Fetch Documents Scoped Exclusively to Current Profile
  const fetchProfileDocuments = useCallback(async (profileId) => {
    if (!profileId) {
      setDocuments([]);
      setDocsLoading(false);
      return;
    }
    setDocsLoading(true);
    try {
      const res = await getDocuments({ profileId });
      if (res.success && Array.isArray(res.data)) {
        setDocuments(res.data);
      } else {
        if (user?.email === 'zaid@doctrack.ai') {
          const fallback = DEMO_DOCUMENTS.filter((d) => d.profileId === profileId);
          setDocuments(fallback);
        } else {
          setDocuments([]);
        }
      }
    } catch (err) {
      console.warn('Error fetching profile documents:', err);
      if (user?.email === 'zaid@doctrack.ai') {
        const fallback = DEMO_DOCUMENTS.filter((d) => d.profileId === profileId);
        setDocuments(fallback);
      } else {
        setDocuments([]);
      }
    } finally {
      setDocsLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (activeProfile?.id) {
      fetchProfileDocuments(activeProfile.id);
    } else {
      setDocuments([]);
      setDocsLoading(false);
    }
  }, [activeProfile?.id, fetchProfileDocuments]);

  // Derived Profile-Scoped Statistics
  const stats = useMemo(() => {
    const total = documents.length;
    const active = documents.filter((d) => d.status === 'ACTIVE').length;
    const expiringSoon = documents.filter((d) => d.status === 'EXPIRING_SOON').length;
    const expired = documents.filter((d) => d.status === 'EXPIRED').length;
    return { total, active, expiringSoon, expired };
  }, [documents]);

  // Section 1: Recent Documents (Sorted by updatedAt / createdAt descending)
  const recentDocuments = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 5);
  }, [documents]);

  // Section 2: Upcoming Expiries (Documents expiring soonest)
  const upcomingExpiries = useMemo(() => {
    return [...documents]
      .filter((d) => d.expiryDate)
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
      .slice(0, 5);
  }, [documents]);

  // Section 3: Document Categories Breakdown
  const categoryBreakdown = useMemo(() => {
    const counts = {};
    documents.forEach((d) => {
      const cat = d.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const total = documents.length || 1;
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100)
    }));
  }, [documents]);

  // Get Initials for Avatar
  const getInitials = (name) => {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Profile Type Meta
  const currentTypeMeta = activeProfile
    ? PROFILE_TYPE_META[activeProfile.type] || PROFILE_TYPE_META.custom
    : PROFILE_TYPE_META.self;
  const TypeIcon = currentTypeMeta.icon;

  // Handlers for Profile Create
  const handleOpenCreate = () => {
    setFormName('');
    setFormType('family');
    setFormRelation('');
    setFormDescription('');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Profile name is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await addProfile({
        name: formName.trim(),
        type: formType,
        relation: formRelation.trim(),
        description: formDescription.trim(),
        isPrimary: formType === 'self'
      });
      setIsCreateOpen(false);
      if (created?.id) {
        selectProfile(created.id);
      }
      setToast({ message: `Profile "${formName.trim()}" created successfully.`, type: 'success' });
      await refreshProfiles();
    } catch (err) {
      setFormError(err.message || 'Failed to create profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for Profile Edit
  const handleOpenEdit = () => {
    if (!activeProfile) return;
    setFormName(activeProfile.name || '');
    setFormType(activeProfile.type || 'self');
    setFormRelation(activeProfile.relation || '');
    setFormDescription(activeProfile.description || '');
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Profile name is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await editProfile(activeProfile.id, {
        name: formName.trim(),
        type: formType,
        relation: formRelation.trim(),
        description: formDescription.trim()
      });
      setIsEditOpen(false);
      setToast({ message: 'Profile details updated successfully.', type: 'success' });
      await refreshProfiles();
    } catch (err) {
      setFormError(err.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for Profile Delete
  const handleDeleteProfile = async (id) => {
    try {
      await removeProfile(id);
      setDeletingId(null);
      setToast({ message: 'Profile deleted successfully.', type: 'success' });
      await refreshProfiles();
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete profile.', type: 'error' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1240px', margin: '0 auto' }}>
      {/* 1. HERO PROFILES GALLERY */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Vault Profiles
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Click any profile to inspect isolated documents, expiry timelines, and renewal roadmaps.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenCreate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, padding: '0.55rem 1.1rem' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>+ Create New Profile</span>
          </button>
        </div>

        {/* HERO PROFILE CARDS GRID */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1rem'
          }}
        >
          {profiles.map((p) => {
            const isSel = activeProfile?.id === p.id;
            const meta = PROFILE_TYPE_META[p.type] || PROFILE_TYPE_META.custom;

            return (
              <div
                key={p.id}
                onClick={() => selectProfile(p.id)}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-xl)',
                  backgroundColor: isSel ? 'var(--brand-light)' : '#FFFFFF',
                  border: isSel ? '2px solid var(--brand-primary)' : '1px solid var(--border-card)',
                  boxShadow: isSel ? '0 8px 24px -4px rgba(46, 104, 48, 0.18)' : 'var(--shadow-sm)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isSel ? 'translateY(-2px)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '125px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: meta.bg,
                        color: meta.color,
                        border: `1.5px solid ${meta.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1rem'
                      }}
                    >
                      {getInitials(p.name)}
                    </div>

                    {isSel ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          backgroundColor: 'var(--brand-primary)',
                          color: '#FFFFFF',
                          padding: '3px 9px',
                          borderRadius: 'var(--radius-pill)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <CheckCircle2 size={12} /> Active
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          backgroundColor: 'var(--bg-subtle)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          fontWeight: 600
                        }}
                      >
                        {meta.label}
                      </span>
                    )}
                  </div>

                  {/* HERO PROFILE NAME */}
                  <div
                    style={{
                      fontSize: '1.45rem',
                      fontWeight: 800,
                      color: isSel ? 'var(--brand-dark)' : 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.25,
                      marginBottom: '4px'
                    }}
                  >
                    {p.name}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {p.relation ? p.relation : meta.label} {p.isPrimary ? '• Primary Owner' : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. DEDICATED ACTIVE PROFILE HERO SHOWCASE */}
      {activeProfile ? (
        <div
          className="card"
          style={{
            padding: '2rem 2.25rem',
            background: 'linear-gradient(135deg, #FFFFFF 0%, var(--bg-subtle) 100%)',
            border: '2px solid var(--brand-primary)',
            boxShadow: 'var(--shadow-md)',
            borderRadius: 'var(--radius-xl)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.75rem'
            }}
          >
            {/* Left: Large Avatar + Giant Hero Title + Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: 'var(--radius-xl)',
                  backgroundColor: currentTypeMeta.bg,
                  color: currentTypeMeta.color,
                  border: `2px solid ${currentTypeMeta.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  letterSpacing: '0.02em',
                  flexShrink: 0,
                  boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)'
                }}
              >
                {getInitials(activeProfile.name)}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                  {/* GIANT HERO PROFILE NAME */}
                  <h1
                    style={{
                      fontSize: '2.5rem',
                      fontWeight: 900,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.03em',
                      lineHeight: 1.15,
                      margin: 0
                    }}
                  >
                    {activeProfile.name}
                  </h1>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: currentTypeMeta.color,
                      backgroundColor: currentTypeMeta.bg,
                      border: `1.5px solid ${currentTypeMeta.border}`,
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-pill)'
                    }}
                  >
                    <TypeIcon size={14} strokeWidth={2.5} />
                    <span>{currentTypeMeta.label}</span>
                  </span>

                  {activeProfile.isPrimary && (
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        backgroundColor: 'var(--brand-primary)',
                        color: '#FFFFFF',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-pill)'
                      }}
                    >
                      Primary Vault Owner
                    </span>
                  )}

                  {activeProfile.relation && (
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      • {activeProfile.relation}
                    </span>
                  )}
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '8px', maxWidth: '680px', lineHeight: 1.5 }}>
                  {activeProfile.description || 'Segregated profile vault for personal records, credentials, and renewal tracking.'}
                </p>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleOpenEdit}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, padding: '0.65rem 1.15rem' }}
              >
                <Edit3 size={16} />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsUploadModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, padding: '0.65rem 1.25rem' }}
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>+ Add Document</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No profile selected.</p>
        </div>
      )}

      {/* 3. PROFILE-SCOPED STATISTICS */}
      <div className="stats-grid">
        <StatCard
          label="Total Documents"
          value={stats.total}
          subtext={`All records in ${activeProfile?.name || 'profile'}`}
          icon={FileText}
          accentColor="var(--brand-classic)"
          iconBg="var(--brand-light)"
          iconColor="var(--brand-primary)"
        />

        <StatCard
          label="Active Documents"
          value={stats.active}
          subtext="Valid and in good standing"
          icon={ShieldCheck}
          accentColor="var(--brand-primary)"
          iconBg="var(--brand-light)"
          iconColor="var(--brand-dark)"
        />

        <StatCard
          label="Expiring Soon"
          value={stats.expiringSoon}
          subtext="Action window active (<30 days)"
          icon={Clock}
          accentColor="#F59E0B"
          iconBg="#FEF3C7"
          iconColor="#D97706"
        />

        <StatCard
          label="Expired Documents"
          value={stats.expired}
          subtext="Immediate renewal required"
          icon={AlertTriangle}
          accentColor="#EF4444"
          iconBg="#FEE2E2"
          iconColor="#DC2626"
        />
      </div>

      {/* 4. FOUR CORE PROFILE DASHBOARD SECTIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.75rem' }}>
        {/* LEFT COLUMN: Section 1 (Recent Documents) & Section 2 (Upcoming Expiries) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* SECTION 1: RECENT DOCUMENTS */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title" style={{ fontSize: '1.15rem' }}>
                  Recent Documents
                </h2>
                <p className="card-subtitle">Latest records indexed for {activeProfile?.name || 'this profile'}</p>
              </div>

              {documents.length > 0 && (
                <Link
                  to={`/documents?q=${encodeURIComponent(activeProfile?.name?.split(' ')[0] || '')}`}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <span>View All ({documents.length})</span>
                  <ChevronRight size={14} />
                </Link>
              )}
            </div>

            {docsLoading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                <span>Loading profile documents...</span>
              </div>
            ) : recentDocuments.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(135, 174, 115, 0.12)',
                    color: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem'
                  }}
                >
                  <FileText size={24} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                  No documents in this profile
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '360px', marginBottom: '1.25rem' }}>
                  Add your first document to {activeProfile?.name} to monitor expiry dates and renewal checklists.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsUploadModalOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                >
                  <Plus size={15} />
                  <span>+ Add Document to Profile</span>
                </button>
              </div>
            ) : (
              <div className="doc-table-wrapper">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Category</th>
                      <th>Expiry Countdown</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDocuments.map((doc) => {
                      const daysLeft = doc.daysLeft !== undefined ? doc.daysLeft : null;
                      return (
                        <tr key={doc.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'var(--brand-light)',
                                  color: 'var(--brand-dark)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                <FileText size={17} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                                  {doc.title}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                  {doc.docNumber || 'No doc number'}
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
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid var(--border-light)'
                              }}
                            >
                              {doc.category || 'General'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {doc.expiryDate ? (
                                <span
                                  style={{
                                    color:
                                      doc.status === 'EXPIRED'
                                        ? 'var(--status-expired-text)'
                                        : doc.status === 'EXPIRING_SOON'
                                        ? '#D97706'
                                        : 'var(--text-primary)'
                                  }}
                                >
                                  {doc.status === 'EXPIRED'
                                    ? `Expired (${Math.abs(daysLeft || 0)}d ago)`
                                    : daysLeft !== null
                                    ? `In ${daysLeft} days`
                                    : new Date(doc.expiryDate).toLocaleDateString()}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>No Expiry Date</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <StatusPill status={doc.status} daysLeft={doc.daysLeft} />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link to={`/documents/${doc.id}`} className="btn-table-action" title="View Document">
                              <ArrowRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2: UPCOMING EXPIRIES */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title" style={{ fontSize: '1.15rem' }}>
                  Upcoming Expiries
                </h2>
                <p className="card-subtitle">Documents requiring renewal action soonest</p>
              </div>
              <Link
                to="/expiry"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Compass size={14} />
                <span>Expiry Radar</span>
              </Link>
            </div>

            {upcomingExpiries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                <CheckCircle2 size={24} color="var(--brand-primary)" style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>All documents in good standing</p>
                <p style={{ fontSize: '0.8rem', marginTop: '3px' }}>
                  No imminent document expirations recorded under this profile.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcomingExpiries.map((doc) => {
                  const isExp = doc.status === 'EXPIRED';
                  const isSoon = doc.status === 'EXPIRING_SOON';
                  return (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isExp ? '#FEF2F2' : isSoon ? '#FFFBEB' : 'var(--bg-subtle)',
                        border: isExp ? '1px solid #FECACA' : isSoon ? '1px solid #FDE68A' : '1px solid var(--border-light)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isExp ? '#FEE2E2' : isSoon ? '#FEF3C7' : 'var(--brand-light)',
                            color: isExp ? '#DC2626' : isSoon ? '#D97706' : 'var(--brand-dark)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {isExp ? <AlertTriangle size={16} /> : <Clock size={16} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            Expiry:{' '}
                            <strong style={{ color: isExp ? '#DC2626' : isSoon ? '#B45309' : 'var(--text-primary)' }}>
                              {new Date(doc.expiryDate).toLocaleDateString()}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <StatusPill status={doc.status} daysLeft={doc.daysLeft} />
                        <Link to={`/documents/${doc.id}`} className="btn-table-action" title="Renew or Inspect">
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Section 3 (Document Categories) & Section 4 (Quick Actions) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* SECTION 3: DOCUMENT CATEGORIES */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title" style={{ fontSize: '1.15rem' }}>
                  Document Categories
                </h2>
                <p className="card-subtitle">Category allocation in this vault</p>
              </div>
              <Tag size={16} color="var(--text-muted)" />
            </div>

            {categoryBreakdown.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No categorized documents yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {categoryBreakdown.map((cat, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {cat.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{cat.percentage}%</span>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            backgroundColor: 'var(--brand-light)',
                            color: 'var(--brand-dark)',
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-pill)'
                          }}
                        >
                          {cat.count}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        height: '6px',
                        backgroundColor: '#E2E8F0',
                        borderRadius: 'var(--radius-pill)',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${cat.percentage}%`,
                          height: '100%',
                          backgroundColor: 'var(--brand-primary)',
                          borderRadius: 'var(--radius-pill)',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: QUICK ACTIONS */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title" style={{ fontSize: '1.15rem' }}>
                  Quick Actions
                </h2>
                <p className="card-subtitle">Operations for {activeProfile?.name || 'profile'}</p>
              </div>
              <Sparkles size={16} color="var(--brand-primary)" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Action 1: Upload Document to Profile */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsUploadModalOpen(true)}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '0.8rem 1rem',
                  gap: '0.65rem'
                }}
              >
                <Upload size={16} strokeWidth={2.2} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700 }}>Upload Document to Profile</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                    Target vault: {activeProfile?.name}
                  </div>
                </div>
              </button>

              {/* Action 2: Edit Profile Information */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleOpenEdit}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '0.8rem 1rem',
                  gap: '0.65rem'
                }}
              >
                <Edit3 size={16} color="var(--text-secondary)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Edit Profile Information
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Change name, classification, or description
                  </div>
                </div>
              </button>

              {/* Action 3: Switch Profile */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsSwitchOpen(true)}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '0.8rem 1rem',
                  gap: '0.65rem'
                }}
              >
                <Users size={16} color="var(--text-secondary)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Switch Profile
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Choose between {profiles.length} available vaults
                  </div>
                </div>
              </button>

              {/* Action 4: Delete Profile (if not primary owner) */}
              {activeProfile && !activeProfile.isPrimary && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setDeletingId(activeProfile.id)}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '0.75rem 1rem',
                    gap: '0.65rem',
                    color: '#DC2626',
                    border: '1px dashed #FCA5A5',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <Trash2 size={16} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>Delete Profile</div>
                    <div style={{ fontSize: '0.72rem', color: '#EF4444' }}>
                      Remove {activeProfile.name} from your account
                    </div>
                  </div>
                </button>
              )}

              {/* Delete Confirmation Alert */}
              {deletingId === activeProfile?.id && (
                <div
                  style={{
                    padding: '0.85rem',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    color: '#DC2626'
                  }}
                >
                  <div style={{ fontWeight: 700 }}>Permanently remove {activeProfile.name}?</div>
                  <p style={{ fontSize: '0.76rem', color: '#B91C1C', marginTop: '2px' }}>
                    This action removes the profile container from your vault.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ backgroundColor: '#DC2626', color: '#FFFFFF', padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => handleDeleteProfile(activeProfile.id)}
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => setDeletingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: CREATE PROFILE */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-profile-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.25rem'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--shadow-lg)',
              padding: '2rem',
              borderRadius: 'var(--radius-xl)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--brand-light)',
                    color: 'var(--brand-primary-accessible)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Users size={20} />
                </div>
                <div>
                  <h2 id="create-profile-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Create New Profile</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Isolate documents under a distinct identity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="btn-ghost"
                aria-label="Close create profile modal"
                style={{ padding: '0.4rem', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--status-expired-bg)',
                  border: '1px solid var(--status-expired-border)',
                  color: 'var(--status-expired-text)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label htmlFor="create-profile-name" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Profile Name <span style={{ color: 'var(--brand-primary-accessible)' }}>*</span>
                </label>
                <input
                  id="create-profile-name"
                  type="text"
                  placeholder="e.g. Rahul, Honda City (KA01AB1234), Priya Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="search-container"
                  style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                  required
                />
              </div>

              <div>
                <label htmlFor="create-profile-type" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Entity Classification Type <span style={{ color: 'var(--brand-primary-accessible)' }}>*</span>
                </label>
                <select
                  id="create-profile-type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  <option value="self">Self (Personal Vault)</option>
                  <option value="family">Family Member (Son, Daughter, Spouse, Parent)</option>
                  <option value="vehicle">Vehicle (Car, Bike, Commercial Vehicle)</option>
                  <option value="employee">Employee (Staff, Contractor, Accountant)</option>
                  <option value="custom">Custom Entity (Appliance, Business, Property)</option>
                </select>
              </div>

              <div>
                <label htmlFor="create-profile-relation" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Relationship / Role Subtitle <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  id="create-profile-relation"
                  type="text"
                  placeholder="e.g. Son, Personal Car, Finance Staff"
                  value={formRelation}
                  onChange={(e) => setFormRelation(e.target.value)}
                  className="search-container"
                  style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                />
              </div>

              <div>
                <label htmlFor="create-profile-description" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Description / Purpose <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  id="create-profile-description"
                  placeholder="Briefly describe what records will be stored under this profile..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PROFILE */}
      {isEditOpen && activeProfile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.25rem'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--shadow-lg)',
              padding: '2rem',
              borderRadius: 'var(--radius-xl)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--brand-light)',
                    color: 'var(--brand-primary-accessible)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Users size={20} />
                </div>
                <div>
                  <h2 id="edit-profile-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Edit Profile Details</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Update profile metadata and role description</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="btn-ghost"
                aria-label="Close edit profile modal"
                style={{ padding: '0.4rem', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--status-expired-bg)',
                  border: '1px solid var(--status-expired-border)',
                  color: 'var(--status-expired-text)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label htmlFor="edit-profile-name" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Profile Name <span style={{ color: 'var(--brand-primary-accessible)' }}>*</span>
                </label>
                <input
                  id="edit-profile-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="search-container"
                  style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-profile-type" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Entity Classification Type
                </label>
                <select
                  id="edit-profile-type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  <option value="self">Self (Personal Vault)</option>
                  <option value="family">Family Member</option>
                  <option value="vehicle">Vehicle / Automobile</option>
                  <option value="employee">Employee / Staff</option>
                  <option value="custom">Custom Entity</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-profile-relation" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Relationship / Role Subtitle
                </label>
                <input
                  id="edit-profile-relation"
                  type="text"
                  value={formRelation}
                  onChange={(e) => setFormRelation(e.target.value)}
                  className="search-container"
                  style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                />
              </div>

              <div>
                <label htmlFor="edit-profile-description" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Description / Purpose
                </label>
                <textarea
                  id="edit-profile-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'none'
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
                  disabled={submitting}
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SWITCH PROFILE */}
      {isSwitchOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
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
              maxWidth: '460px',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--shadow-xl)',
              padding: '1.75rem',
              borderRadius: 'var(--radius-xl)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Switch Active Profile</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Choose which vault to inspect and manage
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSwitchOpen(false)}
                className="btn-ghost"
                style={{ padding: '0.35rem', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {profiles.map((p) => {
                const isCurrent = activeProfile?.id === p.id;
                const meta = PROFILE_TYPE_META[p.type] || PROFILE_TYPE_META.custom;
                const PIcon = meta.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      selectProfile(p.id);
                      setIsSwitchOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isCurrent ? 'rgba(135, 174, 115, 0.12)' : 'var(--bg-subtle)',
                      border: isCurrent ? '1.5px solid var(--brand-primary)' : '1px solid var(--border-light)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: meta.bg,
                          color: meta.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <PIcon size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {meta.label} {p.relation ? `• ${p.relation}` : ''}
                        </div>
                      </div>
                    </div>

                    {isCurrent && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal (Scoped to this active profile) */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        initialProfileId={activeProfile?.id}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          if (activeProfile?.id) {
            fetchProfileDocuments(activeProfile.id);
          }
          setToast({ message: 'Document added to profile vault.', type: 'success' });
        }}
      />

      {/* Toast notifications */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
