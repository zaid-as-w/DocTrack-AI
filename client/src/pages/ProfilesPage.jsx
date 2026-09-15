import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  User,
  Car,
  Briefcase,
  Plus,
  ArrowRight,
  Shield,
  FileText
} from 'lucide-react';
import { DEMO_PROFILES, DEMO_DOCUMENTS } from '../data/demoData';

const ICONS = {
  User,
  Users,
  Car,
  Briefcase
};

export default function ProfilesPage() {
  const navigate = useNavigate();

  // Exclude the virtual 'all' profile
  const entities = DEMO_PROFILES.filter(p => p.id !== 'all');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Multi-Profile Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '3px' }}>
            Segregate identity papers, vehicle registrations, and warranties across family and assets.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => alert('Profile creation will be fully enabled in Iteration 4 (Multi-Profile Management).')}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>New Profile</span>
        </button>
      </div>

      {/* Profile Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {entities.map(profile => {
          const Icon = ICONS[profile.icon] || User;
          const docs = DEMO_DOCUMENTS.filter(d => d.profileId === profile.id);

          return (
            <div key={profile.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: 'var(--brand-light)',
                      color: 'var(--brand-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Icon size={24} strokeWidth={2.2} />
                  </div>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {profile.type}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {profile.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {docs.length} active documents associated
                </p>

                {/* Mini document chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '1rem' }}>
                  {docs.length > 0 ? (
                    docs.map(d => (
                      <span
                        key={d.id}
                        style={{
                          fontSize: '0.75rem',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-subtle)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {d.title}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      No documents uploaded yet
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => navigate(`/documents?q=${encodeURIComponent(profile.name.split(' ')[0])}`)}
                >
                  <span>Inspect Documents</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
