import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  CheckSquare,
  Square,
  FileCheck,
  ExternalLink,
  Info,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { DEMO_DOCUMENTS, RENEWAL_GUIDES } from '../data/demoData';

export default function RenewalAssistantPage() {
  const [selectedDocId, setSelectedDocId] = useState('doc-passport-01');
  const [completedSteps, setCompletedSteps] = useState({});

  const urgentDocs = DEMO_DOCUMENTS.filter(d => RENEWAL_GUIDES[d.id]);
  const activeGuide = RENEWAL_GUIDES[selectedDocId] || RENEWAL_GUIDES['doc-passport-01'];
  const activeDoc = DEMO_DOCUMENTS.find(d => d.id === selectedDocId) || DEMO_DOCUMENTS[0];

  const toggleStep = (stepId) => {
    setCompletedSteps(prev => ({
      ...prev,
      [`${selectedDocId}-${stepId}`]: !prev[`${selectedDocId}-${stepId}`]
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--brand-primary)', marginBottom: '0.25rem' }}>
          <Sparkles size={22} strokeWidth={2.5} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Intelligence Engine
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          AI Renewal Assistant
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Actionable checklists, document prerequisites, and verified official renewal pathways.
        </p>
      </div>

      {/* Document Selection Tabs */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {urgentDocs.map(doc => {
          const isExpired = doc.status === 'EXPIRED';
          const isSelected = selectedDocId === doc.id;

          return (
            <div
              key={doc.id}
              onClick={() => setSelectedDocId(doc.id)}
              className="card"
              style={{
                flex: '1 1 300px',
                cursor: 'pointer',
                border: isSelected ? `2px solid ${isExpired ? '#EF4444' : 'var(--brand-primary)'}` : '1px solid var(--border-light)',
                backgroundColor: isSelected ? '#FFFFFF' : 'var(--bg-surface)',
                boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: isExpired ? 'var(--status-expired-bg)' : 'var(--status-expiring-bg)',
                      color: isExpired ? 'var(--status-expired-text)' : 'var(--status-expiring-text)'
                    }}
                  >
                    {isExpired ? 'Expired' : `${doc.daysLeft} days remaining`}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.6rem' }}>{doc.title}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Owner: {doc.profileName} • {doc.docNumber}
                  </p>
                </div>

                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? (isExpired ? '#FEE2E2' : 'var(--brand-light)') : 'var(--bg-subtle)',
                    color: isSelected ? (isExpired ? '#DC2626' : 'var(--brand-primary)') : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Guide Content */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 0.8fr)', gap: '1.5rem' }}>
        {/* Step-by-Step Checklist */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">{activeGuide.title}</h2>
              <p className="card-subtitle" style={{ color: activeDoc.status === 'EXPIRED' ? 'var(--status-expired-text)' : 'var(--status-expiring-text)', fontWeight: 600 }}>
                Status: {activeGuide.urgency}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
            {activeGuide.steps.map(step => {
              const isDone = !!completedSteps[`${selectedDocId}-${step.id}`];

              return (
                <div
                  key={step.id}
                  onClick={() => toggleStep(step.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isDone ? 'var(--brand-light)' : 'var(--bg-subtle)',
                    border: '1px solid',
                    borderColor: isDone ? 'var(--brand-border)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ color: isDone ? 'var(--brand-primary)' : 'var(--text-muted)', marginTop: '2px' }}>
                    {isDone ? <CheckSquare size={20} strokeWidth={2.5} /> : <Square size={20} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: isDone ? 600 : 500, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--brand-dark)' : 'var(--text-primary)' }}>
                      Step {step.id}: {step.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {activeDoc.renewalUrl && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
              <a
                href={activeDoc.renewalUrl.split(' ')[0]}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                <span>Open Verified Govt Portal</span>
                <ExternalLink size={16} />
              </a>
            </div>
          )}
        </div>

        {/* Required Documents & Fees Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <FileCheck size={20} color="var(--brand-primary)" />
              <span>Required Documents</span>
            </h3>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeGuide.requiredDocuments.map((item, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    lineHeight: 1.4
                  }}
                >
                  • {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card" style={{ backgroundColor: '#F8FAFC' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Info size={18} color="var(--accent-blue)" />
              <span>Statutory Fee Transparency</span>
            </h3>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {activeGuide.officialFee}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Fees shown are indicative statutory rates published by official authorities.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
