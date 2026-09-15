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
      if (docs.length === 0 && !profileId && !categoryId && !status && !q) {
        docs = getDocuments();
      }
    } else {
      docs = getDocuments();

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
    let doc = null;

    if (isDbConnected()) {
      doc = await Document.findById(id);
    } else {
      doc = getLocalDocById(id);
    }

    if (!doc) {
      return res.status(404).json({
        success: false,
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
 * Upload and index a new document
 * POST /api/documents/upload
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

    // Expiry calculation
    const { status, daysLeft } = calculateExpiryStatus(expiryDate);

    // File metadata
    let fileName = 'manual_entry.pdf';
    let fileUrl = '';
    let fileSize = '1.2 MB';

    if (req.file) {
      fileName = req.file.originalname;
      fileUrl = `/uploads/${req.file.filename}`;
      fileSize = formatFileSize(req.file.size);
    }

    const docPayload = {
      userId,
      title: title.trim(),
      category: category.trim(),
      categoryId: categoryId.trim(),
      profileId: profileId.trim(),
      profileName: profileName.trim(),
      docNumber: docNumber.trim(),
      issueDate: issueDate.trim() || new Date().toISOString().split('T')[0],
      expiryDate: expiryDate.trim() || 'Perpetual',
      status,
      daysLeft,
      issuingAuthority: issuingAuthority.trim(),
      placeOfIssue: placeOfIssue.trim(),
      fileName,
      fileUrl,
      fileSize,
      uploadedAt: new Date().toISOString(),
      verified: true,
      renewalRequired: status === 'EXPIRING_SOON' || status === 'EXPIRED',
      summary: summary.trim() || `Stored document indexed for ${profileName}.`
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

    return res.status(201).json({
      success: true,
      message: 'Document uploaded and indexed successfully.',
      data: savedDoc
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
    const updates = { ...req.body };

    if (updates.expiryDate) {
      const { status, daysLeft } = calculateExpiryStatus(updates.expiryDate);
      updates.status = status;
      updates.daysLeft = daysLeft;
      updates.renewalRequired = status === 'EXPIRING_SOON' || status === 'EXPIRED';
    }

    let updatedDoc = null;

    if (isDbConnected()) {
      updatedDoc = await Document.findByIdAndUpdate(id, updates, { new: true });
    } else {
      updatedDoc = updateLocalDoc(id, updates);
    }

    if (!updatedDoc) {
      return res.status(404).json({
        success: false,
        message: `Document ${id} not found.`
      });
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
    let deleted = false;
    let fileUrlToDelete = null;

    if (isDbConnected()) {
      const doc = await Document.findById(id);
      if (doc) {
        fileUrlToDelete = doc.fileUrl;
        await Document.findByIdAndDelete(id);
        deleted = true;
      }
    } else {
      const doc = getLocalDocById(id);
      if (doc) {
        fileUrlToDelete = doc.fileUrl;
        deleted = deleteLocalDoc(id);
      }
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Document ${id} not found.`
      });
    }

    // Safely remove file on disk if stored locally
    if (fileUrlToDelete && fileUrlToDelete.startsWith('/uploads/')) {
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
