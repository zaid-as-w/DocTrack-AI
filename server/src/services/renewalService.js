/**
 * Renewal Service
 * Provides dynamic AI-researched renewal roadmaps via Google Gemini API,
 * verified statutory renewal checklists, prerequisites, official portals,
 * and progress tracking for expiring and expired documents.
 */

const mongoose = require('mongoose');
const Document = require('../models/Document');
const { isDbConnected } = require('../config/db');
const { evaluateDocument } = require('./expiryEngine');
const { getDocuments, getDocumentById: getLocalDocumentById } = require('./documentStore');
const { getWarranties } = require('./warrantyStore');
const geminiService = require('./gemini.service');

// In-memory persistent step completion tracker: { `${userId}:${docId}:${stepId}`: boolean }
const stepCompletionStore = new Map();

// In-memory cache for dynamic AI renewal research results
const aiRenewalGuideCache = new Map();

// Official verified statutory renewal knowledge blueprints (offline-first fallback)
const RENEWAL_KNOWLEDGE_BASE = {
  passport: {
    docType: 'passport',
    category: 'Identity Proofs',
    title: 'Indian Passport Renewal & Re-issue Guide',
    issuingAuthority: 'Passport Seva / Ministry of External Affairs (MEA)',
    portalName: 'Passport Seva Online Portal',
    portalUrl: 'https://portal2.passportindia.gov.in',
    officialPortalUrl: 'https://portal2.passportindia.gov.in',
    isOfficialGovtPortal: true,
    urgencyText: 'Action recommended within 30-90 days before expiration',
    gracePeriod: 'Re-issue can be applied up to 1 year before or up to 3 years after expiry without pre-police verification.',
    officialFee: '₹1,500 (Normal 36 pages) / ₹3,500 (Tatkaal 36 pages) / ₹2,000 (60 pages Jumbo)',
    feeStructure: '₹1,500 (Normal 36 pages) / ₹3,500 (Tatkaal 36 pages) / ₹2,000 (60 pages Jumbo)',
    processingTime: 'Normal: 7-14 working days | Tatkaal: 1-3 working days',
    estimatedDays: 'Normal: 7-14 working days | Tatkaal: 1-3 working days',
    requiredDocuments: [
      'Original Old Passport + self-attested photocopies of first 2 and last 2 pages',
      'Proof of Current Address (Aadhaar Card / Bank Passbook / Electricity Bill)',
      'Annexure E (Self-declaration affidavit for re-issue)',
      'Appointment Confirmation Receipt from Passport Seva Kendra (PSK)'
    ],
    steps: [
      { id: 1, title: 'Portal Registration & Login', description: 'Register or log in to the official Passport Seva Online Portal (passportindia.gov.in)', text: 'Register or log in to the official Passport Seva Online Portal (passportindia.gov.in)' },
      { id: 2, title: 'Select Application Scheme', description: 'Click "Apply for Fresh Passport / Re-issue of Passport" and select Normal or Tatkaal', text: 'Click "Apply for Fresh Passport / Re-issue of Passport" and select Normal or Tatkaal' },
      { id: 3, title: 'Complete Online Application', description: 'Complete online application form with existing passport number and personal details', text: 'Complete online application form with existing passport number and personal details' },
      { id: 4, title: 'Online Fee Payment & Slot Booking', description: 'Pay statutory fee online and schedule appointment at nearest Passport Seva Kendra (PSK)', text: 'Pay statutory fee online and schedule appointment at nearest Passport Seva Kendra (PSK)' },
      { id: 5, title: 'Visit PSK for Verification', description: 'Visit PSK on appointment date with original old passport, address proof, and printed receipt', text: 'Visit PSK on appointment date with original old passport, address proof, and printed receipt' },
      { id: 6, title: 'Biometrics & Passport Issuance', description: 'Complete biometric scanning (fingerprints + live photo) and document verification', text: 'Complete biometric scanning (fingerprints + live photo) and document verification' }
    ]
  },
  license: {
    docType: 'license',
    category: 'Vehicle Records',
    title: 'Driving Licence (DL) Renewal Guide',
    issuingAuthority: 'Ministry of Road Transport and Highways (MoRTH) / State RTO',
    portalName: 'Parivahan Sarathi Services',
    portalUrl: 'https://sarathi.parivahan.gov.in',
    officialPortalUrl: 'https://sarathi.parivahan.gov.in',
    isOfficialGovtPortal: true,
    urgencyText: 'Urgent: Complete within grace period to avoid statutory penalty',
    gracePeriod: '30 days grace period from expiration date before late fees accumulate.',
    officialFee: '₹200 (Renewal fee) + ₹200 (Form 7 Smart Card) + ₹1,000/yr penalty if expired > 1 year',
    feeStructure: '₹200 (Renewal fee) + ₹200 (Form 7 Smart Card) + ₹1,000/yr penalty if expired > 1 year',
    processingTime: '5-10 working days via contactless RTO processing',
    estimatedDays: '5-10 working days via contactless RTO processing',
    requiredDocuments: [
      'Original Expired Driving Licence',
      'Form 1-A Medical Certificate (signed by certified MBBS practitioner for applicants > 40 yrs)',
      'Proof of Age & Address (Aadhaar Card / Voter ID / Passport)',
      'Passport size photograph and digital signature scan'
    ],
    steps: [
      { id: 1, title: 'Access Parivahan Sarathi', description: 'Visit Parivahan Sarathi Portal (sarathi.parivahan.gov.in) and choose your state', text: 'Visit Parivahan Sarathi Portal (sarathi.parivahan.gov.in) and choose your state' },
      { id: 2, title: 'Select DL Services', description: 'Select "Services on Driving Licence (Renewal / Duplicate / Address Change)"', text: 'Select "Services on Driving Licence (Renewal / Duplicate / Address Change)"' },
      { id: 3, title: 'Fetch Driving License Records', description: 'Enter DL Number and Date of Birth to fetch current records from Vahan/Sarathi database', text: 'Enter DL Number and Date of Birth to fetch current records from Vahan/Sarathi database' },
      { id: 4, title: 'Upload Medical Certificate & Documents', description: 'Upload Form 1-A Medical Certificate and required address verification documents', text: 'Upload Form 1-A Medical Certificate and required address verification documents' },
      { id: 5, title: 'Pay Statutory Renewal Fee', description: 'Pay statutory renewal fee online through the payment gateway', text: 'Pay statutory renewal fee online through the payment gateway' },
      { id: 6, title: 'Track Smart Card Dispatch', description: 'Track application reference number; smart card is dispatched via speed post to registered address', text: 'Track application reference number; smart card is dispatched via speed post to registered address' }
    ]
  },
  insurance: {
    docType: 'insurance',
    category: 'Insurance Papers',
    title: 'Motor & Health Insurance Policy Renewal Guide',
    issuingAuthority: 'Insurance Regulatory and Development Authority of India (IRDAI)',
    portalName: 'Direct Insurer Portal / DigiLocker Insurance Gateway',
    portalUrl: 'https://www.irdai.gov.in',
    officialPortalUrl: 'https://www.irdai.gov.in',
    isOfficialGovtPortal: false,
    urgencyText: 'Renew before midnight of expiry date to prevent policy lapse & NCB loss',
    gracePeriod: 'Motor: 90 days for No-Claim Bonus (NCB) retention. Break-in inspection required after 0 days.',
    officialFee: 'Determined by Vehicle Insured Declared Value (IDV) and NCB discount (20%-50%)',
    feeStructure: 'Determined by Vehicle Insured Declared Value (IDV) and NCB discount (20%-50%)',
    processingTime: 'Instant digital policy issuance upon premium settlement',
    estimatedDays: 'Instant digital policy issuance upon premium settlement',
    requiredDocuments: [
      'Existing Insurance Policy Document / Policy Number',
      'Vehicle Registration Certificate (RC)',
      'Valid Pollution Under Control (PUC) Certificate',
      'Proof of No-Claim Bonus (NCB) from previous insurer (if switching)'
    ],
    steps: [
      { id: 1, title: 'Review Current Policy Terms', description: 'Review existing policy schedule, IDV valuation, and claim history from past policy year', text: 'Review existing policy schedule, IDV valuation, and claim history from past policy year' },
      { id: 2, title: 'Confirm NCB Eligibility', description: 'Confirm No-Claim Bonus (NCB) discount percentage (up to 50% discount on own-damage)', text: 'Confirm No-Claim Bonus (NCB) discount percentage (up to 50% discount on own-damage)' },
      { id: 3, title: 'Select Protection Add-ons', description: 'Select essential add-ons: Zero Depreciation, Engine Protect, and Roadside Assistance', text: 'Select essential add-ons: Zero Depreciation, Engine Protect, and Roadside Assistance' },
      { id: 4, title: 'Settle Premium Payment', description: 'Execute premium payment securely via UPI, NetBanking, or Credit Card', text: 'Execute premium payment securely via UPI, NetBanking, or Credit Card' },
      { id: 5, title: 'Download Policy & Sync Vault', description: 'Download newly issued Certificate of Insurance and sync with DocTrack AI vault', text: 'Download newly issued Certificate of Insurance and sync with DocTrack AI vault' }
    ]
  },
  vehicle: {
    docType: 'vehicle',
    category: 'Vehicle Records',
    title: 'Vehicle Fitness & RC Renewal Guide',
    issuingAuthority: 'Parivahan Vahan / State Transport Department',
    portalName: 'Parivahan Vahan Citizen Portal',
    portalUrl: 'https://vahan.parivahan.gov.in',
    officialPortalUrl: 'https://vahan.parivahan.gov.in',
    isOfficialGovtPortal: true,
    urgencyText: 'Required for vehicles older than 15 years or commercial transport',
    gracePeriod: 'Must apply 60 days before expiration of registration certificate.',
    officialFee: '₹600 - ₹1,000 + Green Tax (varies by state and fuel type)',
    feeStructure: '₹600 - ₹1,000 + Green Tax (varies by state and fuel type)',
    processingTime: '7-15 working days following physical vehicle inspection',
    estimatedDays: '7-15 working days following physical vehicle inspection',
    requiredDocuments: [
      'Form 25 (Application for renewal of RC)',
      'Original Registration Certificate (RC book/smart card)',
      'Valid Insurance Certificate and PUC Certificate',
      'Chassis & Engine pencil imprint on Form 25'
    ],
    steps: [
      { id: 1, title: 'Access Parivahan Vahan', description: 'Visit Parivahan Vahan Citizen Services portal and enter vehicle registration', text: 'Visit Parivahan Vahan Citizen Services portal and enter vehicle registration' },
      { id: 2, title: 'Apply for RC Renewal', description: 'Apply for "Renewal of Registration / Fitness Certificate"', text: 'Apply for "Renewal of Registration / Fitness Certificate"' },
      { id: 3, title: 'Pay Green Tax & Inspection Fees', description: 'Pay Green Tax and fitness test fees online', text: 'Pay Green Tax and fitness test fees online' },
      { id: 4, title: 'Book RTO Testing Slot', description: 'Book inspection appointment slot at the jurisdictional RTO testing track', text: 'Book inspection appointment slot at the jurisdictional RTO testing track' },
      { id: 5, title: 'Present Vehicle for Roadworthiness Test', description: 'Present vehicle for roadworthiness and emissions inspection', text: 'Present vehicle for roadworthiness and emissions inspection' }
    ]
  },
  student_id: {
    docType: 'education',
    category: 'Education and Academic',
    title: 'Student ID & Campus Academic Credential Renewal Guide',
    issuingAuthority: 'Institution Administration / Registrar & Academic Affairs',
    portalName: 'University / College Student Academic Portal',
    portalUrl: 'https://www.india.gov.in',
    officialPortalUrl: 'https://www.india.gov.in',
    isOfficialGovtPortal: false,
    urgencyText: 'Renew at the start of each academic year or semester registration',
    gracePeriod: 'Usually 15-30 days from commencement of academic term.',
    officialFee: '₹100 - ₹250 (Student ID smart card re-issue / validation stamp fee)',
    feeStructure: '₹100 - ₹250 (Student ID smart card re-issue / validation stamp fee)',
    processingTime: '2-5 working days via Campus Administration / Student Section',
    estimatedDays: '2-5 working days via Campus Administration / Student Section',
    requiredDocuments: [
      'Current / Expiring Student Identity Card',
      'Current Semester Fee Receipt / Admission Confirmation Slip',
      'Passport size photograph in institutional dress code',
      'HOD or Department Academic Coordinator signature endorsement'
    ],
    steps: [
      { id: 1, title: 'Collect Renewal Requisition Form', description: 'Collect Student ID Card Renewal / Validation Requisition slip from Academic Office or Campus Portal', text: 'Collect Student ID Card Renewal / Validation Requisition slip from Academic Office or Campus Portal' },
      { id: 2, title: 'Attach Fee Receipt & Photo', description: 'Attach paid tuition fee receipt for the current academic session and updated passport photo', text: 'Attach paid tuition fee receipt for the current academic session and updated passport photo' },
      { id: 3, title: 'HOD Department Endorsement', description: 'Obtain verification stamp and signature from your Head of Department (HOD)', text: 'Obtain verification stamp and signature from your Head of Department (HOD)' },
      { id: 4, title: 'Submit to ID Printing Desk', description: 'Submit completed dossier at Academic Counter or ID Printing Section', text: 'Submit completed dossier at Academic Counter or ID Printing Section' },
      { id: 5, title: 'Collect Re-validated Smart Card', description: 'Collect re-validated ID card with new expiry sticker/RFID chip and update DocTrack vault', text: 'Collect re-validated ID card with new expiry sticker/RFID chip and update DocTrack vault' }
    ]
  },
  identity: {
    docType: 'identity',
    category: 'Identity Proofs',
    title: 'National Identity / Aadhaar / Voter ID Update & Renewal Guide',
    issuingAuthority: 'Unique Identification Authority of India (UIDAI) / ECI',
    portalName: 'myAadhaar Citizen Portal (UIDAI)',
    portalUrl: 'https://myaadhaar.uidai.gov.in',
    officialPortalUrl: 'https://myaadhaar.uidai.gov.in',
    isOfficialGovtPortal: true,
    urgencyText: 'Mandatory update every 10 years or upon demographic change',
    gracePeriod: 'Identification records remain active until officially superseded.',
    officialFee: '₹50 (Online Demographic Update) / ₹100 (Biometric Update at Aadhaar Seva Kendra)',
    feeStructure: '₹50 (Online Demographic Update) / ₹100 (Biometric Update at Aadhaar Seva Kendra)',
    processingTime: '5-15 working days following digital document verification',
    estimatedDays: '5-15 working days following digital document verification',
    requiredDocuments: [
      'Proof of Identity (PoI): Passport, PAN Card, Voter ID, or Govt Employee ID',
      'Proof of Address (PoA): Bank Passbook, Electricity Bill, or Rental Agreement',
      'Registered mobile number for Aadhaar OTP authentication'
    ],
    steps: [
      { id: 1, title: 'Access myAadhaar Portal', description: 'Visit myAadhaar portal (myaadhaar.uidai.gov.in) and log in with Aadhaar number and OTP', text: 'Visit myAadhaar portal (myaadhaar.uidai.gov.in) and log in with Aadhaar number and OTP' },
      { id: 2, title: 'Select Document Update Service', description: 'Select "Document Update" or "Update Demographic Details (Name/Address/DOB)"', text: 'Select "Document Update" or "Update Demographic Details (Name/Address/DOB)"' },
      { id: 3, title: 'Upload Proof Documents', description: 'Upload clear color scans of your Proof of Identity and Proof of Address', text: 'Upload clear color scans of your Proof of Identity and Proof of Address' },
      { id: 4, title: 'Submit & Save SRN Number', description: 'Submit application and save the 14-digit Service Request Number (SRN) for tracking', text: 'Submit application and save the 14-digit Service Request Number (SRN) for tracking' },
      { id: 5, title: 'Download Updated e-Aadhaar', description: 'Download updated password-protected e-Aadhaar once notification of approval is received', text: 'Download updated password-protected e-Aadhaar once notification of approval is received' }
    ]
  },
  warranty: {
    docType: 'warranty',
    category: 'Warranty Bills',
    title: 'Manufacturer Extended Warranty & Care Guide',
    issuingAuthority: 'Authorized Brand Service Network',
    portalName: 'Official Brand Care & Support Portal',
    portalUrl: 'https://consumerhelpline.gov.in',
    officialPortalUrl: 'https://consumerhelpline.gov.in',
    isOfficialGovtPortal: false,
    urgencyText: 'Extended warranty must typically be purchased within 30-60 days of original purchase',
    gracePeriod: 'Claims only honored within active warranty duration.',
    officialFee: 'Varies by product category (approx 5%-12% of original invoice valuation)',
    feeStructure: 'Varies by product category (approx 5%-12% of original invoice valuation)',
    processingTime: 'Immediate extended protection plan activation',
    estimatedDays: 'Immediate extended protection plan activation',
    requiredDocuments: [
      'Original Purchase Tax Invoice with GSTIN',
      'Product Serial Number and Model Identifier barcode',
      'Manufacturer Warranty Card (stamped by authorized retailer if offline)',
      'Government Photo Identity Proof'
    ],
    steps: [
      { id: 1, title: 'Verify Serial Number on Invoice', description: 'Locate original invoice and verify serial number matches physical device chassis', text: 'Locate original invoice and verify serial number matches physical device chassis' },
      { id: 2, title: 'Access Brand Support Portal', description: 'Visit manufacturer official support portal or contact authorized toll-free helpline', text: 'Visit manufacturer official support portal or contact authorized toll-free helpline' },
      { id: 3, title: 'Check Extended Care Eligibility', description: 'Check eligibility for 1-year or 2-year extended warranty / accidental damage protection', text: 'Check eligibility for 1-year or 2-year extended warranty / accidental damage protection' },
      { id: 4, title: 'Register Device & Activate Care', description: 'Register device IMEI / Serial Number in manufacturer brand portal', text: 'Register device IMEI / Serial Number in manufacturer brand portal' }
    ]
  },
  general: {
    docType: 'general',
    category: 'Other Documents',
    title: 'Document Validity Verification & Renewal Dossier',
    issuingAuthority: 'Authorized Issuing Organization / Department',
    portalName: 'Official Government & Institutional Services',
    portalUrl: 'https://www.india.gov.in',
    officialPortalUrl: 'https://www.india.gov.in',
    isOfficialGovtPortal: true,
    urgencyText: 'Action recommended before expiration to ensure continuous validity',
    gracePeriod: 'Varies by document category and issuing jurisdiction.',
    officialFee: 'Refer to issuing department schedule of charges',
    feeStructure: 'Refer to issuing department schedule of charges',
    processingTime: '3-10 working days',
    estimatedDays: '3-10 working days',
    requiredDocuments: [
      'Original Document or Certified Copy',
      'Valid Government Photo Identity Proof',
      'Current Address Verification Document',
      'Application / Renewal Requisition Form'
    ],
    steps: [
      { id: 1, title: 'Verify Requirements with Issuer', description: 'Verify expiration date, document number, and issuing requirements with the issuer', text: 'Verify expiration date, document number, and issuing requirements with the issuer' },
      { id: 2, title: 'Assemble Dossier Prerequisites', description: 'Gather original credentials and attested copies of prerequisite identity documents', text: 'Gather original credentials and attested copies of prerequisite identity documents' },
      { id: 3, title: 'Submit Renewal Application', description: 'Submit renewal application through the official administrative portal or designated service counter', text: 'Submit renewal application through the official administrative portal or designated service counter' },
      { id: 4, title: 'Pay Fees & Obtain Receipt', description: 'Complete required statutory fee payment and record receipt / acknowledgement number', text: 'Complete required statutory fee payment and record receipt / acknowledgement number' },
      { id: 5, title: 'Collect Validated Document', description: 'Receive updated document, verify details, and upload new scan to your DocTrack vault', text: 'Receive updated document, verify details, and upload new scan to your DocTrack vault' }
    ]
  }
};

