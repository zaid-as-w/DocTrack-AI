import React, { useState } from 'react';
import { Activity, RefreshCw, CheckCircle2, XCircle, Database, Server, HardDrive, Shield } from 'lucide-react';
import { checkHealth } from '../services/api';

export default function HealthPage({ healthData: initialHealth, onRefresh }) {
  const [healthData, setHealthData] = useState(initialHealth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);

  const runHealthCheck = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const data = await checkHealth();
      setLatency(Math.round(performance.now() - start));
      setHealthData(data);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message || 'Unable to connect to DocTrack API server');
    } finally {
      setLoading(false);
    }
  };

  const isConnected = healthData?.status === 'ok';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            System Diagnostics & Connectivity
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '3px' }}>
            Real-time verification of Express API, database persistence, and service abstractions.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={runHealthCheck}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Testing...' : 'Test Endpoint'}</span>
        </button>
      </div>

      {/* Primary Connectivity Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: isConnected ? 'var(--brand-light)' : '#FEE2E2',
                color: isConnected ? 'var(--brand-primary)' : '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isConnected ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {isConnected ? 'Backend API Responding (200 OK)' : 'API Disconnected'}
              </h2>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Target: <code>http://localhost:5000/api/health</code>
              </div>
            </div>
          </div>

          {latency !== null && (
            <span style={{ fontSize: '0.82rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
              Latency: {latency} ms
            </span>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--status-expired-bg)',
              color: 'var(--status-expired-text)',
              fontSize: '0.88rem',
              marginBottom: '1rem'
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <Server size={14} />
              <span>Express API</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: isConnected ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
              {healthData?.status || 'Unknown'}
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <Database size={14} />
              <span>MongoDB State</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: healthData?.database === 'connected' ? 'var(--brand-primary)' : '#D97706' }}>
              {healthData?.database === 'connected' ? 'Connected' : 'Offline / Standby'}
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <HardDrive size={14} />
              <span>File Storage</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: 'var(--accent-blue)' }}>
              Local Disk (server/uploads)
            </div>
          </div>
        </div>
      </div>

      {/* Service Abstraction Matrix */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
          Pluggable Service Abstraction Matrix
        </h3>
        <p className="card-subtitle" style={{ marginBottom: '1.25rem' }}>
          Mock-first architecture ensuring zero downtime without external API credentials.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { name: 'OCR Engine', active: 'MockOCRService', future: 'Tesseract.js WASM / Python', status: 'Ready' },
            { name: 'Document Classification', active: 'MockClassificationService', future: 'Rule Engine / Gemini API', status: 'Ready' },
            { name: 'Notification Dispatcher', active: 'MockNotificationService', future: 'Twilio SMS & Nodemailer', status: 'Ready' },
            { name: 'AI Chatbot Assistant', active: 'MockChatbotService', future: 'LangChain & Gemini LLM', status: 'Ready' }
          ].map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Current Provider: <code>{s.active}</code>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--brand-light)',
                  color: 'var(--brand-dark)'
                }}
              >
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
