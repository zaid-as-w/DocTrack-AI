const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { isDbConnected } = require('../config/db');

// In-memory initial document fixture dataset (ensures instant offline-first live calculations)
const initialDocuments = [
  {
    id: 'doc-passport-01',
    userId: 'demo-user-zaid-001',
    title: 'Indian Passport (36 Pages)',
    category: 'Identity Proofs',
    categoryId: 'identity',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    status: 'EXPIRING_SOON',
    daysLeft: 27,
    docNumber: 'Z9847291',
    issueDate: '2016-10-12',
    expiryDate: '2026-10-12',
    issuingAuthority: 'Regional Passport Office, Bengaluru',
    placeOfIssue: 'Bengaluru, India',
    fileName: 'zaid_passport_scan.pdf',
    fileSize: '2.4 MB',
    uploadedAt: '2026-08-01T10:30:00.000Z',
    verified: true,
    renewalRequired: true,
    renewalUrl: 'https://portal2.passportindia.gov.in',
    summary: 'Ordinary Indian Passport, eligible for Tatkaal or Normal Re-issue.'
  },
  {
    id: 'doc-aadhaar-02',
    userId: 'demo-user-zaid-001',
    title: 'e-Aadhaar Identity Card',
    category: 'Identity Proofs',
    categoryId: 'identity',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    status: 'ACTIVE',
    daysLeft: 9999,
    docNumber: 'XXXX-XXXX-4819',
    issueDate: '2018-03-15',
    expiryDate: 'Perpetual',
    issuingAuthority: 'UIDAI (Govt of India)',
    placeOfIssue: 'New Delhi',
    fileName: 'aadhaar_card_digital.pdf',
    fileSize: '1.1 MB',
    uploadedAt: '2026-08-10T14:15:00.000Z',
    verified: true,
    renewalRequired: false,
    summary: 'Biometrically verified digital identity with QR code.'
  },
  {
    id: 'doc-dl-03',
    userId: 'demo-user-zaid-001',
    title: 'Driving License (Non-Transport)',
    category: 'Vehicle Records',
    categoryId: 'vehicle',
    profileId: 'son',
    profileName: 'Rahul (Son)',
    status: 'EXPIRED',
    daysLeft: -12,
    docNumber: 'KA03 2019000124',
    issueDate: '2019-08-01',
    expiryDate: '2026-09-03',
    issuingAuthority: 'Regional Transport Office (RTO Indiranagar)',
    placeOfIssue: 'Bengaluru East',
    fileName: 'rahul_dl_card.png',
    fileSize: '840 KB',
    uploadedAt: '2026-07-15T09:20:00.000Z',
    verified: true,
    renewalRequired: true,
    renewalUrl: 'https://parivahan.gov.in',
    summary: 'Expired driving license. Renew within grace period to avoid penalty.'
  },
  {
    id: 'doc-insurance-04',
    userId: 'demo-user-zaid-001',
    title: 'Comprehensive Car Insurance',
    category: 'Insurance Papers',
    categoryId: 'insurance',
    profileId: 'car',
    profileName: 'Honda City (KA01AB1234)',
    status: 'ACTIVE',
    daysLeft: 116,
    docNumber: 'BA-POL-9928172',
    issueDate: '2026-01-10',
    expiryDate: '2027-01-09',
    issuingAuthority: 'Bajaj Allianz General Insurance',
    placeOfIssue: 'Mumbai Head Office',
    fileName: 'honda_city_insurance_2026.pdf',
    fileSize: '3.2 MB',
    uploadedAt: '2026-01-12T11:00:00.000Z',
    verified: true,
    renewalRequired: false,
    summary: 'Zero Depreciation + 24x7 Roadside Assistance Policy.'
  },
  {
    id: 'doc-puc-05',
    userId: 'demo-user-zaid-001',
    title: 'PUC Emission Test Certificate',
    category: 'Vehicle Records',
    categoryId: 'vehicle',
    profileId: 'car',
    profileName: 'Honda City (KA01AB1234)',
    status: 'EXPIRING_SOON',
    daysLeft: 5,
    docNumber: 'KA01-PUC-8812',
    issueDate: '2026-03-20',
    expiryDate: '2026-09-20',
    issuingAuthority: 'Department of Transport, Karnataka',
    placeOfIssue: 'Koramangala Testing Station',
    fileName: 'puc_certificate_valid.jpg',
    fileSize: '620 KB',
    uploadedAt: '2026-03-21T08:45:00.000Z',
    verified: true,
    renewalRequired: true,
    summary: 'Emission test valid for 6 months. Physical emission test required.'
  },
  {
    id: 'doc-warranty-06',
    userId: 'demo-user-zaid-001',
    title: 'Sony Bravia 55" OLED TV Warranty',
    category: 'Warranty Bills',
    categoryId: 'warranty',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    status: 'ACTIVE',
    daysLeft: 430,
    docNumber: 'SNY-INV-49102',
    issueDate: '2025-11-20',
    expiryDate: '2027-11-19',
    issuingAuthority: 'Reliance Digital & Sony India',
    placeOfIssue: 'Bengaluru Store #104',
    fileName: 'sony_bravia_invoice_warranty.pdf',
    fileSize: '1.8 MB',
    uploadedAt: '2025-11-22T16:10:00.000Z',
    verified: true,
    renewalRequired: false,
    summary: '2-Year Comprehensive Panel Warranty. Serial No: SN-882910.'
  },
  {
    id: 'doc-degree-07',
    userId: 'demo-user-zaid-001',
    title: 'Bachelor of Technology in CS Certificate',
    category: 'Educational Certificates',
    categoryId: 'education',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    status: 'ACTIVE',
    daysLeft: 9999,
    docNumber: 'VTU/2024/CS/0812',
    issueDate: '2024-07-15',
    expiryDate: 'Lifetime',
    issuingAuthority: 'Visvesvaraya Technological University',
    placeOfIssue: 'Belagavi, Karnataka',
    fileName: 'vtu_engineering_degree.pdf',
    fileSize: '4.1 MB',
    uploadedAt: '2024-08-01T12:00:00.000Z',
    verified: true,
    renewalRequired: false,
    summary: 'Degree Certificate with First Class with Distinction.'
  }
];

