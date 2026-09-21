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
    summary: 'Ordinary Indian Passport, eligible for Tatkaal or Normal Re-issue.',
    ocrProcessed: true,
    ocrConfidence: 0.98,
    ocrText: [
      'REPUBLIC OF INDIA / PASSPORT',
      'Type: P  Country Code: IND  Passport No: Z9847291',
      'Surname: SHARMA  Given Name: ZAID',
      'Nationality: INDIAN  Sex: M  Date of Birth: 12/04/1995',
      'Place of Issue: BENGALURU, INDIA',
      'Date of Issue: 12/10/2016  Date of Expiry: 12/10/2026',
      'Issuing Authority: Regional Passport Office, Bengaluru',
      'P<INDSHARMA<<ZAID<<<<<<<<<<<<<<<<<<<<<<<<<<<',
      'Z9847291<4IND9504128M2610125<<<<<<<<<<<<<<<04'
    ].join('\n')
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
    summary: 'Biometrically verified digital identity with QR code.',
    ocrProcessed: true,
    ocrConfidence: 0.97,
    ocrText: [
      'GOVERNMENT OF INDIA / UNIQUE IDENTIFICATION AUTHORITY OF INDIA',
      'Enrollment No: 1029/38192/01928',
      'Aadhaar No: XXXX-XXXX-4819',
      'Name: ZAID SHARMA',
      'DOB: 12/04/1995  Gender: Male',
      'Date of Issue: 15/03/2018',
      'Validity: Perpetual / Lifetime',
      'Issuing Authority: UIDAI (Govt of India)'
    ].join('\n')
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
    summary: 'Expired driving license. Renew within grace period to avoid penalty.',
    ocrProcessed: true,
    ocrConfidence: 0.96,
    ocrText: [
      'UNION OF INDIA - DRIVING LICENCE',
      'KARNATAKA MOTOR VEHICLES DEPARTMENT',
      'Licence No: KA03 2019000124',
      'Name: RAHUL SHARMA',
      'Date of Issue: 01/08/2019',
      'Date of Expiry: 03/09/2026',
      'Issuing Authority: Regional Transport Office (RTO Indiranagar)',
      'Vehicle Class: LMV / MCWG',
      'Status: EXPIRED / ACTION REQUIRED'
    ].join('\n')
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
    summary: 'Zero Depreciation + 24x7 Roadside Assistance Policy.',
    ocrProcessed: true,
    ocrConfidence: 0.95,
    ocrText: [
      'BAJAJ ALLIANZ GENERAL INSURANCE CO. LTD.',
      'MOTOR VEHICLE INSURANCE CERTIFICATE',
      'Policy No: BA-POL-9928172',
      'Insured Vehicle: Honda City (KA01AB1234)',
      'Period of Insurance: From 10/01/2026 To 09/01/2027',
      'Issuing Authority: Bajaj Allianz General Insurance',
      'Coverage: Comprehensive Zero Depreciation Policy'
    ].join('\n')
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
    summary: 'Emission test valid for 6 months. Physical emission test required.',
    ocrProcessed: true,
    ocrConfidence: 0.94,
    ocrText: [
      'TRANSPORT DEPARTMENT GOVERNMENT OF KARNATAKA',
      'POLLUTION UNDER CONTROL (PUC) CERTIFICATE',
      'Certificate No: KA01-PUC-8812',
      'Vehicle Registration No: KA01AB1234',
      'Date of Issue: 20/03/2026',
      'Date of Expiry: 20/09/2026',
      'Issuing Authority: Department of Transport, Karnataka'
    ].join('\n')
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
    summary: '2-Year Comprehensive Panel Warranty. Serial No: SN-882910.',
    ocrProcessed: true,
    ocrConfidence: 0.96,
    ocrText: [
      'SONY INDIA AUTHORIZED RETAIL INVOICE',
      'Invoice No: SNY-INV-49102',
      'Product: Sony Bravia 55" 4K OLED Television',
      'Serial No: SN-882910',
      'Date of Issue: 20/11/2025',
      'Warranty Validity: 2 Years (Valid till 19/11/2027)',
      'Issuing Authority: Reliance Digital & Sony India'
    ].join('\n')
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
    summary: 'Degree Certificate with First Class with Distinction.',
    ocrProcessed: true,
    ocrConfidence: 0.95,
    ocrText: [
      'VISVESVARAYA TECHNOLOGICAL UNIVERSITY, BELAGAVI',
      'DEGREE OF BACHELOR OF TECHNOLOGY',
      'This is to certify that ZAID SHARMA has been admitted to the degree of',
      'BACHELOR OF TECHNOLOGY IN COMPUTER SCIENCE & ENGINEERING',
      'University Seat No: VTU/2024/CS/0812',
      'Date of Convocation: 15/07/2024',
      'Class: First Class with Distinction'
    ].join('\n')
  }
];

let localDocuments = [...initialDocuments];

const getDocuments = (userId) => {
  if (!userId) return localDocuments;
  return localDocuments.filter(d => {
    if (userId === 'demo-user-zaid-001') {
      return !d.userId || d.userId === 'demo-user-zaid-001';
    }
    return d.userId === userId;
  });
};

const getDocumentById = (id, userId) => {
  const doc = localDocuments.find(d => d.id === id);
  if (!doc) return null;
  if (userId && doc.userId && doc.userId !== userId) return null;
  return doc;
};

const addDocument = (doc) => {
  if (!doc.ocrText) doc.ocrText = '';
  if (doc.ocrConfidence === undefined) doc.ocrConfidence = 0.95;
  if (doc.ocrProcessed === undefined) doc.ocrProcessed = true;
  if (!doc.sensitivity) doc.sensitivity = doc.classification?.sensitivity || 'STANDARD';
  if (!doc.tags) doc.tags = doc.classification?.suggestedTags || [];

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

const resetDocuments = () => {
  localDocuments = [...initialDocuments];
  return localDocuments;
};

module.exports = {
  getDocuments,
  getAllDocuments: getDocuments,
  getDocumentById,
  addDocument,
  updateDocument,
  deleteDocument,
  resetDocuments,
  calculateExpiryStatus
};
