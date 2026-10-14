const {
  getAlerts,
  getAlertSummary,
  snoozeAlert,
  dismissAlert,
  markAlertRead,
  dismissAllAlerts,
  generateAlertsFromDocumentsAndWarranties
} = require('../services/alertStore');
const { getDocuments } = require('../services/documentStore');
const { getWarranties } = require('../services/warrantyStore');
const Document = require('../models/Document');
const Warranty = require('../models/Warranty');
const Alert = require('../models/Alert');
const { isDbConnected } = require('../config/db');

/**
 * List alerts with optional filters
 * GET /api/alerts
 */
const listAlerts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { profileId = 'all', severity = 'all', status = 'all', includeSnoozed = 'false' } = req.query;

    let docs = [];
    let warranties = [];
    if (isDbConnected()) {
      docs = await Document.find({ userId }).select('-ocrText').lean();
      warranties = await Warranty.find({ userId }).lean();
    } else {
      docs = getDocuments(userId);
      warranties = getWarranties(userId, {});
    }

    generateAlertsFromDocumentsAndWarranties(docs, warranties, userId);

    const alerts = getAlerts({
      userId,
      profileId,
      severity,
      status,
      includeSnoozed: includeSnoozed === 'true'
    });

    const summary = getAlertSummary(userId, profileId);

    return res.status(200).json({
      success: true,
      data: alerts,
      summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get alert aggregate statistics
 * GET /api/alerts/summary
 */
const getSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { profileId = 'all' } = req.query;

    let docs = [];
    let warranties = [];
    if (isDbConnected()) {
      docs = await Document.find({ userId }).select('-ocrText').lean();
      warranties = await Warranty.find({ userId }).lean();
    } else {
      docs = getDocuments(userId);
      warranties = getWarranties(userId, {});
    }

    generateAlertsFromDocumentsAndWarranties(docs, warranties, userId);
    const summary = getAlertSummary(userId, profileId);

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Snooze alert for a given duration
 * POST /api/alerts/:id/snooze
 */
const snooze = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { days = 7 } = req.body;

    const alert = snoozeAlert(id, userId, parseInt(days, 10));
    if (!alert) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        errorCode: 'ALERT_NOT_FOUND',
        message: 'Alert not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Alert snoozed for ${days} days`,
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Dismiss an alert
 * POST /api/alerts/:id/dismiss
 */
const dismiss = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const alert = dismissAlert(id, userId);

    if (isDbConnected()) {
      try {
        await Alert.updateMany(
          {
            $or: [{ id }, { _id: id }],
            $or: [{ userId }, { userId: null }, { userId: 'demo-user-zaid-001' }]
          },
          { status: 'DISMISSED', updatedAt: new Date() }
        );
      } catch (dbErr) {
        console.warn('[AlertController] MongoDB alert dismiss sync warning:', dbErr.message);
      }
    }

    if (!alert) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        errorCode: 'ALERT_NOT_FOUND',
        message: 'Alert not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Alert dismissed successfully',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark alert as read
 * POST /api/alerts/:id/read
 */
const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const alert = markAlertRead(id, userId);

    if (!alert) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        errorCode: 'ALERT_NOT_FOUND',
        message: 'Alert not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Dismiss all active alerts
 * POST /api/alerts/dismiss-all
 */
const dismissAll = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { profileId = 'all' } = req.body;
    const dismissedCount = dismissAllAlerts(userId, profileId);

    if (isDbConnected()) {
      try {
        const query = {
          $or: [{ userId }, { userId: null }, { userId: 'demo-user-zaid-001' }],
          status: { $in: ['ACTIVE', 'READ'] }
        };
        if (profileId !== 'all') query.profileId = profileId;
        await Alert.updateMany(query, { status: 'DISMISSED', updatedAt: new Date() });
      } catch (dbErr) {
        console.warn('[AlertController] MongoDB alert dismiss-all sync warning:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Dismissed ${dismissedCount} alert(s)`,
      dismissedCount
    });
  } catch (error) {
    next(error);
  }
};

const triggerScan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let docs = [];
    let warranties = [];
    if (isDbConnected()) {
      docs = await Document.find({ userId }).select('-ocrText').lean();
      warranties = await Warranty.find({ userId }).lean();
    } else {
      docs = getDocuments(userId);
      warranties = getWarranties(userId, {});
    }

    generateAlertsFromDocumentsAndWarranties(docs, warranties, userId);

    return res.status(200).json({
      success: true,
      message: `Alert scan complete. Synchronized ${docs.length} document(s) and ${warranties.length} warranty record(s).`,
      summary: getAlertSummary(userId, 'all'),
      data: getAlerts({ userId })
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listAlerts,
  getSummary,
  snooze,
  dismiss,
  markRead,
  dismissAll,
  triggerScan
};
