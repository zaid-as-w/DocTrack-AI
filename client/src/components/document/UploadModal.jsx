import React, { useState, useRef, useEffect } from 'react';
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
  FolderPlus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Scan,
  Zap,
  Tag,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Plus
} from 'lucide-react';
import { useProfiles } from '../../context/ProfileContext';
import { uploadDocument, processOCR, getOCRTemplates, classifyDocument } from '../../services/api';

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

export default function UploadModal({ isOpen, onClose, onSuccess, initialProfileId }) {
  const { profiles } = useProfiles();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('identity');
  const [profileId, setProfileId] = useState(initialProfileId || profiles[0]?.id || 'self');
  const [docNumber, setDocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [placeOfIssue, setPlaceOfIssue] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (initialProfileId) {
      setProfileId(initialProfileId);
    } else if (profiles[0]?.id) {
      setProfileId(profiles[0].id);
    }
  }, [initialProfileId, isOpen, profiles]);

  // AI Classification & Sensitivity State
  const [classification, setClassification] = useState(null);
  const [sensitivity, setSensitivity] = useState('STANDARD');
  const [tags, setTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [classifying, setClassifying] = useState(false);

  // OCR Pipeline State
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrStage, setOcrStage] = useState(0);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState(null);
  const [showRawText, setShowRawText] = useState(false);
  const [templates, setTemplates] = useState([]);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadConsent, setUploadConsent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getOCRTemplates()
        .then(res => {
          if (res.success && res.data) setTemplates(res.data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Keyboard accessibility: ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

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

  // Run animated OCR extraction pipeline
  const runOCR = async (fileOrTemplate) => {
    setOcrScanning(true);
    setOcrResult(null);
    setOcrStage(1);
    setOcrProgress(25);

    try {
      const stageTimer1 = setTimeout(() => {
        setOcrStage(2);
        setOcrProgress(65);
      }, 400);

      let ocrRes;
      if (fileOrTemplate instanceof File) {
        const formData = new FormData();
        formData.append('file', fileOrTemplate);
        ocrRes = await processOCR(formData);
      } else if (fileOrTemplate?.templateId) {
        ocrRes = await processOCR({ templateId: fileOrTemplate.templateId });
      } else {
        ocrRes = await processOCR({});
      }

      clearTimeout(stageTimer1);
      setOcrStage(3);
      setOcrProgress(100);

      if (ocrRes.success) {
        if (ocrRes.extractedFields) {
          const fields = ocrRes.extractedFields;
          setOcrResult(ocrRes);

          // Pre-fill form fields automatically
          if (fields.title) setTitle(fields.title);
          if (fields.categoryId) setCategoryId(fields.categoryId);
          if (fields.docNumber) setDocNumber(fields.docNumber);
          if (fields.issueDate) setIssueDate(fields.issueDate);
          if (fields.expiryDate) setExpiryDate(fields.expiryDate);
          if (fields.issuingAuthority) setIssuingAuthority(fields.issuingAuthority);
          if (fields.placeOfIssue) setPlaceOfIssue(fields.placeOfIssue);
          if (fields.summary) setSummary(fields.summary);
        }

        // Apply AI Document Classification if returned
        if (ocrRes.classification) {
          const c = ocrRes.classification;
          setClassification(c);
          if (c.sensitivity) setSensitivity(c.sensitivity);
          if (c.categoryId) setCategoryId(c.categoryId);
          if (c.suggestedTags && Array.isArray(c.suggestedTags)) setTags(c.suggestedTags);
          if (c.suggestedProfileType) {
            const matchedProfile = profiles.find(p => p.type === c.suggestedProfileType || p.id === c.suggestedProfileType);
            if (matchedProfile) setProfileId(matchedProfile.id);
          }
        }
      }
    } catch (err) {
      console.warn('OCR extraction warning:', err);
    } finally {
      setTimeout(() => {
        setOcrScanning(false);
      }, 500);
    }
  };

  const handleAddTag = (tagToAdd) => {
    const clean = (tagToAdd || newTagInput).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (clean && !tags.includes(clean)) {
      setTags(prev => [...prev, clean]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleManualReclassify = async () => {
    if (!title && !ocrResult?.rawText) return;
    setClassifying(true);
    try {
      const res = await classifyDocument({
        text: ocrResult?.rawText || '',
        title: title.trim(),
        fileName: selectedFile?.name || '',
        ocrFields: { docNumber, issuingAuthority, title }
      });
      if (res.success && res.data) {
        const c = res.data;
        setClassification(c);
        if (c.sensitivity) setSensitivity(c.sensitivity);
        if (c.categoryId) setCategoryId(c.categoryId);
        if (c.suggestedTags) {
          setTags(prev => Array.from(new Set([...prev, ...c.suggestedTags])));
        }
        if (c.suggestedProfileType) {
          const match = profiles.find(p => p.type === c.suggestedProfileType || p.id === c.suggestedProfileType);
          if (match) setProfileId(match.id);
        }
      }
    } catch (err) {
      console.warn('Manual reclassification failed:', err);
    } finally {
      setClassifying(false);
    }
  };

  const handleFileSelected = (file) => {
    setError(null);
    if (!file) return;

    if (file.size === 0) {
      setError('Selected file is empty (0 bytes). Please choose a valid document.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit. Please choose a smaller file.');
      return;
    }

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = allowedExtensions.some(ext => lowerName.endsWith(ext));
    if (!hasValidExt) {
      setError('Invalid file format. Only PDF, JPG, JPEG, and PNG files are supported.');
      return;
    }

    setSelectedFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    runOCR(file);
  };

  const handleSelectTemplate = (template) => {
    setSelectedFile(null);
    setError(null);
    runOCR({ templateId: template.id });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    if (issueDate && expiryDate) {
      const issue = new Date(issueDate);
      const expiry = new Date(expiryDate);
      if (!isNaN(issue.getTime()) && !isNaN(expiry.getTime()) && issue > expiry) {
        setError('Issue date cannot be after expiry date.');
        return;
      }
    }

    if (!uploadConsent) {
      setError('Please confirm authorization and agreement with our Terms of Service before uploading.');
      return;
    }

    if (selectedFile) {
      if (selectedFile.size === 0) {
        setError('Selected file is empty (0 bytes).');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size exceeds the 10MB limit.');
        return;
      }
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

      // Attach Sensitivity, Tags & AI Classification metadata
      formData.append('sensitivity', sensitivity);
      formData.append('tags', JSON.stringify(tags));
      if (classification) {
        formData.append('classification', JSON.stringify(classification));
      }

      // Attach OCR payload if present
      if (ocrResult) {
        formData.append('ocrText', ocrResult.rawText || '');
        formData.append('ocrConfidence', ocrResult.confidence || 0.95);
        formData.append('ocrProcessed', 'true');
      }

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
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
          maxWidth: '660px',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-lg)',
          padding: '2rem',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 id="upload-modal-title" style={{ fontSize: '1.45rem', fontWeight: 800 }}>Upload & OCR Index Document</h2>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Close upload modal"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Sample Document Template Chips */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Zap size={13} color="var(--brand-dark)" />
            <span>ONE-CLICK TEST WITH SAMPLE OCR TEMPLATES:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {templates.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--brand-border)',
                  backgroundColor: 'var(--brand-light)',
                  color: 'var(--brand-dark)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Scan size={12} />
                <span>{tpl.label.split('(')[0].trim()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Drag & Drop File Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--brand-primary)' : 'var(--border-light)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem 1.5rem',
            textAlign: 'center',
            backgroundColor: dragActive ? 'var(--brand-light)' : 'var(--bg-subtle)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '1.25rem'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
              boxShadow: 'var(--shadow-sm)',
              color: 'var(--brand-primary)'
            }}
          >
            <UploadCloud size={24} />
          </div>

          {selectedFile ? (
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                {selectedFile.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB • Click to swap file
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Drop image or PDF here to trigger on-device OCR
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Supports PDF, JPG, PNG, WEBP (Max 25 MB)
              </div>
            </div>
          )}
        </div>

        {/* Animated OCR Processing State */}
        {ocrScanning && (
          <div
            style={{
              backgroundColor: 'var(--brand-light)',
              border: '1px solid var(--brand-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={16} className="animate-spin" color="var(--brand-dark)" />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--brand-dark)' }}>
                  {ocrStage === 1 && 'Ingesting & Preprocessing Document...'}
                  {ocrStage === 2 && 'Running On-Device Optical Character Recognition (OCR)...'}
                  {ocrStage === 3 && 'Normalizing Dates, Identity Numbers & Authority...'}
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--brand-dark)' }}>
                {ocrProgress}%
              </span>
            </div>

            <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${ocrProgress}%`,
                  height: '100%',
                  backgroundColor: 'var(--brand-primary)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        )}

        {/* OCR Auto-Extracted Banner */}
        {ocrResult && !ocrScanning && (
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="#059669" />
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#065F46' }}>
                  OCR Auto-Extracted ({(ocrResult.confidence * 100).toFixed(0)}% Confidence)
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #A7F3D0',
                  color: '#059669',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)'
                }}
              >
                {ocrResult.provider}
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#047857', lineHeight: 1.4 }}>
              Attributes detected: Document # <strong>{docNumber || 'Detected'}</strong>, Expiry: <strong>{expiryDate || 'N/A'}</strong>. Form fields have been auto-populated below.
            </div>

            {/* Toggle Raw OCR Text Accordion */}
            <div style={{ borderTop: '1px solid #D1FAE5', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowRawText(!showRawText)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#059669',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: 0
                }}
              >
                <span>{showRawText ? 'Hide Scanned OCR Text' : 'View Scanned OCR Raw Text'}</span>
                {showRawText ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showRawText && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #A7F3D0',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    color: '#1E293B',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {ocrResult.rawText}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Document Classification & Sensitivity Intelligence Card */}
        {classification && (
          <div
            style={{
              background: 'linear-gradient(135deg, #F0FDF4 0%, #EFF6FF 100%)',
              border: '1px solid #BBF7D0',
              borderRadius: 'var(--radius-lg)',
              padding: '1.15rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--brand-primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Sparkles size={15} />
                </div>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    AI Document Classification
                  </span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Smart heuristic NLP taxonomy & sensitivity analyzer
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #86EFAC',
                    color: '#15803D',
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-pill)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <span>{classification.confidencePercentage || 98}% Confidence</span>
                  <span>•</span>
                  <span>{classification.confidenceLevel || 'High'}</span>
                </span>

                <button
                  type="button"
                  onClick={handleManualReclassify}
                  disabled={classifying}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    background: '#FFFFFF',
                    border: '1px solid var(--border-light)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    color: 'var(--text-secondary)'
                  }}
                  title="Re-run AI classification"
                >
                  <RefreshCw size={12} className={classifying ? 'animate-spin' : ''} />
                  <span>Re-classify</span>
                </button>
              </div>
            </div>

            {/* Categorization & Sensitivity Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Identified Category
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  {classification.category}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--brand-dark)', fontWeight: 600 }}>
                  &rsaquo; {classification.subCategory}
                </div>
              </div>

              <div
                style={{
                  backgroundColor:
                    sensitivity === 'HIGH' ? '#FEF2F2' : sensitivity === 'MEDIUM' ? '#FFFBEB' : '#F0FDF4',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${sensitivity === 'HIGH' ? '#FECACA' : sensitivity === 'MEDIUM' ? '#FDE68A' : '#BBF7D0'}`
                }}
              >
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Sensitivity Level
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {sensitivity === 'HIGH' ? (
                    <ShieldAlert size={14} color="#DC2626" />
                  ) : sensitivity === 'MEDIUM' ? (
                    <AlertTriangle size={14} color="#D97706" />
                  ) : (
                    <ShieldCheck size={14} color="#059669" />
                  )}
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: sensitivity === 'HIGH' ? '#DC2626' : sensitivity === 'MEDIUM' ? '#D97706' : '#059669'
                    }}
                  >
                    {sensitivity} SENSITIVITY
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.25 }}>
                  {classification.sensitivityNotice}
                </div>
              </div>
            </div>

            {/* AI Reasoning Quote */}
            {classification.reasoning && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  borderLeft: '3px solid var(--brand-primary)',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic'
                }}
              >
                &ldquo;{classification.reasoning}&rdquo;
              </div>
            )}

            {/* Smart Suggested Tags */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  AI Extracted Tags ({tags.length})
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Click &times; to remove tag
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-light)',
                      color: 'var(--brand-dark)'
                    }}
                  >
                    <Tag size={10} />
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '0 2px',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        lineHeight: 1
                      }}
                    >
                      &times;
                    </button>
                  </span>
                ))}

                {/* Add Tag Input */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                  <input
                    type="text"
                    placeholder="+ add tag"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px dashed var(--border-light)',
                      background: '#FFFFFF',
                      outline: 'none',
                      width: '75px'
                    }}
                  />
                  {newTagInput && (
                    <button
                      type="button"
                      onClick={() => handleAddTag()}
                      style={{
                        background: 'var(--brand-primary)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Document Ingestion Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Document Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Indian Passport, Driving License, Honda City RC..."
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Profile & Category Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Owner Profile
              </label>
              <select
                className="form-input"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.relationship || p.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Document Category
              </label>
              <select
                className="form-input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Document Number & Issuing Authority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Document / Identifier #
              </label>
              <input
                type="text"
                placeholder="e.g. Z9847291, KA03 2019..."
                className="form-input"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Issuing Authority
              </label>
              <input
                type="text"
                placeholder="e.g. Regional Passport Office, RTO, UIDAI"
                className="form-input"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
              />
            </div>
          </div>

          {/* Issue Date & Expiry Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Issue Date
              </label>
              <input
                type="date"
                className="form-input"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Expiry Date (or 'Perpetual')
              </label>
              <input
                type="text"
                placeholder="YYYY-MM-DD or Perpetual"
                className="form-input"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          {/* Place of Issue & Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Place of Issue
              </label>
              <input
                type="text"
                placeholder="e.g. Bengaluru, New Delhi"
                className="form-input"
                value={placeOfIssue}
                onChange={(e) => setPlaceOfIssue(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Notes / Summary
              </label>
              <input
                type="text"
                placeholder="e.g. Verified copy, re-issue notice"
                className="form-input"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
          </div>

          {/* Sensitivity Classification Override */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Sensitivity Classification
              </label>
              <select
                className="form-input"
                value={sensitivity}
                onChange={(e) => setSensitivity(e.target.value)}
              >
                <option value="HIGH">HIGH (Restricted PII / Financial)</option>
                <option value="MEDIUM">MEDIUM (Regulatory / Personal)</option>
                <option value="LOW">LOW (Standard / Commercial)</option>
                <option value="STANDARD">STANDARD</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Classification Status
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)'
                }}
              >
                <Sparkles size={15} color="var(--brand-primary-accessible)" />
                <span>{classification ? `${classification.confidencePercentage || 98}% AI Confidence (Please verify)` : 'Ready for Ingestion'}</span>
              </div>
            </div>
          </div>

          {/* Mandatory Document Ingestion Legal Consent */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}
          >
            <input
              type="checkbox"
              id="upload-doc-authority-consent"
              checked={uploadConsent}
              onChange={(e) => setUploadConsent(e.target.checked)}
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
              htmlFor="upload-doc-authority-consent"
              style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, cursor: 'pointer' }}
            >
              I confirm that I possess lawful authority to upload and store this document, and agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                Privacy Policy
              </a>.
            </label>
          </div>

          {/* Progress Bar during submit */}
          {submitting && (
            <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: 'var(--brand-primary-accessible)',
                  transition: 'width 0.3s ease'
                }}
              />
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
              disabled={submitting || ocrScanning}
              style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <CheckCircle2 size={16} />
              <span>{submitting ? 'Indexing...' : 'Index & Store Document'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
