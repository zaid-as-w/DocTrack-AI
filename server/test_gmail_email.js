/**
 * Comprehensive Unit and Integration Test Suite for Google Gmail API Email Service (OAuth2)
 * Using googleapis (google.gmail({ version: 'v1' }))
 * DocTrack AI — Automated Document Expiry & Renewal System
 *
 * Mocks Google Gmail API calls to guarantee NO real emails are ever dispatched.
 */

const assert = require('assert');
const emailService = require('./src/services/email.service');
const {
  dispatchDocumentUploadedNotification,
  checkAndDispatchExpiryNotification,
  checkAndDispatchWarrantyExpiryNotification
} = require('./src/services/notificationService');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function recordPass(testName) {
  totalTests++;
  passedTests++;
  console.log(`  ✔ [PASS] ${testName}`);
}

function recordFail(testName, err) {
  totalTests++;
  failedTests++;
  console.error(`  ✗ [FAIL] ${testName}:`, err.message);
}

// Track sent messages and mock responses
let capturedRequests = [];
let mockBehavior = {
  profileSuccess: true,
  profileError: null,
  sendSuccess: true,
  sendError: null,
  counter: 100
};

const createMockGmailClient = () => ({
  users: {
    getProfile: async (params) => {
      capturedRequests.push({ api: 'getProfile', params });
      if (!mockBehavior.profileSuccess) {
        throw mockBehavior.profileError || new Error('invalid_grant: Bad Request');
      }
      return {
        data: {
          emailAddress: 'authorized-sender@gmail.com',
          messagesTotal: 120,
          threadsTotal: 85,
          historyId: '998877'
        }
      };
    },
    messages: {
      send: async (params) => {
        capturedRequests.push({ api: 'messages.send', params });
        if (!mockBehavior.sendSuccess) {
          throw mockBehavior.sendError || new Error('Gmail API send rejected');
        }
        mockBehavior.counter++;
        return {
          data: {
            id: `gmail-msg-${mockBehavior.counter}-${Date.now()}`,
            threadId: `thread-${mockBehavior.counter}`,
            labelIds: ['SENT']
          }
        };
      }
    }
  }
});

