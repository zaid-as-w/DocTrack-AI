const {
  getAlerts,
  getAlertSummary,
  snoozeAlert,
  dismissAlert,
  markAlertRead,
  dismissAllAlerts,
  generateAlertsFromDocuments
} = require('../services/alertStore');
const { getDocuments } = require('../services/documentStore');

/**
 * List alerts with optional filters
 * GET /api/alerts
 */
const listAlerts = async (req, res, next) => {
  try {
    const { profileId = 'all', severity = 'all', status = 'all', includeSnoozed = 'false' } = req.query;

    const alerts = getAlerts({
      profileId,
      severity,
      status,
      includeSnoozed: includeSnoozed === 'true'
    });

    const summary = getAlertSummary(profileId);

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
    const { profileId = 'all' } = req.query;
    const summary = getAlertSummary(profileId);

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
    const { days = 7 } = req.body;

    const alert = snoozeAlert(id, parseInt(days, 10));
    if (!alert) {
      return res.status(404).json({
        success: false,
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
    const alert = dismissAlert(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
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
    const alert = markAlertRead(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
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
    const { profileId = 'all' } = req.body;
    const dismissedCount = dismissAllAlerts(profileId);

    return res.status(200).json({
      success: true,
      message: `Dismissed ${dismissedCount} alert(s)`,
      dismissedCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger immediate alert audit scan across documents
 * POST /api/alerts/scan
 */
const triggerScan = async (req, res, next) => {
  try {
    const docs = getDocuments();
    const updatedAlerts = generateAlertsFromDocuments(docs, req.user?.id || 'demo-user-zaid-001');

    return res.status(200).json({
      success: true,
      message: `Alert scan complete. Synchronized ${docs.length} documents.`,
      summary: getAlertSummary('all'),
      data: getAlerts()
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
