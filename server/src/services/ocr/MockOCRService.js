const OCRService = require('./OCRService');

/**
 * MockOCRService
 * Provides realistic document templates and instant offline extractions for testing.
 */
class MockOCRService extends OCRService {
  constructor() {
    super();
    this.templates = [
      {
        id: 'tpl-passport',
        label: 'Indian Passport (36 Pages)',
        category: 'Identity Proofs',
        categoryId: 'identity',
        rawText: [
          'REPUBLIC OF INDIA / PASSPORT',
          'Type: P  Country Code: IND  Passport No: Z9847291',
          'Surname: SHARMA  Given Name: ZAID',
          'Nationality: INDIAN  Sex: M  Date of Birth: 12/04/1995',
          'Place of Issue: BENGALURU, INDIA',
          'Date of Issue: 12/10/2016  Date of Expiry: 12/10/2026',
          'Issuing Authority: Regional Passport Office, Bengaluru',
          'P<INDSHARMA<<ZAID<<<<<<<<<<<<<<<<<<<<<<<<<<<',
          'Z9847291<4IND9504128M2610125<<<<<<<<<<<<<<<04'
        ].join('\n'),
        confidence: 0.98,
        fields: {
          title: 'Indian Passport (36 Pages)',
          category: 'Identity Proofs',
          categoryId: 'identity',
          docNumber: 'Z9847291',
          holderName: 'Zaid Sharma',
          dateOfBirth: '1995-04-12',
          country: 'India',
          issueDate: '2016-10-12',
          expiryDate: '2026-10-12',
          issuingAuthority: 'Regional Passport Office, Bengaluru',
          placeOfIssue: 'Bengaluru, India',
          summary: 'Ordinary Indian Passport, eligible for Tatkaal or Normal Re-issue.'
        }
      },
      {
        id: 'tpl-dl',
        label: 'Driving License (Smart Card)',
        category: 'Vehicle Records',
        categoryId: 'vehicle',
        rawText: [
          'UNION OF INDIA - DRIVING LICENCE',
          'KARNATAKA MOTOR VEHICLES DEPARTMENT',
          'Licence No: KA03 2019000124',
          'Name: RAHUL SHARMA',
          'Date of Issue: 01/08/2019',
          'Date of Expiry: 03/09/2026',
          'Issuing Authority: Regional Transport Office (RTO Indiranagar)',
          'Vehicle Class: LMV / MCWG',
          'Status: EXPIRED / ACTION REQUIRED'
        ].join('\n'),
        confidence: 0.96,
        fields: {
          title: 'Driving License (Non-Transport)',
          category: 'Vehicle Records',
          categoryId: 'vehicle',
          docNumber: 'KA03 2019000124',
          holderName: 'Rahul Sharma',
          dateOfBirth: '1998-06-15',
          country: 'India',
          issueDate: '2019-08-01',
          expiryDate: '2026-09-03',
          issuingAuthority: 'Regional Transport Office (RTO Indiranagar)',
          placeOfIssue: 'Bengaluru East',
          summary: 'Expired driving license. Renew within grace period to avoid penalty.'
        }
      },
      {
        id: 'tpl-aadhaar',
        label: 'e-Aadhaar Digital Card',
        category: 'Identity Proofs',
        categoryId: 'identity',
        rawText: [
          'GOVERNMENT OF INDIA / UNIQUE IDENTIFICATION AUTHORITY OF INDIA',
          'Enrollment No: 1029/38192/01928',
          'Aadhaar No: XXXX-XXXX-4819',
          'Name: ZAID SHARMA',
          'DOB: 12/04/1995  Gender: Male',
          'Date of Issue: 15/03/2018',
          'Validity: Perpetual / Lifetime',
          'Issuing Authority: UIDAI (Govt of India)'
        ].join('\n'),
        confidence: 0.97,
        fields: {
          title: 'e-Aadhaar Identity Card',
          category: 'Identity Proofs',
          categoryId: 'identity',
          docNumber: 'XXXX-XXXX-4819',
          holderName: 'Zaid Sharma',
          dateOfBirth: '1995-04-12',
          country: 'India',
          issueDate: '2018-03-15',
          expiryDate: 'Perpetual',
          issuingAuthority: 'UIDAI (Govt of India)',
          placeOfIssue: 'New Delhi',
          summary: 'Biometrically verified digital identity with QR code.'
        }
      },
      {
        id: 'tpl-insurance',
        label: 'Comprehensive Car Insurance',
        category: 'Insurance Papers',
        categoryId: 'insurance',
        rawText: [
          'BAJAJ ALLIANZ GENERAL INSURANCE CO. LTD.',
          'MOTOR VEHICLE INSURANCE CERTIFICATE',
          'Policy No: BA-POL-9928172',
          'Insured Vehicle: Honda City (KA01AB1234)',
          'Period of Insurance: From 10/01/2026 To 09/01/2027',
          'Issuing Authority: Bajaj Allianz General Insurance',
          'Coverage: Comprehensive Zero Depreciation Policy'
        ].join('\n'),
        confidence: 0.95,
        fields: {
          title: 'Comprehensive Car Insurance',
          category: 'Insurance Papers',
          categoryId: 'insurance',
          docNumber: 'BA-POL-9928172',
          issueDate: '2026-01-10',
          expiryDate: '2027-01-09',
          issuingAuthority: 'Bajaj Allianz General Insurance',
          placeOfIssue: 'Mumbai Head Office',
          summary: 'Zero Depreciation + 24x7 Roadside Assistance Policy.'
        }
      },
      {
        id: 'tpl-warranty',
        label: 'Sony Bravia 55" OLED Invoice',
        category: 'Warranty Bills',
        categoryId: 'warranty',
        rawText: [
          'SONY INDIA AUTHORIZED RETAIL INVOICE',
          'Invoice No: INV-882910',
          'Product: Sony Bravia 55" 4K OLED Television',
          'Serial No: SN-882910',
          'Date of Issue: 05/10/2025',
          'Warranty Validity: 2 Years (Valid till 05/10/2027)',
          'Issuing Authority: Sony India Customer Service'
        ].join('\n'),
        confidence: 0.94,
        fields: {
          title: 'Sony Bravia 55" OLED TV Invoice',
          category: 'Warranty Bills',
          categoryId: 'warranty',
          docNumber: 'INV-882910',
          issueDate: '2025-10-05',
          expiryDate: '2027-10-05',
          issuingAuthority: 'Sony India Customer Service',
          placeOfIssue: 'Bengaluru Flagship Store',
          summary: '2-Year Comprehensive Panel Warranty. Serial No: SN-882910.'
        }
      }
    ];
  }

