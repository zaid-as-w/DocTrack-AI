import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Calendar, ShieldCheck, Plus, ArrowRight } from 'lucide-react';
import StatusPill from '../components/common/StatusPill';
import { DEMO_DOCUMENTS } from '../data/demoData';

export default function WarrantiesPage() {
  const navigate = useNavigate();
  const warrantyDocs = DEMO_DOCUMENTS.filter(d => d.categoryId === 'warranty');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Warranty & Invoice Tracking
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '3px' }}>
            Track product warranties, purchase invoices, and appliance coverage windows.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => alert('Warranty upload will be implemented in Iteration 10 (Warranty Tracking).')}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Add Warranty Bill</span>
        </button>
      </div>

      {/* Warranties Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {warrantyDocs.map(doc => (
          <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: '#FCE7F3',
                    color: '#EC4899',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Receipt size={24} strokeWidth={2.2} />
                </div>
                <StatusPill status={doc.status} />
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {doc.title}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Invoice: {doc.docNumber} • Seller: {doc.issuingAuthority}
              </p>

              <div style={{ marginTop: '1.25rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Purchased:</span>
                  <span style={{ fontWeight: 600 }}>{doc.issueDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Warranty Till:</span>
                  <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>{doc.expiryDate}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ width: '100%' }}
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <span>View Full Invoice & Details</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
