/**
 * DocTrack AI — Local Demo Data Fixtures
 * Realistic, sanitized data demonstrating active, expiring-soon, and expired lifecycles.
 * daysLeft and status are computed dynamically from expiryDate so values stay current.
 */

export const DEMO_PROFILES = [
  { id: 'all', name: 'All Profiles', type: 'system', icon: 'Layers', count: 7 },
  { id: 'self', name: 'Zaid (Self)', type: 'primary', icon: 'User', count: 4 },
  { id: 'son', name: 'Rahul (Son)', type: 'family', icon: 'Users', count: 1 },
  { id: 'car', name: 'Honda City (KA01AB1234)', type: 'vehicle', icon: 'Car', count: 2 },
  { id: 'emp', name: 'Pooja Sharma (Accountant)', type: 'employee', icon: 'Briefcase', count: 0 }
];

export const DEMO_CATEGORIES = [
  { id: 'identity', name: 'Identity Proofs', icon: 'ShieldCheck', docCount: 2, color: '#10B981', sensitivity: 'HIGH' },
  { id: 'vehicle', name: 'Vehicle Records', icon: 'Car', docCount: 2, color: '#3B82F6', sensitivity: 'MEDIUM' },
  { id: 'insurance', name: 'Insurance Papers', icon: 'HeartPulse', docCount: 1, color: '#8B5CF6', sensitivity: 'MEDIUM' },
  { id: 'education', name: 'Educational Certificates', icon: 'GraduationCap', docCount: 1, color: '#F59E0B', sensitivity: 'MEDIUM' },
  { id: 'medical', name: 'Medical Records', icon: 'Stethoscope', docCount: 0, color: '#EF4444', sensitivity: 'HIGH' },
  { id: 'warranty', name: 'Warranty Bills', icon: 'Receipt', docCount: 1, color: '#EC4899', sensitivity: 'LOW' },
  { id: 'property', name: 'Property Documents', icon: 'Home', docCount: 0, color: '#14B8A6', sensitivity: 'HIGH' },
  { id: 'financial', name: 'Financial Documents', icon: 'CreditCard', docCount: 0, color: '#6366F1', sensitivity: 'HIGH' },
  { id: 'other', name: 'Other Documents', icon: 'FileText', docCount: 0, color: '#64748B', sensitivity: 'LOW' }
];

/**
 * Compute live daysLeft from an expiryDate string.
 * Returns 9999 for perpetual/lifetime documents.
 */
