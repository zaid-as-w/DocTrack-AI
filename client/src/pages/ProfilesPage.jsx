import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  User,
  Car,
  Briefcase,
  Layers,
  Plus,
  ArrowRight,
  Shield,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';
import { useProfiles } from '../context/ProfileContext';

const ICONS = {
  User,
  Users,
  Car,
  Briefcase,
  Layers
};

export default function ProfilesPage() {
  const navigate = useNavigate();
  const {
    profiles,
    activeProfileId,
    selectProfile,
    addProfile,
    editProfile,
    removeProfile,
    loading
  } = useProfiles();

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Form States
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('family');
  const [formRelation, setFormRelation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setFormName('');
    setFormType('family');
    setFormRelation('');
    setFormDescription('');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProfile(p);
    setFormName(p.name);
    setFormType(p.type || 'family');
    setFormRelation(p.relation || '');
    setFormDescription(p.description || '');
    setFormError(null);
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
      await addProfile({
        name: formName.trim(),
        type: formType,
        relation: formRelation.trim(),
        description: formDescription.trim()
      });
      setIsCreateOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to create profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Profile name cannot be empty.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await editProfile(editingProfile.id, {
        name: formName.trim(),
        type: formType,
        relation: formRelation.trim(),
        description: formDescription.trim()
      });
      setEditingProfile(null);
    } catch (err) {
      setFormError(err.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await removeProfile(id);
      setDeletingId(null);
    } catch (err) {
      alert(err.message || 'Failed to delete profile');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
              Iteration 4: Multi-Entity Engine
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Multi-Profile Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '3px' }}>
            Manage segregated identity vaults for self, family members, vehicles, and assets.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateModal}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>New Profile</span>
        </button>
      </div>

      {/* Profiles Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {profiles.map(profile => {
          const Icon = ICONS[profile.icon] || User;
          const isActive = activeProfileId === profile.id;

          return (
            <div
              key={profile.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: isActive ? '2px solid var(--brand-primary)' : '1px solid var(--border-card)',
                boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                position: 'relative'
              }}
            >
              <div>
                {/* Card Top Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: isActive ? 'var(--brand-primary)' : 'var(--brand-light)',
                        color: isActive ? '#FFFFFF' : 'var(--brand-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isActive ? 'var(--shadow-brand)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Icon size={24} strokeWidth={2.2} />
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: 'var(--brand-dark)',
                          backgroundColor: 'var(--brand-light)',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-pill)',
                          border: '1px solid var(--brand-border)'
                        }}
                      >
                        {profile.type}
                      </span>
                      {profile.relation && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                          • {profile.relation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active Profile Status Badge */}
                  {isActive ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: 'var(--brand-dark)',
                        backgroundColor: 'var(--brand-light)',
                        padding: '4px 9px',
                        borderRadius: 'var(--radius-pill)',
                        border: '1px solid var(--brand-border)'
                      }}
                    >
                      <CheckCircle2 size={14} color="var(--brand-primary)" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => selectProfile(profile.id)}
                      style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                    >
                      Set Active
                    </button>
                  )}
                </div>

                {/* Profile Title & Description */}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {profile.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                  {profile.description || 'No description provided.'}
                </p>
              </div>

              {/* Bottom Actions Row */}
              <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/documents?q=${encodeURIComponent(profile.name.split(' ')[0])}`)}
                    style={{ flex: 1 }}
                  >
                    <span>Inspect Documents</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title="Edit Profile"
                    onClick={() => openEditModal(profile)}
                    style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)' }}
                  >
                    <Edit3 size={16} color="var(--text-secondary)" />
                  </button>

                  {!profile.isPrimary && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      title="Delete Profile"
                      onClick={() => setDeletingId(profile.id)}
                      style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)', color: '#DC2626' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Inline Delete Confirmation */}
                {deletingId === profile.id && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.82rem',
                      color: '#DC2626'
                    }}
                  >
                    <div>Delete profile <strong>{profile.name}</strong>?</div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ backgroundColor: '#DC2626', color: '#FFFFFF', padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => handleDelete(profile.id)}
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => setDeletingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE PROFILE MODAL */}
      {isCreateOpen && (
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
              maxWidth: '500px',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--shadow-lg)',
              padding: '2rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Create New Profile</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Add a family member, vehicle, or employee asset
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="btn-ghost"
                style={{ padding: '0.35rem', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--status-expired-bg)',
                  color: 'var(--status-expired-text)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Profile Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul, Honda City (KA01AB1234), Ather 450X"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="search-container"
                  style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Entity Classification Type *
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 500,
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="family">Family Member (Son, Daughter, Spouse, Parent)</option>
                  <option value="vehicle">Vehicle / Automobile (Car, Bike, Commercial Fleet)</option>
                  <option value="employee">Employee / Contractor / Staff</option>
                  <option value="custom">Custom Entity (Appliance, Business Asset, Real Estate)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Relationship / Role Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Son, Personal Car, Accountant"
                  value={formRelation}
                  onChange={(e) => setFormRelation(e.target.value)}
                  className="search-container"
                  style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Description / Purpose
                </label>
                <textarea
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
                    fontSize: '0.88rem'
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

      {/* EDIT PROFILE MODAL */}
      {editingProfile && (
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
              maxWidth: '500px',
              backgroundColor: '#FFFFFF',
              boxShadow: 'var(--shadow-lg)',
              padding: '2rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Edit Profile</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Update details for {editingProfile.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="btn-ghost"
                style={{ padding: '0.35rem', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--status-expired-bg)',
                  color: 'var(--status-expired-text)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Profile Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="search-container"
                  style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Entity Classification Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 500,
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="family">Family Member</option>
                  <option value="vehicle">Vehicle / Automobile</option>
                  <option value="employee">Employee / Staff</option>
                  <option value="custom">Custom Entity</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Relationship / Role Subtitle
                </label>
                <input
                  type="text"
                  value={formRelation}
                  onChange={(e) => setFormRelation(e.target.value)}
                  className="search-container"
                  style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Description / Purpose
                </label>
                <textarea
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
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingProfile(null)}
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
    </div>
  );
}
