const ClassificationService = require('./ClassificationService');

/**
 * System standard 9 document categories
 */
const CATEGORY_TAXONOMY = {
  identity: {
    name: 'Identity Proofs',
    categoryId: 'identity',
    defaultSensitivity: 'HIGH',
    sensitivityReason: 'Contains government-issued PII & biometric credentials',
    defaultProfile: 'self',
    icon: 'ShieldCheck',
    color: '#10B981',
    subCategories: [
      {
        name: 'Passport',
        keywords: ['passport', 'republic of india', 'ministry of external affairs', 'country code ind', 'p<ind'],
        patterns: [/[A-Z][0-9]{7}/i, /passport\s*(?:no|number)?/i],
        suggestedTags: ['passport', 'government-id', 'travel', 'citizenship'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      },
      {
        name: 'Aadhaar Card',
        keywords: ['aadhaar', 'uidai', 'unique identification', 'mera aadhaar', 'enrollment no'],
        patterns: [/\d{4}\s*\d{4}\s*\d{4}/, /aadhaar/i],
        suggestedTags: ['aadhaar', 'uidai', 'national-id', 'biometric'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      },
      {
        name: 'PAN Card',
        keywords: ['permanent account number', 'income tax department', 'pan card', 'govt. of india'],
        patterns: [/[A-Z]{5}[0-9]{4}[A-Z]/i],
        suggestedTags: ['pan-card', 'tax-id', 'income-tax', 'identity'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      },
      {
        name: 'Voter ID Card',
        keywords: ['election commission', 'voter identity card', 'elector photo', 'epic'],
        patterns: [/[A-Z]{3}[0-9]{7}/i, /voter/i],
        suggestedTags: ['voter-id', 'election-commission', 'citizenship'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      }
    ]
  },
  vehicle: {
    name: 'Vehicle Records',
    categoryId: 'vehicle',
    defaultSensitivity: 'MEDIUM',
    sensitivityReason: 'Contains vehicular registration & road transport authority records',
    defaultProfile: 'vehicle',
    icon: 'Car',
    color: '#3B82F6',
    subCategories: [
      {
        name: 'Driving License',
        keywords: ['driving licence', 'driving license', 'licensing authority', 'motor vehicles act', 'union of india driving'],
        patterns: [/[A-Z]{2}[-\s]?[0-9]{2}[-\s]?[0-9]{4,11}/i, /dl\s*(?:no|number)?/i],
        suggestedTags: ['driving-license', 'transport', 'id-proof', 'driver-permit'],
        suggestedProfile: 'self',
        sensitivity: 'MEDIUM'
      },
      {
        name: 'Registration Certificate (RC)',
        keywords: ['registration certificate', 'form 23', 'chassis number', 'engine number', 'motor vehicle department', 'rto', 'mvd'],
        patterns: [/[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{1,4}/i, /chassis/i],
        suggestedTags: ['vehicle-rc', 'registration', 'rto', 'automobile'],
        suggestedProfile: 'vehicle',
        sensitivity: 'MEDIUM'
      },
      {
        name: 'Pollution Under Control (PUC)',
        keywords: ['pollution under control', 'puc certificate', 'emission test', 'exhaust emission', 'bharat stage'],
        patterns: [/puc/i, /emission/i],
        suggestedTags: ['puc', 'emissions', 'vehicle-compliance', 'green-certificate'],
        suggestedProfile: 'vehicle',
        sensitivity: 'LOW'
      },
      {
        name: 'Vehicle Fitness Certificate',
        keywords: ['fitness certificate', 'form 38', 'certificate of fitness', 'inspected vehicle'],
        patterns: [/fitness/i],
        suggestedTags: ['vehicle-fitness', 'commercial-vehicle', 'transport'],
        suggestedProfile: 'vehicle',
        sensitivity: 'MEDIUM'
      }
    ]
  },
  insurance: {
    name: 'Insurance Papers',
    categoryId: 'insurance',
    defaultSensitivity: 'MEDIUM',
    sensitivityReason: 'Contains personal policy numbers, premium terms & financial protection details',
    defaultProfile: 'self',
    icon: 'HeartPulse',
    color: '#8B5CF6',
    subCategories: [
      {
        name: 'Comprehensive Motor Insurance',
        keywords: ['motor insurance', 'vehicle package policy', 'own damage', 'third party liability', 'idv', 'hdfc ergo', 'icici lombard', 'bajaj allianz', 'united india'],
        patterns: [/policy\s*(?:no|number)/i, /idv/i],
        suggestedTags: ['motor-insurance', 'vehicle-protection', 'policy', 'cashless'],
        suggestedProfile: 'vehicle',
        sensitivity: 'MEDIUM'
      },
      {
        name: 'Health Insurance Policy',
        keywords: ['health insurance', 'mediclaim', 'family floater', 'sum insured', 'tpa', 'cashless hospitalization', 'star health', 'care health', 'niva bupa'],
        patterns: [/mediclaim/i, /sum\s*insured/i],
        suggestedTags: ['health-insurance', 'mediclaim', 'medical-cover', 'emergency'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      },
      {
        name: 'Term Life Insurance',
        keywords: ['term insurance', 'life insurance', 'life assured', 'death benefit', 'nominee', 'lic of india', 'max life', 'tata aia'],
        patterns: [/life\s*assured/i, /nominee/i],
        suggestedTags: ['life-insurance', 'term-plan', 'financial-security', 'lic'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      }
    ]
  },
  education: {
    name: 'Educational Certificates',
    categoryId: 'education',
    defaultSensitivity: 'MEDIUM',
    sensitivityReason: 'Contains degree credentials, roll numbers & academic institution records',
    defaultProfile: 'self',
    icon: 'GraduationCap',
    color: '#F59E0B',
    subCategories: [
      {
        name: 'University Degree / Diploma',
        keywords: ['university', 'bachelor of technology', 'bachelor of science', 'master', 'degree', 'diploma', 'conferred', 'convocation', 'cgpa'],
        patterns: [/university/i, /degree/i, /conferred/i],
        suggestedTags: ['degree', 'university', 'higher-education', 'academic'],
        suggestedProfile: 'self',
        sensitivity: 'MEDIUM'
      },
      {
        name: 'School Passing Certificate',
        keywords: ['secondary school', 'higher secondary', 'cbse', 'icse', 'state board', 'matriculation', 'roll no', 'school examination'],
        patterns: [/cbse/i, /matriculation/i, /marksheet/i],
        suggestedTags: ['marksheet', 'high-school', 'education', 'certificate'],
        suggestedProfile: 'family',
        sensitivity: 'MEDIUM'
      }
    ]
  },
  medical: {
    name: 'Medical Records',
    categoryId: 'medical',
    defaultSensitivity: 'HIGH',
    sensitivityReason: 'Contains Protected Health Information (PHI), diagnostic prescriptions & clinical history',
    defaultProfile: 'self',
    icon: 'Stethoscope',
    color: '#EF4444',
    subCategories: [
      {
        name: 'Doctor Prescription',
        keywords: ['prescription', 'dr.', 'consultant', 'patient name', 'dosage', 'tab', 'syrup', 'hospital clinic', 'rx'],
        patterns: [/rx\b/i, /prescription/i, /dr\.\s*[a-z]+/i],
        suggestedTags: ['prescription', 'doctor-notes', 'medication', 'healthcare'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      },
      {
        name: 'Diagnostic Lab Report',
        keywords: ['laboratory report', 'pathology', 'blood test', 'biochemistry', 'haemoglobin', 'radiology', 'mri scan', 'ct scan', 'ultrasound'],
        patterns: [/lab\s*report/i, /pathology/i],
        suggestedTags: ['lab-report', 'diagnostics', 'blood-test', 'medical-history'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      },
      {
        name: 'Discharge Summary',
        keywords: ['discharge summary', 'date of admission', 'date of discharge', 'in-patient', 'treating consultant', 'procedure note'],
        patterns: [/discharge\s*summary/i, /admission/i],
        suggestedTags: ['discharge-summary', 'hospitalization', 'inpatient'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      }
    ]
  },
  warranty: {
    name: 'Warranty Bills',
    categoryId: 'warranty',
    defaultSensitivity: 'LOW',
    sensitivityReason: 'Standard commercial invoice & product service guarantee',
    defaultProfile: 'self',
    icon: 'Receipt',
    color: '#EC4899',
    subCategories: [
      {
        name: 'Electronics & Appliance Warranty',
        keywords: ['warranty', 'guarantee card', 'tax invoice', 'serial number', 'imei', 'model number', 'invoice date', 'apple', 'samsung', 'sony', 'lg electronics'],
        patterns: [/warranty/i, /invoice\s*(?:no|number)?/i, /serial\s*(?:no|number)?/i],
        suggestedTags: ['warranty', 'tax-invoice', 'purchase-bill', 'appliance'],
        suggestedProfile: 'self',
        sensitivity: 'LOW'
      },
      {
        name: 'Retail Purchase Receipt',
        keywords: ['cash memo', 'retail invoice', 'amazon', 'flipkart', 'store receipt', 'total amount', 'gstin'],
        patterns: [/gstin/i, /tax\s*invoice/i],
        suggestedTags: ['receipt', 'proof-of-purchase', 'retail', 'invoice'],
        suggestedProfile: 'self',
        sensitivity: 'LOW'
      }
    ]
  },
  property: {
    name: 'Property Documents',
    categoryId: 'property',
    defaultSensitivity: 'HIGH',
    sensitivityReason: 'High-value real estate legal deeds, registry seals & survey allocations',
    defaultProfile: 'self',
    icon: 'Home',
    color: '#14B8A6',
    subCategories: [
      {
        name: 'Sale Deed / Title Deed',
        keywords: ['sale deed', 'sub-registrar', 'stamp duty', 'schedule of property', 'vendor', 'purchaser', 'registration act', 'property title'],
        patterns: [/sale\s*deed/i, /sub-registrar/i, /stamp\s*duty/i],
        suggestedTags: ['sale-deed', 'property-title', 'real-estate', 'land-registry'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      },
      {
        name: 'Lease / Rental Agreement',
        keywords: ['lease agreement', 'rental agreement', 'tenancy contract', 'landlord', 'tenant', 'monthly rent', 'security deposit'],
        patterns: [/lease\s*agreement/i, /rental\s*agreement/i],
        suggestedTags: ['rental-agreement', 'lease', 'tenancy', 'housing'],
        suggestedProfile: 'self',
        sensitivity: 'MEDIUM'
      },
      {
        name: 'Property Tax Receipt',
        keywords: ['property tax', 'municipal corporation', 'assessment number', 'khata certificate', 'pid number', 'tax receipt'],
        patterns: [/property\s*tax/i, /khata/i],
        suggestedTags: ['property-tax', 'khata', 'municipality', 'asset-tax'],
        suggestedProfile: 'self',
        sensitivity: 'MEDIUM'
      }
    ]
  },
  financial: {
    name: 'Financial Documents',
    categoryId: 'financial',
    defaultSensitivity: 'HIGH',
    sensitivityReason: 'Confidential banking numbers, tax returns (ITR) & personal earnings data',
    defaultProfile: 'self',
    icon: 'CreditCard',
    color: '#6366F1',
    subCategories: [
      {
        name: 'Bank Account Statement',
        keywords: ['bank statement', 'account summary', 'account number', 'ifsc code', 'closing balance', 'debit credit', 'state bank of india', 'hdfc bank', 'icici bank'],
        patterns: [/account\s*(?:no|number)/i, /ifsc/i, /closing\s*balance/i],
        suggestedTags: ['bank-statement', 'account-summary', 'banking', 'financial'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      },
      {
        name: 'Income Tax Return (ITR)',
        keywords: ['income tax return', 'itr-v', 'acknowledgement number', 'assessment year', 'gross total income', 'centralised processing center'],
        patterns: [/itr-?[0-9v]/i, /assessment\s*year/i],
        suggestedTags: ['itr', 'tax-return', 'incometax-gov', 'financial-compliance'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      },
      {
        name: 'Salary Slip / Form 16',
        keywords: ['salary slip', 'payslip', 'form 16', 'certificate under section 203', 'basic pay', 'hra', 'provident fund', 'tds deducted'],
        patterns: [/form\s*16/i, /payslip/i, /basic\s*pay/i],
        suggestedTags: ['payslip', 'form-16', 'salary-proof', 'earnings'],
        suggestedProfile: 'self',
        sensitivity: 'HIGH'
      }
    ]
  },
  other: {
    name: 'Other Documents',
    categoryId: 'other',
    defaultSensitivity: 'LOW',
    sensitivityReason: 'General document without recognized high-sensitivity patterns',
    defaultProfile: 'self',
    icon: 'FileText',
    color: '#64748B',
    subCategories: [
      {
        name: 'General Document / Affidavit',
        keywords: ['affidavit', 'notary public', 'undertaking', 'declaration', 'agreement', 'document'],
        patterns: [/.*/],
        suggestedTags: ['general-document', 'records'],
        suggestedProfile: 'self',
        sensitivity: 'LOW'
      }
    ]
  }
};

/**
 * SmartClassificationService
 * Fast, intelligent heuristic NLP and pattern classifier across 9 document categories.
 * Equipped with confidence scoring, explainability, sensitivity scoring, and profile suggestion.
 */
class SmartClassificationService extends ClassificationService {
  constructor() {
    super();
    this.taxonomy = CATEGORY_TAXONOMY;
  }

  /**
   * Classify document based on text content and metadata
   * @param {string} text - OCR text or document transcript
   * @param {object} [metadata] - File metadata (fileName, mimeType, ocrFields)
   * @returns {Promise<object>} Classification details
   */
  async classify(text = '', metadata = {}) {
    const rawContent = `${text} ${metadata.fileName || ''} ${metadata.title || ''}`.toLowerCase();
    
    let bestMatch = null;
    let highestScore = 0;
    let matchedKeywords = [];
    let matchedPatterns = [];

    // Scan each category and its subcategories
    for (const [catKey, catData] of Object.entries(this.taxonomy)) {
      for (const subCat of catData.subCategories) {
        let score = 0;
        let localMatchedKeywords = [];
        let localMatchedPatterns = [];

        // Check keywords
        for (const kw of subCat.keywords) {
          if (rawContent.includes(kw.toLowerCase())) {
            // Give higher weight if keyword appears in filename or title
            const inMetadata = (metadata.fileName || '').toLowerCase().includes(kw) || (metadata.title || '').toLowerCase().includes(kw);
            score += inMetadata ? 25 : 12;
            localMatchedKeywords.push(kw);
          }
        }

        // Check regex patterns
        if (subCat.patterns) {
          for (const pattern of subCat.patterns) {
            if (pattern.test(rawContent)) {
              score += 15;
              localMatchedPatterns.push(pattern.toString());
            }
          }
        }

        // Boost score if OCR extracted fields correlate
        if (metadata.ocrFields) {
          const { docNumber, issuingAuthority, title } = metadata.ocrFields;
          if (docNumber && subCat.patterns && subCat.patterns.some(p => p.test(docNumber))) {
            score += 20;
          }
          if (issuingAuthority && subCat.keywords.some(k => issuingAuthority.toLowerCase().includes(k))) {
            score += 20;
          }
          if (title && subCat.keywords.some(k => title.toLowerCase().includes(k))) {
            score += 15;
          }
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            categoryKey: catKey,
            categoryName: catData.name,
            subCategoryName: subCat.name,
            sensitivity: subCat.sensitivity || catData.defaultSensitivity,
            sensitivityReason: catData.sensitivityReason,
            suggestedProfile: subCat.suggestedProfile || catData.defaultProfile,
            suggestedTags: [...subCat.suggestedTags],
            icon: catData.icon,
            color: catData.color
          };
          matchedKeywords = localMatchedKeywords;
          matchedPatterns = localMatchedPatterns;
        }
      }
    }

    // If no strong match found, default to 'other'
    if (!bestMatch || highestScore < 10) {
      const fallback = this.taxonomy.other;
      const sub = fallback.subCategories[0];
      return {
        success: true,
        category: fallback.name,
        categoryId: fallback.categoryId,
        subCategory: sub.name,
        confidence: 0.65,
        confidencePercentage: 65,
        confidenceLevel: 'LOW',
        sensitivity: 'LOW',
        sensitivityNotice: 'Standard document; low PII sensitivity identified.',
        suggestedProfileType: 'self',
        suggestedTags: ['general-document'],
        reasoning: 'No distinct government or financial signature identified; defaulted to General / Other.',
        matchedKeywords: [],
        timestamp: new Date().toISOString()
      };
    }

    // Calculate normalized confidence between 0.78 and 0.99
    let confidence = 0.80;
    if (highestScore >= 50) confidence = 0.98;
    else if (highestScore >= 35) confidence = 0.94;
    else if (highestScore >= 20) confidence = 0.88;
    else confidence = 0.81;

    // Determine confidence descriptor
    let confidenceLevel = 'HIGH';
    if (confidence < 0.85) confidenceLevel = 'MEDIUM';
    if (confidence < 0.75) confidenceLevel = 'LOW';

    // Construct human-readable explainability reasoning
    const kwSummary = matchedKeywords.slice(0, 3).map(k => `"${k}"`).join(', ');
    const reasoning = kwSummary
      ? `Classified as ${bestMatch.subCategoryName} based on signature keywords [${kwSummary}] and matching structural format.`
      : `Classified as ${bestMatch.subCategoryName} matching category heuristic profile.`;

    return {
      success: true,
      category: bestMatch.categoryName,
      categoryId: bestMatch.categoryKey,
      subCategory: bestMatch.subCategoryName,
      confidence: confidence,
      confidencePercentage: Math.round(confidence * 100),
      confidenceLevel: confidenceLevel,
      sensitivity: bestMatch.sensitivity,
      sensitivityNotice: bestMatch.sensitivityReason,
      suggestedProfileType: bestMatch.suggestedProfile,
      suggestedTags: bestMatch.suggestedTags,
      icon: bestMatch.icon,
      color: bestMatch.color,
      reasoning: reasoning,
      matchedKeywords: matchedKeywords,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Returns all 9 official document categories with their metadata and subcategories
   */
  getCategories() {
    return Object.entries(this.taxonomy).map(([key, item]) => ({
      id: key,
      name: item.name,
      icon: item.icon,
      color: item.color,
      defaultSensitivity: item.defaultSensitivity,
      sensitivityReason: item.sensitivityReason,
      defaultProfile: item.defaultProfile,
      subCategories: item.subCategories.map(s => ({
        name: s.name,
        sensitivity: s.sensitivity,
        suggestedTags: s.suggestedTags
      }))
    }));
  }
}

module.exports = SmartClassificationService;
