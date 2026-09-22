/**
 * Notification & Reminder Controller
 * DocTrack AI — Iteration 11: Notification & Reminder System
 */

const {
  sendNotification,
  getNotifications: getLocalNotifications,
  getNotificationSummary: getLocalNotificationSummary,
  markNotificationAsRead: markLocalNotificationAsRead,
  markAllNotificationsAsRead: markLocalAllAsRead,
  deleteNotification: deleteLocalNotification,
  getScheduledHorizon
} = require('../services/notificationService');

/**
 * Get all notifications
 * GET /api/notifications
 */
const getAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { channel, unreadOnly, severity } = req.query;

    const notifications = getLocalNotifications(userId, { channel, unreadOnly, severity });
    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification summary & channel metrics
 * GET /api/notifications/summary
 */
const getSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const summary = getLocalNotificationSummary(userId);

    return res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const updated = markLocalNotificationAsRead(id, userId);
    if (!updated) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        errorCode: 'NOTIFICATION_NOT_FOUND',
        message: `Notification with ID "${id}" was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 * POST /api/notifications/mark-all-read
 */
const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const count = markLocalAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: `Marked ${count} notifications as read.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
const removeNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = deleteLocalNotification(id, userId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        errorCode: 'NOTIFICATION_NOT_FOUND',
        message: `Notification with ID "${id}" was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Dispatch a manual test notification across chosen channels
 * POST /api/notifications/test
 */
const sendTest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      title,
      message,
      channel,
      recipient,
      documentTitle,
      daysLeft,
      severity
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errorCode: 'VALIDATION_ERROR',
        message: 'Notification title is required.'
      });
    }

    // Default recipient safely to authenticated user's email/phone or env variable
    const safeRecipient = recipient ? String(recipient).trim() : (channel === 'SMS' ? (req.user.phone || process.env.DEMO_PHONE || process.env.TWILIO_PHONE_NUMBER || '') : (req.user.email || process.env.SMTP_USER || 'support@doctrack.ai'));

    const dispatched = await sendNotification({
      userId,
      title: title.trim(),
      message: message ? message.trim() : 'Test notification from DocTrack AI Reminder Engine.',
      channel: channel || 'EMAIL',
      recipient: safeRecipient,
      severity: severity || 'INFO',
      documentTitle: documentTitle || 'Test Document',
      daysLeft: daysLeft !== undefined ? Number(daysLeft) : 15
    });

    return res.status(201).json({
      success: true,
      message: `Test notification dispatched successfully via ${channel || 'EMAIL'}.`,
      notification: dispatched
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get 90d, 30d, 7d, 1d reminder queue horizon
 * GET /api/reminders/horizon
 */
const getReminderHorizon = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const horizon = getScheduledHorizon(userId);

    return res.status(200).json({
      success: true,
      horizon
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger threshold scan and dispatch alerts
 * POST /api/reminders/scan-now
 */
const triggerReminderScan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const horizon = getScheduledHorizon(userId);

    let dispatchedCount = 0;

    // Dispatch reminders for urgent items (day7 and day1)
    const urgentItems = [...horizon.day1, ...horizon.day7];
    for (const item of urgentItems.slice(0, 3)) {
      await sendNotification({
        userId,
        title: `${item.title} Expiry Warning (${item.daysLeft} Days Left)`,
        message: `${item.title} is scheduled for expiry in ${item.daysLeft} days. Renewal action is recommended.`,
        channel: 'SMS',
        recipient: req.user?.phone || process.env.DEMO_PHONE || process.env.TWILIO_PHONE_NUMBER || '',
        severity: item.daysLeft <= 1 ? 'CRITICAL' : 'WARNING',
        documentTitle: item.title,
        daysLeft: item.daysLeft,
        expiryDate: item.expiryDate
      });
      dispatchedCount++;
    }

    return res.status(200).json({
      success: true,
      message: `Reminder audit scan complete. Dispatched ${dispatchedCount} threshold notifications.`,
      dispatchedCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllNotifications,
  getSummary,
  markRead,
  markAllRead,
  removeNotification,
  sendTest,
  getReminderHorizon,
  triggerReminderScan
};
