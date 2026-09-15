/**
 * Centralized Document Store & Expiry Calculation Helper
 * Supports MongoDB sync when online, and in-memory persistence when in standby mode.
 */

const { evaluateDocument } = require('./expiryEngine');

const calculateExpiryStatus = (expiryDate) => {
  const { status, daysLeft } = evaluateDocument({ expiryDate });
  return { status, daysLeft };
};

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
    fileUrl: '/uploads/zaid_passport_scan.pdf',
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
    fileUrl: '/uploads/aadhaar_card_digital.pdf',
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
    fileUrl: '/uploads/rahul_dl_card.png',
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
    fileUrl: '/uploads/honda_city_insurance_2026.pdf',
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
    fileUrl: '/uploads/puc_certificate_valid.jpg',
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
    fileUrl: '/uploads/sony_bravia_invoice_warranty.pdf',
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
    fileUrl: '/uploads/vtu_engineering_degree.pdf',
    fileSize: '4.1 MB',
    uploadedAt: '2024-08-01T12:00:00.000Z',
    verified: true,
    renewalRequired: false,
    summary: 'Degree Certificate with First Class with Distinction.'
  }
];

let localDocuments = [...initialDocuments];

const getDocuments = () => localDocuments;

const getDocumentById = (id) => localDocuments.find(d => d.id === id);

const addDocument = (doc) => {
  localDocuments.unshift(doc);
  return doc;
};

const updateDocument = (id, updates) => {
  const index = localDocuments.findIndex(d => d.id === id);
  if (index !== -1) {
    localDocuments[index] = { ...localDocuments[index], ...updates };
    return localDocuments[index];
  }
  return null;
};

const deleteDocument = (id) => {
  const prevLen = localDocuments.length;
  localDocuments = localDocuments.filter(d => d.id !== id);
  return localDocuments.length < prevLen;
};

module.exports = {
  getDocuments,
  getDocumentById,
  addDocument,
  updateDocument,
  deleteDocument,
  calculateExpiryStatus
};
