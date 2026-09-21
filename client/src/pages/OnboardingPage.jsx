import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FolderLock,
  Clock,
  Sparkles,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfiles } from '../context/ProfileContext';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, finishOnboarding } = useAuth();
  const { profiles, addProfile, editProfile, selectProfile, refreshProfiles } = useProfiles();

  const [step, setStep] = useState(1);
  const [profileName, setProfileName] = useState('');
  const [profileType, setProfileType] = useState('self');
  const [relation, setRelation] = useState('Self');
  const [description, setDescription] = useState('Primary personal document vault and identity records');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize with user's registered name
  useEffect(() => {
    if (user?.name) {
      setProfileName(user.name);
    }
  }, [user]);

  const handleFinishOnboarding = async (e) => {
    if (e) e.preventDefault();
    if (!profileName.trim()) {
      setError('Profile name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let createdOrUpdatedProfile = null;
      // Check if primary profile was already auto-provisioned
      const existingSelf = profiles.find((p) => p.isPrimary || p.type === 'self');
      if (existingSelf) {
        createdOrUpdatedProfile = await editProfile(existingSelf.id, {
          name: profileName.trim(),
          type: profileType,
          relation: relation.trim(),
          description: description.trim()
        });
      } else {
        createdOrUpdatedProfile = await addProfile({
          name: profileName.trim(),
          type: profileType,
          relation: relation.trim(),
          description: description.trim(),
          isPrimary: true
        });
      }

      if (createdOrUpdatedProfile?.id) {
        selectProfile(createdOrUpdatedProfile.id);
      }

      // Mark onboarding completed in AuthContext and backend
      await finishOnboarding();
      await refreshProfiles();

      // Navigate to dedicated Profile Dashboard
      navigate('/profiles', { replace: true });
    } catch (err) {
      console.error('Onboarding setup error:', err);
      setError(err.message || 'Could not complete profile setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-page)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.25rem'
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--gradient-brand)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-brand)',
            marginBottom: '0.85rem'
          }}
        >
          <ShieldCheck size={30} strokeWidth={2.5} />
        </div>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          DocTrack <span style={{ color: 'var(--brand-primary)' }}>AI</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Intelligent Document & Expiry Lifecycle Platform
        </p>
      </div>

      {/* Main Wizard Card */}
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '580px',
          padding: '2.5rem',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Step Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--border-light)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: step >= 1 ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.88rem'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: step >= 1 ? 'var(--brand-primary)' : 'var(--border-light)',
                color: step >= 1 ? '#FFFFFF' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.82rem',
                fontWeight: 700
              }}
            >
              1
            </div>
            <span>Welcome</span>
          </div>

          <div
            style={{
              width: '40px',
              height: '2px',
              backgroundColor: step >= 2 ? 'var(--brand-primary)' : 'var(--border-light)'
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: step >= 2 ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.88rem'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: step >= 2 ? 'var(--brand-primary)' : 'var(--border-light)',
                color: step >= 2 ? '#FFFFFF' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.82rem',
                fontWeight: 700
              }}
            >
              2
            </div>
            <span>Personal Profile</span>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--status-expired-bg)',
              border: '1px solid var(--status-expired-border)',
              color: 'var(--status-expired-text)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}
          >
            <AlertCircle size={16} flexShrink={0} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: WELCOME & FEATURE PREVIEWS */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(135, 174, 115, 0.12)',
                  color: 'var(--brand-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem'
                }}
              >
                Account Created
              </span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Welcome, {user?.name || 'Explorer'}!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
                Your private document intelligence environment is ready. Here is what you can do with DocTrack AI:
              </p>
            </div>

            {/* Value Proposition Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.9rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div
                  style={{
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(135, 174, 115, 0.12)',
                    color: 'var(--brand-primary)'
                  }}
                >
                  <FolderLock size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Isolated Multi-Profile Vaults
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                    Categorize documents for yourself, family members, vehicles, and staff without cross-profile clutter.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.9rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div
                  style={{
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: '#3B82F6'
                  }}
                >
                  <Clock size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Automated Expiry Radar
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                    Dynamic daily status audits with 30-day, 15-day, and 7-day proactive expiry alerts.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.9rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div
                  style={{
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    color: '#8B5CF6'
                  }}
                >
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    OCR & AI Renewal Assistant
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                    Automated metadata extraction from passports, driving licenses, insurance, and warranty cards.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep(2)}
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
            >
              <span>Continue to Set Up Profile</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 2: CREATE / CONFIRM PERSONAL PROFILE */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(135, 174, 115, 0.12)',
                  color: 'var(--brand-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem'
                }}
              >
                Primary Vault
              </span>
              <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Set Up Personal Profile
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem', lineHeight: 1.4 }}>
                This is your primary owner vault for tracking your personal IDs, passports, certificates, and policies.
              </p>
            </div>

            <form onSubmit={handleFinishOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Profile Name */}
              <div>
                <label htmlFor="onboarding-profile-name" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Profile Name <span style={{ color: 'var(--brand-primary-accessible)' }}>*</span>
                </label>
                <div className="search-container" style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.7rem 0.9rem' }}>
                  <User size={16} color="var(--brand-primary-accessible)" />
                  <input
                    id="onboarding-profile-name"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Zaid Attar"
                    className="search-input"
                    required
                  />
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Defaulted to your registered account name.
                </span>
              </div>

              {/* Profile Type (Self) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Profile Type
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(135, 174, 115, 0.12)',
                        color: 'var(--brand-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <User size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Self (Primary Owner)
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Default vault for your personal records
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(135, 174, 115, 0.15)',
                      color: 'var(--brand-primary)',
                      fontSize: '0.76rem',
                      fontWeight: 700
                    }}
                  >
                    Primary
                  </span>
                </div>
              </div>

              {/* Relation / Subtitle (Optional) */}
              <div>
                <label htmlFor="onboarding-relation" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Relation / Subtitle <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                </label>
                <div className="search-container" style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.7rem 0.9rem' }}>
                  <Layers size={16} color="var(--text-muted)" />
                  <input
                    id="onboarding-relation"
                    type="text"
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    placeholder="e.g. Self, Account Holder"
                    className="search-input"
                  />
                </div>
              </div>

              {/* Vault Description (Optional) */}
              <div>
                <label htmlFor="onboarding-description" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Vault Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  id="onboarding-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the documents stored in this vault..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.86rem',
                    fontFamily: 'inherit',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep(1)}
                  style={{ flex: 1, padding: '0.85rem' }}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 2, padding: '0.85rem' }}
                >
                  <span>{loading ? 'Creating Vault...' : 'Go to Profile Dashboard'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
