const express = require('express');
const router = express.Router();
const { upload, validateUploadedFile } = require('../middleware/upload');
const authenticateJWT = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { processOCR, getTemplates, getStatus } = require('../controllers/ocrController');

// @route   POST /api/ocr/process
// @desc    Upload an image or pass text/template to extract structured fields via OCR
// @access  Protected
router.post(
  '/process',
  authenticateJWT,
  aiRateLimiter,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return next(err);
      }
      next();
    });
  },
  validateUploadedFile,
  processOCR
);

// @route   GET /api/ocr/templates
// @desc    Retrieve sample demo document templates for fast testing
// @access  Public / Authenticated
router.get('/templates', getTemplates);

// @route   GET /api/ocr/status
// @desc    Get OCR engine status and feature capabilities
// @access  Public
router.get('/status', getStatus);

module.exports = router;
