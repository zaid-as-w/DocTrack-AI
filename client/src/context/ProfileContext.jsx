import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProfiles, createProfile, updateProfile, deleteProfile } from '../services/api';
import { DEMO_PROFILES } from '../data/demoData';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(() => {
    return localStorage.getItem('doctrack_active_profile') || 'all';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfilesList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProfiles();
      if (res.success && Array.isArray(res.data)) {
        setProfiles(res.data);
      } else {
        setProfiles(DEMO_PROFILES.filter(p => p.id !== 'all'));
      }
      setError(null);
    } catch (err) {
      console.warn('Profiles API error, falling back to fixtures:', err);
      setProfiles(DEMO_PROFILES.filter(p => p.id !== 'all'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfilesList();
  }, [fetchProfilesList]);

  const selectProfile = (id) => {
    setActiveProfileId(id);
    localStorage.setItem('doctrack_active_profile', id);
  };

  const addProfile = async (profileData) => {
    const res = await createProfile(profileData);
    if (res.success && res.data) {
      setProfiles(prev => [...prev, res.data]);
      return res.data;
    }
    throw new Error(res.message || 'Failed to create profile');
  };

  const editProfile = async (id, profileData) => {
    const res = await updateProfile(id, profileData);
    if (res.success && res.data) {
      setProfiles(prev => prev.map(p => (p.id === id ? { ...p, ...res.data } : p)));
      return res.data;
    }
    throw new Error(res.message || 'Failed to update profile');
  };

  const removeProfile = async (id) => {
    const res = await deleteProfile(id);
    if (res.success) {
      setProfiles(prev => prev.filter(p => p.id !== id));
      if (activeProfileId === id) {
        selectProfile('all');
      }
      return true;
    }
    throw new Error(res.message || 'Failed to delete profile');
  };

  const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

  const value = {
    profiles,
    activeProfileId,
    activeProfile,
    loading,
    error,
    selectProfile,
    addProfile,
    editProfile,
    removeProfile,
    refreshProfiles: fetchProfilesList
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfiles() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfiles must be used within a ProfileProvider');
  }
  return context;
}
