/**
 * Comprehensive Unit and Integration Test Suite for Twilio SMS & Voice Service
 * DocTrack AI — Automated Document Expiry & Renewal System
 *
 * Strictly mocks Twilio API calls so no live SMS or phone calls are dispatched.
 */

const assert = require('assert');
const smsService = require('./src/services/sms.service');
const { sendNotification } = require('./src/services/notificationService');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const recordPass = (name) => {
  totalTests++;
  passedTests++;
  console.log(`  ✓ [PASS] ${name}`);
};

const recordFail = (name, err) => {
  totalTests++;
  failedTests++;
  console.error(`  ✗ [FAIL] ${name}:`, err.message);
};

// Mock Twilio Client Factory
const createMockTwilioClient = (behavior = {}) => {
  const recordedMessages = [];
  const recordedCalls = [];

  return {
    recordedMessages,
    recordedCalls,
    api: {
      v2010: {
        accounts: () => ({
          fetch: async () => {
            if (behavior.accountError) throw behavior.accountError;
            return {
              status: behavior.accountStatus || 'active',
              type: behavior.accountType || 'Trial',
              friendlyName: 'DocTrack Test Twilio Account'
            };
          }
        })
      }
    },
    messages: {
      create: async (payload) => {
        recordedMessages.push(payload);
        if (behavior.smsError) throw behavior.smsError;
        return {
          sid: `SM${Date.now()}`,
          status: 'queued',
          to: payload.to,
          from: payload.from || payload.messagingServiceSid,
          dateCreated: new Date()
        };
      }
    },
    calls: {
      create: async (payload) => {
        recordedCalls.push(payload);
        if (behavior.voiceError) throw behavior.voiceError;
        return {
          sid: `CA${Date.now()}`,
          status: 'queued',
          to: payload.to,
          from: payload.from,
          dateCreated: new Date()
        };
      }
    }
  };
};

