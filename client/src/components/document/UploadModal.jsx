import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building,
  Hash,
  User,
  FolderPlus
} from 'lucide-react';
import { useProfiles } from '../../context/ProfileContext';
import { uploadDocument } from '../../services/api';

const CATEGORIES = [
  { id: 'identity', name: 'Identity Proofs' },
  { id: 'vehicle', name: 'Vehicle Records' },
  { id: 'insurance', name: 'Insurance Papers' },
  { id: 'education', name: 'Educational Certificates' },
  { id: 'warranty', name: 'Warranty Bills' },
  { id: 'medical', name: 'Medical Records' },
  { id: 'property', name: 'Property Documents' },
  { id: 'financial', name: 'Financial Documents' },
  { id: 'other', name: 'Other Documents' }
];

export default function UploadModal({ isOpen, onClose, onSuccess }) {
  const { profiles } = useProfiles();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('identity');
  const [profileId, setProfileId] = useState(profiles[0]?.id || 'self');
  const [docNumber, setDocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [placeOfIssue, setPlaceOfIssue] = useState('');
  const [summary, setSummary] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setSelectedFile(file);
    if (!title) {
      // Pre-fill title from clean filename
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setProgress(35);

    try {
      const selectedCategoryObj = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
      const selectedProfileObj = profiles.find(p => p.id === profileId) || profiles[0] || { name: 'Zaid (Self)' };

      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('title', title.trim());
      formData.append('category', selectedCategoryObj.name);
      formData.append('categoryId', categoryId);
      formData.append('profileId', profileId);
      formData.append('profileName', selectedProfileObj.name);
      formData.append('docNumber', docNumber.trim());
      formData.append('issueDate', issueDate.trim());
      formData.append('expiryDate', expiryDate.trim());
      formData.append('issuingAuthority', issuingAuthority.trim());
      formData.append('placeOfIssue', placeOfIssue.trim());
      formData.append('summary', summary.trim());

      setProgress(75);
      const res = await uploadDocument(formData);
      setProgress(100);

      setTimeout(() => {
        setSubmitting(false);
        if (onSuccess) onSuccess(res.data);
        onClose();
      }, 300);
    } catch (err) {
      setError(err.message || 'Failed to upload document.');
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-lg)',
          padding: '2rem'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--brand-dark)',
                  backgroundColor: 'var(--brand-light)',
                  border: '1px solid var(--brand-border)',
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-pill)',
                  textTransform: 'uppercase'
                }}
              >
                Document Ingestion
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Upload & Index Document</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '0.35rem', borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--status-expired-bg)',
              color: 'var(--status-expired-text)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Drag & Drop File Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--brand-primary)' : 'var(--border-light)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem 1rem',
              textAlign: 'center',
              backgroundColor: dragActive ? 'var(--brand-light)' : 'var(--bg-subtle)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {selectedFile ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--brand-primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FileText size={22} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for local upload
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--brand-light)',
                    color: 'var(--brand-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <UploadCloud size={24} />
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Drag and drop document here, or <span style={{ color: 'var(--brand-primary)' }}>browse files</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Supports PDF, JPG, PNG, WEBP up to 15MB
                </div>
              </div>
            )}
          </div>

          {/* Title & Document Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Document Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Indian Passport, Car Insurance"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="search-container"
                style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Official Document / Policy #
              </label>
              <input
                type="text"
                placeholder="e.g. Z9847291, BA-POL-9928"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="search-container"
                style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
              />
            </div>
          </div>

          {/* Profile Owner & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Assign Profile Owner *
              </label>
              <select
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#FFFFFF',
                  fontWeight: 500,
                  fontSize: '0.9rem'
                }}
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Document Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#FFFFFF',
                  fontWeight: 500,
                  fontSize: '0.9rem'
                }}
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Issue Date & Expiry Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="search-container"
                style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="search-container"
                style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Leave blank if perpetual or lifetime validity.
              </div>
            </div>
          </div>

          {/* Issuing Authority & Place */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Issuing Authority
              </label>
              <input
                type="text"
                placeholder="e.g. UIDAI, RTO Bengaluru, Bajaj Allianz"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                className="search-container"
                style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Place of Issue
              </label>
              <input
                type="text"
                placeholder="e.g. Bengaluru, New Delhi"
                value={placeOfIssue}
                onChange={(e) => setPlaceOfIssue(e.target.value)}
                className="search-container"
                style={{ width: '100%', backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem' }}
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Notes / Summary
            </label>
            <textarea
              placeholder="Important notes, coverage specifics, policy tiers..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: '#FFFFFF',
                fontFamily: 'inherit',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Upload Progress Bar */}
          {submitting && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--brand-dark)', fontWeight: 600 }}>Indexing document...</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Indexing...' : 'Save & Index Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