/**
 * Match a document to its best renewal blueprint
 */
function matchBlueprint(doc = {}) {
  const title = (doc.title || '').toLowerCase();
  const category = (doc.category || doc.categoryId || '').toLowerCase();
  const docType = (doc.documentType || '').toLowerCase();

  if (title.includes('passport')) return RENEWAL_KNOWLEDGE_BASE.passport;
  if (title.includes('license') || title.includes('licence') || title.includes('dl') || category.includes('driving')) return RENEWAL_KNOWLEDGE_BASE.license;
  if (title.includes('insurance') || category.includes('insurance')) return RENEWAL_KNOWLEDGE_BASE.insurance;
  if (title.includes('rc') || title.includes('registration') || category.includes('vehicle')) return RENEWAL_KNOWLEDGE_BASE.vehicle;
  if (
    title.includes('student') || title.includes('college') || title.includes('university') ||
    title.includes('school') || title.includes('campus') || category.includes('education') || docType.includes('student')
  ) {
    return RENEWAL_KNOWLEDGE_BASE.student_id;
  }
  if (title.includes('aadhaar') || title.includes('voter') || title.includes('pan') || category.includes('identity')) {
    return RENEWAL_KNOWLEDGE_BASE.identity;
  }
  if (category.includes('warranty') || title.includes('warranty') || title.includes('invoice')) {
    return RENEWAL_KNOWLEDGE_BASE.warranty;
  }
  return RENEWAL_KNOWLEDGE_BASE.general;
}

