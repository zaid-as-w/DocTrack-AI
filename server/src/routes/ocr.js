const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { processOCR, getTemplates, getStatus } = require('../controllers/ocrController');

// @route   POST /api/ocr/process
// @desc    Upload an image or pass text/template to extract structured fields via OCR
// @access  Public / Permissive
router.post('/process', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      // If multer errors on file type, fallback to parsing body
      console.warn('OCR file upload notice:', err.message);
    }
    next();
  });
}, processOCR);

// @route   GET /api/ocr/templates
// @desc    Retrieve sample demo document templates for fast testing
// @access  Public
router.get('/templates', getTemplates);

// @route   GET /api/ocr/status
// @desc    Get OCR engine status and feature capabilities
// @access  Public
router.get('/status', getStatus);

module.exports = router;
