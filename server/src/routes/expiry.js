const express = require('express');
const router = express.Router();
const { getExpirySummary, triggerScan } = require('../controllers/expiryController');
const authenticateJWT = require('../middleware/auth');

// All expiry routes strictly require authentication
router.use(authenticateJWT);

// @route   GET /api/expiry/summary
// @desc    Get threshold buckets, critical warnings, and audit metrics for authenticated user
router.get('/summary', getExpirySummary);

// @route   POST /api/expiry/scan
// @desc    Trigger on-demand expiry audit scan for authenticated user
router.post('/scan', triggerScan);

module.exports = router;