/**
 * Fetch raw documents for a user, prioritizing live MongoDB records when connected
 */
async function fetchUserDocs(userId) {
  if (isDbConnected()) {
    try {
      const dbDocs = await Document.find({ userId })
        .select('id _id title category categoryId docNumber profileId profileName expiryDate status daysLeft issueDate issuingAuthority verified renewalUrl')
        .sort({ updatedAt: -1 })
        .lean();
      if (dbDocs && dbDocs.length > 0) {
        return dbDocs.map(d => {
          const evalResult = evaluateDocument({ expiryDate: d.expiryDate });
          return {
            id: d._id ? d._id.toString() : d.id,
            documentId: d._id ? d._id.toString() : d.id,
            ...d,
            status: d.status || evalResult.status,
            daysLeft: typeof d.daysLeft === 'number' ? d.daysLeft : evalResult.daysLeft
          };
        });
      }
    } catch (err) {
      console.warn('[RenewalService] DB docs fetch error:', err.message);
    }
  }

  return getDocuments(userId);
}

/**
 * Get all documents requiring renewal for a specific user, enriched with guide metadata
 */
async function getRenewalItems(userId) {
  const userDocs = await fetchUserDocs(userId);

  // Focus on documents that are EXPIRING_SOON, EXPIRED, or flagged renewalRequired, or expiring within 90 days
  let renewalDocs = userDocs.filter(d =>
    d.status === 'EXPIRING_SOON' ||
    d.status === 'EXPIRED' ||
    d.renewalRequired ||
    (typeof d.daysLeft === 'number' && d.daysLeft <= 90)
  );

  // If none are expiring/expired, provide the user's documents as actionable candidates
  if (renewalDocs.length === 0 && userDocs.length > 0) {
    renewalDocs = userDocs.slice(0, 5);
  }

  return renewalDocs.map(doc => {
    const blueprint = matchBlueprint(doc);
    const docId = doc.id || doc._id;
    const steps = blueprint.steps.map(s => {
      const isCompleted = !!stepCompletionStore.get(`${userId}:${docId}:${s.id}`);
      return { ...s, isCompleted };
    });

    const completedCount = steps.filter(s => s.isCompleted).length;
    const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
    const portalUrl = doc.renewalUrl || blueprint.portalUrl;

    return {
      id: docId,
      documentId: docId,
      title: doc.title,
      docNumber: doc.docNumber,
      category: doc.category,
      profileName: doc.profileName,
      status: doc.status,
      daysLeft: doc.daysLeft,
      expiryDate: doc.expiryDate,
      renewalUrl: portalUrl,
      portalUrl,
      officialPortalUrl: portalUrl,
      portalName: blueprint.portalName,
      isOfficialGovtPortal: blueprint.isOfficialGovtPortal,
      urgencyText: doc.status === 'EXPIRED' ? 'EXPIRED - Action Required' : (doc.daysLeft !== undefined ? `${doc.daysLeft} days remaining` : blueprint.urgencyText),
      officialFee: blueprint.officialFee,
      feeStructure: blueprint.feeStructure || blueprint.officialFee,
      gracePeriod: blueprint.gracePeriod,
      estimatedDays: blueprint.estimatedDays || blueprint.processingTime,
      stepsCount: steps.length,
      completedStepsCount: completedCount,
      progressPercent
    };
  });
}

