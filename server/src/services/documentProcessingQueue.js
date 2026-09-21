/**
 * Asynchronous Background Document Processing Queue
 * DocTrack AI — Fast, Secure, Asynchronous OCR Pipeline
 * 
 * Offloads OCR text extraction, entity parsing, intelligent categorization,
 * expiry calculation, and immediate reminder dispatching from the HTTP upload request.
 */

const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { isDbConnected } = require('../config/db');
const { updateDocument: updateLocalDoc, getDocumentById: getLocalDocById, calculateExpiryStatus } = require('./documentStore');
const { ocrService } = require('./ocr');
const { classificationService } = require('./classification');
const cloudinaryService = require('./cloudinary.service');
const { checkAndDispatchExpiryNotification, dispatchDocumentUploadedNotification } = require('./notificationService');

// In-memory active job locks to prevent duplicate concurrent processing for the same document ID
const activeJobs = new Set();

/**
 * Check if a document is currently undergoing background processing
 * @param {string} docId
 * @returns {boolean}
 */
const isProcessing = (docId) => {
  if (!docId) return false;
  return activeJobs.has(docId.toString());
};

/**
 * Update document record in MongoDB or LocalDB
 */
const saveDocUpdate = async (docId, updates) => {
  try {
    if (isDbConnected()) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(docId)) {
        return await Document.findByIdAndUpdate(docId, updates, { new: true });
      }
      return await Document.findOneAndUpdate({ $or: [{ id: docId }, { _id: docId }] }, updates, { new: true });
    }
    return updateLocalDoc(docId, updates);
  } catch (err) {
    console.warn(`[DocumentProcessingQueue] Failed to save document update for ${docId}:`, err.message);
    return null;
  }
};

/**
 * Fetch document record by ID from MongoDB or LocalDB
 */
const fetchDocument = async (docId, userId) => {
  try {
    if (isDbConnected()) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(docId)) {
        return await Document.findById(docId);
      }
      return await Document.findOne({ $or: [{ id: docId }, { _id: docId }] });
    }
    return getLocalDocById(docId, userId);
  } catch (err) {
    console.warn(`[DocumentProcessingQueue] Error fetching doc ${docId}:`, err.message);
    return null;
  }
};

/**
 * Execute full asynchronous document processing pipeline:
 * 1. Cloudinary storage sync (if configured)
 * 2. OCR text extraction
 * 3. Metadata extraction (holder name, doc number, authority, country, address)
 * 4. Contextual date detection (Issue vs Expiry)
 * 5. Document categorization & sensitivity classification
 * 6. Expiry status & validity horizon calculation
 * 7. Immediate threshold reminder dispatch (Nodemailer SMTP + Twilio SMS)
 * 8. Status finalization (completed / needs_review / failed)
 * 
 * @param {Object|string} docOrId - Document object or document ID
 * @param {Object} options - { user, filePath, body, isRetry }
 */
