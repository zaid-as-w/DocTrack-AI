/**
 * Renewal Service
 * Provides verified statutory renewal checklists, prerequisites, official portals,
 * and progress tracking for expiring and expired documents.
 */

const { getDocuments, getDocumentById } = require('./documentStore');
const { getWarranties } = require('./warrantyStore');

// In-memory persistent step completion tracker: { `${userId}:${docId}:${stepId}`: boolean }
const stepCompletionStore = new Map();

// Official verified renewal knowledge blueprints
const RENEWAL_KNOWLEDGE_BASE = {
  passport: {
    docType: 'passport',
    category: 'Identity Proofs',
    title: 'Indian Passport Renewal & Re-issue Guide',
    issuingAuthority: 'Passport Seva / Ministry of External Affairs',
    portalName: 'Passport Seva Online Portal',
    portalUrl: 'https://portal2.passportindia.gov.in',
    isOfficialGovtPortal: true,
    urgencyText: 'Action recommended within 30-90 days before expiration',
    gracePeriod: 'Re-issue can be applied up to 1 year before or up to 3 years after expiry without pre-police verification.',
    officialFee: '₹1,500 (Normal 36 pages) / ₹3,500 (Tatkaal 36 pages) / ₹2,000 (60 pages Jumbo)',
    processingTime: 'Normal: 7-14 working days | Tatkaal: 1-3 working days',
    requiredDocuments: [
      'Original Old Passport + self-attested photocopies of first 2 and last 2 pages',
      'Proof of Current Address (Aadhaar Card / Bank Passbook / Electricity Bill)',
      'Annexure E (Self-declaration affidavit for re-issue)',
      'Appointment Confirmation Receipt from Passport Seva Kendra (PSK)'
    ],
    steps: [
      { id: 1, text: 'Register or log in to the official Passport Seva Online Portal (passportindia.gov.in)' },
      { id: 2, text: 'Click "Apply for Fresh Passport / Re-issue of Passport" and select Normal or Tatkaal' },
      { id: 3, text: 'Complete online application form with existing passport number and personal details' },
      { id: 4, text: 'Pay statutory fee online and schedule appointment at nearest Passport Seva Kendra (PSK)' },
      { id: 5, text: 'Visit PSK on appointment date with original old passport, address proof, and printed receipt' },
      { id: 6, text: 'Complete biometric scanning (fingerprints + live photo) and document verification' }
    ]
  },
  license: {
    docType: 'license',
    category: 'Vehicle Records',
    title: 'Driving Licence (DL) Renewal Guide',
    issuingAuthority: 'Ministry of Road Transport and Highways (MoRTH) / State RTO',
    portalName: 'Parivahan Sarathi Services',
    portalUrl: 'https://sarathi.parivahan.gov.in',
    isOfficialGovtPortal: true,
    urgencyText: 'Urgent: Complete within grace period to avoid statutory penalty',
    gracePeriod: '30 days grace period from expiration date before late fees accumulate.',
    officialFee: '₹200 (Renewal fee) + ₹200 (Form 7 Smart Card) + ₹1,000/yr penalty if expired > 1 year',
    processingTime: '5-10 working days via contactless RTO processing',
    requiredDocuments: [
      'Original Expired Driving Licence',
      'Form 1-A Medical Certificate (signed by certified MBBS practitioner for applicants > 40 yrs)',
      'Proof of Age & Address (Aadhaar Card / Voter ID / Passport)',
      'Passport size photograph and digital signature scan'
    ],
    steps: [
      { id: 1, text: 'Visit Parivahan Sarathi Portal (sarathi.parivahan.gov.in) and choose your state' },
      { id: 2, text: 'Select "Services on Driving Licence (Renewal / Duplicate / Address Change)"' },
      { id: 3, text: 'Enter DL Number and Date of Birth to fetch current records from Vahan/Sarathi database' },
      { id: 4, text: 'Upload Form 1-A Medical Certificate and required address verification documents' },
      { id: 5, text: 'Pay statutory renewal fee online through the payment gateway' },
      { id: 6, text: 'Track application reference number; smart card is dispatched via speed post to registered address' }
    ]
  },
  insurance: {
    docType: 'insurance',
    category: 'Insurance Papers',
    title: 'Motor & Health Insurance Policy Renewal Guide',
    issuingAuthority: 'Insurance Regulatory and Development Authority of India (IRDAI)',
    portalName: 'Direct Insurer Portal / DigiLocker Insurance Gateway',
    portalUrl: 'https://www.irdai.gov.in',
    isOfficialGovtPortal: false,
    urgencyText: 'Renew before midnight of expiry date to prevent policy lapse & NCB loss',
    gracePeriod: 'Motor: 90 days for No-Claim Bonus (NCB) retention. Break-in inspection required after 0 days.',
    officialFee: 'Determined by Vehicle Insured Declared Value (IDV) and NCB discount (20%-50%)',
    processingTime: 'Instant digital policy issuance upon premium settlement',
    requiredDocuments: [
      'Existing Insurance Policy Document / Policy Number',
      'Vehicle Registration Certificate (RC)',
      'Valid Pollution Under Control (PUC) Certificate',
      'Proof of No-Claim Bonus (NCB) from previous insurer (if switching)'
    ],
    steps: [
      { id: 1, text: 'Review existing policy schedule, IDV valuation, and claim history from past policy year' },
      { id: 2, text: 'Confirm No-Claim Bonus (NCB) discount percentage (up to 50% discount on own-damage)' },
      { id: 3, text: 'Select essential add-ons: Zero Depreciation, Engine Protect, and Roadside Assistance' },
      { id: 4, text: 'Execute premium payment securely via UPI, NetBanking, or Credit Card' },
      { id: 5, text: 'Download newly issued Certificate of Insurance and sync with DocTrack AI vault' }
    ]
  },
  vehicle: {
    docType: 'vehicle',
    category: 'Vehicle Records',
    title: 'Vehicle Fitness & RC Renewal Guide',
    issuingAuthority: 'Parivahan Vahan / State Transport Department',
    portalName: 'Parivahan Vahan Citizen Portal',
    portalUrl: 'https://vahan.parivahan.gov.in',
    isOfficialGovtPortal: true,
    urgencyText: 'Required for vehicles older than 15 years or commercial transport',
    gracePeriod: 'Must apply 60 days before expiration of registration certificate.',
    officialFee: '₹600 - ₹1,000 + Green Tax (varies by state and fuel type)',
    processingTime: '7-15 working days following physical vehicle inspection',
    requiredDocuments: [
      'Form 25 (Application for renewal of RC)',
      'Original Registration Certificate (RC book/smart card)',
      'Valid Insurance Certificate and PUC Certificate',
      'Chassis & Engine pencil imprint on Form 25'
    ],
    steps: [
      { id: 1, text: 'Visit Parivahan Vahan Citizen Services portal and enter vehicle registration' },
      { id: 2, text: 'Apply for "Renewal of Registration / Fitness Certificate"' },
      { id: 3, text: 'Pay Green Tax and fitness test fees online' },
      { id: 4, text: 'Book inspection appointment slot at the jurisdictional RTO testing track' },
      { id: 5, text: 'Present vehicle for roadworthiness and emissions inspection' }
    ]
  },
  warranty: {
    docType: 'warranty',
    category: 'Consumer Electronics & Appliances',
    title: 'Manufacturer Extended Warranty & Care Guide',
    issuingAuthority: 'Authorized Brand Service Network',
    portalName: 'Official Brand Care & Support Portal',
    portalUrl: 'https://consumerhelpline.gov.in',
    isOfficialGovtPortal: false,
    urgencyText: 'Extended warranty must typically be purchased within 30-60 days of original purchase',
    gracePeriod: 'Claims only honored within active warranty duration.',
    officialFee: 'Varies by product category (approx 5%-12% of original invoice valuation)',
    processingTime: 'Immediate extended protection plan activation',
    requiredDocuments: [
      'Original Purchase Tax Invoice with GSTIN',
      'Product Serial Number and Model Identifier barcode',
      'Manufacturer Warranty Card (stamped by authorized retailer if offline)',
      'Government Photo Identity Proof'
    ],
    steps: [
      { id: 1, text: 'Locate original invoice and verify serial number matches physical device chassis' },
      { id: 2, text: 'Visit manufacturer official support portal or contact authorized toll-free helpline' },
      { id: 3, text: 'Check eligibility for 1-year or 2-year extended warranty / accidental damage protection' },
      { id: 4, text: 'Register device IMEI / Serial Number in manufacturer brand portal' }
    ]
  }
};

