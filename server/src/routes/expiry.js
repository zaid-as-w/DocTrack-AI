const express = require('express');
const router = express.Router();
const { getExpirySummary, triggerScan } = require('../controllers/expiryController');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

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

// @route   GET /api/expiry/summary
// @desc    Get threshold buckets, critical warnings, and audit metrics
router.get('/summary', getExpirySummary);

// @route   POST /api/expiry/scan
// @desc    Trigger on-demand expiry audit scan
router.post('/scan', triggerScan);

module.exports = router;
