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
  Plus,
  Mail,
  MessageSquare,
  Clock,
  Check
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
  const [holderName, setHolderName] = useState('');
  const [country, setCountry] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [placeOfIssue, setPlaceOfIssue] = useState('');
  const [summary, setSummary] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitSuccessData, setSubmitSuccessData] = useState(null);

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

  // Run animated 5-stage OCR extraction pipeline
  const runOCR = async (fileOrTemplate) => {
    setOcrScanning(true);
    setOcrResult(null);
    setSubmitSuccessData(null);
    setOcrStage(1); // 1. Uploading document...
    setOcrProgress(20);

    const t1 = setTimeout(() => {
      setOcrStage(2); // 2. Analyzing document with OCR...
      setOcrProgress(40);
    }, 400);

    const t2 = setTimeout(() => {
      setOcrStage(3); // 3. Extracting document details...
      setOcrProgress(65);
    }, 800);

    const t3 = setTimeout(() => {
      setOcrStage(4); // 4. Checking expiry date...
      setOcrProgress(85);
    }, 1200);

    try {
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

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      setOcrStage(5); // 5. Document processed successfully.
      setOcrProgress(100);

      if (ocrRes && ocrRes.success) {
        setOcrResult(ocrRes);
        const fields = ocrRes.extractedFields || {};

        // Pre-fill form fields automatically
        if (fields.title) setTitle(fields.title);
        if (fields.categoryId) setCategoryId(fields.categoryId);
        if (fields.docNumber) setDocNumber(fields.docNumber);
        if (fields.holderName) setHolderName(fields.holderName);
        if (fields.country) setCountry(fields.country);
        if (fields.issueDate) setIssueDate(fields.issueDate);
        if (fields.expiryDate) setExpiryDate(fields.expiryDate);
        if (fields.issuingAuthority) setIssuingAuthority(fields.issuingAuthority);
        if (fields.placeOfIssue) setPlaceOfIssue(fields.placeOfIssue);
        if (fields.summary) setSummary(fields.summary);
        if (fields.needsVerification !== undefined) setNeedsVerification(fields.needsVerification);

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
      }, 700);
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
      formData.append('holderName', holderName.trim());
      formData.append('country', country.trim());
      formData.append('issueDate', issueDate.trim());
      formData.append('expiryDate', expiryDate.trim());
      formData.append('issuingAuthority', issuingAuthority.trim());
      formData.append('placeOfIssue', placeOfIssue.trim());
      formData.append('summary', summary.trim());
      formData.append('needsVerification', needsVerification ? 'true' : 'false');

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

      const savedDoc = res.data;
      const notif = res.notification;

      if (notif && notif.triggered) {
        setSubmitSuccessData(res);
        setSubmitting(false);
        if (onSuccess) onSuccess(savedDoc);
      } else {
        setTimeout(() => {
          setSubmitting(false);
          if (onSuccess) onSuccess(savedDoc);
          onClose();
        }, 400);
      }
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

        {/* Post-Upload Success & Notification Dispatched Modal State */}
        {submitSuccessData ? (
          <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: '#D1FAE5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CheckCircle2 size={30} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065F46', margin: 0 }}>
                  Document Processed & Stored Successfully!
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#047857', marginTop: '0.35rem', marginBottom: 0 }}>
                  "{submitSuccessData.data?.title}" has been securely encrypted and stored in your vault.
                </p>
              </div>
            </div>

            {/* Notification Delivery Feedback Card */}
            {submitSuccessData.notification && submitSuccessData.notification.triggered ? (
              <div
                style={{
                  backgroundColor: '#FFF7ED',
                  border: '1px solid #FED7AA',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#C2410C', fontWeight: 800, fontSize: '0.92rem' }}>
                  <AlertTriangle size={17} color="#EA580C" />
                  <span>Document Expiring Soon ({submitSuccessData.notification.daysLeft} days remaining)</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9A3412', lineHeight: 1.4 }}>
                  Immediate expiry reminders were evaluated against your 30-day compliance horizon:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {submitSuccessData.notification.emailSent ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#065F46', fontWeight: 600 }}>
                      <CheckCircle2 size={16} color="#059669" />
                      <span>✓ Email reminder sent to {submitSuccessData.notification.emailRecipient}</span>
                    </div>
                  ) : submitSuccessData.notification.emailStatus === 'skipped' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#64748B' }}>
                      <Clock size={16} />
                      <span>Email reminder skipped (No email address on user profile)</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#DC2626' }}>
                      <AlertCircle size={16} />
                      <span>Email delivery failed (Transporter error logged)</span>
                    </div>
                  )}

                  {submitSuccessData.notification.smsSent ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#065F46', fontWeight: 600 }}>
                      <CheckCircle2 size={16} color="#059669" />
                      <span>✓ SMS reminder sent to {submitSuccessData.notification.smsRecipient}</span>
                    </div>
                  ) : submitSuccessData.notification.smsStatus === 'skipped' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#64748B' }}>
                      <Clock size={16} />
                      <span>SMS reminder skipped (No mobile phone on user profile)</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#DC2626' }}>
                      <AlertCircle size={16} />
                      <span>SMS delivery failed (Carrier / provider error logged)</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                  fontSize: '0.82rem',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <CheckCircle2 size={16} color="#059669" />
                <span>Document lifecycle active. Automated reminders will be dispatched prior to expiry.</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
                style={{ fontWeight: 700, padding: '0.6rem 1.5rem' }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
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

        {/* 5-Step Animated OCR Processing Pipeline */}
        {ocrScanning && (
          <div
            style={{
              backgroundColor: 'var(--brand-light)',
              border: '1px solid var(--brand-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--brand-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={16} className="animate-spin" color="var(--brand-primary)" />
                <span>Automated Document Intelligence Pipeline</span>
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                {ocrProgress}%
              </span>
            </div>

            {/* Stepper Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { stage: 1, label: '1. Uploading document...' },
                { stage: 2, label: '2. Analyzing document with OCR...' },
                { stage: 3, label: '3. Extracting document details...' },
                { stage: 4, label: '4. Checking expiry date...' },
                { stage: 5, label: '5. Document processed successfully.' }
              ].map(st => {
                const isCompleted = ocrStage > st.stage;
                const isCurrent = ocrStage === st.stage;
                return (
                  <div
                    key={st.stage}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.82rem',
                      fontWeight: isCurrent || isCompleted ? 700 : 500,
                      color: isCompleted ? '#059669' : isCurrent ? 'var(--brand-dark)' : 'var(--text-muted)'
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={15} color="#059669" />
                    ) : isCurrent ? (
                      <RefreshCw size={14} className="animate-spin" color="var(--brand-primary)" />
                    ) : (
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid #CBD5E1' }} />
                    )}
                    <span>{st.label}</span>
                  </div>
                );
              })}
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

        {/* Extracted Metadata Review Card */}
        {ocrResult && !ocrScanning && (() => {
          const currentStatus = computeStatus(expiryDate);
          const categoryName = CATEGORIES.find(c => c.id === categoryId)?.name || 'Official Document';

          return (
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                marginBottom: '1.25rem',
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
                    Extracted Metadata Review
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
                    {Math.round((ocrResult.confidence || 0.95) * 100)}% Confidence
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)'
                    }}
                  >
                    {ocrResult.provider || 'SmartOCR'}
                  </span>
                </div>
              </div>

              {/* Warning if Verification is Needed */}
              {(needsVerification || (ocrResult.confidence && ocrResult.confidence < 0.8)) && (
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
                  <AlertTriangle size={16} color="#D97706" />
                  <span>
                    <strong>Please verify extracted information:</strong> Some document fields could not be determined with high certainty. Please review and adjust the fields below before saving.
                  </span>
                </div>
              )}

              {/* Expiring Soon Status Banner */}
              {currentStatus.isExpiringSoon && (
                <div
                  style={{
                    backgroundColor: '#FFF7ED',
                    border: '1px solid #FED7AA',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 0.85rem',
                    color: '#C2410C',
                    fontSize: '0.82rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                    <AlertTriangle size={15} color="#EA580C" />
                    <span>Document Expiring Soon ({currentStatus.daysLeft} days remaining)</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#9A3412', lineHeight: 1.35 }}>
                    DocTrack AI will immediately dispatch multi-channel reminders (Email & SMS) to your registered profile upon saving.
                  </div>
                </div>
              )}

              {/* Metadata Key-Value Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Document Number</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginTop: '2px' }}>{docNumber || 'Not detected'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Holder Name</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginTop: '2px' }}>{holderName || 'Not detected'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Issue Date</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginTop: '2px' }}>{issueDate || 'Not detected'}</div>
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
                    {ocrResult.rawText}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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

          {/* Document Number & Holder Name */}
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
                Holder Name
              </label>
              <input
                type="text"
                placeholder="e.g. Mohammed Zaid"
                className="form-input"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
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

          {/* Issuing Authority & Place of Issue / Country */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Place of Issue / Country
              </label>
              <input
                type="text"
                placeholder="e.g. Bengaluru, India"
                className="form-input"
                value={placeOfIssue || country}
                onChange={(e) => {
                  setPlaceOfIssue(e.target.value);
                  setCountry(e.target.value);
                }}
              />
            </div>
          </div>


          {/* Notes / Summary */}
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
        </>
        )}
      </div>
    </div>
  );
}
