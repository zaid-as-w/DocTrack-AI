import React, { useState, useEffect } from 'react';
import { checkHealth } from '../services/api';

export default function HomePage({ healthData, error, onRefresh, loading }) {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* System Status Overview Card */}
      <div className="card" id="health-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 className="card-title">Full-Stack Connectivity Proof</h2>
            <p className="card-desc">
              Verifying real-time HTTP communication between React (Vite) client and Express backend.
            </p>
          </div>
          <button
            id="btn-refresh-health"
            onClick={onRefresh}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>🔄</span>
            <span>{loading ? 'Checking...' : 'Refresh Status'}</span>
          </button>
        </div>

        {loading && !healthData && (
          <div style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>
            Attempting to contact backend at <code>GET /api/health</code>...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger-text)',
              marginBottom: '1rem'
            }}
          >
            <strong>Backend Connection Failed:</strong> {error}
            <div style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--text-secondary)' }}>
              Ensure the backend server is running via <code>cd server && npm run dev</code> on port 5000.
            </div>
          </div>
        )}

        {healthData && (
          <div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Backend Response</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--success-text)', marginTop: '4px' }}>
                  {healthData.status === 'ok' ? 'Connected (200 OK)' : healthData.status}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Local MongoDB</div>
                <div
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: healthData.database === 'connected' ? 'var(--success-text)' : 'var(--warning-text)',
                    marginTop: '4px'
                  }}
                >
                  {healthData.database === 'connected' ? 'Connected' : 'Offline / Standby'}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Environment</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#38bdf8', marginTop: '4px' }}>
                  Local-Only (Offline)
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Raw JSON Payload from <code>GET /api/health</code>:
              </div>
              <pre className="code-block" id="health-payload">
                {JSON.stringify(healthData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Architecture Modules Prepared in Iteration 0 */}
      <div className="grid-cols-2">
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
            🧩 Service Abstraction Layer
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Clean interface abstractions and instant Mock implementations ready for local engines:
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>• OCR Service</span>
              <code style={{ color: 'var(--accent-primary)' }}>MockOCRService (Tesseract WASM ready)</code>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>• Classification Service</span>
              <code style={{ color: 'var(--accent-primary)' }}>MockClassificationService (Rule-based)</code>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>• Notification Service</span>
              <code style={{ color: 'var(--accent-primary)' }}>MockNotificationService (In-app)</code>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>• Chatbot Service</span>
              <code style={{ color: 'var(--accent-primary)' }}>MockChatbotService (Canned Q&A)</code>
            </li>
          </ul>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
            💾 Storage & Persistence
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Zero third-party cloud dependencies (no Cloudinary, Firebase, Twilio):
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>• Database</span>
              <code style={{ color: 'var(--accent-primary)' }}>mongodb://localhost:27017/doctrack</code>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>• File Uploads</span>
              <code style={{ color: 'var(--accent-primary)' }}>server/uploads/ (Multer diskStorage)</code>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>• Core Model</span>
              <code style={{ color: 'var(--accent-primary)' }}>User (Schema prepared)</code>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>• Next Iteration</span>
              <code style={{ color: 'var(--warning-text)' }}>Iteration 1: App Shell & UI Polish</code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
