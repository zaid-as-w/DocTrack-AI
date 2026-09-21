const express = require('express');
const router = express.Router();
const { upload, validateUploadedFile } = require('../middleware/upload');
const {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument,
  getDocumentStatus,
  retryDocumentOCR
} = require('../controllers/documentController');
const { authorizeDocumentOwner, enforceUserOwnership } = require('../middleware/authorizeOwner');
const { validateDocumentInput, validateIdParam } = require('../middleware/validators');
const authenticateJWT = require('../middleware/auth');

// All document management routes strictly require authentication
router.use(authenticateJWT);

// @route   GET /api/documents
// @desc    Get all documents for authenticated user with optional filters
router.get('/', getAllDocuments);

// @route   GET /api/documents/:id/status
// @desc    Get real-time document background processing & OCR status
router.get('/:id/status', validateIdParam('id'), authorizeDocumentOwner, getDocumentStatus);

// @route   GET /api/documents/:id
// @desc    Get a specific document by ID (guarded by ownership and ID validation)
router.get('/:id', validateIdParam('id'), authorizeDocumentOwner, getDocumentById);

// @route   POST /api/documents/upload & POST /api/documents
// @desc    Upload a new file and index document metadata (with magic bytes binary validation & user ownership)
router.post('/upload', upload.single('file'), validateUploadedFile, validateDocumentInput, enforceUserOwnership, uploadDocument);
router.post('/', upload.single('file'), validateUploadedFile, validateDocumentInput, enforceUserOwnership, uploadDocument);

// @route   POST /api/documents/:id/retry-ocr & POST /api/documents/:id/process
// @desc    Retry or re-trigger document OCR analysis without re-uploading file
router.post('/:id/retry-ocr', validateIdParam('id'), authorizeDocumentOwner, retryDocumentOCR);
router.post('/:id/process', validateIdParam('id'), authorizeDocumentOwner, retryDocumentOCR);

// @route   PUT /api/documents/:id
// @desc    Update document metadata (guarded by ownership & validation)
router.put('/:id', validateIdParam('id'), authorizeDocumentOwner, validateDocumentInput, updateDocument);

// @route   DELETE /api/documents/:id
// @desc    Delete a document and remove file from disk (guarded by ownership)
router.delete('/:id', validateIdParam('id'), authorizeDocumentOwner, deleteDocument);

module.exports = router;

