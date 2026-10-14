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

    let notifications = [];
    const { isDbConnected } = require('../config/db');
    const Notification = require('../models/Notification');

    if (isDbConnected()) {
      const query = { userId };
      if (channel && channel !== 'ALL') query.channel = channel;
      if (unreadOnly === 'true' || unreadOnly === true) query.readAt = null;
      if (severity && severity !== 'ALL') query.severity = severity;

      notifications = await Notification.find(query).sort({ createdAt: -1 }).lean();
    } else {
      notifications = getLocalNotifications(userId, { channel, unreadOnly, severity });
    }

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
    const { isDbConnected } = require('../config/db');
    const Notification = require('../models/Notification');

    if (isDbConnected()) {
      const all = await Notification.find({ userId }).lean();
      const unreadCount = all.filter(n => !n.readAt).length;
      const deliveredCount = all.filter(n => n.status === 'DELIVERED').length;
      const emailCount = all.filter(n => n.channel === 'EMAIL').length;
      const smsCount = all.filter(n => n.channel === 'SMS').length;
      const inAppCount = all.filter(n => n.channel === 'IN_APP').length;

      return res.status(200).json({
        success: true,
        summary: {
          totalCount: all.length,
          unreadCount,
          deliveredCount,
          deliveryRatePct: all.length > 0 ? Math.round((deliveredCount / all.length) * 100) : 100,
          emailCount,
          smsCount,
          inAppCount,
          activeChannels: ['IN_APP', 'EMAIL', 'SMS']
        }
      });
    }

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
 * Recipient is always the authenticated user's own verified email or phone.
 * The caller cannot specify an arbitrary third-party recipient.
 */
const sendTest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      title,
      message,
      channel,
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

    // SECURITY: Always send to the authenticated user's own contact.
    // Never use a caller-supplied recipient — that would allow sending
    // SMS / emails / calls to arbitrary third-party numbers or addresses.
    const isVoice = channel === 'VOICE';
    const isSms = channel === 'SMS';
    const safeRecipient = (isSms || isVoice)
      ? (req.user.phone || '')
      : (req.user.email || '');

    if (!safeRecipient) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CONTACT',
        errorCode: 'MISSING_CONTACT',
        message: `No ${isSms || isVoice ? 'phone number' : 'email address'} associated with your account. Please update your profile.`
      });
    }

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
    const userPhone = req.user?.phone || '';
    const userEmail = req.user?.email || '';
    const horizon = getScheduledHorizon(userId);

    let dispatchedCount = 0;

    // Dispatch reminders for urgent items (day7 and day1)
    const urgentItems = [...horizon.day1, ...horizon.day7];
    for (const item of urgentItems.slice(0, 3)) {
      if (userPhone) {
        await sendNotification({
          userId,
          title: `${item.title} Expiry Warning (${item.daysLeft} Days Left)`,
          message: `${item.title} is scheduled for expiry in ${item.daysLeft} days. Renewal action is recommended.`,
          channel: 'SMS',
          recipient: userPhone,
          severity: item.daysLeft <= 1 ? 'CRITICAL' : 'WARNING',
          documentTitle: item.title,
          daysLeft: item.daysLeft,
          expiryDate: item.expiryDate
        });
        dispatchedCount++;
      } else if (userEmail) {
        await sendNotification({
          userId,
          title: `${item.title} Expiry Warning (${item.daysLeft} Days Left)`,
          message: `${item.title} is scheduled for expiry in ${item.daysLeft} days. Renewal action is recommended.`,
          channel: 'EMAIL',
          recipient: userEmail,
          severity: item.daysLeft <= 1 ? 'CRITICAL' : 'WARNING',
          documentTitle: item.title,
          daysLeft: item.daysLeft,
          expiryDate: item.expiryDate
        });
        dispatchedCount++;
      }
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

/**
 * Get live provider diagnostic status (Amazon SES + Twilio)
 * GET /api/notifications/providers/status
 */
const getProviderStatus = async (req, res, next) => {
  try {
    const emailService = require('../services/email.service');
    const smsService = require('../services/sms.service');

    const sesConfigured = emailService.isConfigured();
    const sesVerification = await emailService.verifySesConnection();

    const twilioConfigured = smsService.isConfigured();
    const twilioVerification = await smsService.verifyTwilioConnection();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      providers: {
        email: {
          provider: 'Amazon Simple Email Service (SES)',
          configured: sesConfigured,
          verified: sesVerification,
          region: process.env.AWS_REGION || 'ap-south-1',
          sender: process.env.SES_FROM_EMAIL || 'Unconfigured'
        },
        telecom: {
          provider: 'Twilio SMS & Voice',
          configured: twilioConfigured,
          verified: twilioVerification.connected === true,
          status: twilioVerification.status || 'offline',
          accountType: twilioVerification.type || 'unknown',
          senderNumber: process.env.TWILIO_PHONE_NUMBER || 'Unconfigured'
        }
      }
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
  triggerReminderScan,
  getProviderStatus
};
