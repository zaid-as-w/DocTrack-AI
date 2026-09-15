const Document = require('../models/Document');
const { isDbConnected } = require('../config/db');
const { getDocuments } = require('../services/documentStore');
const { THRESHOLDS, auditDocuments } = require('../services/expiryEngine');
const { runAuditScan } = require('../services/auditScheduler');

/**
 * Get comprehensive expiry summary with threshold buckets
 * GET /api/expiry/summary
 */
const getExpirySummary = async (req, res, next) => {
  try {
    const userId = req.user?.id || 'demo-user-zaid-001';
    let docs = [];

    if (isDbConnected()) {
      docs = await Document.find({ userId });
      if (docs.length === 0) {
        docs = getDocuments();
      }
    } else {
      docs = getDocuments();
    }

    const auditResult = auditDocuments(docs);

    return res.status(200).json({
      success: true,
      data: {
        ...auditResult,
        configuredThresholds: THRESHOLDS,
        scannedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger an on-demand audit scan across all indexed documents
 * POST /api/expiry/scan
 */
const triggerScan = async (req, res, next) => {
  try {
    const userId = req.user?.id || 'demo-user-zaid-001';
    const result = await runAuditScan(userId);

    return res.status(200).json({
      success: true,
      message: `Audit scan completed across ${result.scannedCount} documents.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpirySummary,
  triggerScan
};
