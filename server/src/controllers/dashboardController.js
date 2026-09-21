const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { isDbConnected } = require('../config/db');
const { getDocuments } = require('../services/documentStore');
const { getAlerts, getAlertSummary } = require('../services/alertStore');

const initialActivities = [
  {
    id: 'act-01',
    type: 'EXPIRY_ALERT',
    title: 'Passport Expiry Window Triggered',
    description: 'Indian Passport (Z9847291) entered 30-day renewal window (27 days left).',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  },
  {
    id: 'act-02',
    type: 'EXPIRED',
    title: 'Driving License Status: Expired',
    description: "Rahul's driving license (KA03 2019000124) expired on Sep 03, 2026.",
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'act-03',
    type: 'VERIFIED',
    title: 'Aadhaar Card Verified',
    description: 'Digital signature verified by UIDAI verification authority.',
    timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString()
  },
  {
    id: 'act-04',
    type: 'UPLOAD',
    title: 'Vehicle Insurance Uploaded',
    description: 'Comprehensive policy for Honda City (KA01AB1234) indexed and archived.',
    timestamp: new Date(Date.now() - 120 * 3600 * 1000).toISOString()
  }
];

let localActivities = [...initialActivities];

/**
 * Helper to calculate Portfolio Health Score (0 - 100%)
 */
const calculateHealthScore = (docs) => {
  if (!docs || docs.length === 0) {
    return {
      score: 100,
      grade: 'A+',
      rating: 'EXCELLENT',
      label: 'Optimal Portfolio',
      description: 'No active compliance risks or pending expirations found.',
      breakdown: {
        expiredPenalty: 0,
        criticalPenalty: 0,
        expiringSoonPenalty: 0,
        unverifiedPenalty: 0
      }
    };
  }

  let penalty = 0;
  let expiredPenalty = 0;
  let criticalPenalty = 0;
  let expiringSoonPenalty = 0;
  let unverifiedPenalty = 0;

  docs.forEach(doc => {
    const days = typeof doc.daysLeft === 'number' ? doc.daysLeft : 9999;

    if (doc.status === 'EXPIRED' || days < 0) {
      expiredPenalty += 25;
    } else if (days >= 0 && days <= 7) {
      criticalPenalty += 12;
    } else if (days > 7 && days <= 30) {
      expiringSoonPenalty += 6;
    }

    if (doc.verified === false) {
      unverifiedPenalty += 2;
    }
  });

  penalty = expiredPenalty + criticalPenalty + expiringSoonPenalty + unverifiedPenalty;
  const score = Math.max(0, Math.min(100, 100 - penalty));

  let grade = 'A';
  let rating = 'EXCELLENT';
  let label = 'Portfolio in Good Standing';
  let description = 'Key documents are valid and monitored with active alerts.';

  if (score >= 90) {
    grade = 'A';
    rating = 'EXCELLENT';
    label = 'Excellent Protection';
    description = 'All vital documents are current, verified, and well within validity periods.';
  } else if (score >= 75) {
    grade = 'B';
    rating = 'GOOD';
    label = 'Good Standing';
    description = 'Minor upcoming renewals approaching. Portfolio is actively protected.';
  } else if (score >= 50) {
    grade = 'C';
    rating = 'NEEDS_ATTENTION';
    label = 'Attention Required';
    description = 'One or more documents require immediate renewal action or document update.';
  } else {
    grade = 'D';
    rating = 'HIGH_RISK';
    label = 'Critical Risk';
    description = 'Expired or unrenewed documents detected. Urgent renewal action recommended.';
  }

  return {
    score,
    grade,
    rating,
    label,
    description,
    breakdown: {
      expiredPenalty,
      criticalPenalty,
      expiringSoonPenalty,
      unverifiedPenalty
    }
  };
};

/**
 * Compute Expiry Horizon distribution (<0d, 0-7d, 8-30d, 31-90d, 90d+, Perpetual)
 */
