const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const { validateNotificationInput, validateIdParam } = require('../middleware/validators');
const { notificationRateLimiter } = require('../middleware/rateLimiter');
const {
  getAllNotifications,
  getSummary,
  markRead,
  markAllRead,
  removeNotification,
  sendTest,
  getProviderStatus
} = require('../controllers/notificationController');

// All notification routes strictly require authentication
router.use(authenticateJWT);

// @route   GET /api/notifications/providers/status
// @desc    Check Amazon SES and Twilio provider live connectivity status
router.get('/providers/status', getProviderStatus);

// @route   GET /api/notifications
// @desc    Get all notifications for authenticated user with optional filters
router.get('/', getAllNotifications);

// @route   GET /api/notifications/summary
// @desc    Get notification summary metrics & channel delivery breakdown
router.get('/summary', getSummary);

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a single notification as read (guarded by ID validation & ownership)
router.patch('/:id/read', validateIdParam('id'), markRead);

// @route   POST /api/notifications/mark-all-read
// @desc    Mark all unread notifications as read for current user
router.post('/mark-all-read', markAllRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification record (guarded by ID validation & ownership)
router.delete('/:id', validateIdParam('id'), removeNotification);

// @route   POST /api/notifications/test
// @desc    Dispatch manual test notification (validated payload, rate-limited)
router.post('/test', notificationRateLimiter, validateNotificationInput, sendTest);

module.exports = router;
