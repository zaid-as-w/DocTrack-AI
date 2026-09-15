/**
 * DocTrack AI — Centralized Expiry Calculation & Background Audit Engine
 * Standardized thresholds: 180 days, 90 days, 30 days, 7 days, 1 day.
 */

const THRESHOLDS = [180, 90, 60, 30, 15, 7, 1];

/**
 * Standardized document evaluation function
 * Single source of truth for expiry math across entire application
 */
const evaluateDocument = (doc, referenceDate = new Date()) => {
  const expiryStr = doc.expiryDate;

  if (!expiryStr || typeof expiryStr !== 'string') {
    return {
      status: 'ACTIVE',
      daysLeft: 9999,
      stage: 'PERPETUAL',
      isUrgent: false,
      gracePeriodActive: false,
      thresholdHit: null,
      message: 'Perpetual validity (No expiration date)'
    };
  }

  const lower = expiryStr.toLowerCase().trim();
  if (lower.includes('perpetual') || lower.includes('lifetime') || lower.includes('no expiry')) {
    return {
      status: 'ACTIVE',
      daysLeft: 9999,
      stage: 'PERPETUAL',
      isUrgent: false,
      gracePeriodActive: false,
      thresholdHit: null,
      message: 'Perpetual validity (No expiration date)'
    };
  }

  const target = new Date(expiryStr);
  if (isNaN(target.getTime())) {
    return {
      status: 'ACTIVE',
      daysLeft: 9999,
      stage: 'PERPETUAL',
      isUrgent: false,
      gracePeriodActive: false,
      thresholdHit: null,
      message: 'Perpetual validity'
    };
  }

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Determine threshold bucket
  let status = 'ACTIVE';
  let stage = 'HEALTHY';
  let isUrgent = false;
  let gracePeriodActive = false;
  let thresholdHit = null;

  if (daysLeft < 0) {
    status = 'EXPIRED';
    stage = 'EXPIRED';
    isUrgent = true;
    // Standard 30-day grace period
    gracePeriodActive = Math.abs(daysLeft) <= 30;
    thresholdHit = 'EXPIRED';
  } else if (daysLeft <= 1) {
    status = 'EXPIRING_SOON';
    stage = 'CRITICAL_1_DAY';
    isUrgent = true;
    thresholdHit = 1;
  } else if (daysLeft <= 7) {
    status = 'EXPIRING_SOON';
    stage = 'URGENT_7_DAYS';
    isUrgent = true;
    thresholdHit = 7;
  } else if (daysLeft <= 30) {
    status = 'EXPIRING_SOON';
    stage = 'WARNING_30_DAYS';
    isUrgent = true;
    thresholdHit = 30;
  } else if (daysLeft <= 90) {
    status = 'ACTIVE';
    stage = 'NOTICE_90_DAYS';
    isUrgent = false;
    thresholdHit = 90;
  } else if (daysLeft <= 180) {
    status = 'ACTIVE';
    stage = 'ADVANCE_180_DAYS';
    isUrgent = false;
    thresholdHit = 180;
  } else {
    status = 'ACTIVE';
    stage = 'HEALTHY';
    isUrgent = false;
  }

  return {
    status,
    daysLeft,
    stage,
    isUrgent,
    gracePeriodActive,
    thresholdHit,
    message:
      daysLeft < 0
        ? `Expired ${Math.abs(daysLeft)} days ago${gracePeriodActive ? ' (Within standard 30-day grace period)' : ''}`
        : daysLeft === 0
        ? 'Expires today!'
        : `${daysLeft} days remaining`
  };
};

/**
 * Categorize multiple documents into standardized audit buckets
 */
const auditDocuments = (documents) => {
  const buckets = {
    expired: [],
    critical: [], // 0 - 7 days
    warning: [], // 8 - 30 days
    approaching: [], // 31 - 90 days
    future: [], // 91+ days
    perpetual: []
  };

  documents.forEach((doc) => {
    const evaluation = evaluateDocument(doc);
    const enriched = { ...doc, evaluation };

    if (evaluation.daysLeft === 9999) {
      buckets.perpetual.push(enriched);
    } else if (evaluation.daysLeft < 0) {
      buckets.expired.push(enriched);
    } else if (evaluation.daysLeft <= 7) {
      buckets.critical.push(enriched);
    } else if (evaluation.daysLeft <= 30) {
      buckets.warning.push(enriched);
    } else if (evaluation.daysLeft <= 90) {
      buckets.approaching.push(enriched);
    } else {
      buckets.future.push(enriched);
    }
  });

  return {
    summary: {
      total: documents.length,
      expiredCount: buckets.expired.length,
      criticalCount: buckets.critical.length,
      warningCount: buckets.warning.length,
      approachingCount: buckets.approaching.length,
      futureCount: buckets.future.length,
      perpetualCount: buckets.perpetual.length,
      attentionRequired: buckets.expired.length + buckets.critical.length + buckets.warning.length
    },
    buckets
  };
};

module.exports = {
  THRESHOLDS,
  evaluateDocument,
  auditDocuments
};
