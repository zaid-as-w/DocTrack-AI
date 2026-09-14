const express = require('express');
const router = express.Router();
const { isDbConnected } = require('../config/db');

// @route   GET /api/health
// @desc    System health check endpoint
// @access  Public
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'DocTrack AI API',
    timestamp: new Date().toISOString(),
    database: isDbConnected() ? 'connected' : 'disconnected'
  });
});

module.exports = router;
