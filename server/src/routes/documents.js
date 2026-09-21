const express = require('express');
const router = express.Router();
const { upload, validateUploadedFile } = require('../middleware/upload');
const {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument
} = require('../controllers/documentController');
const { authorizeDocumentOwner, enforceUserOwnership } = require('../middleware/authorizeOwner');
const { validateDocumentInput, validateIdParam } = require('../middleware/validators');
const authenticateJWT = require('../middleware/auth');

// All document management routes strictly require authentication
router.use(authenticateJWT);

// @route   GET /api/documents
// @desc    Get all documents for authenticated user with optional filters
router.get('/', getAllDocuments);

// @route   GET /api/documents/:id
// @desc    Get a specific document by ID (guarded by ownership and ID validation)
router.get('/:id', validateIdParam('id'), authorizeDocumentOwner, getDocumentById);

// @route   POST /api/documents/upload & POST /api/documents
// @desc    Upload a new file and index document metadata (with magic bytes binary validation & user ownership)
router.post('/upload', upload.single('file'), validateUploadedFile, validateDocumentInput, enforceUserOwnership, uploadDocument);
router.post('/', upload.single('file'), validateUploadedFile, validateDocumentInput, enforceUserOwnership, uploadDocument);

// @route   PUT /api/documents/:id
// @desc    Update document metadata (guarded by ownership & validation)
router.put('/:id', validateIdParam('id'), authorizeDocumentOwner, validateDocumentInput, updateDocument);

// @route   DELETE /api/documents/:id
// @desc    Delete a document and remove file from disk (guarded by ownership)
router.delete('/:id', validateIdParam('id'), authorizeDocumentOwner, deleteDocument);

module.exports = router;

