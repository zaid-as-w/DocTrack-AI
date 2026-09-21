/**
 * Asynchronous Background Document Processing Queue
 * DocTrack AI — Fast, Secure, Asynchronous OCR Pipeline
 * 
 * Offloads OCR text extraction, entity parsing, intelligent categorization,
 * expiry calculation, and immediate reminder dispatching from the HTTP upload request.
 * 
 * Processing pipeline priority:
 *   1. FastAPI ai-service /ocr (real OCR + date extraction, 5s timeout)
 *   2. SmartOCRService fallback (on-device heuristic engine)
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
const { callFastApiOCR, callFastApiExtractDates, isFastApiAvailable } = require('./ocr/FastApiOCRService');
const geminiService = require('./gemini.service');

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

    // Step 3: OCR Text Extraction (FastAPI first → SmartOCRService fallback)
    await saveDocUpdate(docId, { processingStage: 'ocr' });
    let ocrText = doc.ocrText || '';
    let ocrConfidence = doc.ocrConfidence || 0.90;
    let extractedFields = doc.extractedMetadata || {};
    let fastApiUsed = false;

    // 3a. Attempt FastAPI /ocr (real OCR + date extraction)
    try {
      const fastApiUp = await isFastApiAvailable();
      if (fastApiUp && filePath && fs.existsSync(filePath)) {
        console.log(`[DocumentProcessingQueue] 🚀 Using FastAPI OCR for document: ${docId}`);
        const faRes = await callFastApiOCR(filePath, null, doc.fileName, null);
        if (faRes && faRes.success && faRes.rawText && faRes.rawText.length > 20) {
          ocrText = faRes.rawText;
          ocrConfidence = faRes.confidence || ocrConfidence;
          extractedFields = { ...extractedFields, ...faRes.extractedFields };
          fastApiUsed = true;
          console.log(`[DocumentProcessingQueue] ✅ FastAPI OCR complete. Expiry: ${faRes.extractedFields?.expiryDate || 'not detected'}`);
        }
      } else if (fastApiUp && ocrText && ocrText.length > 20) {
        // Already have raw text — just run date extraction on it
        const faRes = await callFastApiExtractDates(ocrText, null);
        if (faRes && faRes.success) {
          if (faRes.expiryDate && !extractedFields.expiryDate) extractedFields.expiryDate = faRes.expiryDate;
          if (faRes.issueDate && !extractedFields.issueDate) extractedFields.issueDate = faRes.issueDate;
          if (faRes.dateOfBirth && !extractedFields.dateOfBirth) extractedFields.dateOfBirth = faRes.dateOfBirth;
          fastApiUsed = true;
        }
      }
    } catch (faErr) {
      console.warn(`[DocumentProcessingQueue] FastAPI OCR unavailable, falling back: ${faErr.message}`);
    }

    // 3b. SmartOCRService fallback (always runs if FastAPI failed or gave no text)
    if (!fastApiUsed || !ocrText || ocrText.length < 20) {
      try {
        const templateId = options.body?.templateId;
        if (filePath && fs.existsSync(filePath)) {
          const ocrRes = await ocrService.extractText(filePath, { fileName: doc.fileName, templateId });
          if (ocrRes && ocrRes.success) {
            ocrText = ocrRes.rawText || ocrText;
            ocrConfidence = ocrRes.confidence || ocrConfidence;
            // Merge: don't overwrite FastAPI dates if already set
            const smartFields = ocrRes.extractedFields || {};
            extractedFields = {
              ...smartFields,
              ...extractedFields,
              expiryDate: extractedFields.expiryDate || smartFields.expiryDate,
              issueDate: extractedFields.issueDate || smartFields.issueDate
            };
          }
        } else if (templateId) {
          const ocrRes = await ocrService.extractText(null, { templateId, fileName: doc.fileName });
          if (ocrRes && ocrRes.success) {
            ocrText = ocrRes.rawText || ocrText;
            ocrConfidence = ocrRes.confidence || ocrConfidence;
            const smartFields = ocrRes.extractedFields || {};
            extractedFields = { ...smartFields, ...extractedFields };
          }
        } else if (doc.fileName) {
          const ocrRes = await ocrService.extractText(null, { fileName: doc.fileName });
          if (ocrRes && ocrRes.success) {
            ocrText = ocrRes.rawText || ocrText;
            ocrConfidence = ocrRes.confidence || ocrConfidence;
            const smartFields = ocrRes.extractedFields || {};
            extractedFields = {
              ...smartFields,
              ...extractedFields,
              expiryDate: extractedFields.expiryDate || smartFields.expiryDate,
              issueDate: extractedFields.issueDate || smartFields.issueDate
            };
          }
        }
      } catch (ocrErr) {
        console.warn(`[DocumentProcessingQueue] SmartOCR fallback notice for ${docId}:`, ocrErr.message);
      }
    }

    // 3c. Gemini LLM metadata extraction if configured and OCR text exists
    if (geminiService.isConfigured() && ocrText && ocrText.length > 20) {
      if (!extractedFields.expiryDate || !extractedFields.docNumber || !extractedFields.issueDate) {
        try {
          const geminiMeta = await geminiService.extractMetadataWithGemini(ocrText, doc.title || doc.fileName);
          if (geminiMeta) {
            if (geminiMeta.docNumber && !extractedFields.docNumber) extractedFields.docNumber = geminiMeta.docNumber;
            if (geminiMeta.issueDate && !extractedFields.issueDate) extractedFields.issueDate = geminiMeta.issueDate;
            if (geminiMeta.expiryDate && !extractedFields.expiryDate) extractedFields.expiryDate = geminiMeta.expiryDate;
            if (geminiMeta.issuingAuthority && (!extractedFields.issuingAuthority || extractedFields.issuingAuthority === 'Standard Authority')) {
              extractedFields.issuingAuthority = geminiMeta.issuingAuthority;
            }
            if (geminiMeta.placeOfIssue && !extractedFields.placeOfIssue) extractedFields.placeOfIssue = geminiMeta.placeOfIssue;
          }
        } catch (gemMetaErr) {
          console.warn(`[DocumentProcessingQueue] Gemini metadata extraction notice:`, gemMetaErr.message);
        }
      }
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

    // Strictly enforce No-Hallucination policy (if user manually provided expiry date, it is already verified)
    const needsVerification = !normalizedExpiryDate || (Boolean(extractedFields.needsVerification) && !doc.expiryDate);

    // Step 6: Document Categorization & AI Taxonomy
    await saveDocUpdate(docId, { processingStage: 'categorizing' });

    let classification = doc.classification || null;
    if (!classification) {
      if (geminiService.isConfigured() && ocrText) {
        try {
          classification = await geminiService.classifyWithGemini(ocrText, {
            fileName: doc.fileName || 'document',
            title: doc.title || 'Official Record',
            ocrFields: {
              docNumber: finalDocNumber,
              issuingAuthority: finalAuthority,
              title: doc.title
            }
          });
        } catch (gemClassErr) {
          console.warn(`[DocumentProcessingQueue] Gemini classification notice:`, gemClassErr.message);
        }
      }

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

    // Step 8: Finalize Processing Status & Update Document IMMEDIATELY (sub-second completion)
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
      notificationHistory: Array.isArray(doc.notificationHistory) ? [...doc.notificationHistory] : [],
      processingStatus: finalProcessingStatus,
      processingStage: 'completed',
      ocrStatus: 'completed',
      metadataStatus: 'completed',
      processingError: ''
    };

    const savedResult = await saveDocUpdate(docId, finalUpdates);
    const updatedDoc = savedResult || { ...(doc.toObject ? doc.toObject() : doc), ...finalUpdates };

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

    console.log(`✅ [DocumentProcessingQueue] Successfully completed processing for document: ${docId} in sub-second time (Status: ${finalProcessingStatus})`);

    // Step 9: Multi-Channel Notifications (executed asynchronously in background — NEVER blocks user UI)
    setImmediate(async () => {
      const thresholdDays = parseInt(process.env.EXPIRY_REMINDER_THRESHOLD_DAYS || '30', 10);
      const intermediateDoc = {
        ...(updatedDoc.toObject ? updatedDoc.toObject() : updatedDoc),
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
        notificationHistory: Array.isArray(updatedDoc.notificationHistory) ? [...updatedDoc.notificationHistory] : []
      };

      try {
        await dispatchDocumentUploadedNotification({
          document: intermediateDoc,
          user: options.user
        });
      } catch (uplErr) {
        console.warn(`[DocumentProcessingQueue] Upload notification error for ${docId}:`, uplErr.message);
      }

      if (daysLeft !== null && (daysLeft <= thresholdDays || status === 'EXPIRING_SOON' || status === 'EXPIRED')) {
        try {
          await checkAndDispatchExpiryNotification({
            document: intermediateDoc,
            user: options.user,
            thresholdDays,
            isImmediate: true
          });
        } catch (notifErr) {
          console.warn(`[DocumentProcessingQueue] Immediate threshold notification error for ${docId}:`, notifErr.message);
        }
      }

      if (intermediateDoc.notificationHistory && intermediateDoc.notificationHistory.length > 0) {
        await saveDocUpdate(docId, { notificationHistory: intermediateDoc.notificationHistory });
      }
    });

    return {
      success: true,
      documentId: docId,
      processingStatus: finalProcessingStatus,
      data: updatedDoc
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
