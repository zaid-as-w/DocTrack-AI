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
const authenticateJWT = require('../middleware/auth');
const { validateIdParam } = require('../middleware/validators');

// All alert routes strictly require authentication
router.use(authenticateJWT);

// @route   GET /api/alerts
// @desc    List alerts for authenticated user with severity, status, or profile filters
router.get('/', listAlerts);

// @route   GET /api/alerts/summary
// @desc    Get aggregate count of alerts by severity and status for authenticated user
router.get('/summary', getSummary);

// @route   POST /api/alerts/scan
// @desc    Trigger instant alert recalculation against current user documents
router.post('/scan', triggerScan);

// @route   POST /api/alerts/dismiss-all
// @desc    Dismiss all active alerts for current user
router.post('/dismiss-all', dismissAll);

// @route   POST /api/alerts/:id/snooze
// @desc    Snooze an alert for specified days (guarded by ID validation)
router.post('/:id/snooze', validateIdParam('id'), snooze);

// @route   POST /api/alerts/:id/dismiss
// @desc    Dismiss an alert permanently (guarded by ID validation)
router.post('/:id/dismiss', validateIdParam('id'), dismiss);

// @route   POST /api/alerts/:id/read
// @desc    Mark an alert as read (guarded by ID validation)
router.post('/:id/read', validateIdParam('id'), markRead);

module.exports = router;
