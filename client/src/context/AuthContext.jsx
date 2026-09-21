import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getCurrentUser, completeOnboarding } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('doctrack_token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Validate existing token on boot
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('doctrack_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await getCurrentUser();
        if (res.success && res.user) {
          setUser(res.user);
          setToken(storedToken);
        } else {
          localStorage.removeItem('doctrack_token');
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        // Token invalid or backend unreachable
        localStorage.removeItem('doctrack_token');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await loginUser(email, password);
      if (res.success && res.token) {
        localStorage.setItem('doctrack_token', res.token);
        setToken(res.token);
        setUser(res.user);
        return res;
      }
      throw new Error(res.message || 'Login failed');
    } catch (err) {
      setAuthError(err.message || 'Failed to authenticate');
      throw err;
    }
  };

  const register = async (name, email, password, phone) => {
    setAuthError(null);
    try {
      const res = await registerUser(name, email, password, phone);
      if (res.success && res.token) {
        localStorage.setItem('doctrack_token', res.token);
        setToken(res.token);
        setUser(res.user);
        return res;
      }
      throw new Error(res.message || 'Registration failed');
    } catch (err) {
      setAuthError(err.message || 'Failed to register account');
      throw err;
    }
  };

  const finishOnboarding = async () => {
    try {
      await completeOnboarding();
      setUser((prev) => (prev ? { ...prev, onboardingCompleted: true } : null));
    } catch (err) {
      console.error('Failed to complete onboarding on server:', err);
      setUser((prev) => (prev ? { ...prev, onboardingCompleted: true } : null));
    }
  };

  const logout = () => {
    localStorage.removeItem('doctrack_token');
    localStorage.removeItem('doctrack_active_profile');
    setUser(null);
    setToken(null);
    setAuthError(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    authError,
    login,
    register,
    finishOnboarding,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
