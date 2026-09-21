const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const {
  getReminderHorizon,
  triggerReminderScan
} = require('../controllers/notificationController');

// All reminder routes strictly require authentication
router.use(authenticateJWT);

// @route   GET /api/reminders/horizon
// @desc    Get 90d, 30d, 7d, 1d reminder queue horizon for authenticated user
router.get('/horizon', getReminderHorizon);

// @route   POST /api/reminders/scan-now
// @desc    Trigger immediate reminder threshold evaluation and dispatch
router.post('/scan-now', triggerReminderScan);

module.exports = router;
