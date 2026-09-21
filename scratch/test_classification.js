const { classificationService } = require('../server/src/services/classification');

async function runTests() {
  console.log('--- TEST 1: Passport OCR Classification ---');
  const passportText = `
    REPUBLIC OF INDIA / PASSPORT
    Type: P Country Code: IND Passport No: Z9847291
    Surname: SHARMA Given Name: ZAID
    Date of Issue: 12/10/2016 Date of Expiry: 12/10/2026
    Issuing Authority: Regional Passport Office, Bengaluru
  `;
  const res1 = await classificationService.classify(passportText, { fileName: 'zaid_passport.pdf' });
  console.log('Result 1:', {
    category: res1.category,
    subCategory: res1.subCategory,
    confidence: res1.confidence,
    sensitivity: res1.sensitivity,
    suggestedProfileType: res1.suggestedProfileType,
    suggestedTags: res1.suggestedTags,
    reasoning: res1.reasoning
  });
  console.assert(res1.category === 'Identity Proofs', 'Category should be Identity Proofs');
  console.assert(res1.sensitivity === 'HIGH', 'Passport should be HIGH sensitivity');

  console.log('\n--- TEST 2: Vehicle RC Classification ---');
  const rcText = `
    FORM 23 REGISTRATION CERTIFICATE
    Registration No: KA01AB1234
    Chassis Number: MA3ERLF3S00129384 Engine Number: K12M1293849
    Vehicle Class: Motor Car (LMV)
  `;
  const res2 = await classificationService.classify(rcText, { fileName: 'honda_city_rc.pdf' });
  console.log('Result 2:', {
    category: res2.category,
    subCategory: res2.subCategory,
    confidence: res2.confidence,
    sensitivity: res2.sensitivity,
    suggestedProfileType: res2.suggestedProfileType,
    suggestedTags: res2.suggestedTags
  });
  console.assert(res2.category === 'Vehicle Records', 'Category should be Vehicle Records');
  console.assert(res2.suggestedProfileType === 'vehicle', 'Profile should be vehicle');

  console.log('\n--- TEST 3: Warranty Bill Classification ---');
  const warrantyText = `
    SONY INDIA AUTHORIZED RETAIL INVOICE
    Tax Invoice No: SNY-INV-49102
    Product: Sony Bravia 55" OLED Television
    Serial No: SN-882910 Warranty Validity: 2 Years
  `;
  const res3 = await classificationService.classify(warrantyText, { fileName: 'sony_bravia_warranty.pdf' });
  console.log('Result 3:', {
    category: res3.category,
    subCategory: res3.subCategory,
    confidence: res3.confidence,
    sensitivity: res3.sensitivity,
    suggestedTags: res3.suggestedTags
  });
  console.assert(res3.category === 'Warranty Bills', 'Category should be Warranty Bills');
  console.assert(res3.sensitivity === 'LOW', 'Warranty should be LOW sensitivity');

  console.log('\n--- TEST 4: Categories Taxonomy Inspection ---');
  const categories = classificationService.getCategories();
  console.log(`Retrieved ${categories.length} standard categories:`);
  categories.forEach(c => {
    console.log(`  - [${c.id}] ${c.name} (${c.subCategories.length} subcategories, default sensitivity: ${c.defaultSensitivity})`);
  });
  console.assert(categories.length === 9, 'Should have 9 categories');

  console.log('\nALL 4 CLASSIFICATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
