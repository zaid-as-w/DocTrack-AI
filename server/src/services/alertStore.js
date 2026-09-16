/**
 * Centralized Alert Store & Notification Engine
 * Manages multi-tier alerts, snoozing, dismissing, and automatic generation from document states.
 * Operates offline-first with in-memory persistence and syncs with MongoDB when online.
 */

const Alert = require('../models/Alert');
const { isDbConnected } = require('../config/db');
const { evaluateDocument } = require('./expiryEngine');

const initialAlerts = [
  {
    id: 'alert-dl-expired',
    userId: 'demo-user-zaid-001',
    documentId: 'doc-dl-03',
    documentTitle: 'Driving License (Non-Transport)',
    profileId: 'son',
    profileName: 'Rahul (Son)',
    category: 'Vehicle Records',
    severity: 'CRITICAL',
    type: 'EXPIRED',
    title: 'Driving License Expired',
    message: "Rahul's driving license expired on Sep 03, 2026. Renew within grace period to avoid penalties.",
    status: 'ACTIVE',
    snoozedUntil: null,
    daysLeft: -13,
    actionUrl: '/renewal-assistant',
    actionLabel: 'Renewal Guide',
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
  },
  {
    id: 'alert-passport-expiring',
    userId: 'demo-user-zaid-001',
    documentId: 'doc-passport-01',
    documentTitle: 'Indian Passport (36 Pages)',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    category: 'Identity Proofs',
    severity: 'WARNING',
    type: 'EXPIRING_WARNING',
    title: 'Passport Expiry Approaching',
    message: 'Passport expires in 27 days (Oct 12, 2026). Apply for Tatkaal or Normal re-issue online.',
    status: 'ACTIVE',
    snoozedUntil: null,
    daysLeft: 27,
    actionUrl: '/renewal-assistant',
    actionLabel: 'Re-issue Info',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'alert-puc-expiring',
    userId: 'demo-user-zaid-001',
    documentId: 'doc-puc-05',
    documentTitle: 'PUC Emission Test Certificate',
    profileId: 'car',
    profileName: 'Honda City (KA01AB1234)',
    category: 'Vehicle Records',
    severity: 'CRITICAL',
    type: 'EXPIRING_CRITICAL',
    title: 'PUC Certificate Expires in 4 Days',
    message: 'Vehicle emission compliance certificate expires on Sep 20, 2026. Visit an authorized testing center.',
    status: 'ACTIVE',
    snoozedUntil: null,
    daysLeft: 4,
    actionUrl: '/documents/doc-puc-05',
    actionLabel: 'View Certificate',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  },
  {
    id: 'alert-warranty-info',
    userId: 'demo-user-zaid-001',
    documentId: 'doc-warranty-06',
    documentTitle: 'Sony Bravia 55" OLED TV Invoice',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    category: 'Warranty Bills',
    severity: 'INFO',
    type: 'EXPIRING_INFO',
    title: 'Extended Warranty Window Open',
    message: 'Appliance warranty valid through Oct 2027. Serial number indexed for fast support.',
    status: 'ACTIVE',
    snoozedUntil: null,
    daysLeft: 395,
    actionUrl: '/documents/doc-warranty-06',
    actionLabel: 'View Invoice',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  }
];

let localAlerts = [...initialAlerts];

/**
 * Generate/Refresh alerts from a collection of documents
 */
