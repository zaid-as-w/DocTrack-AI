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
  Plus,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useProfiles } from '../../context/ProfileContext';
import {
  uploadDocument,
  getDocumentStatus,
  retryDocumentOCR,
  updateDocument,
  getOCRTemplates
} from '../../services/api';

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
  const pollIntervalRef = useRef(null);

  // Modal Flow Step: 'form' | 'processing' | 'review' | 'failed'
  const [modalStep, setModalStep] = useState('form');

  // File & Template State
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [templates, setTemplates] = useState([]);

  // Document Core Fields
  const [currentDocId, setCurrentDocId] = useState(null);
  const [processedDoc, setProcessedDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('identity');
  const [profileId, setProfileId] = useState(initialProfileId || profiles[0]?.id || 'self');
  const [docNumber, setDocNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [country, setCountry] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [placeOfIssue, setPlaceOfIssue] = useState('');
  const [summary, setSummary] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  // AI Classification & Sensitivity State
  const [classification, setClassification] = useState(null);
  const [sensitivity, setSensitivity] = useState('STANDARD');
  const [tags, setTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Async Processing & Polling State
  const [submitting, setSubmitting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [processingStage, setProcessingStage] = useState('queued');
  const [processingError, setProcessingError] = useState(null);
  const [showRawText, setShowRawText] = useState(false);
  const [error, setError] = useState(null);
  const [uploadConsent, setUploadConsent] = useState(true);
  const [isEditingInReview, setIsEditingInReview] = useState(false);
  const [savingUpdates, setSavingUpdates] = useState(false);

  // Compute live expiry evaluation
  const computeStatus = (expDateStr) => {
    if (!expDateStr || expDateStr.toLowerCase() === 'perpetual' || expDateStr.toLowerCase() === 'null') {
      return { status: 'ACTIVE', label: 'Perpetual / Non-Expiring', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', isExpiringSoon: false, isExpired: false, daysLeft: null };
    }
    const exp = new Date(expDateStr);
    if (isNaN(exp.getTime())) {
      return { status: 'NEEDS_VERIFICATION', label: 'Unverified Date', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', isExpiringSoon: false, isExpired: false, daysLeft: null };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) {
      return { status: 'EXPIRED', label: `Expired (${Math.abs(daysLeft)} days ago)`, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', isExpiringSoon: false, isExpired: true, daysLeft };
    } else if (daysLeft <= 30) {
      return { status: 'EXPIRING_SOON', label: `Expiring Soon (${daysLeft} days remaining)`, color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', isExpiringSoon: true, isExpired: false, daysLeft };
    } else {
      return { status: 'ACTIVE', label: `Active (${daysLeft} days remaining)`, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', isExpiringSoon: false, isExpired: false, daysLeft };
    }
  };

  useEffect(() => {
    if (initialProfileId) {
      setProfileId(initialProfileId);
    } else if (profiles[0]?.id) {
      setProfileId(profiles[0].id);
    }
  }, [initialProfileId, isOpen, profiles]);

  useEffect(() => {
    if (isOpen) {
      getOCRTemplates()
        .then(res => {
          if (res.success && res.data) setTemplates(res.data);
        })
        .catch(() => {});
    } else {
      resetModal();
    }
  }, [isOpen]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Keyboard accessibility: ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting && !savingUpdates) {
        handleModalClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, savingUpdates]);

  const resetModal = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setModalStep('form');
    setSelectedFile(null);
    setSelectedTemplate(null);
    setCurrentDocId(null);
    setProcessedDoc(null);
    setTitle('');
    setDocNumber('');
    setHolderName('');
    setCountry('');
    setIssueDate('');
    setExpiryDate('');
    setIssuingAuthority('');
    setPlaceOfIssue('');
    setSummary('');
    setNeedsVerification(false);
    setClassification(null);
    setSensitivity('STANDARD');
    setTags([]);
    setProcessingStage('queued');
    setProcessingError(null);
    setError(null);
    setSubmitting(false);
    setIsRetrying(false);
    setIsEditingInReview(false);
  };

  const handleModalClose = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    resetModal();
    onClose();
  };

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
    setError(null);
    setSelectedTemplate(null);
    if (!file) return;

    if (file.size === 0) {
      setError('Selected file is empty (0 bytes). Please choose a valid document.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15MB limit. Please choose a smaller file.');
      return;
    }

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.tiff'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = allowedExtensions.some(ext => lowerName.endsWith(ext));
    if (!hasValidExt) {
      setError('Invalid file format. Only PDF, JPG, JPEG, PNG, and WEBP files are supported.');
      return;
    }

    setSelectedFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
  };

  const handleSelectTemplate = (template) => {
    setSelectedFile(null);
    setSelectedTemplate(template);
    setError(null);
    setTitle(template.label.split('(')[0].trim());
    if (template.category) {
      const matched = CATEGORIES.find(c => c.id === template.category || c.name.toLowerCase().includes(template.category.toLowerCase()));
      if (matched) setCategoryId(matched.id);
    }
  };

  // Populate state fields from background-processed document
  const populateFieldsFromDoc = (doc) => {
    if (!doc) return;
    if (doc.title) setTitle(doc.title);
    if (doc.categoryId) setCategoryId(doc.categoryId);
    if (doc.profileId) setProfileId(doc.profileId);
    if (doc.docNumber) setDocNumber(doc.docNumber);
    if (doc.holderName) setHolderName(doc.holderName);
    if (doc.country) setCountry(doc.country);
    if (doc.issueDate) setIssueDate(doc.issueDate);
    if (doc.expiryDate) setExpiryDate(doc.expiryDate);
    if (doc.issuingAuthority) setIssuingAuthority(doc.issuingAuthority);
    if (doc.placeOfIssue) setPlaceOfIssue(doc.placeOfIssue);
    if (doc.summary) setSummary(doc.summary);
    if (doc.needsVerification !== undefined) setNeedsVerification(doc.needsVerification);
    if (doc.sensitivity) setSensitivity(doc.sensitivity);
    if (doc.tags && Array.isArray(doc.tags)) setTags(doc.tags);
    if (doc.classification) setClassification(doc.classification);
  };

  // Start polling status loop
  const startPolling = (docId) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await getDocumentStatus(docId);
        if (res && res.success) {
          const status = res.processingStatus;
          const stage = res.processingStage;
          if (stage) setProcessingStage(stage);

          if (status === 'completed' || status === 'needs_review') {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            const updatedDoc = res.data;
            setProcessedDoc(updatedDoc);
            populateFieldsFromDoc(updatedDoc);
            setModalStep('review');
            if (onSuccess) onSuccess(updatedDoc);
          } else if (status === 'failed') {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setProcessingError(res.processingError || 'Automatic OCR analysis failed to parse document.');
            setModalStep('failed');
          }
        }
      } catch (pollErr) {
        console.warn('Status polling check notice:', pollErr.message);
      }
    }, 600);
  };

  // Immediate Fast Upload Trigger
  const handleStartUpload = async (e) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    if (!uploadConsent) {
      setError('Please confirm authorization and agreement with our Terms of Service before uploading.');
      return;
    }

    if (!selectedFile && !selectedTemplate) {
      setError('Please select a file or template to upload.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const selectedCategoryObj = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
      const selectedProfileObj = profiles.find(p => p.id === profileId) || profiles[0] || { name: 'Zaid (Self)' };

      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title.trim());
        formData.append('category', selectedCategoryObj.name);
        formData.append('categoryId', categoryId);
        formData.append('profileId', profileId);
        formData.append('profileName', selectedProfileObj.name);
        formData.append('docNumber', docNumber.trim());
        formData.append('holderName', holderName.trim());
        formData.append('country', country.trim());
        formData.append('issueDate', issueDate.trim());
        formData.append('expiryDate', expiryDate.trim());
        formData.append('issuingAuthority', issuingAuthority.trim());
        formData.append('placeOfIssue', placeOfIssue.trim());
        formData.append('summary', summary.trim());
        formData.append('sensitivity', sensitivity);
        formData.append('isAsync', 'true');

        res = await uploadDocument(formData);
      } else {
        res = await uploadDocument({
          templateId: selectedTemplate.id,
          title: title.trim(),
          category: selectedCategoryObj.name,
          categoryId,
          profileId,
          profileName: selectedProfileObj.name,
          docNumber: docNumber.trim(),
          holderName: holderName.trim(),
          country: country.trim(),
          issueDate: issueDate.trim(),
          expiryDate: expiryDate.trim(),
          issuingAuthority: issuingAuthority.trim(),
          placeOfIssue: placeOfIssue.trim(),
          summary: summary.trim(),
          sensitivity,
          isAsync: true
        });
      }

      const docId = res.documentId || res.data?._id || res.data?.id;
      setCurrentDocId(docId);
      setSubmitting(false);

      // Instantly transition to Live Asynchronous Processing View
      setModalStep('processing');
      setProcessingStage('ocr');
      startPolling(docId);

    } catch (err) {
      setError(err.message || 'Failed to initiate document upload.');
      setSubmitting(false);
    }
  };

  // Retry OCR Analysis
  const handleRetry = async () => {
    if (!currentDocId) return;
    setIsRetrying(true);
    setProcessingError(null);
    setModalStep('processing');
    setProcessingStage('ocr');

    try {
      await retryDocumentOCR(currentDocId);
      startPolling(currentDocId);
    } catch (err) {
      setProcessingError(err.message || 'Failed to re-trigger OCR analysis.');
      setModalStep('failed');
    } finally {
      setIsRetrying(false);
    }
  };

  // Save manual updates made during review
  const handleSaveReviewUpdates = async (e) => {
    if (e) e.preventDefault();
    if (!currentDocId) {
      handleModalClose();
      return;
    }

    setSavingUpdates(true);
    setError(null);

    try {
      const selectedCategoryObj = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
      const selectedProfileObj = profiles.find(p => p.id === profileId) || profiles[0] || { name: 'Zaid (Self)' };

      const updatePayload = {
        title: title.trim(),
        category: selectedCategoryObj.name,
        categoryId,
        profileId,
        profileName: selectedProfileObj.name,
        docNumber: docNumber.trim(),
        holderName: holderName.trim(),
        country: country.trim(),
        issueDate: issueDate.trim(),
        expiryDate: expiryDate.trim(),
        issuingAuthority: issuingAuthority.trim(),
        placeOfIssue: placeOfIssue.trim(),
        summary: summary.trim(),
        sensitivity,
        tags
      };

      const res = await updateDocument(currentDocId, updatePayload);
      if (onSuccess && res.data) {
        onSuccess(res.data);
      }
      handleModalClose();
    } catch (err) {
      setError(err.message || 'Failed to save document updates.');
    } finally {
      setSavingUpdates(false);
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

  // Mapping stages to progress percentage
  const getStageProgress = (stage) => {
    switch (stage) {
      case 'queued':
      case 'storing':
        return 20;
      case 'ocr':
        return 45;
      case 'metadata':
        return 70;
      case 'dates':
        return 85;
      case 'categorizing':
        return 95;
      case 'completed':
        return 100;
      default:
        return 50;
    }
  };

  // Render 5-step checklist items
  const CHECKLIST_STEPS = [
    { id: 'storing', label: 'Document uploaded & securely stored in isolated vault', stageMatch: ['storing', 'ocr', 'metadata', 'dates', 'categorizing', 'completed'] },
    { id: 'ocr', label: 'Optical Character Recognition (OCR text & layout analysis)', stageMatch: ['ocr', 'metadata', 'dates', 'categorizing', 'completed'] },
    { id: 'metadata', label: 'Extracting document details & entity identifiers', stageMatch: ['metadata', 'dates', 'categorizing', 'completed'] },
    { id: 'dates', label: 'Contextual date detection (Issue vs Expiry separation)', stageMatch: ['dates', 'categorizing', 'completed'] },
    { id: 'categorizing', label: 'Intelligent categorization & compliance validity horizon', stageMatch: ['categorizing', 'completed'] }
  ];

  const currentStatus = computeStatus(expiryDate);
  const categoryName = CATEGORIES.find(c => c.id === categoryId)?.name || 'Official Document';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '680px',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-xl)',
          padding: '2rem',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 id="upload-modal-title" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {modalStep === 'form' && 'Upload Document & Auto-Index'}
              {modalStep === 'processing' && 'Analyzing Document Vault Record...'}
              {modalStep === 'review' && 'Document Analyzed & Stored'}
              {modalStep === 'failed' && 'Document Analysis Notice'}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              DocTrack AI • Fast, Secure, Asynchronous Document Intelligence
            </div>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleModalClose}
            aria-label="Close upload modal"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Error Banner */}
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

        {/* =========================================================
            STATE 1: INITIAL UPLOAD FORM (Fast, non-blocking)
           ========================================================= */}
        {modalStep === 'form' && (
          <>
            {/* Quick Sample Document Template Chips */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Zap size={13} color="var(--brand-dark)" />
                <span>ONE-CLICK TEST WITH SAMPLE OCR TEMPLATES:</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {templates.map(tpl => {
                  const isSelected = selectedTemplate?.id === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-pill)',
                        border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--brand-border)'}`,
                        backgroundColor: isSelected ? 'var(--brand-primary)' : 'var(--brand-light)',
                        color: isSelected ? '#FFFFFF' : 'var(--brand-dark)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Scan size={12} />
                      <span>{tpl.label.split('(')[0].trim()}</span>
                    </button>
                  );
                })}
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
                    {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different file
                  </div>
                </div>
              ) : selectedTemplate ? (
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--brand-dark)', fontSize: '0.95rem' }}>
                    Selected Template: {selectedTemplate.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Click here to upload your own document instead
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    Drop document or PDF here to start fast async upload
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Supports PDF, JPG, PNG, WEBP (Max 15 MB) • OCR extracts fields automatically
                  </div>
                </div>
              )}
            </div>

            {/* Ingestion Parameters Form */}
            <form onSubmit={handleStartUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Document Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Document Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Passport, Driving License, Honda City RC, Health Insurance..."
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Profile & Category Selectors */}
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

              {/* Manual Date Entry Section (Issue Date & Expiry Date) */}
              <div style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <Calendar size={15} color="var(--brand-primary)" />
                  <span>Document Dates (Manual Entry or OCR Auto-Detect)</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Issue Date Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      Issue Date <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.72rem' }}>(Optional)</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Leave blank to auto-detect via OCR
                    </div>
                  </div>

                  {/* Expiry Date Field */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Expiry Date <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.72rem' }}>(Optional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setExpiryDate(expiryDate === 'Perpetual' ? '' : 'Perpetual')}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: expiryDate === 'Perpetual' ? '#10B981' : 'var(--accent-blue)',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {expiryDate === 'Perpetual' ? '✓ Lifetime' : 'Mark as Lifetime'}
                      </button>
                    </div>

                    {expiryDate === 'Perpetual' ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#065F46',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        height: '38px'
                      }}>
                        <span>♾️ Lifetime / No Expiry</span>
                        <button
                          type="button"
                          onClick={() => setExpiryDate('')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#047857',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            textDecoration: 'underline'
                          }}
                        >
                          Pick date
                        </button>
                      </div>
                    ) : (
                      <input
                        type="date"
                        className="form-input"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        placeholder="YYYY-MM-DD"
                        style={{ fontSize: '0.85rem' }}
                      />
                    )}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Leave blank to auto-detect via OCR
                    </div>
                  </div>
                </div>
              </div>

              {/* Informative AI Badge */}
              <div
                style={{
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.8rem',
                  color: '#1D4ED8'
                }}
              >
                <Sparkles size={16} color="#2563EB" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Flexible Entry:</strong> You can fill in the dates above manually now, or leave them empty and DocTrack AI's high-speed OCR will auto-extract them from your file.
                </span>
              </div>

              {/* Mandatory Legal Consent */}
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
                    accentColor: 'var(--brand-primary)'
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

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleModalClose}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || (!selectedFile && !selectedTemplate)}
                  style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} />
                      <span>Upload & Start Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* =========================================================
            STATE 2: LIVE ASYNCHRONOUS PROCESSING & 5-STEP CHECKLIST
           ========================================================= */}
        {modalStep === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header / Active Document Card */}
            <div
              style={{
                backgroundColor: 'var(--brand-light)',
                border: '1px solid var(--brand-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <RefreshCw size={18} className="animate-spin" color="var(--brand-primary)" />
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--brand-dark)' }}>
                      Asynchronous OCR & Intelligence Engine
                    </span>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Processing "{title}" in the background
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                  {getStageProgress(processingStage)}%
                </span>
              </div>

              {/* Smooth Progress Bar */}
              <div style={{ height: '7px', backgroundColor: '#E2E8F0', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${getStageProgress(processingStage)}%`,
                    height: '100%',
                    backgroundColor: 'var(--brand-primary)',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>

            {/* 5-Step Real-Time Stepper Checklist */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Live Processing Checklist
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {CHECKLIST_STEPS.map((st, idx) => {
                  const isCurrent = processingStage === st.id;
                  const isCompleted = st.stageMatch.includes(processingStage) && processingStage !== st.id;

                  return (
                    <div
                      key={st.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        fontSize: '0.85rem',
                        fontWeight: isCurrent || isCompleted ? 700 : 500,
                        color: isCompleted ? '#059669' : isCurrent ? 'var(--brand-dark)' : 'var(--text-muted)',
                        padding: '0.35rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isCurrent ? 'var(--brand-light)' : 'transparent',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
                      ) : isCurrent ? (
                        <RefreshCw size={17} className="animate-spin" color="var(--brand-primary)" style={{ flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1.5px solid #CBD5E1', flexShrink: 0 }} />
                      )}
                      <span>
                        {idx + 1}. {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reassurance note */}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Your file is securely encrypted in MongoDB Atlas & storage. Polling server every 2 seconds...
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleModalClose}
              >
                Close & Run in Background
              </button>
            </div>
          </div>
        )}

        {/* =========================================================
            STATE 3: METADATA REVIEW & NOTIFICATION FEEDBACK CARD
           ========================================================= */}
        {modalStep === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Success Banner */}
            <div
              style={{
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#D1FAE5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#065F46', margin: 0 }}>
                  Document Processed & Stored Successfully!
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#047857', marginTop: '2px', marginBottom: 0 }}>
                  "{processedDoc?.title || title}" has been securely indexed and verified.
                </p>
              </div>
            </div>

            {/* Notification Delivery Feedback Card if Expiring Soon */}
            {processedDoc?.notificationHistory && processedDoc.notificationHistory.length > 0 && (
              <div
                style={{
                  backgroundColor: '#FFF7ED',
                  border: '1px solid #FED7AA',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#C2410C', fontWeight: 800, fontSize: '0.9rem' }}>
                  <AlertTriangle size={17} color="#EA580C" />
                  <span>Immediate Expiry Reminders Dispatched (≤ 30 Days Compliance Window)</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                  {processedDoc.notificationHistory.map((notif, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.82rem',
                        color: notif.status === 'SENT' ? '#065F46' : '#9A3412',
                        fontWeight: 600
                      }}
                    >
                      <CheckCircle2 size={15} color={notif.status === 'SENT' ? '#059669' : '#EA580C'} />
                      <span>
                        {notif.channel}: {notif.status} to {notif.recipient} ({notif.details})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Metadata Review Card */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              {/* Review Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} color="#059669" />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
                    Extracted Metadata Overview
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      color: '#059669',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)'
                    }}
                  >
                    {Math.round((processedDoc?.ocrConfidence || 0.95) * 100)}% Confidence
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingInReview(!isEditingInReview)}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: 'var(--brand-dark)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      cursor: 'pointer'
                    }}
                  >
                    {isEditingInReview ? 'Hide Edit Form' : '✏️ Edit Fields'}
                  </button>
                </div>
              </div>

              {/* Warning if Verification is Needed */}
              {(needsVerification || !expiryDate) && (
                <div
                  style={{
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.65rem 0.85rem',
                    color: '#B45309',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Non-Expiring or Needs Review:</strong> No definite expiration date was found on this document. You can confirm it as Perpetual or set an expiry date below.
                  </span>
                </div>
              )}

              {/* Metadata Key-Value Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '0.65rem',
                  backgroundColor: '#FFFFFF',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #E2E8F0'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Document Type</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginTop: '2px' }}>{categoryName}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Document #</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginTop: '2px' }}>{docNumber || 'None'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Holder Name</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginTop: '2px' }}>{holderName || 'Zaid'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Issue Date</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginTop: '2px' }}>{issueDate || 'None'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Expiry Date</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginTop: '2px' }}>{expiryDate || 'Perpetual / None'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Lifecycle Status</div>
                  <div style={{ marginTop: '2px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        backgroundColor: currentStatus.bg,
                        border: `1px solid ${currentStatus.border}`,
                        color: currentStatus.color,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        display: 'inline-block'
                      }}
                    >
                      {currentStatus.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggle Raw OCR Text Accordion */}
              {processedDoc?.ocrText && (
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowRawText(!showRawText)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
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
                        border: '1px solid #CBD5E1',
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
                      {processedDoc.ocrText}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Editable Form Inputs in Review Mode */}
            {isEditingInReview && (
              <form onSubmit={handleSaveReviewUpdates} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Verify or Edit Document Fields
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Document #
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Holder Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Issue Date
                    </label>
                    <input
                      type="text"
                      placeholder="YYYY-MM-DD"
                      className="form-input"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Expiry Date (or Perpetual)
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsEditingInReview(false)}
                  >
                    Cancel Edit
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={savingUpdates}
                  >
                    {savingUpdates ? 'Saving...' : 'Save Updates'}
                  </button>
                </div>
              </form>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleModalClose}
                style={{ fontWeight: 700, padding: '0.6rem 1.5rem' }}
              >
                Done / View in Vault
              </button>
            </div>
          </div>
        )}

        {/* =========================================================
            STATE 4: FAILURE RESILIENCE & RETRY
           ========================================================= */}
        {modalStep === 'failed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem'
              }}
            >
              <AlertCircle size={24} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                  Automated Analysis Could Not Complete
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#B91C1C', marginTop: '4px', marginBottom: 0 }}>
                  {processingError || 'The OCR engine could not reliably parse text from this document.'}
                </p>
                <div style={{ fontSize: '0.78rem', color: '#7F1D1D', marginTop: '0.5rem' }}>
                  ✓ <strong>Your document was NOT deleted.</strong> It remains safely stored in your vault. You can retry automated analysis or fill details manually.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setModalStep('review');
                  setIsEditingInReview(true);
                }}
              >
                Enter Details Manually
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRetry}
                disabled={isRetrying}
                style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={15} className={isRetrying ? 'animate-spin' : ''} />
                <span>{isRetrying ? 'Retrying...' : 'Retry OCR Analysis'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