const processDocument = async (docOrId, options = {}) => {
  const docId = (docOrId?._id ? docOrId._id.toString() : (docOrId?.id || docOrId?.toString())).trim();

  if (!docId) {
    console.warn('[DocumentProcessingQueue] Invalid document ID received.');
    return { success: false, error: 'INVALID_DOC_ID' };
  }

  // Duplicate Job Prevention: skip if already active
  if (activeJobs.has(docId)) {
    console.log(`[DocumentProcessingQueue] Document ${docId} is already being processed. Skipping duplicate job.`);
    return { success: true, alreadyRunning: true, processingStatus: 'processing' };
  }

  activeJobs.add(docId);

  try {
    let doc = typeof docOrId === 'object' && docOrId.title ? docOrId : await fetchDocument(docId, options.user?.id);

    if (!doc) {
      console.warn(`[DocumentProcessingQueue] Document ${docId} not found in database.`);
      activeJobs.delete(docId);
      return { success: false, error: 'DOCUMENT_NOT_FOUND' };
    }

    // Step 1: Initialize processing status & stage
    await saveDocUpdate(docId, {
      processingStatus: 'processing',
      processingStage: 'ocr',
      ocrStatus: 'processing',
      processingError: ''
    });

    // Step 2: Storage Sync (Cloudinary upload if configured and local file exists)
    let filePath = options.filePath;
    if (!filePath && doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
      filePath = path.join(__dirname, '../../', doc.fileUrl);
    }

    if (filePath && fs.existsSync(filePath) && cloudinaryService.isConfigured()) {
      try {
        await saveDocUpdate(docId, { processingStage: 'storing' });
        const cloudRes = await cloudinaryService.uploadDocumentFile(filePath, {
          folder: `doctrack/${doc.userId || 'general'}/documents`
        });
        if (cloudRes && cloudRes.url) {
          doc.fileUrl = cloudRes.url;
          await saveDocUpdate(docId, { fileUrl: cloudRes.url });
        }
      } catch (cloudErr) {
        console.warn(`[DocumentProcessingQueue] Cloudinary sync notice for ${docId}:`, cloudErr.message);
      }
    }

    // Step 3: OCR Text Extraction
    await saveDocUpdate(docId, { processingStage: 'ocr' });
    let ocrText = doc.ocrText || '';
    let ocrConfidence = doc.ocrConfidence || 0.90;
    let extractedFields = doc.extractedMetadata || {};

    try {
      const templateId = options.body?.templateId;
      if (filePath && fs.existsSync(filePath)) {
        const ocrRes = await ocrService.extractText(filePath, { fileName: doc.fileName, templateId });
        if (ocrRes && ocrRes.success) {
          ocrText = ocrRes.rawText || ocrText;
          ocrConfidence = ocrRes.confidence || ocrConfidence;
          extractedFields = ocrRes.extractedFields || {};
        }
      } else if (templateId) {
        const ocrRes = await ocrService.extractText(null, { templateId, fileName: doc.fileName });
        if (ocrRes && ocrRes.success) {
          ocrText = ocrRes.rawText || ocrText;
          ocrConfidence = ocrRes.confidence || ocrConfidence;
          extractedFields = ocrRes.extractedFields || {};
        }
      } else if (doc.fileName) {
        const ocrRes = await ocrService.extractText(null, { fileName: doc.fileName });
        if (ocrRes && ocrRes.success) {
          ocrText = ocrRes.rawText || ocrText;
          ocrConfidence = ocrRes.confidence || ocrConfidence;
          extractedFields = ocrRes.extractedFields || {};
        }
      }
    } catch (ocrErr) {
      console.warn(`[DocumentProcessingQueue] OCR extraction notice for ${docId}:`, ocrErr.message);
    }

    // Step 4: Metadata Extraction & Normalization
    await saveDocUpdate(docId, { processingStage: 'metadata' });

    const finalDocNumber = doc.docNumber || extractedFields.docNumber || '';
    const finalHolderName = doc.holderName || extractedFields.holderName || '';
    const finalDateOfBirth = doc.dateOfBirth || extractedFields.dateOfBirth || '';
    const finalCountry = doc.country && doc.country !== 'India' ? doc.country : (extractedFields.country || doc.country || 'India');
    const finalAddress = doc.address || extractedFields.address || '';
    const finalAuthority = doc.issuingAuthority || extractedFields.issuingAuthority || 'Standard Authority';
    const finalPlace = doc.placeOfIssue || extractedFields.placeOfIssue || '';

    // Step 5: Contextual Date Extraction (Issue vs Expiry)
    await saveDocUpdate(docId, { processingStage: 'dates' });

    let rawIssueDate = doc.issueDate || extractedFields.issueDate || '';
    let rawExpiryDate = doc.expiryDate || extractedFields.expiryDate || '';

    const normalizedIssueDate = ocrService.normalizeDate(rawIssueDate) || rawIssueDate || '';
    let normalizedExpiryDate = null;

    if (rawExpiryDate && typeof rawExpiryDate === 'string' && rawExpiryDate.trim()) {
      if (/perpetual|lifetime|never|no expiry/i.test(rawExpiryDate.trim())) {
        normalizedExpiryDate = 'Perpetual';
      } else {
        normalizedExpiryDate = ocrService.normalizeDate(rawExpiryDate.trim()) || rawExpiryDate.trim();
      }
    }

    // Strictly enforce No-Hallucination policy
    const needsVerification = !normalizedExpiryDate || Boolean(extractedFields.needsVerification);

    // Step 6: Document Categorization & AI Taxonomy
    await saveDocUpdate(docId, { processingStage: 'categorizing' });

    let classification = doc.classification || null;
    if (!classification) {
      try {
        classification = await classificationService.classify(ocrText, {
          fileName: doc.fileName || 'document',
          title: doc.title || 'Official Record',
          ocrFields: {
            docNumber: finalDocNumber,
            issuingAuthority: finalAuthority,
            title: doc.title
          }
        });
      } catch (classErr) {
        console.warn(`[DocumentProcessingQueue] Classification notice for ${docId}:`, classErr.message);
      }
    }

    const determinedCategory = (doc.category && doc.category !== 'Other Documents' && doc.category !== 'other')
      ? doc.category
      : (classification?.category || 'Identity Proofs');

    const determinedCategoryId = (doc.categoryId && doc.categoryId !== 'other')
      ? doc.categoryId
      : (classification?.categoryId || 'identity');

    const determinedDocType = classification?.subCategory || classification?.category || 'Official Document';
    const classificationConfidence = classification?.confidence || 0.95;
    const sensitivity = doc.sensitivity || classification?.sensitivity || 'STANDARD';

    let mergedTags = Array.isArray(doc.tags) ? [...doc.tags] : [];
    if (classification?.suggestedTags && Array.isArray(classification.suggestedTags)) {
      mergedTags = Array.from(new Set([...mergedTags, ...classification.suggestedTags]));
    }

    // Step 7: Expiry Engine Evaluation
    let status = 'ACTIVE';
    let daysLeft = null;

    if (!normalizedExpiryDate || normalizedExpiryDate === 'Perpetual') {
      status = 'ACTIVE';
      daysLeft = null;
    } else {
      const expEval = calculateExpiryStatus(normalizedExpiryDate);
      status = expEval.status;
      daysLeft = expEval.daysLeft;
    }

    // Step 8: Multi-Channel Notifications (Upload Confirmation + Threshold Reminder)
    await saveDocUpdate(docId, { processingStage: 'notifications' });

    const thresholdDays = parseInt(process.env.EXPIRY_REMINDER_THRESHOLD_DAYS || '30', 10);
    let uploadNotifResult = { triggered: false };
    let expiryNotifResult = { triggered: false };

    // Build intermediate document representation for notifications
    const intermediateDoc = {
      ...(doc.toObject ? doc.toObject() : doc),
      _id: docId,
      id: docId,
      title: doc.title,
      category: determinedCategory,
      categoryId: determinedCategoryId,
      docNumber: finalDocNumber,
      holderName: finalHolderName,
      issueDate: normalizedIssueDate,
      expiryDate: normalizedExpiryDate,
      daysLeft,
      status,
      notificationHistory: Array.isArray(doc.notificationHistory) ? [...doc.notificationHistory] : []
    };

    // 1. Always dispatch Document Upload Confirmation via Nodemailer SMTP + Twilio SMS
    try {
      uploadNotifResult = await dispatchDocumentUploadedNotification({
        document: intermediateDoc,
        user: options.user
      });
    } catch (uplErr) {
      console.warn(`[DocumentProcessingQueue] Upload notification error for ${docId}:`, uplErr.message);
    }

    // 2. If document is expiring soon or expired, also evaluate immediate threshold reminder
    if (daysLeft !== null && (daysLeft <= thresholdDays || status === 'EXPIRING_SOON' || status === 'EXPIRED')) {
      try {
        expiryNotifResult = await checkAndDispatchExpiryNotification({
          document: intermediateDoc,
          user: options.user,
          thresholdDays,
          isImmediate: true
        });
      } catch (notifErr) {
        console.warn(`[DocumentProcessingQueue] Immediate threshold notification error for ${docId}:`, notifErr.message);
      }
    }

    // Step 9: Finalize Processing Status & Update Document
    const finalProcessingStatus = needsVerification ? 'needs_review' : 'completed';

    const finalUpdates = {
      category: determinedCategory,
      categoryId: determinedCategoryId,
      documentType: determinedDocType,
      docNumber: finalDocNumber,
      holderName: finalHolderName,
      dateOfBirth: finalDateOfBirth,
      country: finalCountry,
      address: finalAddress,
      issuingAuthority: finalAuthority,
      placeOfIssue: finalPlace,
      issueDate: normalizedIssueDate,
      expiryDate: normalizedExpiryDate || '',
      status,
      daysLeft,
      needsVerification,
      verified: !needsVerification,
      renewalRequired: status === 'EXPIRING_SOON' || status === 'EXPIRED',
      ocrText,
      ocrConfidence,
      ocrProcessed: Boolean(ocrText),
      classification,
      classificationConfidence,
      sensitivity,
      tags: mergedTags,
      extractedMetadata: extractedFields,
      notificationHistory: intermediateDoc.notificationHistory,
      processingStatus: finalProcessingStatus,
      processingStage: 'completed',
      ocrStatus: 'completed',
      metadataStatus: 'completed',
      processingError: ''
    };

    const updatedDoc = await saveDocUpdate(docId, finalUpdates);

    // Record activity in log
    if (isDbConnected() && doc.userId) {
      try {
        await ActivityLog.create({
          userId: doc.userId,
          type: 'OCR_COMPLETE',
          title: `Document Analysis Completed: ${doc.title}`,
          description: `Extracted details (${determinedDocType}). Expiry: ${normalizedExpiryDate || 'Perpetual'}, Status: ${status}.`
        });
      } catch (logErr) {}
    }

    console.log(`✅ [DocumentProcessingQueue] Successfully completed processing for document: ${docId} (Status: ${finalProcessingStatus})`);

    return {
      success: true,
      documentId: docId,
      processingStatus: finalProcessingStatus,
      data: updatedDoc,
      notification: { upload: uploadNotifResult, expiry: expiryNotifResult }
    };
  } catch (err) {
    console.error(`❌ [DocumentProcessingQueue] Unhandled error during document processing for ${docId}:`, err);

    // Fault-tolerant preservation: never delete document on error
    await saveDocUpdate(docId, {
      processingStatus: 'failed',
      processingStage: 'failed',
      ocrStatus: 'failed',
      processingError: err.message || 'Automatic OCR analysis encountered an unexpected error.'
    });

    return {
      success: false,
      documentId: docId,
      processingStatus: 'failed',
      error: err.message
    };
  } finally {
    activeJobs.delete(docId);
  }
};

/**
 * Enqueue a document for asynchronous background processing
 * Returns immediately to caller without blocking the HTTP lifecycle
 * 
 * @param {Object} doc - Stored document record
 * @param {Object} options - { user, filePath, body }
 */
const enqueue = (doc, options = {}) => {
  const docId = doc._id ? doc._id.toString() : doc.id;
  setImmediate(() => {
    processDocument(doc, options).catch(err => {
      console.warn(`[DocumentProcessingQueue] Background task failure on ${docId}:`, err.message);
    });
  });
  return { enqueued: true, documentId: docId };
};

module.exports = {
  enqueue,
  processDocument,
  isProcessing
};