async function runAllTests() {
  console.log('================================================================');
  console.log('  DocTrack AI — Google Gmail API (OAuth2) Test Suite            ');
  console.log('================================================================\n');

  // Backup existing environment
  const origUser = process.env.GMAIL_USER;
  const origClientId = process.env.GOOGLE_CLIENT_ID;
  const origSecret = process.env.GOOGLE_CLIENT_SECRET;
  const origRefresh = process.env.GOOGLE_REFRESH_TOKEN;

  // -------------------------------------------------------------
  // Test 1: Missing Environment Variables Detection
  // -------------------------------------------------------------
  try {
    delete process.env.GMAIL_USER;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REFRESH_TOKEN;

    emailService.setGmailClient(null);
    assert.strictEqual(emailService.isConfigured(), false, 'Should be unconfigured when env vars are missing');

    let threw = false;
    try {
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Hello'
      });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.code, 'CONFIG_MISSING', 'Error code should be CONFIG_MISSING');
      assert.ok(err.message.includes('incomplete'), 'Error message should explain missing credentials');
    }
    assert.ok(threw, 'sendEmail should throw when configuration is missing');
    recordPass('Test 1: Rejects execution cleanly when Gmail OAuth2 credentials missing');
  } catch (err) {
    recordFail('Test 1: Rejects execution cleanly when Gmail OAuth2 credentials missing', err);
  }

  // -------------------------------------------------------------
  // Test 2: Valid Configuration Initialization
  // -------------------------------------------------------------
  try {
    process.env.GMAIL_USER = 'notifications@doctrack.ai';
    process.env.GOOGLE_CLIENT_ID = 'mock-client-id-12345.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-mock-client-secret-998877';
    process.env.GOOGLE_REFRESH_TOKEN = '1//04mock-refresh-token-xyz-abc';

    assert.strictEqual(emailService.isConfigured(), true, 'Should be configured when all 4 vars present');
    recordPass('Test 2: Initializes and reports configured when OAuth2 credentials are present');
  } catch (err) {
    recordFail('Test 2: Initializes and reports configured when OAuth2 credentials are present', err);
  }

  // Inject mock Gmail client
  const mockClient = createMockGmailClient();
  emailService.setGmailClient(mockClient);

  // -------------------------------------------------------------
  // Test 3: RFC 2822 MIME Message Construction & Unicode Safety
  // -------------------------------------------------------------
  try {
    const mime = emailService.createMimeMessage({
      from: 'sender@gmail.com',
      to: 'recipient@example.com',
      subject: 'Test Subject: 🔔 Expiring Soon',
      text: 'Plain text body with emoji 🔔',
      html: '<h1>HTML body with emoji 🔔</h1>'
    });

    assert.ok(mime.includes('From: DocTrack AI <sender@gmail.com>'), 'From header formatted correctly');
    assert.ok(mime.includes('To: recipient@example.com'), 'To header included');
    assert.ok(mime.includes('MIME-Version: 1.0'), 'MIME-Version header present');
    assert.ok(mime.includes('Content-Type: multipart/alternative;'), 'multipart/alternative header present');
    assert.ok(mime.includes('Content-Transfer-Encoding: base64'), 'Base64 transfer encoding used');
    assert.ok(mime.includes('Subject: =?UTF-8?B?'), 'Subject encoded via RFC 2047 UTF-8');
    recordPass('Test 3: RFC 2822 MIME message constructed with multipart and UTF-8 encoding');
  } catch (err) {
    recordFail('Test 3: RFC 2822 MIME message constructed with multipart and UTF-8 encoding', err);
  }

  // -------------------------------------------------------------
  // Test 4: Base64URL Encoding (RFC 4648)
  // -------------------------------------------------------------
  try {
    const rawSample = 'Test String with + and / characters requiring URL-safe encoding ====';
    const encoded = emailService.encodeBase64Url(rawSample);
    assert.ok(!encoded.includes('+'), 'Base64URL must not contain +');
    assert.ok(!encoded.includes('/'), 'Base64URL must not contain /');
    assert.ok(!encoded.includes('='), 'Base64URL must not contain = padding');
    assert.ok(/^[A-Za-z0-9_-]+$/.test(encoded), 'Must only contain valid Base64URL characters');
    recordPass('Test 4: Base64URL encoding strictly complies with RFC 4648');
  } catch (err) {
    recordFail('Test 4: Base64URL encoding strictly complies with RFC 4648', err);
  }

  // -------------------------------------------------------------
  // Test 5: Successful Gmail API Delivery & Receipt Tracking
  // -------------------------------------------------------------
  try {
    capturedRequests = [];
    mockBehavior.sendSuccess = true;

    const receipt = await emailService.sendEmail({
      to: 'user@example.com',
      subject: 'Passport Expiry Notice',
      html: '<p>Your passport is expiring in 30 days.</p>',
      type: 'EXPIRY_ALERT'
    });

    assert.strictEqual(receipt.success, true);
    assert.strictEqual(receipt.delivered, true);
    assert.strictEqual(receipt.mode, 'gmail-api');
    assert.strictEqual(receipt.recipient, 'user@example.com');
    assert.ok(receipt.messageId.startsWith('gmail-msg-'), 'MessageId must come from Gmail API');

    assert.strictEqual(capturedRequests.length, 1);
    const apiCall = capturedRequests[0];
    assert.strictEqual(apiCall.api, 'messages.send');
    assert.strictEqual(apiCall.params.userId, 'me');
    assert.ok(apiCall.params.requestBody.raw, 'Raw Base64URL message supplied to Gmail API');

    recordPass('Test 5: Successfully dispatches message to Gmail API (userId: me, raw encoded)');
  } catch (err) {
    recordFail('Test 5: Successfully dispatches message to Gmail API', err);
  }

  // -------------------------------------------------------------
  // Test 6: Input Validation (Missing Recipient, Bad Email, Empty Body)
  // -------------------------------------------------------------
  try {
    let badToCaught = false;
    try {
      await emailService.sendEmail({ to: 'invalid-email-string', subject: 'Hi', text: 'Hello' });
    } catch (e) {
      badToCaught = true;
      assert.strictEqual(e.code, 'INVALID_RECIPIENT');
    }
    assert.ok(badToCaught, 'Invalid email address must be rejected');

    let noBodyCaught = false;
    try {
      await emailService.sendEmail({ to: 'valid@example.com', subject: 'Hi' });
    } catch (e) {
      noBodyCaught = true;
      assert.strictEqual(e.code, 'INVALID_INPUT');
    }
    assert.ok(noBodyCaught, 'Missing body must be rejected');

    recordPass('Test 6: Validates inputs and rejects invalid recipients or missing content');
  } catch (err) {
    recordFail('Test 6: Validates inputs and rejects invalid recipients or missing content', err);
  }

  // -------------------------------------------------------------
  // Test 7: OAuth2 Authorization Failure (invalid_grant / 401)
  // -------------------------------------------------------------
  try {
    mockBehavior.sendSuccess = false;
    const authError = new Error('invalid_grant: Token has been expired or revoked.');
    authError.code = 400;
    mockBehavior.sendError = authError;

    let caught = false;
    try {
      await emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test Auth Failure',
        text: 'Should fail gracefully'
      });
    } catch (err) {
      caught = true;
      assert.strictEqual(err.code, 'OAUTH_INVALID_GRANT');
      assert.strictEqual(err.statusCode, 401);
      assert.ok(err.remediation.includes('OAuth Playground'), 'Remediation should guide re-authentication');
      // Ensure no raw secrets leaked
      assert.ok(!err.message.includes('mock-client-secret'));
      assert.ok(!err.message.includes('mock-refresh-token'));
    }
    assert.ok(caught, 'Auth failure must be handled and sanitized');
    recordPass('Test 7: Sanitizes OAuth2 authorization failure without leaking secrets');
  } catch (err) {
    recordFail('Test 7: Sanitizes OAuth2 authorization failure without leaking secrets', err);
  }

  // -------------------------------------------------------------
  // Test 8: Gmail API Quota Error Handling (429 / 403 quotaExceeded)
  // -------------------------------------------------------------
  try {
    mockBehavior.sendSuccess = false;
    const quotaError = new Error('User-rate limit exceeded: quotaExceeded');
    quotaError.code = 429;
    mockBehavior.sendError = quotaError;

    let caught = false;
    try {
      await emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test Quota Failure',
        text: 'Should report quota'
      });
    } catch (err) {
      caught = true;
      assert.strictEqual(err.code, 'GMAIL_QUOTA_EXCEEDED');
      assert.strictEqual(err.statusCode, 429);
      assert.ok(err.remediation.includes('quota'));
    }
    assert.ok(caught, 'Quota limit error must be caught');
    recordPass('Test 8: Gracefully classifies and reports Gmail API quota limits');
  } catch (err) {
    recordFail('Test 8: Gracefully classifies and reports Gmail API quota limits', err);
  }

  // -------------------------------------------------------------
  // Test 9: Startup Verification via users.getProfile({ userId: 'me' })
  // -------------------------------------------------------------
  try {
    capturedRequests = [];
    mockBehavior.profileSuccess = true;
    const verified = await emailService.verifyGmailConnection();
    assert.strictEqual(verified, true, 'verifyGmailConnection should return true when profile succeeds');
    assert.strictEqual(capturedRequests[0].api, 'getProfile');
    assert.strictEqual(capturedRequests[0].params.userId, 'me');
    recordPass('Test 9: Startup verification calls users.getProfile without sending real email');
  } catch (err) {
    recordFail('Test 9: Startup verification calls users.getProfile', err);
  }

  // -------------------------------------------------------------
  // Test 10: HTML Escaping on User Inputs (XSS Prevention)
  // -------------------------------------------------------------
  try {
    const malicious = '<script>alert("xss")</script> & \'test\'';
    const escaped = emailService.escapeHtml(malicious);
    assert.strictEqual(escaped.includes('<script>'), false);
    assert.ok(escaped.includes('&lt;script&gt;'));
    assert.ok(escaped.includes('&amp;'));
    assert.ok(escaped.includes('&quot;'));
    assert.ok(escaped.includes('&#39;'));
    recordPass('Test 10: HTML escaping prevents injection across rendered email templates');
  } catch (err) {
    recordFail('Test 10: HTML escaping prevents injection', err);
  }

  // -------------------------------------------------------------
  // Test 11: All 9 Application Templates Dispatch Successfully
  // -------------------------------------------------------------
  try {
    mockBehavior.sendSuccess = true;
    const testUser = { name: 'Zaid Attar', email: 'zaid@doctrack.ai' };
    const testDoc = {
      _id: 'doc-mock-123',
      title: 'International Passport',
      category: 'Identity Proofs',
      profileName: 'Zaid Personal',
      expiryDate: '2028-05-20',
      status: 'ACTIVE'
    };
    const testWarranty = {
      id: 'war-mock-456',
      productName: 'MacBook Pro M3',
      brand: 'Apple',
      expiryDate: '2027-11-10',
      coverageType: 'AppleCare+'
    };

    // 1. Welcome
    const r1 = await emailService.sendWelcomeEmail(testUser);
    assert.strictEqual(r1.type, 'WELCOME');

    // 2. Verification
    const r2 = await emailService.sendEmailVerification(testUser, 'tok-verify-123');
    assert.strictEqual(r2.type, 'EMAIL_VERIFICATION');

    // 3. Password Reset Link
    const r3 = await emailService.sendPasswordReset(testUser, 'tok-reset-456');
    assert.strictEqual(r3.type, 'PASSWORD_RESET');

    // 4. OTP Reset
    const r4 = await emailService.sendOtpEmail(testUser, '491823');
    assert.strictEqual(r4.type, 'OTP_RESET');

    // 5. Expiry Reminder
    const r5 = await emailService.sendDocumentExpiryReminder({ user: testUser, document: testDoc, daysLeft: 30, threshold: 30 });
    assert.strictEqual(r5.type, 'DOCUMENT_EXPIRY_REMINDER');

    // 6. Expired Notification
    const r6 = await emailService.sendDocumentExpiredNotification({ user: testUser, document: testDoc });
    assert.strictEqual(r6.type, 'DOCUMENT_EXPIRED');

    // 7. Renewal Reminder
    const r7 = await emailService.sendRenewalReminder({ user: testUser, document: testDoc, renewalGuide: { portalName: 'Passport Seva' } });
    assert.strictEqual(r7.type, 'RENEWAL_REMINDER');

    // 8. Warranty Expiry
    const r8 = await emailService.sendWarrantyExpiryNotification({ user: testUser, warranty: testWarranty, daysRemaining: 15 });
    assert.strictEqual(r8.type, 'WARRANTY_EXPIRY');

    // 9. Upload Ingestion
    const r9 = await emailService.sendDocumentUploadedEmail({ user: testUser, document: testDoc, daysLeft: 120 });
    assert.strictEqual(r9.type, 'DOCUMENT_UPLOADED');

    recordPass('Test 11: All 9 application email templates dispatch successfully via Gmail API');
  } catch (err) {
    recordFail('Test 11: All 9 application email templates dispatch successfully', err);
  }

  // -------------------------------------------------------------
  // Test 12: NotificationService Integration (Upload & Expiry Workflows)
  // -------------------------------------------------------------
  try {
    mockBehavior.sendSuccess = true;
    const testDoc = {
      id: 'doc-notif-integration',
      userId: 'test-user-id',
      profileName: 'Integration Tester',
      title: 'Commercial Pilot License',
      category: 'Professional License',
      expiryDate: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0], // 25 days left -> 30d threshold
      status: 'EXPIRING_SOON',
      daysLeft: 25,
      notificationHistory: []
    };
    const testUser = { id: 'test-user-id', name: 'Integration Tester', email: 'tester@doctrack.ai' };

    // Upload notification workflow
    const uploadRes = await dispatchDocumentUploadedNotification({ document: testDoc, user: testUser });
    assert.strictEqual(uploadRes.triggered, true);
    assert.strictEqual(uploadRes.email.status, 'sent');
    assert.ok(uploadRes.email.messageId.startsWith('gmail-msg-'));

    // Expiry reminder workflow
    const expiryRes = await checkAndDispatchExpiryNotification({ document: testDoc, user: testUser, thresholdDays: 30 });
    assert.strictEqual(expiryRes.triggered, true);
    assert.strictEqual(expiryRes.emailSent, true);
    assert.strictEqual(expiryRes.emailStatus, 'sent');

    recordPass('Test 12: notificationService seamlessly routes upload & expiry reminders through Gmail API');
  } catch (err) {
    recordFail('Test 12: notificationService seamlessly routes upload & expiry reminders', err);
  }

  // Restore environment
  if (origUser) process.env.GMAIL_USER = origUser; else delete process.env.GMAIL_USER;
  if (origClientId) process.env.GOOGLE_CLIENT_ID = origClientId; else delete process.env.GOOGLE_CLIENT_ID;
  if (origSecret) process.env.GOOGLE_CLIENT_SECRET = origSecret; else delete process.env.GOOGLE_CLIENT_SECRET;
  if (origRefresh) process.env.GOOGLE_REFRESH_TOKEN = origRefresh; else delete process.env.GOOGLE_REFRESH_TOKEN;

  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passedTests} passed, ${failedTests} failed, ${totalTests} total`);
  console.log('----------------------------------------------------------------\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test Suite crashed:', err);
  process.exit(1);
});
