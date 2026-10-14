/**
 * Centralized Alert Store & Notification Engine
 * Manages multi-tier alerts, snoozing, dismissing, and dynamic generation from uploaded documents and warranties.
 * Strictly reflects ONLY the user's uploaded documents and warranties with their real metadata.
 */

const Alert = require('../models/Alert');
const { isDbConnected } = require('../config/db');
const { evaluateDocument } = require('./expiryEngine');
const { calculateWarrantyStatus } = require('./warrantyStore');

// Empty initial alerts - NEVER show hardcoded demo alerts!
let localAlerts = [];

/**
 * Generate/Refresh alerts dynamically from user documents and warranties
 */
const generateAlertsFromDocumentsAndWarranties = (documents = [], warranties = [], userId) => {
  const now = new Date();
  const currentUserId = userId ? userId.toString() : null;

  // Clean up existing alerts for documents/warranties that no longer exist for this user
  const currentDocIds = new Set(
    documents.map(d => (d._id ? d._id.toString() : d.id ? d.id.toString() : null)).filter(Boolean)
  );
  const currentWarIds = new Set(
    warranties.map(w => (w._id ? w._id.toString() : w.id ? w.id.toString() : null)).filter(Boolean)
  );

  localAlerts = localAlerts.filter(a => {
    if (currentUserId && a.userId && a.userId.toString() !== currentUserId) {
      return true; // Keep other users' alerts intact
    }
    if (a.documentId && !currentDocIds.has(a.documentId.toString())) {
      return false; // Document was deleted or doesn't belong to user
    }
    if (a.warrantyId && !currentWarIds.has(a.warrantyId.toString())) {
      return false; // Warranty was deleted or doesn't belong to user
    }
    return true;
  });

  // 1. Process real uploaded documents
  documents.forEach((doc) => {
    const docId = (doc._id ? doc._id.toString() : doc.id)?.toString();
    if (!docId) return;

    const docOwnerId = (doc.userId ? doc.userId.toString() : null) || currentUserId;
    const evalResult = evaluateDocument(doc);
    const { status, daysLeft } = evalResult;

    let alertSeverity = null;
    let alertType = null;
    let alertTitle = null;
    let alertMsg = null;
    let actionUrl = `/documents/${docId}`;
    let actionLabel = 'View Document';

    if (status === 'EXPIRED') {
      alertSeverity = 'CRITICAL';
      alertType = 'EXPIRED';
      alertTitle = `${doc.title} has Expired`;
      alertMsg = `${doc.title} (${doc.profileName || 'Self'}) expired on ${doc.expiryDate || 'past date'}. Urgent renewal or renewal assistance required.`;
      actionUrl = '/renewal-assistant';
      actionLabel = 'Renewal Guide';
    } else if (daysLeft >= 0 && daysLeft <= 7) {
      alertSeverity = 'CRITICAL';
      alertType = 'EXPIRING_CRITICAL';
      alertTitle = `Critical: ${doc.title} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
      alertMsg = `${doc.title} action deadline is immediate (${doc.expiryDate}). Renew now to prevent expiration.`;
      actionUrl = '/renewal-assistant';
      actionLabel = 'Urgent Renewal';
    } else if (daysLeft > 7 && daysLeft <= 30) {
      alertSeverity = 'WARNING';
      alertType = 'EXPIRING_WARNING';
      alertTitle = `Renewal Window: ${doc.title} (${daysLeft} days remaining)`;
      alertMsg = `${doc.title} standard 30-day renewal cycle active. Review required checklist and official portal info.`;
      actionUrl = '/renewal-assistant';
      actionLabel = 'Prepare Renewal';
    } else if (daysLeft > 30 && daysLeft <= 90) {
      alertSeverity = 'INFO';
      alertType = 'EXPIRING_INFO';
      alertTitle = `Upcoming Expiry: ${doc.title} in ${daysLeft} days`;
      alertMsg = `${doc.title} will expire on ${doc.expiryDate}. Keep renewal papers ready.`;
      actionUrl = `/documents/${docId}`;
      actionLabel = 'View Details';
    }

    if (alertSeverity) {
      const existingAlert = localAlerts.find(
        a => a.documentId === docId && a.type === alertType && a.userId === docOwnerId
      );

      // If user previously dismissed this alert for this document, respect dismiss!
      if (existingAlert && existingAlert.status === 'DISMISSED') {
        return;
      }

      const alertPayload = {
        userId: docOwnerId,
        documentId: docId,
        documentTitle: doc.title,
        profileId: doc.profileId || 'self',
        profileName: doc.profileName || 'Self',
        category: doc.category || 'Other Documents',
        severity: alertSeverity,
        type: alertType,
        title: alertTitle,
        message: alertMsg,
        status: existingAlert ? existingAlert.status : 'ACTIVE',
        snoozedUntil: existingAlert ? existingAlert.snoozedUntil : null,
        daysLeft,
        actionUrl,
        actionLabel
      };

      if (existingAlert) {
        if (
          existingAlert.status === 'SNOOZED' &&
          existingAlert.snoozedUntil &&
          new Date(existingAlert.snoozedUntil) <= now
        ) {
          alertPayload.status = 'ACTIVE';
          alertPayload.snoozedUntil = null;
        }
        Object.assign(existingAlert, alertPayload, { updatedAt: now.toISOString() });
      } else {
        localAlerts.unshift({
          id: `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          ...alertPayload,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      }
    }
  });

  // 2. Process real uploaded warranties
  warranties.forEach((war) => {
    const warId = (war._id ? war._id.toString() : war.id)?.toString();
    if (!warId) return;

    const warOwnerId = (war.userId ? war.userId.toString() : null) || currentUserId;
    const { status, daysRemaining } = calculateWarrantyStatus(war.expiryDate);

    let alertSeverity = null;
    let alertType = null;
    let alertTitle = null;
    let alertMsg = null;
    let actionUrl = '/warranties';
    let actionLabel = 'View Warranty';

    if (status === 'EXPIRED') {
      alertSeverity = 'CRITICAL';
      alertType = 'EXPIRED';
      alertTitle = `${war.productName} Warranty Expired`;
      alertMsg = `Coverage for ${war.productName} (${war.brand || 'Appliance'}) ended on ${war.expiryDate}. Extended AMC plan recommended.`;
    } else if (daysRemaining >= 0 && daysRemaining <= 7) {
      alertSeverity = 'CRITICAL';
      alertType = 'EXPIRING_CRITICAL';
      alertTitle = `Critical: ${war.productName} warranty ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
      alertMsg = `${war.productName} warranty expires on ${war.expiryDate}. Schedule last-minute service or claim check now.`;
    } else if (daysRemaining > 7 && daysRemaining <= 30) {
      alertSeverity = 'WARNING';
      alertType = 'EXPIRING_WARNING';
      alertTitle = `Warranty Expiring: ${war.productName} (${daysRemaining} days left)`;
      alertMsg = `Standard warranty expires on ${war.expiryDate}. Review claim support or extended coverage.`;
    }

    if (alertSeverity) {
      const existingAlert = localAlerts.find(
        a => a.warrantyId === warId && a.type === alertType && a.userId === warOwnerId
      );

      if (existingAlert && existingAlert.status === 'DISMISSED') {
        return;
      }

      const alertPayload = {
        userId: warOwnerId,
        warrantyId: warId,
        documentTitle: war.productName,
        profileId: war.profileId || 'self',
        profileName: war.profileName || 'Self',
        category: war.category || 'Warranty Bills',
        severity: alertSeverity,
        type: alertType,
        title: alertTitle,
        message: alertMsg,
        status: existingAlert ? existingAlert.status : 'ACTIVE',
        snoozedUntil: existingAlert ? existingAlert.snoozedUntil : null,
        daysLeft: daysRemaining,
        actionUrl,
        actionLabel
      };

      if (existingAlert) {
        if (
          existingAlert.status === 'SNOOZED' &&
          existingAlert.snoozedUntil &&
          new Date(existingAlert.snoozedUntil) <= now
        ) {
          alertPayload.status = 'ACTIVE';
          alertPayload.snoozedUntil = null;
        }
        Object.assign(existingAlert, alertPayload, { updatedAt: now.toISOString() });
      } else {
        localAlerts.unshift({
          id: `alert-war-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          ...alertPayload,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      }
    }
  });

  return localAlerts;
};

