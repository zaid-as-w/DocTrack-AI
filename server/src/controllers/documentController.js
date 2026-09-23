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
const { checkAndDispatchExpiryNotification, dispatchDocumentUploadedNotification } = require('../services/notificationService');
const documentProcessingQueue = require('../services/documentProcessingQueue');

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
    let {
      title,
      category = 'Other Documents',
      categoryId = 'other',
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

    // File metadata
    let fileName = 'manual_entry.pdf';
    let fileUrl = '';
    let fileSize = '1.2 MB';

    if (req.file) {
      fileName = req.file.originalname;
      fileUrl = `/uploads/${req.file.filename}`;
      fileSize = formatFileSize(req.file.size);

      // If title not provided, auto-derive from original filename
      if (!title || !title.trim()) {
        const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Document title is required.'
      });
    }

    const isAsync = Boolean(req.file) || Boolean(req.body?.templateId) || req.body?.isAsync === 'true' || req.body?.isAsync === true;

    // Initial date normalization if provided
    const normalizedIssueDate = ocrService.normalizeDate(issueDate) || issueDate || '';
    let normalizedExpiryDate = null;
    if (expiryDate && typeof expiryDate === 'string' && expiryDate.trim()) {
      if (/perpetual|lifetime|never|no expiry/i.test(expiryDate.trim())) {
        normalizedExpiryDate = 'Perpetual';
      } else {
        normalizedExpiryDate = ocrService.normalizeDate(expiryDate.trim()) || expiryDate.trim();
      }
    }

    let status = 'ACTIVE';
    let daysLeft = null;
    if (normalizedExpiryDate && normalizedExpiryDate !== 'Perpetual') {
      const expEval = calculateExpiryStatus(normalizedExpiryDate);
      status = expEval.status;
      daysLeft = expEval.daysLeft;
    }

    const docPayload = {
      userId,
      title: title.trim(),
      category: category.trim(),
      categoryId: categoryId.trim(),
      profileId: profileId.trim(),
      profileName: profileName.trim(),
      docNumber: docNumber.trim(),
      holderName: holderName.trim(),
      dateOfBirth: dateOfBirth.trim(),
      country: country.trim() || 'India',
      address: address.trim(),
      issueDate: normalizedIssueDate,
      expiryDate: normalizedExpiryDate || '',
      status,
      daysLeft,
      issuingAuthority: issuingAuthority.trim(),
      placeOfIssue: placeOfIssue.trim(),
      needsVerification: !normalizedExpiryDate,
      fileName,
      fileUrl,
      fileSize,
      uploadedAt: new Date().toISOString(),
      verified: Boolean(normalizedExpiryDate),
      renewalRequired: status === 'EXPIRING_SOON' || status === 'EXPIRED',
      summary: summary.trim() || `Stored document record for ${profileName}.`,
      ocrText: req.body.ocrText || '',
      ocrConfidence: req.body.ocrConfidence ? parseFloat(req.body.ocrConfidence) : null,
      ocrProcessed: false,
      processingStatus: isAsync ? 'processing' : 'completed',
      processingStage: isAsync ? 'queued' : 'completed',
      ocrStatus: isAsync ? 'pending' : 'completed',
      metadataStatus: isAsync ? 'pending' : 'completed',
      processingError: '',
      documentType: '',
      classificationConfidence: null,
      sensitivity: req.body.sensitivity || 'STANDARD',
      tags: [],
      classification: null,
      extractedMetadata: {},
      notificationHistory: []
    };

    let savedDoc = null;

    if (isDbConnected()) {
      savedDoc = await Document.create(docPayload);
      await ActivityLog.create({
        userId,
        type: 'UPLOAD',
        title: `Document Uploaded: ${docPayload.title}`,
        description: `Stored securely under ${docPayload.profileName}.`
      });
    } else {
      docPayload.id = `doc-${Date.now()}`;
      savedDoc = addLocalDoc(docPayload);
    }

    const documentId = savedDoc._id ? savedDoc._id.toString() : savedDoc.id;

    // Trigger asynchronous background processing pipeline
    if (isAsync) {
      documentProcessingQueue.enqueue(savedDoc, {
        user: req.user,
        filePath: req.file ? req.file.path : null,
        body: req.body
      });
    } else {
      // For manual creation without file, dispatch notifications non-blocking
      setImmediate(() => {
        dispatchDocumentUploadedNotification({
          document: savedDoc,
          user: req.user
        }).catch(() => {});

        const isPerpetual = !normalizedExpiryDate || normalizedExpiryDate === 'Perpetual' || /perpetual|lifetime|never|no expiry/i.test(normalizedExpiryDate);
        if (!isPerpetual && daysLeft !== null && (daysLeft <= 180 || status === 'EXPIRING_SOON' || status === 'EXPIRED')) {
          checkAndDispatchExpiryNotification({
            document: savedDoc,
            user: req.user,
            thresholdDays: status === 'EXPIRED' ? -1 : 180,
            isImmediate: true
          }).catch(() => {});
        }
      });
    }

    // Return immediate HTTP 201 response (< 200ms)
    return res.status(201).json({
      success: true,
      message: isAsync ? 'Document uploaded successfully. Processing started.' : 'Document created successfully.',
      documentId,
      processingStatus: savedDoc.processingStatus,
      data: savedDoc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get real-time document processing and OCR status
 * GET /api/documents/:id/status
 */
const getDocumentStatus = async (req, res, next) => {
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
        message: `Document ${id} not found.`
      });
    }

    const docId = doc._id ? doc._id.toString() : doc.id;
    return res.status(200).json({
      success: true,
      documentId: docId,
      processingStatus: doc.processingStatus || 'completed',
      processingStage: doc.processingStage || 'completed',
      ocrStatus: doc.ocrStatus || 'completed',
      metadataStatus: doc.metadataStatus || 'completed',
      processingError: doc.processingError || '',
      data: doc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retry or re-trigger document OCR analysis without re-uploading file
 * POST /api/documents/:id/retry-ocr & POST /api/documents/:id/process
 */
const retryDocumentOCR = async (req, res, next) => {
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
        message: `Document ${id} not found.`
      });
    }

    const docId = doc._id ? doc._id.toString() : doc.id;

    // Check if already currently processing
    if (documentProcessingQueue.isProcessing(docId)) {
      return res.status(200).json({
        success: true,
        message: 'Document analysis is already currently in progress.',
        documentId: docId,
        processingStatus: 'processing'
      });
    }

    // Reset processing status
    const resetUpdates = {
      processingStatus: 'processing',
      processingStage: 'queued',
      ocrStatus: 'processing',
      processingError: ''
    };

    if (isDbConnected()) {
      doc = await Document.findByIdAndUpdate(docId, resetUpdates, { new: true });
    } else {
      doc = updateLocalDoc(docId, resetUpdates);
    }

    // Enqueue background processing without blocking
    documentProcessingQueue.enqueue(doc, {
      user: req.user,
      isRetry: true
    });

    return res.status(200).json({
      success: true,
      message: 'Document analysis retry started successfully.',
      documentId: docId,
      processingStatus: 'processing',
      data: doc
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
  deleteDocument,
  getDocumentStatus,
  retryDocumentOCR
};
