const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument
} = require('../controllers/documentController');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

// Permissive JWT parser
const permissiveAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, jwtSecret);
    } catch {
      req.user = { id: 'demo-user-zaid-001', name: 'Zaid', email: 'zaid@doctrack.ai' };
    }
  } else {
    req.user = { id: 'demo-user-zaid-001', name: 'Zaid', email: 'zaid@doctrack.ai' };
  }
  next();
};

router.use(permissiveAuth);

// @route   GET /api/documents
// @desc    Get all documents with optional filters (?profileId=...&categoryId=...&status=...&q=...)
router.get('/', getAllDocuments);

// @route   GET /api/documents/:id
// @desc    Get a specific document by ID
router.get('/:id', getDocumentById);

// @route   POST /api/documents/upload
// @desc    Upload a new file and index document metadata
router.post('/upload', upload.single('file'), uploadDocument);

// @route   PUT /api/documents/:id
// @desc    Update document metadata
router.put('/:id', updateDocument);

// @route   DELETE /api/documents/:id
// @desc    Delete a document and remove file from disk
router.delete('/:id', deleteDocument);

module.exports = router;