const initialActivities = [
  {
    id: 'act-01',
    type: 'EXPIRY_ALERT',
    title: 'Passport Expiry Window Triggered',
    description: 'Indian Passport (Z9847291) entered 30-day renewal window (27 days left).',
    timestamp: '2026-09-15T08:30:00.000Z'
  },
  {
    id: 'act-02',
    type: 'EXPIRED',
    title: 'Driving License Status: Expired',
    description: "Rahul's driving license (KA03 2019000124) expired on Sep 03, 2026.",
    timestamp: '2026-09-04T00:01:00.000Z'
  },
  {
    id: 'act-03',
    type: 'VERIFIED',
    title: 'Aadhaar Card Verified',
    description: 'Digital signature verified by UIDAI verification authority.',
    timestamp: '2026-08-10T14:20:00.000Z'
  },
  {
    id: 'act-04',
    type: 'UPLOAD',
    title: 'Vehicle Insurance Uploaded',
    description: 'Comprehensive policy for Honda City (KA01AB1234) indexed and archived.',
    timestamp: '2026-01-12T11:05:00.000Z'
  }
];

// In-memory state
let localDocuments = [...initialDocuments];
let localActivities = [...initialActivities];

/**
 * Get dashboard statistics and attention items
 * GET /api/dashboard/stats
 */
const getStats = async (req, res, next) => {
  try {
    const { profileId } = req.query;

    let docs = [];

    if (isDbConnected()) {
      const query = {};
      if (req.user?.id) query.userId = req.user.id;
      if (profileId && profileId !== 'all') query.profileId = profileId;

      docs = await Document.find(query).sort({ updatedAt: -1 });

      // If DB has no documents yet, return seed set for demonstration
      if (docs.length === 0) {
        docs = localDocuments;
      }
    } else {
      docs = localDocuments;
    }

    // Filter by profile if requested
    if (profileId && profileId !== 'all') {
      docs = docs.filter(d => d.profileId === profileId);
    }

    // Compute metrics
    const activeCount = docs.filter(d => d.status === 'ACTIVE').length;
    const expiringSoonCount = docs.filter(d => d.status === 'EXPIRING_SOON').length;
    const expiredCount = docs.filter(d => d.status === 'EXPIRED').length;
    const totalCount = docs.length;

    // Filter urgent attention items
    const urgentDocuments = docs
      .filter(d => d.status === 'EXPIRING_SOON' || d.status === 'EXPIRED')
      .sort((a, b) => a.daysLeft - b.daysLeft);

    // Compute category breakdown
    const categoryMap = {};
    docs.forEach(d => {
      categoryMap[d.category] = (categoryMap[d.category] || 0) + 1;
    });

    const categorySummary = Object.keys(categoryMap).map(name => ({
      name,
      docCount: categoryMap[name]
    }));

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          total: totalCount,
          active: activeCount,
          expiringSoon: expiringSoonCount,
          expired: expiredCount
        },
        urgentDocuments,
        categorySummary,
        recentActivity: localActivities,
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
    const { profileId, limit = 5 } = req.query;
    const maxLimit = parseInt(limit, 10) || 5;

    let docs = [];

    if (isDbConnected()) {
      const query = {};
      if (req.user?.id) query.userId = req.user.id;
      if (profileId && profileId !== 'all') query.profileId = profileId;

      docs = await Document.find(query)
        .sort({ uploadedAt: -1 })
        .limit(maxLimit);

      if (docs.length === 0) {
        docs = localDocuments.slice(0, maxLimit);
      }
    } else {
      let filtered = localDocuments;
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