/**
 * Match a document to its best renewal blueprint
 */
function matchBlueprint(doc) {
  const title = (doc.title || '').toLowerCase();
  const category = (doc.category || doc.categoryId || '').toLowerCase();

  if (title.includes('passport')) return RENEWAL_KNOWLEDGE_BASE.passport;
  if (title.includes('license') || title.includes('licence') || title.includes('dl')) return RENEWAL_KNOWLEDGE_BASE.license;
  if (title.includes('insurance') || category.includes('insurance')) return RENEWAL_KNOWLEDGE_BASE.insurance;
  if (title.includes('rc') || title.includes('registration') || category.includes('vehicle')) return RENEWAL_KNOWLEDGE_BASE.vehicle;
  return RENEWAL_KNOWLEDGE_BASE.passport; // default high-detail template
}

/**
 * Get all documents requiring renewal for a specific user, enriched with guide metadata
 */
async function getRenewalItems(userId) {
  const userDocs = getDocuments(userId);

  // Focus on documents that are EXPIRING_SOON, EXPIRED, or flagged renewalRequired
  const renewalDocs = userDocs.filter(d =>
    d.status === 'EXPIRING_SOON' ||
    d.status === 'EXPIRED' ||
    d.renewalRequired ||
    (typeof d.daysLeft === 'number' && d.daysLeft <= 90)
  );

  return renewalDocs.map(doc => {
    const blueprint = matchBlueprint(doc);
    const steps = blueprint.steps.map(s => {
      const isCompleted = !!stepCompletionStore.get(`${userId}:${doc.id}:${s.id}`);
      return { ...s, isCompleted };
    });

    const completedCount = steps.filter(s => s.isCompleted).length;
    const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

    return {
      id: doc.id,
      documentId: doc.id,
      title: doc.title,
      docNumber: doc.docNumber,
      category: doc.category,
      profileName: doc.profileName,
      status: doc.status,
      daysLeft: doc.daysLeft,
      expiryDate: doc.expiryDate,
      renewalUrl: doc.renewalUrl || blueprint.portalUrl,
      portalName: blueprint.portalName,
      isOfficialGovtPortal: blueprint.isOfficialGovtPortal,
      urgencyText: doc.status === 'EXPIRED' ? 'EXPIRED - Action Required Immediately' : `${doc.daysLeft} days remaining`,
      officialFee: blueprint.officialFee,
      gracePeriod: blueprint.gracePeriod,
      stepsCount: steps.length,
      completedStepsCount: completedCount,
      progressPercent
    };
  });
}