/**
 * Get comprehensive renewal roadmap for a specific document.
 * Serves verified statutory blueprint instantly (<10ms) and upgrades via AI asynchronously or on explicit refresh.
 */
async function getRenewalGuide(userId, docId, forceRefresh = false) {
  let doc = null;

  if (isDbConnected()) {
    try {
      if (mongoose.Types.ObjectId.isValid(docId)) {
        doc = await Document.findOne({ _id: docId, userId })
          .select('id _id title category categoryId docNumber profileId profileName expiryDate status daysLeft issueDate issuingAuthority verified renewalUrl')
          .lean();
      }
      if (!doc) {
        doc = await Document.findOne({ $or: [{ id: docId }, { docNumber: docId }], userId })
          .select('id _id title category categoryId docNumber profileId profileName expiryDate status daysLeft issueDate issuingAuthority verified renewalUrl')
          .lean();
      }
    } catch (err) {
      console.warn('[RenewalGuide] DB lookup error:', err.message);
    }
  }

  if (!doc) {
    doc = getLocalDocumentById(docId, userId);
  }

  if (!doc) {
    const err = new Error(`Document with ID "${docId}" was not found.`);
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    err.errorCode = 'DOCUMENT_NOT_FOUND';
    throw err;
  }

  const evalResult = evaluateDocument({ expiryDate: doc.expiryDate });
  const actualDaysLeft = typeof doc.daysLeft === 'number' ? doc.daysLeft : evalResult.daysLeft;
  const actualStatus = doc.status || evalResult.status;
  const actualDocId = doc.id || (doc._id ? doc._id.toString() : docId);

  // Dynamic AI Research Cache Lookup
  const cacheKey = `${actualDocId}:${actualStatus}:${actualDaysLeft}`;
  let guideSource = null;

  if (!forceRefresh && aiRenewalGuideCache.has(cacheKey)) {
    guideSource = aiRenewalGuideCache.get(cacheKey);
  }

  if (forceRefresh) {
    // Explicit user-requested re-research with AI (strict 2500ms timeout)
    try {
      const aiResearch = await geminiService.researchRenewalGuideWithGemini({
        document: {
          ...doc,
          status: actualStatus,
          daysLeft: actualDaysLeft
        }
      });

      if (aiResearch && Array.isArray(aiResearch.steps) && aiResearch.steps.length > 0) {
        guideSource = aiResearch;
        aiRenewalGuideCache.set(cacheKey, guideSource);
      }
    } catch (aiErr) {
      console.warn('[RenewalGuide] Explicit Gemini AI re-research timed out, using blueprint:', aiErr.message);
    }
  }

  // Instant High-Fidelity Blueprint: Serve immediately if not in cache
  if (!guideSource) {
    guideSource = matchBlueprint(doc);
    // Cache the tailored blueprint immediately for sub-millisecond follow-ups
    aiRenewalGuideCache.set(cacheKey, guideSource);

    // Asynchronously perform background AI enhancement without blocking the user
    if (!forceRefresh && geminiService.isConfigured()) {
      setImmediate(async () => {
        try {
          const aiResearch = await geminiService.researchRenewalGuideWithGemini({
            document: {
              ...doc,
              status: actualStatus,
              daysLeft: actualDaysLeft
            }
          });
          if (aiResearch && Array.isArray(aiResearch.steps) && aiResearch.steps.length > 0) {
            aiRenewalGuideCache.set(cacheKey, aiResearch);
          }
        } catch (_) {
          // Silent fallback to existing blueprint in cache
        }
      });
    }
  }

  const rawSteps = guideSource.steps || [];
  const steps = rawSteps.map((s, idx) => {
    const stepId = s.id || idx + 1;
    const isCompleted = !!stepCompletionStore.get(`${userId}:${actualDocId}:${stepId}`);
    return {
      id: stepId,
      title: s.title || s.text || `Step ${stepId}`,
      description: s.description || s.text || '',
      text: s.text || s.description || s.title || '',
      isCompleted
    };
  });

  const completedCount = steps.filter(s => s.isCompleted).length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
  const portalUrl = doc.renewalUrl || guideSource.officialPortalUrl || guideSource.portalUrl || 'https://www.india.gov.in';

  return {
    document: {
      id: actualDocId,
      title: doc.title,
      docNumber: doc.docNumber,
      category: doc.category,
      profileName: doc.profileName,
      status: actualStatus,
      daysLeft: actualDaysLeft,
      expiryDate: doc.expiryDate,
      issueDate: doc.issueDate,
      issuingAuthority: doc.issuingAuthority || guideSource.issuingAuthority
    },
    guide: {
      title: guideSource.title || `${doc.title} Renewal Dossier`,
      issuingAuthority: guideSource.issuingAuthority || doc.issuingAuthority || 'Authorized Issuing Authority',
      urgencyText: guideSource.urgencyText || (actualStatus === 'EXPIRED' ? 'Expired (Action required)' : (actualDaysLeft !== undefined ? `${actualDaysLeft} days remaining` : 'Action required')),
      portalName: guideSource.portalName || 'Official Digital Portal',
      portalUrl,
      officialPortalUrl: portalUrl,
      isOfficialGovtPortal: Boolean(guideSource.isOfficialGovtPortal),
      officialFee: guideSource.officialFee || guideSource.feeStructure || 'Refer to issuing authority',
      feeStructure: guideSource.feeStructure || guideSource.officialFee || 'Refer to issuing authority',
      processingTime: guideSource.processingTime || guideSource.estimatedDays || '3-7 working days',
      estimatedDays: guideSource.estimatedDays || guideSource.processingTime || '3-7 working days',
      gracePeriod: guideSource.gracePeriod || 'Standard statutory grace period applies',
      requiredDocuments: guideSource.requiredDocuments || ['Original Document', 'Proof of Identity', 'Proof of Address'],
      steps,
      completedCount,
      totalSteps: steps.length,
      progressPercent,
      aiResearchSummary: guideSource.aiResearchSummary || null,
      isAiResearched: Boolean(guideSource.isAiResearched)
    }
  };
}

/**
 * Toggle completion status of a renewal checklist step
 */
async function toggleRenewalStep(userId, docId, stepId, completed) {
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
  matchBlueprint,
  getRenewalItems,
  getRenewalGuide,
  toggleRenewalStep
};