  getTemplates() {
    return this.templates;
  }

  async extractText(filePathOrBuffer, options = {}) {
    const templateId = options.templateId;
    if (templateId) {
      const found = this.templates.find(t => t.id === templateId);
      if (found) {
        return {
          success: true,
          provider: 'MockOCRService (Pre-Calibrated Template)',
          confidence: found.confidence,
          rawText: found.rawText,
          extractedFields: found.fields,
          pipelineStages: [
            { stage: 'DOCUMENT_INGESTED', status: 'COMPLETE' },
            { stage: 'TEMPLATE_MATCHING', status: 'COMPLETE' },
            { stage: 'OCR_EXTRACTION', status: 'COMPLETE', confidence: found.confidence },
            { stage: 'FIELD_EXTRACTION', status: 'COMPLETE' }
          ]
        };
      }
    }

    // Default to passport template
    const def = this.templates[0];
    return {
      success: true,
      provider: 'MockOCRService',
      confidence: def.confidence,
      rawText: def.rawText,
      extractedFields: def.fields,
      pipelineStages: [
        { stage: 'DOCUMENT_INGESTED', status: 'COMPLETE' },
        { stage: 'OCR_EXTRACTION', status: 'COMPLETE', confidence: def.confidence },
        { stage: 'FIELD_EXTRACTION', status: 'COMPLETE' }
      ]
    };
  }
}

module.exports = MockOCRService;