/**
 * Get comprehensive renewal roadmap for a specific document
 */
async function getRenewalGuide(userId, docId) {
  const doc = getDocumentById(docId, userId);

  if (!doc) {
    const err = new Error(`Document with ID "${docId}" was not found.`);
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    err.errorCode = 'DOCUMENT_NOT_FOUND';
    throw err;
  }

  const blueprint = matchBlueprint(doc);

  const steps = blueprint.steps.map(s => {
    const isCompleted = !!stepCompletionStore.get(`${userId}:${docId}:${s.id}`);
    return { ...s, isCompleted };
  });

  const completedCount = steps.filter(s => s.isCompleted).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return {
    document: {
      id: doc.id,
      title: doc.title,
      docNumber: doc.docNumber,
      category: doc.category,
      profileName: doc.profileName,
      status: doc.status,
      daysLeft: doc.daysLeft,
      expiryDate: doc.expiryDate,
      issueDate: doc.issueDate,
      issuingAuthority: doc.issuingAuthority || blueprint.issuingAuthority
    },
    guide: {
      title: `${doc.title} Renewal Dossier`,
      urgencyText: doc.status === 'EXPIRED' ? 'Expired (Grace period active)' : `${doc.daysLeft} days remaining`,
      portalName: blueprint.portalName,
      portalUrl: doc.renewalUrl || blueprint.portalUrl,
      isOfficialGovtPortal: blueprint.isOfficialGovtPortal,
      officialFee: blueprint.officialFee,
      processingTime: blueprint.processingTime,
      gracePeriod: blueprint.gracePeriod,
      requiredDocuments: blueprint.requiredDocuments,
      steps,
      completedCount,
      totalSteps: steps.length,
      progressPercent
    }
  };
}

/**
 * Toggle completion status of a renewal checklist step
 */
async function toggleRenewalStep(userId, docId, stepId, completed) {
  const doc = getDocumentById(docId, userId);
  if (!doc) {
    const err = new Error(`Document with ID "${docId}" was not found.`);
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    err.errorCode = 'DOCUMENT_NOT_FOUND';
    throw err;
  }

  const key = `${userId}:${docId}:${stepId}`;
  const nextVal = typeof completed === 'boolean' ? completed : !stepCompletionStore.get(key);
  stepCompletionStore.set(key, nextVal);

  return {
    docId,
    stepId,
    isCompleted: nextVal
  };
}

module.exports = {
  RENEWAL_KNOWLEDGE_BASE,
  getRenewalItems,
  getRenewalGuide,
  toggleRenewalStep
};