// Backward-compatible alias
const generateAlertsFromDocuments = (documents = [], userId) => {
  return generateAlertsFromDocumentsAndWarranties(documents, [], userId);
};

/**
 * Retrieve active alerts with filters
 */
const getAlerts = ({
  userId,
  profileId = 'all',
  severity = 'all',
  status = 'all',
  includeSnoozed = false
} = {}) => {
  const now = new Date();
  const targetUserId = userId ? userId.toString() : null;

  return localAlerts.filter(alert => {
    // Hide dismissed alerts unless explicitly requested
    if (status !== 'DISMISSED' && alert.status === 'DISMISSED') return false;

    // Filter strictly by target user ID — NEVER show other users' or demo alerts!
    if (targetUserId) {
      if (!alert.userId || alert.userId.toString() !== targetUserId) {
        return false;
      }
    }

    // Reactivate expired snoozes automatically
    if (alert.status === 'SNOOZED' && alert.snoozedUntil && new Date(alert.snoozedUntil) <= now) {
      alert.status = 'ACTIVE';
      alert.snoozedUntil = null;
    }

    if (profileId !== 'all' && alert.profileId !== profileId) return false;
    if (severity !== 'all' && alert.severity !== severity) return false;

    if (status !== 'all') {
      if (alert.status !== status) return false;
    } else {
      if (!includeSnoozed && alert.status === 'SNOOZED') return false;
    }

    return true;
  }).sort((a, b) => {
    const severityOrder = { CRITICAL: 1, WARNING: 2, INFO: 3 };
    const diff = (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
    if (diff !== 0) return diff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};

/**
 * Snooze alert for N days
 */
const snoozeAlert = (id, userId, days = 7) => {
  const targetUserId = userId ? userId.toString() : null;
  const alert = localAlerts.find(a => {
    if (a.id !== id) return false;
    const alertUserId = a.userId ? a.userId.toString() : null;
    return !targetUserId || !alertUserId || alertUserId === targetUserId;
  });
  if (!alert) return null;

  const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  alert.status = 'SNOOZED';
  alert.snoozedUntil = snoozedUntil.toISOString();
  alert.updatedAt = new Date().toISOString();
  return alert;
};

/**
 * Dismiss an alert
 */
const dismissAlert = (id, userId) => {
  const targetUserId = userId ? userId.toString() : null;
  const alert = localAlerts.find(a => {
    if (a.id !== id) return false;
    const alertUserId = a.userId ? a.userId.toString() : null;
    return !targetUserId || !alertUserId || alertUserId === targetUserId;
  });
  if (!alert) return null;

  alert.status = 'DISMISSED';
  alert.updatedAt = new Date().toISOString();
  return alert;
};

/**
 * Mark alert as read
 */
const markAlertRead = (id, userId) => {
  const targetUserId = userId ? userId.toString() : null;
  const alert = localAlerts.find(a => {
    if (a.id !== id) return false;
    const alertUserId = a.userId ? a.userId.toString() : null;
    return !targetUserId || !alertUserId || alertUserId === targetUserId;
  });
  if (!alert) return null;

  alert.status = 'READ';
  alert.updatedAt = new Date().toISOString();
  return alert;
};

/**
 * Dismiss all active alerts
 */
const dismissAllAlerts = (userId, profileId = 'all') => {
  let count = 0;
  const targetUserId = userId ? userId.toString() : null;

  localAlerts.forEach(alert => {
    const alertUserId = alert.userId ? alert.userId.toString() : null;
    const matchesUser = !targetUserId || !alertUserId || alertUserId === targetUserId;
    if (!matchesUser) return;

    if (profileId === 'all' || alert.profileId === profileId) {
      if (alert.status === 'ACTIVE' || alert.status === 'READ') {
        alert.status = 'DISMISSED';
        alert.updatedAt = new Date().toISOString();
        count++;
      }
    }
  });
  return count;
};

/**
 * Aggregate summary metrics
 */
const getAlertSummary = (userId, profileId = 'all') => {
  const activeAlerts = getAlerts({ userId, profileId, status: 'all', includeSnoozed: false })
    .filter(a => a.status === 'ACTIVE' || a.status === 'READ');

  return {
    total: activeAlerts.length,
    critical: activeAlerts.filter(a => a.severity === 'CRITICAL').length,
    warning: activeAlerts.filter(a => a.severity === 'WARNING').length,
    info: activeAlerts.filter(a => a.severity === 'INFO').length,
    unread: activeAlerts.filter(a => a.status === 'ACTIVE').length,
    snoozed: localAlerts.filter(a => (!userId || a.userId === userId) && a.status === 'SNOOZED').length
  };
};

module.exports = {
  generateAlertsFromDocuments,
  generateAlertsFromDocumentsAndWarranties,
  getAlerts,
  snoozeAlert,
  dismissAlert,
  markAlertRead,
  dismissAllAlerts,
  getAlertSummary
};
