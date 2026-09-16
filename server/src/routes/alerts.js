const express = require('express');
const router = express.Router();
const {
  listAlerts,
  getSummary,
  snooze,
  dismiss,
  markRead,
  dismissAll,
  triggerScan
} = require('../controllers/alertController');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

// Permissive auth middleware (accepts JWT if provided, defaults to demo user)
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

// @route   GET /api/alerts
// @desc    List alerts with severity, status, or profile filters
router.get('/', permissiveAuth, listAlerts);

// @route   GET /api/alerts/summary
// @desc    Get aggregate count of alerts by severity and status
router.get('/summary', permissiveAuth, getSummary);

// @route   POST /api/alerts/scan
// @desc    Trigger instant alert recalculation against current documents
router.post('/scan', permissiveAuth, triggerScan);

// @route   POST /api/alerts/dismiss-all
// @desc    Dismiss all active alerts
router.post('/dismiss-all', permissiveAuth, dismissAll);

// @route   POST /api/alerts/:id/snooze
// @desc    Snooze an alert for specified days
router.post('/:id/snooze', permissiveAuth, snooze);

// @route   POST /api/alerts/:id/dismiss
// @desc    Dismiss an alert permanently
router.post('/:id/dismiss', permissiveAuth, dismiss);

// @route   POST /api/alerts/:id/read
// @desc    Mark an alert as read
router.post('/:id/read', permissiveAuth, markRead);

module.exports = router;
