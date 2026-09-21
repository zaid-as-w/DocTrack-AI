import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Mail, ArrowRight, ArrowLeft, CheckCircle2,
  AlertCircle, Lock, Eye, EyeOff, RefreshCw, KeyRound
} from 'lucide-react';
import { sendOtp, verifyOtpAndReset } from '../services/api';
import Footer from '../components/layout/Footer';

// Step indicator component
const StepDot = ({ step, current, label }) => {
  const done = current > step;
  const active = current === step;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: '0.8rem',
        background: done ? 'var(--brand-primary)' : active ? 'var(--gradient-brand)' : 'transparent',
        border: done || active ? 'none' : '2px solid var(--border-color)',
        color: done || active ? '#fff' : 'var(--text-muted)',
        transition: 'all 0.3s ease',
        boxShadow: active ? 'var(--shadow-brand)' : 'none'
      }}>
        {done ? <CheckCircle2 size={16} /> : step}
      </div>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: active ? 'var(--brand-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
};

const StepLine = ({ done }) => (
  <div style={{
    flex: 1, height: 2, marginBottom: 22,
    background: done ? 'var(--brand-primary)' : 'var(--border-color)',
    transition: 'background 0.4s ease'
  }} />
);

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // Step: 1 = email entry, 2 = OTP entry, 3 = new password
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState(null);

  const otpRefs = useRef([]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ─── Step 1: Send OTP ─────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtp(email.trim().toLowerCase());
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP input handling ───────────────────────────────────────────────────
  const handleOtpChange = (idx, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (!digit && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  // ─── Step 2: Verify OTP → move to step 3 ─────────────────────────────────
  const handleVerifyOtp = (e) => {
    e?.preventDefault();
    setError(null);
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setStep(3);
  };

  // ─── Step 3: Reset password ───────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    const code = otp.join('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtpAndReset(email.trim().toLowerCase(), code, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Code is invalid or expired. Please request a new one.');
      // If OTP is wrong/expired, go back to step 2
      if (err.message?.toLowerCase().includes('invalid') || err.message?.toLowerCase().includes('expired')) {
        setStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Strength bar ─────────────────────────────────────────────────────────
  const getStrength = (pw) => {
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strength = getStrength(password);
  const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', '#DC2626', '#F97316', '#EAB308', '#22C55E', '#10B981'][strength];

  const cardStyle = { width: '100%', maxWidth: '460px', padding: '2.25rem' };

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-page)',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', padding: '2rem 1.25rem'
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: 'var(--radius-lg)',
          background: 'var(--gradient-brand)', color: '#FFFFFF',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-brand)', marginBottom: '0.75rem'
        }}>
          <ShieldCheck size={28} strokeWidth={2.5} />
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          DocTrack <span style={{ color: 'var(--brand-primary)' }}>AI</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
          Account Recovery &amp; Secure Password Reset
        </p>
      </div>

      {/* Success state */}
      {success ? (
        <div className="card" style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '0.5rem 0 1.5rem' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem', boxShadow: '0 4px 20px rgba(16,185,129,0.3)'
            }}>
              <CheckCircle2 size={34} color="#fff" strokeWidth={2.5} />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Password Updated!
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Your account password has been reset securely. Sign in now with your new credentials.
            </p>
          </div>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.78rem', fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <span>Sign In to Vault</span>
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="card" style={cardStyle}>
          {/* Step indicator */}
          {!success && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: '2rem' }}>
              <StepDot step={1} current={step} label="Email" />
              <StepLine done={step > 1} />
              <StepDot step={2} current={step} label="Code" />
              <StepLine done={step > 2} />
              <StepDot step={3} current={step} label="Password" />
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
              padding: '0.85rem 1rem', backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA', borderRadius: 'var(--radius-md)',
              color: '#DC2626', fontSize: '0.86rem', marginBottom: '1.25rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* ─── STEP 1: Enter Email ─────────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleSendOtp}>
              <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Forgot Password?
                </h2>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Enter your registered email and we'll send a <strong>6-digit verification code</strong> to your inbox.
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Registered Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="fp-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoFocus
                    required
                    style={{ width: '100%', padding: '0.7rem 0.85rem 0.7rem 2.5rem', fontSize: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#FFFFFF', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                id="fp-send-code-btn"
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1 }}
              >
                {loading ? 'Sending Code…' : <><span>Send Verification Code</span><ArrowRight size={16} /></>}
              </button>

              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                  <ArrowLeft size={15} /> Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* ─── STEP 2: Enter OTP ──────────────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Enter Verification Code
                </h2>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  We sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.<br />
                  Check your inbox (and spam folder).
                </p>
              </div>

              {/* Dev OTP hint */}
              {devOtp && (
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F0FDF4', border: '1px dashed #86EFAC', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#166534', textAlign: 'center' }}>
                  🛠️ Dev mode code: <strong style={{ fontSize: '1rem', letterSpacing: '0.2em' }}>{devOtp}</strong>
                </div>
              )}

              {/* 6-box OTP input */}
              <div style={{ display: 'flex', gap: '0.55rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-digit-${idx}`}
                    ref={el => otpRefs.current[idx] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    style={{
                      width: '48px', height: '56px', textAlign: 'center',
                      fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${digit ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                      backgroundColor: digit ? 'rgba(16,185,129,0.06)' : '#FFFFFF',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box'
                    }}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <button
                id="fp-verify-btn"
                type="submit"
                disabled={otp.join('').length !== 6}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: otp.join('').length !== 6 ? 0.6 : 1, cursor: otp.join('').length !== 6 ? 'not-allowed' : 'pointer' }}
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>

              {/* Resend */}
              <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                {resendCooldown > 0 ? (
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Resend in <strong>{resendCooldown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    id="fp-resend-btn"
                    onClick={handleSendOtp}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <RefreshCw size={14} /> Resend Code
                  </button>
                )}
              </div>

              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button type="button" onClick={() => { setStep(1); setError(null); setOtp(['','','','','','']); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ArrowLeft size={14} /> Change Email
                </button>
              </div>
            </form>
          )}

          {/* ─── STEP 3: New Password ──────────────────────────────────── */}
          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--gradient-brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 0.75rem', boxShadow: 'var(--shadow-brand)'
                }}>
                  <KeyRound size={22} color="#fff" strokeWidth={2.5} />
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Set New Password
                </h2>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Code verified! Choose a strong new password for your account.
                </p>
              </div>

              {/* New Password */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={17} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="fp-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoFocus
                    required
                    style={{ width: '100%', padding: '0.7rem 2.5rem 0.7rem 2.5rem', fontSize: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxSizing: 'border-box', backgroundColor: '#FFFFFF', color: 'var(--text-primary)' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {/* Strength bar */}
                {password && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i <= strength ? strengthColor : 'var(--border-color)', transition: 'background 0.3s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: strengthColor }}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={17} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="fp-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%', padding: '0.7rem 0.85rem 0.7rem 2.5rem', fontSize: '0.9rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${confirmPassword && confirmPassword !== password ? '#FECACA' : 'var(--border-color)'}`,
                      boxSizing: 'border-box', backgroundColor: '#FFFFFF', color: 'var(--text-primary)'
                    }}
                  />
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p style={{ fontSize: '0.78rem', color: '#DC2626', marginTop: '4px', fontWeight: 600 }}>Passwords do not match</p>
                )}
              </div>

              <button
                id="fp-reset-btn"
                type="submit"
                disabled={loading || password !== confirmPassword || password.length < 6}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (loading || password !== confirmPassword || password.length < 6) ? 0.7 : 1, cursor: (loading || password !== confirmPassword || password.length < 6) ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Saving Password…' : <><span>Save New Password</span><ArrowRight size={16} /></>}
              </button>

              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button type="button" onClick={() => { setStep(2); setError(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ArrowLeft size={14} /> Re-enter Code
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
}