const computeDaysLeft = (expiryDate) => {
  if (!expiryDate) return 9999;
  const lower = expiryDate.toLowerCase();
  if (lower.includes('perpetual') || lower.includes('lifetime') || lower.includes('no expiry')) return 9999;
  const diff = Math.round((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};

const computeStatus = (daysLeft) => {
  if (daysLeft === 9999) return 'ACTIVE';
  if (daysLeft < 0) return 'EXPIRED';
  if (daysLeft <= 30) return 'EXPIRING_SOON';
  return 'ACTIVE';
};

const makeDoc = (base) => {
  const daysLeft = computeDaysLeft(base.expiryDate);
  return {
    ...base,
    daysLeft,
    status: computeStatus(daysLeft)
  };
};

export const DEMO_DOCUMENTS = [
  makeDoc({
    id: 'doc-passport-01',
    title: 'Indian Passport (36 Pages)',
    category: 'Identity Proofs',
    categoryId: 'identity',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    docNumber: 'Z9847291',
    issueDate: '2016-10-12',
    expiryDate: '2026-10-12',
    issuingAuthority: 'Regional Passport Office, Bengaluru',
    placeOfIssue: 'Bengaluru, India',
    fileName: 'zaid_passport_scan.pdf',
    fileSize: '2.4 MB',
    uploadedAt: '2026-08-01T10:30:00Z',
    verified: true,
    renewalRequired: true,
    renewalUrl: 'https://portal2.passportindia.gov.in (Official Govt Portal)',
    summary: 'Ordinary Indian Passport, eligible for Tatkaal or Normal Re-issue.'
  }),
  makeDoc({
    id: 'doc-aadhaar-02',
    title: 'e-Aadhaar Identity Card',
    category: 'Identity Proofs',
    categoryId: 'identity',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    docNumber: 'XXXX-XXXX-4819',
    issueDate: '2018-03-15',
    expiryDate: 'Perpetual (No Expiry)',
    issuingAuthority: 'UIDAI (Govt of India)',
    placeOfIssue: 'New Delhi',
    fileName: 'aadhaar_card_digital.pdf',
    fileSize: '1.1 MB',
    uploadedAt: '2026-08-10T14:15:00Z',
    verified: true,
    renewalRequired: false,
    summary: 'Biometrically verified digital identity with QR code.'
  }),
  makeDoc({
    id: 'doc-dl-03',
    title: 'Driving License (Non-Transport)',
    category: 'Vehicle Records',
    categoryId: 'vehicle',
    profileId: 'son',
    profileName: 'Rahul (Son)',
    docNumber: 'KA03 2019000124',
    issueDate: '2019-08-01',
    expiryDate: '2026-09-03',
    issuingAuthority: 'Regional Transport Office (RTO Indiranagar)',
    placeOfIssue: 'Bengaluru East',
    fileName: 'rahul_dl_card.png',
    fileSize: '840 KB',
    uploadedAt: '2026-07-15T09:20:00Z',
    verified: true,
    renewalRequired: true,
    renewalUrl: 'https://parivahan.gov.in (Sarathi Services)',
    summary: 'Expired driving license. Renew within grace period to avoid penalty.'
  }),
  makeDoc({
    id: 'doc-insurance-04',
    title: 'Comprehensive Car Insurance',
    category: 'Insurance Papers',
    categoryId: 'insurance',
    profileId: 'car',
    profileName: 'Honda City (KA01AB1234)',
    docNumber: 'BA-POL-9928172',
    issueDate: '2026-01-10',
    expiryDate: '2027-01-09',
    issuingAuthority: 'Bajaj Allianz General Insurance',
    placeOfIssue: 'Mumbai Head Office',
    fileName: 'honda_city_insurance_2026.pdf',
    fileSize: '3.2 MB',
    uploadedAt: '2026-01-12T11:00:00Z',
    verified: true,
    renewalRequired: false,
    summary: 'Zero Depreciation + 24x7 Roadside Assistance Policy.'
  }),
  makeDoc({
    id: 'doc-puc-05',
    title: 'PUC Emission Test Certificate',
    category: 'Vehicle Records',
    categoryId: 'vehicle',
    profileId: 'car',
    profileName: 'Honda City (KA01AB1234)',
    docNumber: 'KA01-PUC-8812',
    issueDate: '2026-03-20',
    expiryDate: '2026-09-20',
    issuingAuthority: 'Department of Transport, Karnataka',
    placeOfIssue: 'Koramangala Testing Station',
    fileName: 'puc_certificate_valid.jpg',
    fileSize: '620 KB',
    uploadedAt: '2026-03-21T08:45:00Z',
    verified: true,
    renewalRequired: true,
    summary: 'Emission test valid for 6 months. Physical emission test required.'
  }),
  makeDoc({
    id: 'doc-warranty-06',
    title: 'Sony Bravia 55" OLED TV Warranty',
    category: 'Warranty Bills',
    categoryId: 'warranty',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    docNumber: 'SNY-INV-49102',
    issueDate: '2025-11-20',
    expiryDate: '2027-11-19',
    issuingAuthority: 'Reliance Digital & Sony India',
    placeOfIssue: 'Bengaluru Store #104',
    fileName: 'sony_bravia_invoice_warranty.pdf',
    fileSize: '1.8 MB',
    uploadedAt: '2025-11-22T16:10:00Z',
    verified: true,
    renewalRequired: false,
    summary: '2-Year Comprehensive Panel Warranty. Serial No: SN-882910.'
  }),
  makeDoc({
    id: 'doc-degree-07',
    title: 'Bachelor of Technology in CS Certificate',
    category: 'Educational Certificates',
    categoryId: 'education',
    profileId: 'self',
    profileName: 'Zaid (Self)',
    docNumber: 'VTU/2024/CS/0812',
    issueDate: '2024-07-15',
    expiryDate: 'Lifetime (Perpetual)',
    issuingAuthority: 'Visvesvaraya Technological University',
    placeOfIssue: 'Belagavi, Karnataka',
    fileName: 'vtu_engineering_degree.pdf',
    fileSize: '4.1 MB',
    uploadedAt: '2024-08-01T12:00:00Z',
    verified: true,
    renewalRequired: false,
    summary: 'Degree Certificate with First Class with Distinction.'
  })
];

export const RENEWAL_GUIDES = {
  'doc-passport-01': {
    title: 'Indian Passport Renewal Guide',
    urgency: 'Action recommended within 30 days',
    steps: [
      { id: 1, text: 'Register or log in to Passport Seva Online Portal (passportindia.gov.in)' },
      { id: 2, text: 'Select "Apply for Fresh Passport/Re-issue of Passport"' },
      { id: 3, text: 'Fill online form with current passport number (Z9847291)' },
      { id: 4, text: 'Schedule appointment at nearest PSK (Passport Seva Kendra)' },
      { id: 5, text: 'Carry original old passport, Aadhaar card, and appointment receipt' }
    ],
    requiredDocuments: [
      'Original Old Passport (Z9847291) + self-attested copies of first 2 & last 2 pages',
      'Proof of Current Address (Aadhaar / Utility Bill)',
      'Annexure E (Standard self-declaration for reissue)'
    ],
    officialFee: 'INR 1,500 (Normal 36 pages) / INR 3,500 (Tatkaal)'
  },
  'doc-dl-03': {
    title: 'Driving License Renewal Guide',
    urgency: 'Immediate renewal required (Grace period active)',
    steps: [
      { id: 1, text: 'Visit Parivahan Sarathi Portal (sarathi.parivahan.gov.in)' },
      { id: 2, text: 'Select State -> Services on Driving License (Renewal)' },
      { id: 3, text: 'Enter DL Number (KA03 2019000124) and Date of Birth' },
      { id: 4, text: 'Upload Form 1A (Medical Certificate) and current DL copy' },
      { id: 5, text: 'Pay statutory fee online and track application status' }
    ],
    requiredDocuments: [
      'Original Driving License (KA03 2019000124)',
      'Medical Certificate Form 1-A signed by registered medical practitioner',
      'Age & Address Proof (Aadhaar / Passport)'
    ],
    officialFee: 'INR 200 (Renewal) + INR 200 (Smart card fee) + Late fee (if applicable)'
  }
};