async function runTwilioTests() {
  console.log('================================================================');
  console.log('   DocTrack AI — Twilio SMS & Voice Comprehensive Tests         ');
  console.log('================================================================\n');

  // Ensure test mode
  process.env.NODE_ENV = 'test';

  // Save original env vars
  const origSid = process.env.TWILIO_ACCOUNT_SID;
  const origAuth = process.env.TWILIO_AUTH_TOKEN;
  const origPhone = process.env.TWILIO_PHONE_NUMBER;

  // Set test credentials
  process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
  process.env.TWILIO_AUTH_TOKEN = 'authtest123456789012345678901234';
  process.env.TWILIO_PHONE_NUMBER = '+15005550006';

  // Test 1: Phone number normalization to E.164
  try {
    assert.strictEqual(smsService.normalizePhoneNumber('9876543210'), '+919876543210', '10-digit defaults to +91');
    assert.strictEqual(smsService.normalizePhoneNumber('+919876543210'), '+919876543210', 'Preserves +91 prefix');
    assert.strictEqual(smsService.normalizePhoneNumber('09876543210'), '+919876543210', 'Strips leading 0');
    assert.strictEqual(smsService.normalizePhoneNumber('+14155552671'), '+14155552671', 'Preserves US numbers');
    recordPass('Test 1: Phone number normalization conforms to E.164 standard');
  } catch (err) {
    recordFail('Test 1: Phone number normalization conforms to E.164 standard', err);
  }

  // Test 2: Twilio SMS parameter mapping
  try {
    const mockClient = createMockTwilioClient();
    smsService.setTwilioClient(mockClient);

    const res = await smsService.sendSms({
      to: '9876543210',
      message: 'Your passport expires in 15 days.'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.provider, 'twilio');
    assert.strictEqual(mockClient.recordedMessages.length, 1);
    assert.strictEqual(mockClient.recordedMessages[0].to, '+919876543210');
    assert.strictEqual(mockClient.recordedMessages[0].from, '+15005550006');
    assert.strictEqual(mockClient.recordedMessages[0].body, 'Your passport expires in 15 days.');
    recordPass('Test 2: Twilio SMS parameters mapped correctly to client.messages.create');
  } catch (err) {
    recordFail('Test 2: Twilio SMS parameters mapped correctly to client.messages.create', err);
  }

  // Test 3: Twilio Voice parameter mapping & valid TwiML XML
  try {
    const mockClient = createMockTwilioClient();
    smsService.setTwilioClient(mockClient);

    const res = await smsService.makeVoiceCall({
      to: '+919876543210',
      documentTitle: 'Driving Licence',
      daysLeft: 3
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.provider, 'twilio');
    assert.strictEqual(mockClient.recordedCalls.length, 1);
    assert.strictEqual(mockClient.recordedCalls[0].to, '+919876543210');
    assert.strictEqual(mockClient.recordedCalls[0].from, '+15005550006');
    assert.ok(mockClient.recordedCalls[0].twiml.includes('<Response>'), 'TwiML must contain <Response>');
    assert.ok(mockClient.recordedCalls[0].twiml.includes('<Say voice="alice" language="en-US">'), 'TwiML must contain <Say>');
    assert.ok(mockClient.recordedCalls[0].twiml.includes('Driving Licence'), 'TwiML must include document title');
    recordPass('Test 3: Twilio Voice parameter mapping and TwiML XML generation');
  } catch (err) {
    recordFail('Test 3: Twilio Voice parameter mapping and TwiML XML generation', err);
  }

  // Test 4: Missing configuration fails with clear error and NO fake fallback
  try {
    const config = require('./src/config/env');
    const savedConfigSid = config.twilio.accountSid;
    const savedConfigAuth = config.twilio.authToken;

    process.env.TWILIO_ACCOUNT_SID = '';
    process.env.TWILIO_AUTH_TOKEN = '';
    config.twilio.accountSid = '';
    config.twilio.authToken = '';
    smsService.setTwilioClient(null);

    let threw = false;
    try {
      await smsService.sendSms({ to: '+919876543210', message: 'Test' });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.code, 'TWILIO_NOT_CONFIGURED');
    }
    assert.strictEqual(threw, true, 'sendSms must reject when credentials unconfigured');
    recordPass('Test 4: Missing Twilio configuration fails clearly without mock fallback');

    // Restore test credentials
    process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
    process.env.TWILIO_AUTH_TOKEN = 'authtest123456789012345678901234';
    config.twilio.accountSid = savedConfigSid;
    config.twilio.authToken = savedConfigAuth;
  } catch (err) {
    recordFail('Test 4: Missing Twilio configuration fails clearly without mock fallback', err);
  }

  // Test 5: Twilio API errors (e.g. unverified trial number 21608) surface actual remediation
  try {
    const trialError = new Error('The number is unverified.');
    trialError.code = 21608;
    trialError.status = 400;

    const mockClient = createMockTwilioClient({ smsError: trialError });
    smsService.setTwilioClient(mockClient);

    let threwExpected = false;
    try {
      await smsService.sendSms({ to: '+919876543210', message: 'Test' });
    } catch (err) {
      threwExpected = true;
      assert.strictEqual(err.code, 21608);
      assert.ok(err.remediation.includes('Twilio Trial restriction'), 'Remediation must explain trial restriction');
      assert.ok(err.remediation.includes('Verified Caller IDs'), 'Remediation must mention Verified Caller IDs');
    }
    assert.strictEqual(threwExpected, true);
    recordPass('Test 5: Twilio trial restriction (code 21608) surfaces exact cause and remediation');
  } catch (err) {
    recordFail('Test 5: Twilio trial restriction (code 21608) surfaces exact cause and remediation', err);
  }

  // Test 6: verifyTwilioConnection reports account details without sending messages
  try {
    const mockClient = createMockTwilioClient({ accountStatus: 'active', accountType: 'Trial' });
    smsService.setTwilioClient(mockClient);

    const diagnostic = await smsService.verifyTwilioConnection();
    assert.strictEqual(diagnostic.connected, true);
    assert.strictEqual(diagnostic.status, 'active');
    assert.strictEqual(diagnostic.type, 'Trial');
    assert.strictEqual(mockClient.recordedMessages.length, 0, 'Must NOT send messages during diagnostic');
    assert.strictEqual(mockClient.recordedCalls.length, 0, 'Must NOT place calls during diagnostic');
    recordPass('Test 6: verifyTwilioConnection performs read-only diagnostic check without sending messages');
  } catch (err) {
    recordFail('Test 6: verifyTwilioConnection performs read-only diagnostic check without sending messages', err);
  }

  // Test 7: sendNotification with channel SMS and VOICE records accurate provider status
  try {
    const mockClient = createMockTwilioClient();
    smsService.setTwilioClient(mockClient);

    // A. Successful SMS
    const notifSms = await sendNotification({
      userId: 'test-user',
      title: 'Passport Expiry',
      message: 'Your passport expires in 10 days.',
      channel: 'SMS',
      recipient: '+919876543210'
    });
    assert.strictEqual(notifSms.channel, 'SMS');
    assert.strictEqual(notifSms.status, 'SENT');
    assert.ok(notifSms.deliveryReceiptId.startsWith('SM'));

    // B. Successful Voice
    const notifVoice = await sendNotification({
      userId: 'test-user',
      title: 'Vehicle Insurance Urgent Expiry',
      message: 'Your vehicle insurance policy KA01-INS-2918 expires tomorrow.',
      channel: 'VOICE',
      recipient: '+919876543210',
      daysLeft: 1
    });
    assert.strictEqual(notifVoice.channel, 'VOICE');
    assert.strictEqual(notifVoice.status, 'SENT');
    assert.ok(notifVoice.deliveryReceiptId.startsWith('CA'));

    // C. Provider failure throws and does NOT mark DELIVERED
    const failClient = createMockTwilioClient({ smsError: new Error('Twilio Network Error') });
    smsService.setTwilioClient(failClient);

    let threwOnSmsFail = false;
    try {
      await sendNotification({
        userId: 'test-user',
        title: 'Will Fail',
        message: 'Network issue',
        channel: 'SMS',
        recipient: '+919876543210'
      });
    } catch (err) {
      threwOnSmsFail = true;
    }
    assert.strictEqual(threwOnSmsFail, true, 'sendNotification must throw on SMS failure');
    recordPass('Test 7: sendNotification handles SMS & VOICE channels and prevents fake success on failure');
  } catch (err) {
    recordFail('Test 7: sendNotification handles SMS & VOICE channels and prevents fake success on failure', err);
  }

  // Restore original environment
  if (origSid) process.env.TWILIO_ACCOUNT_SID = origSid; else delete process.env.TWILIO_ACCOUNT_SID;
  if (origAuth) process.env.TWILIO_AUTH_TOKEN = origAuth; else delete process.env.TWILIO_AUTH_TOKEN;
  if (origPhone) process.env.TWILIO_PHONE_NUMBER = origPhone; else delete process.env.TWILIO_PHONE_NUMBER;
  smsService.setTwilioClient(null);

  console.log('\n================================================================');
  console.log(`  Tests Complete: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTwilioTests().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
