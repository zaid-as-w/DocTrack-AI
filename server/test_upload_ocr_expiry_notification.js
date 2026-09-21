/**
 * Comprehensive Test Suite: Upload, OCR Extraction, Intelligent Date Detection,
 * Expiry Evaluation & Multi-Channel Reminder Dispatch
 * 
 * Verifies all 10 core requirements:
 * 1. Document expiring in 2 years -> Active, no notification
 * 2. Document expiring in 20 days -> Expiring soon, immediate email & SMS dispatched
 * 3. Document expiring in 30 days (boundary) -> Inside threshold, notification triggered
 * 4. Document expiring tomorrow (1 day remaining) -> Urgent notification dispatched
 * 5. Document expired yesterday (-1 day) -> Expired notification dispatched
 * 6. Document with unknown / missing expiry date -> expiryDate: null, needsVerification: true, no notification
 * 7. User with email only -> Email sent, SMS skipped, document saved
 * 8. User with phone only -> SMS sent, email skipped, document saved
 * 9. Simulated email transport failure -> Fault tolerant, SMS attempted, document upload succeeds
 * 10. Duplicate notification prevention -> Second check returns alreadySent, no duplicate email/SMS sent
 */

const assert = require('assert');
const path = require('path');
const { SmartOCRService, MockOCRService } = require('./src/services/ocr');
const { checkAndDispatchExpiryNotification } = require('./src/services/notificationService');
const emailService = require('./src/services/email.service');
const smsService = require('./src/services/sms.service');
const { evaluateDocument } = require('./src/services/expiryEngine');

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 DOCTRACK AI — OCR & EXPIRY NOTIFICATION TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function record(testName, result, details = '') {
    total++;
    if (result) {
      passed++;
      console.log(`  ✅ [PASS] ${testName}`);
      if (details) console.log(`     └─ ${details}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     └─ ${details}`);
    }
  }

  const ocrService = new SmartOCRService();
  const mockService = new MockOCRService();

  // -------------------------------------------------------------
  // PART A: Intelligent Multi-Format Date Parsing & Context Detection
  // -------------------------------------------------------------
  console.log('🔹 SECTION A: Date Normalization & Contextual Detection (Issue vs Expiry)');

  // Test formats
  const dateFormats = [
    { input: '25/12/2026', expected: '2026-12-25', desc: 'DD/MM/YYYY format' },
    { input: '25-12-2026', expected: '2026-12-25', desc: 'DD-MM-YYYY format' },
    { input: '25.12.2026', expected: '2026-12-25', desc: 'DD.MM.YYYY format' },
    { input: '2026-12-25', expected: '2026-12-25', desc: 'YYYY-MM-DD format' },
    { input: '25-Dec-2026', expected: '2026-12-25', desc: 'DD-MMM-YYYY format' },
    { input: '25 December 2026', expected: '2026-12-25', desc: 'DD Month YYYY format' },
    { input: 'December 25, 2026', expected: '2026-12-25', desc: 'Month DD, YYYY format' }
  ];

  for (const df of dateFormats) {
    const normalized = ocrService.normalizeDate(df.input);
    record(`Normalize Date: ${df.desc} ("${df.input}")`, normalized === df.expected, `Got: ${normalized}`);
  }

  // Contextual issue vs expiry date detection
  const sampleDocText = `
    GOVERNMENT OF INDIA - PASSPORT
    Name: MOHAMMED ZAID
    Passport No: Z9847291
    Date of Birth: 15/04/1995
    Date of Issue: 10/05/2022
    Date of Expiry: 09/05/2032
    Country: India
  `;

  const extractedFields = ocrService.extractFields(sampleDocText);
  record(
    'Contextual Date Matching: Separates Issue Date from Expiry Date',
    extractedFields.issueDate === '2022-05-10' && extractedFields.expiryDate === '2032-05-09',
    `Issue: ${extractedFields.issueDate}, Expiry: ${extractedFields.expiryDate}`
  );

  record(
    'Metadata Extraction: Holder Name & Country Extracted',
    extractedFields.holderName === 'MOHAMMED ZAID' && extractedFields.country === 'India',
    `Holder: ${extractedFields.holderName}, Country: ${extractedFields.country}`
  );

  // -------------------------------------------------------------
  // PART B: 10 Required Test Scenarios
  // -------------------------------------------------------------
  console.log('\n🔹 SECTION B: 10 Core Expiry & Notification Scenarios');

  // Test 1: Document expiring in 2 years
  const today = new Date();
  const dateIn2Years = new Date(today);
  dateIn2Years.setFullYear(today.getFullYear() + 2);
  const dateIn2YearsStr = dateIn2Years.toISOString().split('T')[0];

  const doc2Years = {
    id: 'test-doc-2years',
    title: 'Future Passport',
    expiryDate: dateIn2YearsStr,
    notificationHistory: []
  };

  const eval2Years = evaluateDocument(doc2Years);
  const notif2Years = await checkAndDispatchExpiryNotification({
    document: doc2Years,
    user: { email: 'zaid@test.com', phone: '+919876543210', name: 'Zaid' }
  });

  record(
    'Test 1: Document expiring in 2 years -> Active status & No Notification Dispatched',
    eval2Years.status === 'ACTIVE' && eval2Years.daysLeft > 30 && notif2Years.triggered === false,
    `Status: ${eval2Years.status}, DaysLeft: ${eval2Years.daysLeft}, Notification Triggered: ${notif2Years.triggered}`
  );

  // Test 2: Document expiring in 20 days -> Expiring Soon, immediate email & SMS
  const dateIn20Days = new Date(today);
  dateIn20Days.setDate(today.getDate() + 20);
  const dateIn20DaysStr = dateIn20Days.toISOString().split('T')[0];

  const doc20Days = {
    id: 'test-doc-20days',
    title: 'Health Insurance Policy',
    expiryDate: dateIn20DaysStr,
    notificationHistory: []
  };

  const eval20Days = evaluateDocument(doc20Days);
  const notif20Days = await checkAndDispatchExpiryNotification({
    document: doc20Days,
    user: { email: 'zaid@test.com', phone: '+919876543210', name: 'Zaid' },
    isImmediate: true
  });

  record(
    'Test 2: Document expiring in 20 days -> Expiring Soon & Immediate Email + SMS Dispatched',
    eval20Days.status === 'EXPIRING_SOON' &&
      eval20Days.daysLeft === 20 &&
      notif20Days.triggered === true &&
      notif20Days.emailSent === true &&
      notif20Days.smsSent === true &&
      doc20Days.notificationHistory.length >= 2,
    `Status: ${eval20Days.status}, DaysLeft: ${eval20Days.daysLeft}, EmailSent: ${notif20Days.emailSent}, SmsSent: ${notif20Days.smsSent}`
  );

  // Test 3: Document expiring in 30 days (boundary) -> Inside threshold, notification triggered
  const dateIn30Days = new Date(today);
  dateIn30Days.setDate(today.getDate() + 30);
  const dateIn30DaysStr = dateIn30Days.toISOString().split('T')[0];

  const doc30Days = {
    id: 'test-doc-30days',
    title: 'Vehicle Registration Certificate',
    expiryDate: dateIn30DaysStr,
    notificationHistory: []
  };

  const notif30Days = await checkAndDispatchExpiryNotification({
    document: doc30Days,
    user: { email: 'zaid@test.com', phone: '+919876543210', name: 'Zaid' }
  });

  record(
    'Test 3: Document expiring in 30 days (exact boundary) -> Notification Triggered',
    notif30Days.triggered === true && (notif30Days.daysLeft === 30 || notif30Days.daysLeft === 29),
    `DaysLeft: ${notif30Days.daysLeft}, Triggered: ${notif30Days.triggered}`
  );

  // Test 4: Document expiring tomorrow (1 day remaining)
  const dateTomorrow = new Date(today);
  dateTomorrow.setDate(today.getDate() + 1);
  const dateTomorrowStr = dateTomorrow.toISOString().split('T')[0];

  const docTomorrow = {
    id: 'test-doc-tomorrow',
    title: 'PUC Emission Certificate',
    expiryDate: dateTomorrowStr,
    notificationHistory: []
  };

  const notifTomorrow = await checkAndDispatchExpiryNotification({
    document: docTomorrow,
    user: { email: 'zaid@test.com', phone: '+919876543210', name: 'Zaid' }
  });

  record(
    'Test 4: Document expiring tomorrow (1 day remaining) -> Urgent Notification Dispatched',
    notifTomorrow.triggered === true && notifTomorrow.daysLeft === 1 && notifTomorrow.emailSent && notifTomorrow.smsSent,
    `DaysLeft: ${notifTomorrow.daysLeft}, Triggered: ${notifTomorrow.triggered}`
  );

  // Test 5: Document expired yesterday (-1 day)
  const dateYesterday = new Date(today);
  dateYesterday.setDate(today.getDate() - 1);
  const dateYesterdayStr = dateYesterday.toISOString().split('T')[0];

  const docYesterday = {
    id: 'test-doc-yesterday',
    title: 'Commercial Fitness Certificate',
    expiryDate: dateYesterdayStr,
    notificationHistory: []
  };

  const evalYesterday = evaluateDocument(docYesterday);
  const notifYesterday = await checkAndDispatchExpiryNotification({
    document: docYesterday,
    user: { email: 'zaid@test.com', phone: '+919876543210', name: 'Zaid' }
  });

  record(
    'Test 5: Document expired yesterday (-1 day) -> Expired Status & Dispatched',
    evalYesterday.status === 'EXPIRED' && notifYesterday.triggered === true && notifYesterday.daysLeft < 0,
    `Status: ${evalYesterday.status}, DaysLeft: ${notifYesterday.daysLeft}, Triggered: ${notifYesterday.triggered}`
  );

  // Test 6: Document with unknown / missing expiry date
  const textWithoutExpiry = `
    INVOICE / RECEIPT
    Customer: John Doe
    Date of Issue: 12/03/2024
    Description: Office Chair Purchase
    Amount: $150.00
  `;

  const ocrNoExpiry = ocrService.extractFields(textWithoutExpiry);
  const docNoExpiry = {
    id: 'test-doc-noexpiry',
    title: 'Office Chair Receipt',
    expiryDate: ocrNoExpiry.expiryDate,
    needsVerification: ocrNoExpiry.needsVerification,
    notificationHistory: []
  };

  const notifNoExpiry = await checkAndDispatchExpiryNotification({
    document: docNoExpiry,
    user: { email: 'zaid@test.com', phone: '+919876543210', name: 'Zaid' }
  });

  record(
    'Test 6: Document with unknown/missing expiry date -> expiryDate: null, needsVerification: true, no hallucination',
    ocrNoExpiry.expiryDate === null &&
      ocrNoExpiry.needsVerification === true &&
      notifNoExpiry.triggered === false,
    `ExpiryDate: ${ocrNoExpiry.expiryDate}, needsVerification: ${ocrNoExpiry.needsVerification}, Notification: ${notifNoExpiry.triggered}`
  );

  // Test 7: User with only email configured -> Email sent, SMS skipped, no failure
  const docEmailOnly = {
    id: 'test-doc-emailonly',
    title: 'Driving License',
    expiryDate: dateIn20DaysStr,
    notificationHistory: []
  };

  const notifEmailOnly = await checkAndDispatchExpiryNotification({
    document: docEmailOnly,
    user: { email: 'zaid-only@test.com', phone: null, name: 'Zaid Email Only' }
  });

  record(
    'Test 7: User with email only -> Email sent, SMS skipped, document saved safely',
    notifEmailOnly.triggered === true &&
      notifEmailOnly.emailSent === true &&
      notifEmailOnly.smsSent === false &&
      notifEmailOnly.smsStatus === 'skipped',
    `EmailStatus: ${notifEmailOnly.emailStatus}, SmsStatus: ${notifEmailOnly.smsStatus}`
  );

  // Test 8: User with only phone configured -> SMS sent, Email skipped, no failure
  const docPhoneOnly = {
    id: 'test-doc-phoneonly',
    title: 'Aadhaar Card',
    expiryDate: dateIn20DaysStr,
    notificationHistory: []
  };

  const notifPhoneOnly = await checkAndDispatchExpiryNotification({
    document: docPhoneOnly,
    user: { email: null, phone: '+919876500000', name: 'Zaid Phone Only' }
  });

  record(
    'Test 8: User with phone only -> SMS sent, Email skipped, document saved safely',
    notifPhoneOnly.triggered === true &&
      notifPhoneOnly.smsSent === true &&
      notifPhoneOnly.emailSent === false &&
      notifPhoneOnly.emailStatus === 'skipped',
    `EmailStatus: ${notifPhoneOnly.emailStatus}, SmsStatus: ${notifPhoneOnly.smsStatus}`
  );

  // Test 9: Simulated failure during email transport -> Graceful fault tolerance
  const originalSendEmail = emailService.sendEmail;
  // Monkey-patch email send to simulate transporter failure
  emailService.sendEmail = async () => {
    throw new Error('ECONNREFUSED 127.0.0.1:587 (Simulated SMTP Outage)');
  };

  let simulatedErrorCaught = false;
  let notifFaultTolerant = null;
  try {
    const docFailure = {
      id: 'test-doc-failtest',
      title: 'Term Insurance',
      expiryDate: dateIn20DaysStr,
      notificationHistory: []
    };

    notifFaultTolerant = await checkAndDispatchExpiryNotification({
      document: docFailure,
      user: { email: 'down@smtp.com', phone: '+919999988888', name: 'Zaid' }
    });
  } catch (err) {
    simulatedErrorCaught = true;
  } finally {
    emailService.sendEmail = originalSendEmail;
  }

  record(
    'Test 9: Simulated Email Failure -> Function does NOT throw, SMS still attempted, error logged gracefully',
    simulatedErrorCaught === false &&
      notifFaultTolerant !== null &&
      notifFaultTolerant.emailStatus === 'failed' &&
      notifFaultTolerant.smsSent === true,
    `EmailStatus: ${notifFaultTolerant?.emailStatus}, SmsSent: ${notifFaultTolerant?.smsSent}`
  );

  // Test 10: Duplicate notification prevention
  // Re-run notification check on doc20Days which already had notifications sent
  const notifDuplicate = await checkAndDispatchExpiryNotification({
    document: doc20Days,
    user: { email: 'zaid@test.com', phone: '+919876543210', name: 'Zaid' }
  });

  record(
    'Test 10: Duplicate Notification Prevention -> Second check returns alreadySent: true, stops duplicate dispatch',
    notifDuplicate.triggered === false && notifDuplicate.alreadySent === true,
    `Triggered: ${notifDuplicate.triggered}, AlreadySent: ${notifDuplicate.alreadySent}, Reason: ${notifDuplicate.reason}`
  );

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`📊 RESULTS: ${passed}/${total} TESTS PASSED (${((passed / total) * 100).toFixed(0)}%)`);
  console.log('===============================================================');

  if (passed === total) {
    console.log('🎉 ALL OCR & EXPIRY NOTIFICATION TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error(`❌ ${total - passed} tests failed.`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
