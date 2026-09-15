const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { isDbConnected } = require('../config/db');
const { getDocuments, updateDocument } = require('./documentStore');
const { evaluateDocument, auditDocuments, THRESHOLDS } = require('./expiryEngine');

/**
 * Execute an audit scan across all indexed documents.
 * Recalculates daysLeft, status, and renewalRequired flags according to standardized thresholds.
 * 
 * @param {string} userId
 * @returns {Promise<{ scannedCount: number, findingsCount: number, findings: Array, summary: Object }>}
 */
const runAuditScan = async (userId = 'demo-user-zaid-001') => {
  let docs = [];

  if (isDbConnected()) {
    docs = await Document.find({ userId });
    if (docs.length === 0) docs = getDocuments();
  } else {
    docs = getDocuments();
  }

  const findings = [];

  for (const doc of docs) {
    const evaluation = evaluateDocument(doc);
    const docId = doc._id ? doc._id.toString() : doc.id;

    // Check if status or daysLeft shifted from stored values
    if (doc.status !== evaluation.status || doc.daysLeft !== evaluation.daysLeft) {
      const renewalRequired = evaluation.status === 'EXPIRING_SOON' || evaluation.status === 'EXPIRED';

      if (isDbConnected()) {
        await Document.findByIdAndUpdate(docId, {
          status: evaluation.status,
          daysLeft: evaluation.daysLeft,
          renewalRequired
        });
      } else {
        updateDocument(docId, {
          status: evaluation.status,
          daysLeft: evaluation.daysLeft,
          renewalRequired
        });
      }

      findings.push({
        docId,
        title: doc.title,
        oldStatus: doc.status,
        newStatus: evaluation.status,
        daysLeft: evaluation.daysLeft,
        stage: evaluation.stage,
        message: evaluation.message
      });
    }
  }

  // Record audit activity log if there were status shifts
  if (findings.length > 0 && isDbConnected()) {
    await ActivityLog.create({
      userId,
      type: 'STATUS_CHANGE',
      title: 'Expiry Engine Audit Scan Completed',
      description: `Scanned ${docs.length} documents. Identified ${findings.length} status lifecycle shifts.`
    });
  }

  const auditResult = auditDocuments(docs);

  return {
    scannedCount: docs.length,
    findingsCount: findings.length,
    findings,
    summary: auditResult.summary,
    scannedAt: new Date().toISOString()
  };
};

/**
 * Scheduled background processor for document expiry auditing.
 * Runs on boot after a brief delay, and then periodically at intervalMs.
 * 
 * @param {number} intervalMs - Default 6 hours (21600000 ms)
 */
let schedulerIntervalId = null;

const startExpiryScheduler = (intervalMs = 6 * 60 * 60 * 1000) => {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
  }

  console.log(`⏱️  [Expiry Engine] Scheduled background processor initialized (Interval: ${intervalMs / 1000 / 60} min)`);

  // Initial audit scan shortly after boot (3 seconds)
  setTimeout(async () => {
    try {
      console.log('🔍 [Expiry Engine] Running startup document lifecycle audit scan...');
      const result = await runAuditScan();
      console.log(`✅ [Expiry Engine] Initial audit scan complete: ${result.scannedCount} docs scanned, ${result.findingsCount} status changes.`);
    } catch (err) {
      console.warn('⚠️  [Expiry Engine] Initial audit scan encountered error:', err.message);
    }
  }, 3000);

  // Recurring background interval
  schedulerIntervalId = setInterval(async () => {
    try {
      console.log('🔍 [Expiry Engine] Executing periodic background lifecycle audit scan...');
      const result = await runAuditScan();
      console.log(`✅ [Expiry Engine] Periodic audit scan complete: ${result.scannedCount} docs scanned, ${result.findingsCount} status changes.`);
    } catch (err) {
      console.warn('⚠️  [Expiry Engine] Background audit scan encountered error:', err.message);
    }
  }, intervalMs);

  return schedulerIntervalId;
};

const stopExpiryScheduler = () => {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
    console.log('🛑 [Expiry Engine] Background scheduler halted.');
  }
};

module.exports = {
  runAuditScan,
  startExpiryScheduler,
  stopExpiryScheduler
};
