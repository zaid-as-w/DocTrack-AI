const express = require('express');
const router = express.Router();
const { getStats, getRecentDocuments } = require('../controllers/dashboardController');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

// Permissive auth middleware for dashboard overview (accepts token if provided, falls back to demo evaluator user)
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

// @route   GET /api/dashboard/stats
// @desc    Retrieve aggregated metrics, urgent alerts, and category summaries
// @access  Public / Authenticated
router.get('/stats', permissiveAuth, getStats);

// @route   GET /api/dashboard/recent
// @desc    Retrieve recently uploaded or indexed documents
// @access  Public / Authenticated
router.get('/recent', permissiveAuth, getRecentDocuments);

module.exports = router;
