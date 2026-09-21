import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, User, Phone, Eye, EyeOff, AlertCircle, Sparkles, ArrowRight, CheckSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/layout/Footer';
import CookieBanner from '../components/common/CookieBanner';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const redirectPath = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isRegisterMode) {
      // Account Creation Validation (Data Minimization: phone is optional)
      if (!name.trim() || !email.trim() || !password) {
        setError('Please fill in your name, email, and password.');
        return;
      }

      if (phone.trim()) {
        const cleanPhone = phone.trim().replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          setError('Please enter a valid 10-digit mobile number, or leave the field blank.');
          return;
        }
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }

      if (!termsAccepted) {
        setError('You must accept the Terms and Conditions and acknowledge the Privacy Policy to create a vault account.');
        return;
      }

      setLoading(true);
      try {
        await register(name.trim(), email.trim(), password, phone.trim());
        navigate('/', { replace: true });
      } catch (err) {
        setError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    } else {
      // Sign In Validation
      if (!email.trim() || !password) {
        setError('Please fill in both email and password.');
        return;
      }

      setLoading(true);
      try {
        await login(email.trim(), password);
        navigate(redirectPath, { replace: true });
      } catch (err) {
        setError(err.message || 'Invalid email or password.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-page)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem 1.25rem'
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--gradient-brand)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-brand)',
            marginBottom: '0.75rem'
          }}
        >
          <ShieldCheck size={28} strokeWidth={2.5} />
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          DocTrack <span style={{ color: 'var(--brand-primary)' }}>AI</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
          Offline-first intelligent document lifecycle management
        </p>
      </div>

      {/* Card */}
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2rem'
        }}
      >
        {/* Mode Switcher Segmented Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.25rem',
            backgroundColor: 'var(--bg-subtle)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem'
          }}
        >
          <button
            type="button"
            onClick={() => { setIsRegisterMode(false); setError(null); }}
            style={{
              padding: '0.55rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: !isRegisterMode ? '#FFFFFF' : 'transparent',
              color: !isRegisterMode ? 'var(--brand-primary)' : 'var(--text-secondary)',
              boxShadow: !isRegisterMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegisterMode(true); setError(null); }}
            style={{
              padding: '0.55rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: isRegisterMode ? '#FFFFFF' : 'transparent',
              color: isRegisterMode ? 'var(--brand-primary)' : 'var(--text-secondary)',
              boxShadow: isRegisterMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Create Account
          </button>
        </div>

        <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isRegisterMode ? 'Create New Account' : 'Sign In to Your Vault'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isRegisterMode
              ? 'Initialize your isolated vault with mobile & credentials'
              : 'Access protected profiles, expiry alerts, and documents'}
          </p>
        </div>



        {/* Error Alert */}
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
              marginBottom: '1.25rem'
            }}
          >
            <AlertCircle size={16} flexShrink={0} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Fields for Create Account Mode */}
          {isRegisterMode && (
            <>
              {/* Full Name */}
              <div>
                <label
                  htmlFor="login-name"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                >
                  Full Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div className="search-container" style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}>
                  <User size={16} color="var(--text-muted)" />
                  <input
                    id="login-name"
                    type="text"
                    placeholder="e.g. Zaid Attar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="search-input"
                    required
                  />
                </div>
              </div>

              {/* Mobile Number (Optional for Data Minimization) */}
              <div>
                <label
                  htmlFor="login-phone"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                >
                  Mobile Number <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional — for SMS & WhatsApp alerts)</span>
                </label>
                <div className="search-container" style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}>
                  <Phone size={16} color="var(--text-muted)" />
                  <input
                    id="login-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
            >
              Email Address <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div className="search-container" style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}>
              <Mail size={16} color="var(--text-muted)" />
              <input
                id="login-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="search-input"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label
                htmlFor="login-password"
                style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}
              >
                {isRegisterMode ? 'Password (min. 6 characters)' : 'Password'} <span style={{ color: '#DC2626' }}>*</span>
              </label>
            </div>
            <div className="search-container" style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}>
              <Lock size={16} color="var(--text-muted)" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="search-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Only in Register Mode) */}
          {isRegisterMode && (
            <div>
              <label
                htmlFor="login-confirm-password"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
              >
                Confirm Password <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div className="search-container" style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}>
                <Lock size={16} color="var(--text-muted)" />
                <input
                  id="login-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="search-input"
                  required
                />
              </div>
            </div>
          )}

          {/* Form Consent Checkbox (Registration Mode) */}
          {isRegisterMode && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginTop: '0.2rem' }}>
              <input
                type="checkbox"
                id="login-register-consent"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
                style={{
                  width: '18px',
                  height: '18px',
                  marginTop: '2px',
                  cursor: 'pointer',
                  accentColor: 'var(--brand-primary-accessible)'
                }}
              />
              <label
                htmlFor="login-register-consent"
                style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, cursor: 'pointer' }}
              >
                I agree to the{' '}
                <Link to="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline', fontWeight: 600 }}>
                  Terms & Conditions
                </Link>{' '}
                and acknowledge the{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline', fontWeight: 600 }}>
                  Privacy Policy
                </Link>. I consent to the local processing and storage of my document records.
              </label>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', fontWeight: 700 }}
          >
            <span>
              {loading
                ? isRegisterMode ? 'Creating Account...' : 'Authenticating...'
                : isRegisterMode ? 'Create Secure Vault Account' : 'Sign In to Vault'}
            </span>
            <ArrowRight size={16} />
          </button>

          {!isRegisterMode && (
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.35rem 0 0', lineHeight: 1.4 }}>
              By signing in, you agree to our{' '}
              <Link to="/terms" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>Terms & Conditions</Link>{' '}
              and acknowledge our{' '}
              <Link to="/privacy" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>Privacy Policy</Link>.
            </p>
          )}
        </form>

        {/* Toggle link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
          {isRegisterMode ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegisterMode(false); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--brand-primary-accessible)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Sign In to Vault
              </button>
            </p>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Need a new account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegisterMode(true); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--brand-primary-accessible)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Create a Vault Account
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Security Reassurance */}
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2rem', marginBottom: '2.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span>🔒 JWT Session Security</span>
        <span>•</span>
        <span>🛡️ Bcrypt Salted Hash</span>
        <span>•</span>
        <span>💾 Local-First Persistence</span>
        <span>•</span>
        <span>⚖️ GDPR & DPDP Aligned</span>
      </div>

      {/* Universal Legal Footer & Cookie Banner */}
      <div style={{ width: '100%' }}>
        <Footer />
      </div>
      <CookieBanner />
    </div>
  );
}
