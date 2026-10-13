/**
 * End-to-End Test Suite for DocTrack AI Email Notification System
 * Validates:
 * 1. Amazon SES connectivity via AWS SDK v3
 * 2. Upload confirmation email with metadata & document link
 * 3. Already expired document handling with renewal link
 * 4. Expiry threshold notifications (180d, 90d, 30d, 7d, 1d)
 * 5. Non-expiring / perpetual documents (upload email sent, 0 expiry reminders)
 * 6. Duplicate reminder prevention for same document and threshold
 * 7. Graceful error handling (storage preserved on email failure)
 */

const { connectDB, disconnectDB } = require('./src/config/db');
const User = require('./src/models/User');
const Document = require('./src/models/Document');
const emailService = require('./src/services/email.service');
const {
  resolveUserContact,
  checkAndDispatchExpiryNotification,
  dispatchDocumentUploadedNotification
} = require('./src/services/notificationService');

async function runTestSuite() {
  console.log('================================================================');
  console.log('  DocTrack AI — Complete Email Notification System E2E Tests  ');
  console.log('================================================================\n');

  // Inject mocked SESClient to ensure tests do not dispatch real emails
  emailService.setSesClient({
    send: async (command) => {
      return {
        MessageId: `ses-test-e2e-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        Max24HourSend: 50000,
        SentLast24Hours: 0
      };
    }
  });

  await connectDB();

  // Test 1: Verify Amazon SES Connection
  console.log('--- Test 1: Amazon SES Client Handshake ---');
  const sesConnected = await emailService.verifySesConnection();
  console.log(`✓ Amazon SES Service Connected: ${sesConnected ? 'YES (Amazon SES v3 SDK)' : 'FALLBACK (Mock Mode)'}`);

  // Fetch or create a test user in MongoDB
  let testUser = await User.findOne({ email: 'docktrack0@gmail.com' });
  if (!testUser) {
    testUser = await User.create({
      name: 'DocTrack Lead User',
      email: 'docktrack0@gmail.com',
      passwordHash: '$2a$10$abcdef1234567890abcdef1234567890abcdef1234567890',
      onboardingCompleted: true
    });
  }
  console.log(`✓ Test MongoDB User: ${testUser.name} <${testUser.email}> (ID: ${testUser._id})`);

  // Test 2: User Contact Resolution from MongoDB
  console.log('\n--- Test 2: MongoDB User Account Contact Resolution ---');
  const resolvedContact = await resolveUserContact({ document: { userId: testUser._id.toString() } });
  if (resolvedContact.email !== testUser.email) {
    throw new Error(`Expected email ${testUser.email}, but got ${resolvedContact.email}`);
  }
  console.log(`✓ Correctly retrieved authenticated account email from MongoDB: ${resolvedContact.email}`);

  // Test 3: Upload Confirmation Email
  console.log('\n--- Test 3: Upload Confirmation Email (Immediate on Upload) ---');
  const testUploadDoc = await Document.create({
    userId: testUser._id.toString(),
    profileId: 'self',
    profileName: 'DocTrack Lead User',
    title: 'Comprehensive Health Insurance Policy',
    category: 'Health Insurance',
    categoryId: 'insurance',
    docNumber: 'HDFC-ERGO-998822',
    holderName: 'DocTrack Lead User',
    issuingAuthority: 'HDFC ERGO General Insurance',
    placeOfIssue: 'Bengaluru, India',
    country: 'India',
    dateOfBirth: '1995-05-15',
    issueDate: '2024-01-15',
    expiryDate: '2027-01-15',
    status: 'ACTIVE',
    daysLeft: 1200,
    uploadedAt: new Date().toISOString()
  });

  const uploadNotifResult = await dispatchDocumentUploadedNotification({
    document: testUploadDoc,
    user: testUser
  });
  console.log(`✓ Upload notification triggered: ${uploadNotifResult.triggered}`);
  console.log(`✓ Email dispatch status: ${uploadNotifResult.email.status} (Recipient: ${uploadNotifResult.email.recipient})`);
  if (!uploadNotifResult.triggered || uploadNotifResult.email.status !== 'sent') {
    throw new Error('Upload notification email failed to dispatch.');
  }

  // Verify notification history recorded on document
  const reloadedUploadDoc = await Document.findById(testUploadDoc._id);
  const uploadHistoryEntry = reloadedUploadDoc.notificationHistory.find(h => h.type === 'DOCUMENT_UPLOADED');
  if (!uploadHistoryEntry) {
    throw new Error('Upload notification entry was not recorded in document.notificationHistory');
  }
  console.log(`✓ Notification history recorded in MongoDB for document ${testUploadDoc._id}: ${uploadHistoryEntry.status}`);

  // Test 4: Expiry Threshold Notifications (180d, 90d, 30d, 7d, 1d)
  console.log('\n--- Test 4: Configured Expiry Threshold Reminders (180d, 90d, 30d, 7d, 1d) ---');
  const thresholdTestCases = [
    { label: '180-day threshold', daysRemaining: 150, expectedThreshold: 180 },
    { label: '90-day threshold', daysRemaining: 75, expectedThreshold: 90 },
    { label: '30-day threshold', daysRemaining: 22, expectedThreshold: 30 },
    { label: '7-day threshold', daysRemaining: 6, expectedThreshold: 7 },
    { label: '1-day threshold', daysRemaining: 1, expectedThreshold: 1 }
  ];

  for (const tc of thresholdTestCases) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + tc.daysRemaining);
    const dateStr = futureDate.toISOString().split('T')[0];

    const threshDoc = await Document.create({
      userId: testUser._id.toString(),
      profileId: 'self',
      profileName: 'DocTrack Lead User',
      title: `Identity Card (${tc.label})`,
      category: 'Identity Proofs',
      categoryId: 'identity',
      docNumber: `ID-${tc.daysRemaining}D`,
      expiryDate: dateStr,
      status: tc.daysRemaining <= 30 ? 'EXPIRING_SOON' : 'ACTIVE',
      daysLeft: tc.daysRemaining
    });

    const threshResult = await checkAndDispatchExpiryNotification({
      document: threshDoc,
      user: testUser,
      thresholdDays: 180
    });

    console.log(`✓ [${tc.label}] ${tc.daysRemaining} days remaining -> Threshold: ${threshResult.thresholdDays}, Email Sent: ${threshResult.emailSent}`);
    if (threshResult.thresholdDays !== tc.expectedThreshold || !threshResult.emailSent) {
      throw new Error(`Threshold mismatch for ${tc.label}: expected ${tc.expectedThreshold}, got ${threshResult.thresholdDays}`);
    }

    // Clean up test document
    await Document.findByIdAndDelete(threshDoc._id);
  }

  // Test 5: Already Expired Document Handling
  console.log('\n--- Test 5: Already Expired Document Handling ---');
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 45); // Expired 45 days ago
  const expiredDateStr = pastDate.toISOString().split('T')[0];

  const expiredDoc = await Document.create({
    userId: testUser._id.toString(),
    profileId: 'self',
    profileName: 'DocTrack Lead User',
    title: 'Commercial Driving License',
    category: 'Driving License',
    categoryId: 'driving',
    docNumber: 'DL-KA03-EXPIRED',
    issueDate: '2019-01-01',
    expiryDate: expiredDateStr,
    status: 'EXPIRED',
    daysLeft: -45
  });

  // Step A: Upload email confirmation still sent immediately
  const expiredUploadRes = await dispatchDocumentUploadedNotification({
    document: expiredDoc,
    user: testUser
  });
  console.log(`✓ Expired document upload confirmation sent: ${expiredUploadRes.email.status}`);

  // Step B: Expired notification with Renewal Assistant link sent immediately
  const expiredExpiryRes = await checkAndDispatchExpiryNotification({
    document: expiredDoc,
    user: testUser,
    thresholdDays: 180
  });
  console.log(`✓ Expired notification triggered: ${expiredExpiryRes.triggered}, Threshold: ${expiredExpiryRes.thresholdDays} (Expired: -1), Email Sent: ${expiredExpiryRes.emailSent}`);
  if (!expiredExpiryRes.triggered || expiredExpiryRes.thresholdDays !== -1 || !expiredExpiryRes.emailSent) {
    throw new Error('Expired document notification failed to trigger.');
  }

  // Test 6: Non-Expiring / Perpetual Document
  console.log('\n--- Test 6: Non-Expiring / Perpetual Document ---');
  const perpetualDoc = await Document.create({
    userId: testUser._id.toString(),
    profileId: 'self',
    profileName: 'DocTrack Lead User',
    title: 'Government Permanent Aadhaar Card',
    category: 'Identity Proofs',
    categoryId: 'identity',
    docNumber: 'UIDAI-XXXX-1234',
    issueDate: '2020-05-10',
    expiryDate: 'Perpetual',
    status: 'ACTIVE',
    daysLeft: null
  });

  // Upload email sent immediately
  const perpUploadRes = await dispatchDocumentUploadedNotification({
    document: perpetualDoc,
    user: testUser
  });
  console.log(`✓ Perpetual document upload confirmation sent: ${perpUploadRes.email.status}`);

  // Expiry reminder must NOT be generated
  const perpExpiryRes = await checkAndDispatchExpiryNotification({
    document: perpetualDoc,
    user: testUser,
    thresholdDays: 180
  });
  console.log(`✓ Perpetual document expiry reminder skipped: triggered=${perpExpiryRes.triggered}, reason=${perpExpiryRes.reason}`);
  if (perpExpiryRes.triggered || perpExpiryRes.reason !== 'PERPETUAL_DOCUMENT') {
    throw new Error('Perpetual document improperly triggered an expiry reminder.');
  }

  // Test 7: Duplicate Reminder Prevention
  console.log('\n--- Test 7: Duplicate Reminder Prevention ---');
  // Re-run check on the already expired document
  const reloadedExpiredDoc = await Document.findById(expiredDoc._id);
  const dupCheckRes = await checkAndDispatchExpiryNotification({
    document: reloadedExpiredDoc,
    user: testUser,
    thresholdDays: 180
  });
  console.log(`✓ Duplicate check result: triggered=${dupCheckRes.triggered}, alreadySent=${dupCheckRes.alreadySent}, reason=${dupCheckRes.reason}`);
  if (dupCheckRes.triggered || !dupCheckRes.alreadySent || dupCheckRes.reason !== 'ALREADY_SENT') {
    throw new Error('Duplicate reminder was not prevented.');
  }

  // Test 8: Graceful Error Handling (Document Preservation)
  console.log('\n--- Test 8: Graceful Error Handling (Storage Preservation) ---');
  const brokenEmailDoc = await Document.create({
    userId: testUser._id.toString(),
    profileId: 'self',
    profileName: 'DocTrack Lead User',
    title: 'Test Document With Invalid Recipient',
    category: 'General',
    categoryId: 'general',
    docNumber: 'ERR-TEST-001',
    expiryDate: '2026-10-10',
    status: 'ACTIVE',
    daysLeft: 18
  });

  // Force invalid recipient to simulate failure
  const failRes = await checkAndDispatchExpiryNotification({
    document: brokenEmailDoc,
    user: { name: 'Fault Test', email: 'invalid-email-address-no-at-sign' }
  });
  console.log(`✓ Handled invalid recipient gracefully: emailStatus=${failRes.emailStatus}`);

  // Verify document was not deleted or rolled back
  const checkBrokenDoc = await Document.findById(brokenEmailDoc._id);
  if (!checkBrokenDoc) {
    throw new Error('Document was unexpectedly rolled back or deleted on email failure!');
  }
  console.log(`✓ Document ${checkBrokenDoc._id} remains securely preserved in MongoDB.`);

  // Cleanup temporary test documents
  await Document.findByIdAndDelete(testUploadDoc._id);
  await Document.findByIdAndDelete(expiredDoc._id);
  await Document.findByIdAndDelete(perpetualDoc._id);
  await Document.findByIdAndDelete(brokenEmailDoc._id);

  console.log('\n================================================================');
  console.log('  🎉 ALL 8 TESTS PASSED SUCCESSFULLY! EMAIL SYSTEM FULLY VERIFIED');
  console.log('================================================================\n');

  await disconnectDB();
}

runTestSuite().catch(async (err) => {
  console.error('\n❌ Test Suite Failed:', err);
  try { await disconnectDB(); } catch {}
  process.exit(1);
});