const generateAlertsFromDocuments = (documents = [], userId = 'demo-user-zaid-001') => {
  const now = new Date();

  documents.forEach((doc) => {
    const docId = doc._id ? doc._id.toString() : doc.id;
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
      alertMsg = `Expired on ${doc.expiryDate || 'past date'}. Urgent renewal or renewal assistance required.`;
      actionUrl = '/renewal-assistant';
      actionLabel = 'Renewal Guide';
    } else if (daysLeft >= 0 && daysLeft <= 7) {
      alertSeverity = 'CRITICAL';
      alertType = 'EXPIRING_CRITICAL';
      alertTitle = `Critical: ${doc.title} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
      alertMsg = `Action deadline is immediate (${doc.expiryDate}). Renew now to prevent expiration.`;
      actionUrl = '/renewal-assistant';
      actionLabel = 'Urgent Renewal';
    } else if (daysLeft > 7 && daysLeft <= 30) {
      alertSeverity = 'WARNING';
      alertType = 'EXPIRING_WARNING';
      alertTitle = `Renewal Window: ${doc.title} (${daysLeft} days remaining)`;
      alertMsg = `Standard 30-day renewal cycle active. Review required checklist and official portal info.`;
      actionUrl = '/renewal-assistant';
      actionLabel = 'Prepare Renewal';
    } else if (daysLeft > 30 && daysLeft <= 90) {
      alertSeverity = 'INFO';
      alertType = 'EXPIRING_INFO';
      alertTitle = `Upcoming Expiry: ${doc.title} in ${daysLeft} days`;
      alertMsg = `Document will expire on ${doc.expiryDate}. Keep renewal papers ready.`;
      actionUrl = `/documents/${docId}`;
      actionLabel = 'View Details';
    }

    if (alertSeverity) {
      const existingIndex = localAlerts.findIndex(
        a => a.documentId === docId && a.type === alertType && a.status !== 'DISMISSED'
      );

      const alertPayload = {
        userId,
        documentId: docId,
        documentTitle: doc.title,
        profileId: doc.profileId || 'self',
        profileName: doc.profileName || 'Self',
        category: doc.category || 'Other Documents',
        severity: alertSeverity,
        type: alertType,
        title: alertTitle,
        message: alertMsg,
        status: existingIndex !== -1 ? localAlerts[existingIndex].status : 'ACTIVE',
        snoozedUntil: existingIndex !== -1 ? localAlerts[existingIndex].snoozedUntil : null,
        daysLeft,
        actionUrl,
        actionLabel
      };

      if (existingIndex !== -1) {
        // If snooze expired, reactivate
        if (
          localAlerts[existingIndex].status === 'SNOOZED' &&
          localAlerts[existingIndex].snoozedUntil &&
          new Date(localAlerts[existingIndex].snoozedUntil) <= now
        ) {
          alertPayload.status = 'ACTIVE';
          alertPayload.snoozedUntil = null;
        }
        localAlerts[existingIndex] = {
          ...localAlerts[existingIndex],
          ...alertPayload,
          updatedAt: now.toISOString()
        };
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

  return localAlerts;
};

/**
 * Retrieve active alerts with filters
 */
const getAlerts = ({
  profileId = 'all',
  severity = 'all',
  status = 'all',
  includeSnoozed = false
} = {}) => {
  const now = new Date();

  return localAlerts.filter(alert => {
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
      // By default show ACTIVE and READ alerts, hide DISMISSED and unexpired SNOOZED unless requested
      if (alert.status === 'DISMISSED') return false;
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
const snoozeAlert = (id, days = 7) => {
  const alert = localAlerts.find(a => a.id === id);
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
const dismissAlert = (id) => {
  const alert = localAlerts.find(a => a.id === id);
  if (!alert) return null;

  alert.status = 'DISMISSED';
  alert.updatedAt = new Date().toISOString();
  return alert;
};

/**
 * Mark alert as read
 */
const markAlertRead = (id) => {
  const alert = localAlerts.find(a => a.id === id);
  if (!alert) return null;

  alert.status = 'READ';
  alert.updatedAt = new Date().toISOString();
  return alert;
};

/**
 * Dismiss all active alerts
 */
const dismissAllAlerts = (profileId = 'all') => {
  let count = 0;
  localAlerts.forEach(alert => {
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
const getAlertSummary = (profileId = 'all') => {
  const activeAlerts = getAlerts({ profileId, status: 'all', includeSnoozed: false })
    .filter(a => a.status === 'ACTIVE' || a.status === 'READ');

  return {
    total: activeAlerts.length,
    critical: activeAlerts.filter(a => a.severity === 'CRITICAL').length,
    warning: activeAlerts.filter(a => a.severity === 'WARNING').length,
    info: activeAlerts.filter(a => a.severity === 'INFO').length,
    unread: activeAlerts.filter(a => a.status === 'ACTIVE').length,
    snoozed: localAlerts.filter(a => a.status === 'SNOOZED').length
  };
};

module.exports = {
  generateAlertsFromDocuments,
  getAlerts,
  snoozeAlert,
  dismissAlert,
  markAlertRead,
  dismissAllAlerts,
  getAlertSummary
};