const calculateHorizonDistribution = (docs) => {
  const distribution = {
    expired: 0,
    critical7d: 0,
    urgent30d: 0,
    approaching90d: 0,
    safe90dPlus: 0,
    perpetual: 0
  };

  docs.forEach(doc => {
    const days = typeof doc.daysLeft === 'number' ? doc.daysLeft : 9999;
    const expiryStr = (doc.expiryDate || '').toLowerCase();

    if (days >= 9999 || expiryStr.includes('perpetual') || expiryStr.includes('lifetime')) {
      distribution.perpetual++;
    } else if (days < 0 || doc.status === 'EXPIRED') {
      distribution.expired++;
    } else if (days <= 7) {
      distribution.critical7d++;
    } else if (days <= 30) {
      distribution.urgent30d++;
    } else if (days <= 90) {
      distribution.approaching90d++;
    } else {
      distribution.safe90dPlus++;
    }
  });

  return distribution;
};

/**
 * Get advanced dashboard statistics, health score, horizon, alerts, and category summaries
 * GET /api/dashboard/stats
 */
const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.query;

    let docs = [];

    if (isDbConnected()) {
      const query = { userId };
      if (profileId && profileId !== 'all') query.profileId = profileId;

      docs = await Document.find(query).sort({ updatedAt: -1 });

      if (docs.length === 0 && userId === 'demo-user-zaid-001') {
        docs = getDocuments(userId);
      }
    } else {
      docs = getDocuments(userId);
    }

    // Filter by profile if requested
    if (profileId && profileId !== 'all') {
      docs = docs.filter(d => d.profileId === profileId);
    }

    // Compute basic counts
    const activeCount = docs.filter(d => d.status === 'ACTIVE').length;
    const expiringSoonCount = docs.filter(d => d.status === 'EXPIRING_SOON').length;
    const expiredCount = docs.filter(d => d.status === 'EXPIRED').length;
    const totalCount = docs.length;

    // Filter urgent attention documents
    const urgentDocuments = docs
      .filter(d => d.status === 'EXPIRING_SOON' || d.status === 'EXPIRED')
      .sort((a, b) => a.daysLeft - b.daysLeft);

    // Compute Category Summary with percentages
    const categoryMap = {};
    docs.forEach(d => {
      categoryMap[d.category] = (categoryMap[d.category] || 0) + 1;
    });

    const categorySummary = Object.keys(categoryMap).map(name => ({
      name,
      docCount: categoryMap[name],
      percentage: totalCount > 0 ? Math.round((categoryMap[name] / totalCount) * 100) : 0
    })).sort((a, b) => b.docCount - a.docCount);

    // Dynamic Portfolio Health Score & Horizon
    const health = calculateHealthScore(docs);
    const horizon = calculateHorizonDistribution(docs);

    // Retrieve active alerts from centralized alert store for this user
    const alerts = getAlerts({
      userId,
      profileId: profileId || 'all',
      status: 'all',
      includeSnoozed: false
    });
    const alertSummary = getAlertSummary(userId, profileId || 'all');

    // Retrieve user activities if available
    let recentActivity = [];
    if (isDbConnected()) {
      try {
        recentActivity = await ActivityLog.find({ userId }).sort({ timestamp: -1 }).limit(10);
      } catch {
        recentActivity = [];
      }
    }
    if (recentActivity.length === 0 && userId === 'demo-user-zaid-001') {
      recentActivity = localActivities;
    }

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          total: totalCount,
          active: activeCount,
          expiringSoon: expiringSoonCount,
          expired: expiredCount
        },
        health,
        horizon,
        urgentDocuments,
        alerts: alerts.slice(0, 6),
        alertSummary,
        categorySummary,
        recentActivity,
        profileId: profileId || 'all'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recently uploaded or indexed documents
 * GET /api/dashboard/recent
 */
const getRecentDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { profileId, limit = 5 } = req.query;
    const maxLimit = parseInt(limit, 10) || 5;

    let docs = [];

    if (isDbConnected()) {
      const query = { userId };
      if (profileId && profileId !== 'all') query.profileId = profileId;

      docs = await Document.find(query)
        .sort({ uploadedAt: -1 })
        .limit(maxLimit);

      if (docs.length === 0 && userId === 'demo-user-zaid-001') {
        docs = getDocuments(userId).slice(0, maxLimit);
      }
    } else {
      let filtered = getDocuments(userId);
      if (profileId && profileId !== 'all') {
        filtered = filtered.filter(d => d.profileId === profileId);
      }
      docs = filtered.slice(0, maxLimit);
    }

    return res.status(200).json({
      success: true,
      data: docs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getRecentDocuments
};
