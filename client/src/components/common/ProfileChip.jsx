import React from 'react';
import { User, Users, Car, Briefcase, Layers } from 'lucide-react';

const ICONS = {
  User,
  Users,
  Car,
  Briefcase,
  Layers
};

export default function ProfileChip({ profile, active, onClick }) {
  const IconComponent = ICONS[profile.icon] || User;

  return (
    <button
      type="button"
      className={`profile-chip ${active ? 'active' : ''}`}
      onClick={() => onClick && onClick(profile.id)}
    >
      <IconComponent size={15} strokeWidth={2.2} />
      <span>{profile.name}</span>
      {profile.count !== undefined && (
        <span
          style={{
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: '9999px',
            backgroundColor: active ? 'var(--brand-primary)' : 'var(--bg-subtle)',
            color: active ? '#FFFFFF' : 'var(--text-muted)'
          }}
        >
          {profile.count}
        </span>
      )}
    </button>
  );
}
