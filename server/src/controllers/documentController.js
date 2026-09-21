const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { isDbConnected } = require('../config/db');
const {
  getDocuments,
  getDocumentById: getLocalDocById,
  addDocument: addLocalDoc,
  updateDocument: updateLocalDoc,
  deleteDocument: deleteLocalDoc,
  calculateExpiryStatus
} = require('../services/documentStore');
const { ocrService } = require('../services/ocr');
const { classificationService } = require('../services/classification');
const cloudinaryService = require('../services/cloudinary.service');
const { checkAndDispatchExpiryNotification } = require('../services/notificationService');

/**
 * Format bytes to human-readable string
 */
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Get all documents with optional filtering
 * GET /api/documents
 */
const getAllDocuments = async (req, res, next) => {
  try {
    const { profileId, categoryId, status, q } = req.query;
    const userId = req.user?.id || 'demo-user-zaid-001';

    let docs = [];

    if (isDbConnected()) {
      const query = { userId };
      if (profileId && profileId !== 'all') query.profileId = profileId;
      if (categoryId && categoryId !== 'all') query.categoryId = categoryId;
      if (status && status !== 'ALL') query.status = status;
      if (q && q.trim()) {
        query.$or = [
          { title: { $regex: q.trim(), $options: 'i' } },
          { docNumber: { $regex: q.trim(), $options: 'i' } },
          { profileName: { $regex: q.trim(), $options: 'i' } }
        ];
      }

      docs = await Document.find(query).sort({ updatedAt: -1 });
      // Only demo-user-zaid-001 falls back to seed documents when DB has no records
      if (docs.length === 0 && userId === 'demo-user-zaid-001' && !profileId && !categoryId && !status && !q) {
        docs = getDocuments('demo-user-zaid-001');
      }
    } else {
      docs = getDocuments(userId);

      if (profileId && profileId !== 'all') {
        docs = docs.filter(d => d.profileId === profileId);
      }
      if (categoryId && categoryId !== 'all') {
        docs = docs.filter(d => d.categoryId === categoryId);
      }
      if (status && status !== 'ALL') {
        docs = docs.filter(d => d.status === status);
      }
      if (q && q.trim()) {
        const queryTerm = q.toLowerCase().trim();
        docs = docs.filter(
          d =>
            d.title.toLowerCase().includes(queryTerm) ||
            (d.docNumber && d.docNumber.toLowerCase().includes(queryTerm)) ||
            (d.profileName && d.profileName.toLowerCase().includes(queryTerm))
        );
      }
    }

    return res.status(200).json({
      success: true,
      count: docs.length,
      data: docs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single document by ID
 * GET /api/documents/:id
 */
const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'demo-user-zaid-001';
    let doc = null;

    if (isDbConnected()) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(id)) {
        doc = await Document.findOne({ _id: id, userId });
      } else {
        doc = await Document.findOne({ $or: [{ id }, { docNumber: id }], userId });
      }
    } else {
      doc = getLocalDocById(id, userId);
    }

    if (!doc) {
      return res.status(404).json({
        success: false,
        status: 'error',
        code: 'DOCUMENT_NOT_FOUND',
        errorCode: 'DOCUMENT_NOT_FOUND',
        message: `Document ${id} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: doc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload and index a new document with automated OCR analysis & immediate threshold notification
 * POST /api/documents/upload & POST /api/documents
 */
const uploadDocument = async (req, res, next) => {
  try {
    const userId = req.user?.id || 'demo-user-zaid-001';
    const {
      title,
      category = 'Identity Proofs',
      categoryId = 'identity',
      profileId = 'self',
      profileName = 'Zaid (Self)',
      docNumber = '',
      holderName = '',
      dateOfBirth = '',
      country = '',
      address = '',
      issueDate = '',
      expiryDate = '',
      issuingAuthority = '',
      placeOfIssue = '',
      summary = ''
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Document title is required.'
      });
    }

    // File metadata
    let fileName = 'manual_entry.pdf';
    let fileUrl = '';
    let fileSize = '1.2 MB';

    if (req.file) {
      fileName = req.file.originalname;
      fileUrl = `/uploads/${req.file.filename}`;
      fileSize = formatFileSize(req.file.size);
    }

    // Automated OCR Extraction Pipeline
    let ocrText = req.body.ocrText || '';
    let ocrConfidence = req.body.ocrConfidence ? parseFloat(req.body.ocrConfidence) : null;
    let ocrProcessed = req.body.ocrProcessed !== undefined ? Boolean(req.body.ocrProcessed) : false;
    let extractedFields = {};

    if (req.file) {
      try {
        const ocrRes = await ocrService.extractText(req.file.path, { fileName: req.file.originalname });
        if (ocrRes && ocrRes.success) {
          ocrText = ocrText || ocrRes.rawText;
          ocrConfidence = ocrConfidence || ocrRes.confidence;
          ocrProcessed = true;
          extractedFields = ocrRes.extractedFields || {};
        }
      } catch (err) {
        console.warn('Background OCR extraction warning:', err.message);
      }
    }

    // Merge extracted metadata with submitted values
    const finalDocNumber = (docNumber && docNumber.trim()) || extractedFields.docNumber || '';
    const finalHolderName = (holderName && holderName.trim()) || extractedFields.holderName || '';
    const finalDateOfBirth = (dateOfBirth && dateOfBirth.trim()) || extractedFields.dateOfBirth || '';
    const finalCountry = (country && country.trim()) || extractedFields.country || 'India';
    const finalAddress = (address && address.trim()) || extractedFields.address || '';
    const finalAuthority = (issuingAuthority && issuingAuthority.trim()) || extractedFields.issuingAuthority || '';
    const finalPlace = (placeOfIssue && placeOfIssue.trim()) || extractedFields.placeOfIssue || '';

    // Date normalization & contextual parsing
    let rawIssueDate = (issueDate && issueDate.trim()) || extractedFields.issueDate || '';
    let rawExpiryDate = (expiryDate && expiryDate.trim()) || extractedFields.expiryDate || '';

    const normalizedIssueDate = ocrService.normalizeDate(rawIssueDate) || rawIssueDate || '';
    const normalizedExpiryDate = ocrService.normalizeDate(rawExpiryDate) || (rawExpiryDate === 'Perpetual' ? 'Perpetual' : (rawExpiryDate || null));

    // Expiry status & remaining validity calculation
    let status = 'ACTIVE';
    let daysLeft = null;
    let needsVerification = false;

    if (!normalizedExpiryDate) {
      status = 'ACTIVE';
      daysLeft = null;
      needsVerification = true;
    } else {
      const expEval = calculateExpiryStatus(normalizedExpiryDate);
      status = expEval.status;
      daysLeft = expEval.daysLeft;
    }

    // If Cloudinary is configured, upload the validated document to Cloudinary
    if (req.file && cloudinaryService.isConfigured()) {
      try {
        const cloudRes = await cloudinaryService.uploadDocumentFile(req.file.path, {
          folder: `doctrack/${userId}/documents`
        });
        if (cloudRes && cloudRes.url) {
          fileUrl = cloudRes.url;
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (e) {}
        }
      } catch (cloudErr) {
        console.warn('[Cloudinary Warning] Falling back to local storage URL:', cloudErr.message);
      }
    }

    let classification = null;
    if (req.body.classification) {
      try {
        classification = typeof req.body.classification === 'string'
          ? JSON.parse(req.body.classification)
          : req.body.classification;
      } catch (e) {
        classification = null;
      }
    }

    if (!classification) {
      classification = await classificationService.classify(ocrText, {
        fileName,
        title: title.trim(),
        ocrFields: { docNumber: finalDocNumber, issuingAuthority: finalAuthority, title }
      });
    }

    const sensitivity = req.body.sensitivity || classification?.sensitivity || 'STANDARD';
    let tags = [];
    if (req.body.tags) {
      tags = Array.isArray(req.body.tags)
        ? req.body.tags
        : typeof req.body.tags === 'string'
          ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean)
          : [];
    } else if (classification?.suggestedTags) {
      tags = classification.suggestedTags;
    }

    const docPayload = {
      userId,
      title: title.trim(),
      category: category.trim(),
      categoryId: categoryId.trim(),
      profileId: profileId.trim(),
      profileName: profileName.trim(),
      docNumber: finalDocNumber,
      holderName: finalHolderName,
      dateOfBirth: finalDateOfBirth,
      country: finalCountry,
      address: finalAddress,
      issueDate: normalizedIssueDate,
      expiryDate: normalizedExpiryDate || '',
      status,
      daysLeft,
      issuingAuthority: finalAuthority,
      placeOfIssue: finalPlace,
      needsVerification,
      fileName,
      fileUrl,
      fileSize,
      uploadedAt: new Date().toISOString(),
      verified: !needsVerification,
      renewalRequired: status === 'EXPIRING_SOON' || status === 'EXPIRED',
      summary: summary.trim() || `Stored document indexed for ${profileName}.`,
      ocrText,
      ocrConfidence: ocrConfidence || 0.95,
      ocrProcessed: ocrProcessed || Boolean(ocrText),
      sensitivity,
      tags,
      classification,
      extractedMetadata: extractedFields,
      notificationHistory: []
    };

    let savedDoc = null;

    if (isDbConnected()) {
      savedDoc = await Document.create(docPayload);
      await ActivityLog.create({
        userId,
        type: 'UPLOAD',
        title: `Document Uploaded: ${docPayload.title}`,
        description: `Indexed under ${docPayload.profileName} (${docPayload.category}).`
      });
    } else {
      docPayload.id = `doc-${Date.now()}`;
      savedDoc = addLocalDoc(docPayload);
    }

    // Immediate Threshold Check & Multi-Channel Notification Dispatch
    const thresholdDays = parseInt(process.env.EXPIRY_REMINDER_THRESHOLD_DAYS || '30', 10);
    let notificationResult = { triggered: false };

    try {
      notificationResult = await checkAndDispatchExpiryNotification({
        document: savedDoc,
        user: req.user,
        thresholdDays,
        isImmediate: true
      });
    } catch (notifErr) {
      console.warn('[Immediate Notification Error]', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Document uploaded and indexed successfully.',
      data: savedDoc,
      notification: notificationResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing document
 * PUT /api/documents/:id
 */
const updateDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'demo-user-zaid-001';
    const updates = { ...req.body };

    // Prevent changing document ownership
    delete updates.userId;

    if (updates.expiryDate) {
      const normalizedExp = ocrService.normalizeDate(updates.expiryDate) || updates.expiryDate;
      updates.expiryDate = normalizedExp;
      const { status, daysLeft } = calculateExpiryStatus(normalizedExp);
      updates.status = status;
      updates.daysLeft = daysLeft;
      updates.renewalRequired = status === 'EXPIRING_SOON' || status === 'EXPIRED';
      updates.needsVerification = false;
      updates.verified = true;
    }

    let updatedDoc = null;

    if (isDbConnected()) {
      const mongoose = require('mongoose');
      const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id, userId } : { id, userId };
      updatedDoc = await Document.findOneAndUpdate(filter, updates, { new: true });
    } else {
      const existing = getLocalDocById(id, userId);
      if (existing) {
        updatedDoc = updateLocalDoc(id, updates);
      }
    }

    if (!updatedDoc) {
      return res.status(404).json({
        success: false,
        status: 'error',
        code: 'DOCUMENT_NOT_FOUND',
        errorCode: 'DOCUMENT_NOT_FOUND',
        message: `Document ${id} not found.`
      });
    }

    // Check if updated document entered expiry threshold
    if (updatedDoc.status === 'EXPIRING_SOON' || updatedDoc.status === 'EXPIRED') {
      const thresholdDays = parseInt(process.env.EXPIRY_REMINDER_THRESHOLD_DAYS || '30', 10);
      try {
        await checkAndDispatchExpiryNotification({
          document: updatedDoc,
          user: req.user,
          thresholdDays
        });
      } catch (e) {}
    }

    return res.status(200).json({
      success: true,
      message: 'Document updated successfully.',
      data: updatedDoc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a document
 * DELETE /api/documents/:id
 */
const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'demo-user-zaid-001';
    let deleted = false;
    let fileUrlToDelete = null;

    if (isDbConnected()) {
      const mongoose = require('mongoose');
      const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id, userId } : { id, userId };
      const doc = await Document.findOne(filter);
      if (doc) {
        fileUrlToDelete = doc.fileUrl;
        await Document.findOneAndDelete(filter);
        deleted = true;
      }
    } else {
      const doc = getLocalDocById(id, userId);
      if (doc) {
        fileUrlToDelete = doc.fileUrl;
        deleted = deleteLocalDoc(id);
      }
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        status: 'error',
        code: 'DOCUMENT_NOT_FOUND',
        errorCode: 'DOCUMENT_NOT_FOUND',
        message: `Document ${id} not found.`
      });
    }

    // Safely remove file on Cloudinary or local disk
    if (fileUrlToDelete && (fileUrlToDelete.includes('cloudinary.com') || fileUrlToDelete.startsWith('https://res.cloudinary.com'))) {
      try {
        await cloudinaryService.deleteDocumentFile(fileUrlToDelete);
      } catch (e) {
        console.warn('Failed to delete asset from Cloudinary:', e.message);
      }
    } else if (fileUrlToDelete && fileUrlToDelete.startsWith('/uploads/')) {
      const fileName = fileUrlToDelete.replace('/uploads/', '');
      const filePath = path.resolve(__dirname, '../../uploads', fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Failed to delete file from uploads disk:', e.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument
};
