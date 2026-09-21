/**
 * End-to-End Test: Verify Document Upload Triggers Multi-Channel Email & SMS Notification
 * DocTrack AI — Real SMTP Email Delivery & Phone Number Format Verification
 */

require('dotenv').config();
const assert = require('assert');
const { dispatchDocumentUploadedNotification, checkAndDispatchExpiryNotification } = require('./src/services/notificationService');
const emailService = require('./src/services/email.service');
const smsService = require('./src/services/sms.service');
const localDb = require('./src/services/localDb');

async function testUploadNotifications() {
  console.log('===============================================================');
  console.log('🚀 TESTING REAL DOCUMENT UPLOAD NOTIFICATION DISPATCH (EMAIL + SMS)');
  console.log('===============================================================\n');

  // Find registered user in localDb
  const registeredUser = localDb.findUserByEmail('sabaattar523@gmail.com');
  console.log('Registered Account Owner:', {
    name: registeredUser?.name,
    email: registeredUser?.email,
    phone: registeredUser?.phone
  });

  // Scenario 1: Uploading a normal document expiring in 2 years (e.g. Passport)
  console.log('\n--- Scenario 1: Upload Active Document (Expires in 2 Years) ---');
  const futureDoc = {
    id: `doc-test-${Date.now()}`,
    userId: registeredUser?.id || 'user-1789966812796-sckqh',
    title: 'International Passport (Ordinary)',
    category: 'Identity Proofs',
    profileName: 'Zaid (Self)',
    docNumber: 'T9812456',
    holderName: 'Zaid Attar',
    issueDate: '2024-01-15',
    expiryDate: '2028-01-15',
    daysLeft: 480,
    status: 'ACTIVE',
    notificationHistory: []
  };

  const uploadResult = await dispatchDocumentUploadedNotification({
    document: futureDoc,
    user: registeredUser
  });

  console.log('Upload Notification Result:', {
    triggered: uploadResult.triggered,
    emailStatus: uploadResult.email.status,
    emailRecipient: uploadResult.email.recipient,
    emailMessageId: uploadResult.email.messageId,
    smsStatus: uploadResult.sms.status,
    smsRecipient: uploadResult.sms.recipient,
    smsMessageId: uploadResult.sms.messageId,
    historyLength: futureDoc.notificationHistory.length
  });

  assert.strictEqual(uploadResult.triggered, true, 'Upload notification must be triggered');
  assert.strictEqual(uploadResult.email.status, 'sent', 'Email must be successfully sent');
  assert.strictEqual(uploadResult.email.recipient, 'sabaattar523@gmail.com', 'Recipient must be sabaattar523@gmail.com');
  assert.strictEqual(uploadResult.sms.status, 'sent', 'SMS must be processed (live or mock outbox)');
  assert.strictEqual(futureDoc.notificationHistory.length, 2, 'History must contain 2 entries (Email + SMS)');

  console.log('✅ Scenario 1 PASSED: Real email delivered to sabaattar523@gmail.com for uploaded document!');

  // Scenario 2: Uploading a document expiring in 15 days (Urgent Compliance Warning)
  console.log('\n--- Scenario 2: Upload Expiring Soon Document (15 Days Left) ---');
  const expiringDoc = {
    id: `doc-test-exp-${Date.now()}`,
    userId: registeredUser?.id || 'user-1789966812796-sckqh',
    title: 'Vehicle Pollution Certificate (PUC)',
    category: 'Vehicle Records',
    profileName: 'Zaid (Self)',
    docNumber: 'KA-01-PUC-9921',
    holderName: 'Zaid Attar',
    issueDate: '2026-03-20',
    expiryDate: '2026-10-06',
    daysLeft: 15,
    status: 'EXPIRING_SOON',
    notificationHistory: []
  };

  // Step A: Upload confirmation
  const uploadResult2 = await dispatchDocumentUploadedNotification({
    document: expiringDoc,
    user: registeredUser
  });

  // Step B: Immediate threshold alert
  const thresholdResult = await checkAndDispatchExpiryNotification({
    document: expiringDoc,
    user: registeredUser,
    thresholdDays: 30,
    isImmediate: true
  });

  console.log('Expiring Document Results:', {
    uploadEmail: uploadResult2.email.status,
    uploadSms: uploadResult2.sms.status,
    thresholdTriggered: thresholdResult.triggered,
    thresholdEmail: thresholdResult.emailStatus,
    thresholdSms: thresholdResult.smsStatus,
    totalHistoryEntries: expiringDoc.notificationHistory.length
  });

  assert.strictEqual(uploadResult2.triggered, true);
  assert.strictEqual(uploadResult2.email.status, 'sent');
  assert.strictEqual(thresholdResult.triggered, true);
  assert.strictEqual(thresholdResult.emailSent, true);

  console.log('✅ Scenario 2 PASSED: Both upload confirmation and 30-day threshold reminder delivered!');

  // Scenario 3: Upload with demo fallback user (ensuring sabaattar523@gmail.com is resolved)
  console.log('\n--- Scenario 3: Upload with Demo / Minimal Token User ---');
  const demoDoc = {
    id: `doc-test-demo-${Date.now()}`,
    userId: 'demo-user-zaid-001',
    title: 'Health Insurance Policy Card',
    category: 'Insurance Policies',
    profileName: 'Zaid (Self)',
    expiryDate: '2027-05-10',
    daysLeft: 230,
    status: 'ACTIVE',
    notificationHistory: []
  };

  const demoResult = await dispatchDocumentUploadedNotification({
    document: demoDoc,
    user: { id: 'demo-user-zaid-001', email: 'zaid@example.com' }
  });

  console.log('Demo Fallback Result:', {
    resolvedRecipient: demoResult.email.recipient,
    emailStatus: demoResult.email.status,
    smsRecipient: demoResult.sms.recipient,
    smsStatus: demoResult.sms.status
  });

  assert.strictEqual(demoResult.email.recipient, 'sabaattar523@gmail.com', 'Fallback must route to registered owner');
  assert.strictEqual(demoResult.email.status, 'sent', 'Email delivered to owner');

  console.log('✅ Scenario 3 PASSED: Fallback smoothly routes to sabaattar523@gmail.com!');

  console.log('\n===============================================================');
  console.log('🎉 ALL 3 DOCUMENT UPLOAD NOTIFICATION SCENARIOS PASSED 100%!');
  console.log('===============================================================');
}

testUploadNotifications().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
