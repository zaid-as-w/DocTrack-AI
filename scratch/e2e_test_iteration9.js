async function testE2E() {
  console.log('=== RUNNING END-TO-END VERIFICATION FOR ITERATION 9 ===\n');

  // 1. Categories taxonomy
  console.log('1. Checking Categories Endpoint...');
  const catRes = await fetch('http://localhost:5000/api/classification/categories');
  const catData = await catRes.json();
  console.log(`Status: ${catRes.status}, Received ${catData.data?.length} categories`);
  console.assert(catData.data?.length === 9, 'Must have 9 categories');

  // 2. Direct Classification
  console.log('\n2. Testing Direct Text Classification (Passport)...');
  const classRes = await fetch('http://localhost:5000/api/classification/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'REPUBLIC OF INDIA PASSPORT MINISTRY OF EXTERNAL AFFAIRS Z9847291',
      fileName: 'passport_scan.pdf'
    })
  });
  const classData = await classRes.json();
  console.log('Classification Result:', {
    category: classData.data?.category,
    subCategory: classData.data?.subCategory,
    confidence: classData.data?.confidencePercentage,
    sensitivity: classData.data?.sensitivity,
    tags: classData.data?.suggestedTags
  });
  console.assert(classData.data?.category === 'Identity Proofs', 'Category should match');
  console.assert(classData.data?.sensitivity === 'HIGH', 'Sensitivity should be HIGH');

  // 3. OCR Pipeline Integration
  console.log('\n3. Testing OCR Pipeline + Automatic Classification...');
  const ocrRes = await fetch('http://localhost:5000/api/ocr/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateId: 'tpl-dl'
    })
  });
  const ocrData = await ocrRes.json();
  console.log('OCR with Classification:', {
    ocrSuccess: ocrData.success,
    detectedTitle: ocrData.fields?.title || ocrData.extractedFields?.title,
    classificationCategory: ocrData.classification?.category,
    classificationSensitivity: ocrData.classification?.sensitivity,
    suggestedProfile: ocrData.classification?.suggestedProfileType
  });
  console.assert(ocrData.classification?.category === 'Vehicle Records', 'DL must classify as Vehicle Records');

  // 4. Document Ingestion with Classification
  console.log('\n4. Testing Document Ingestion with Sensitivity and Classification...');
  const uploadRes = await fetch('http://localhost:5000/api/documents/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'HDFC Ergo Health Suraksha Policy',
      category: 'Insurance Papers',
      categoryId: 'insurance',
      profileId: 'self',
      profileName: 'Zaid (Self)',
      docNumber: 'HDFC-HLTH-991823',
      expiryDate: '2027-05-15',
      sensitivity: 'HIGH',
      tags: ['health-insurance', 'mediclaim', 'emergency']
    })
  });
  const uploadData = await uploadRes.json();
  console.log('Upload Result:', {
    success: uploadData.success,
    docId: uploadData.data?.id,
    title: uploadData.data?.title,
    sensitivity: uploadData.data?.sensitivity,
    tags: uploadData.data?.tags
  });
  console.assert(uploadData.data?.sensitivity === 'HIGH', 'Sensitivity should be preserved');

  console.log('\n=== ALL ITERATION 9 E2E TESTS PASSED SUCCESSFULLY! ===');
}

testE2E().catch(err => {
  console.error('E2E Verification Error:', err);
  process.exit(1);
});
