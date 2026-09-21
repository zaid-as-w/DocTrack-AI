const express = require('express');
const router = express.Router();
const { getStats, getRecentDocuments } = require('../controllers/dashboardController');
const authenticateJWT = require('../middleware/auth');

// All dashboard routes strictly require authentication
router.use(authenticateJWT);

// @route   GET /api/dashboard/stats
// @desc    Retrieve aggregated metrics, urgent alerts, and category summaries for authenticated user
router.get('/stats', getStats);

// @route   GET /api/dashboard/recent
// @desc    Retrieve recently uploaded or indexed documents for authenticated user
router.get('/recent', getRecentDocuments);

module.exports = router;
