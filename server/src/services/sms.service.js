/**
 * Multi-Provider SMS Service
 * DocTrack AI — Automated Document Expiry & Renewal System
 *
 * Provider priority:
 *   1. Fast2SMS  — India-native, no DLT registration needed (FAST2SMS_API_KEY)
 *   2. Twilio    — International, requires DLT template for Indian numbers
 *   3. Mock      — Local outbox receipt (always succeeds as final fallback)
 */

const https = require('https');
const http = require('http');
const querystring = require('querystring');
const config = require('../config/env');

// ─── Provider configuration ────────────────────────────────────────────────────

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || '';
const isFast2SmsConfigured = Boolean(
  FAST2SMS_API_KEY &&
  !FAST2SMS_API_KEY.startsWith('YOUR_') &&
  FAST2SMS_API_KEY.length > 10
);

const isTwilioConfigured = Boolean(
  config.twilio.accountSid &&
  config.twilio.phoneNumber &&
  (process.env.TWILIO_AUTH_TOKEN || config.twilio.apiKey)
);

// In-memory mock SMS outbox
const mockSmsOutbox = [];

// ─── Phone number normalizer ───────────────────────────────────────────────────

/**
 * Normalize phone number to E.164 format (+91XXXXXXXXXX)
 */
const normalizePhoneNumber = (phone, defaultCountryCode = '+91') => {
  if (!phone) return '';
  const str = String(phone).trim();
  let cleaned = str.replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.substring(1);
  if (cleaned.length === 10) return defaultCountryCode + cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return '+' + cleaned;
  return '+' + cleaned;
};

/**
 * Extract 10-digit number from E.164 Indian number for Fast2SMS
 * Fast2SMS expects numbers without country code (10 digits)
 */
const toFast2SmsNumber = (phone) => {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return '';
  // Remove +91 prefix
  if (normalized.startsWith('+91') && normalized.length === 13) {
    return normalized.slice(3);
  }
  // Remove +91 or just return last 10 digits
  const digits = normalized.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
};

// ─── Fast2SMS Provider ─────────────────────────────────────────────────────────

/**
 * Send SMS via Fast2SMS Quick SMS API
 * Docs: https://www.fast2sms.com/dashboard/dev-api
 * No DLT template registration required for Quick SMS
 */
const sendFast2Sms = (to, message) => {
  return new Promise((resolve, reject) => {
    const mobileNumber = toFast2SmsNumber(to);
    if (!mobileNumber || mobileNumber.length !== 10) {
      return reject(new Error('Fast2SMS: Invalid Indian mobile number: ' + to));
    }

    const postData = JSON.stringify({
      route: 'q',          // Quick SMS route (no DLT needed)
      message: message,
      language: 'english',
      flash: 0,
      numbers: mobileNumber
    });

    const options = {
      hostname: 'www.fast2sms.com',
      port: 443,
      path: '/dev/bulkV2',
      method: 'POST',
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Fast2SMS returns { return: true, request_id: '...', message: [...] } on success
          if (parsed.return === true || parsed.return === 'true') {
            resolve({
              success: true,
              messageId: parsed.request_id || ('F2S-' + Date.now()),
              provider: 'fast2sms',
              recipient: mobileNumber
            });
          } else {
            const errMsg = (Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message) || 'Fast2SMS error';
            reject(new Error('Fast2SMS: ' + errMsg));
          }
        } catch (e) {
          reject(new Error('Fast2SMS response parse error: ' + e.message + ' | raw: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Fast2SMS request timed out'));
    });

    req.on('error', (err) => {
      reject(new Error('Fast2SMS network error: ' + err.message));
    });

    req.write(postData);
    req.end();
  });
};

// ─── Twilio Provider ───────────────────────────────────────────────────────────

const sendTwilioRestSms = (to, body) => {
  return new Promise((resolve, reject) => {
    const accountSid = config.twilio.accountSid;
    const fromPhone = config.twilio.phoneNumber;
    const normalizedTo = normalizePhoneNumber(to);

    // Auth priority: AuthToken > ApiKey/Secret
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    const authUsername = authToken ? accountSid : (config.twilio.apiKey || accountSid);
    const authPassword = authToken || config.twilio.apiSecret || '';

    const postData = querystring.stringify({
      To: normalizedTo,
      From: fromPhone,
      Body: body
    });

    const authHeader = Buffer.from(authUsername + ':' + authPassword).toString('base64');

    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: '/2010-04-01/Accounts/' + accountSid + '/Messages.json',
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              messageId: parsed.sid || ('SM' + Date.now()),
              provider: 'twilio',
              status: parsed.status
            });
          } else {
            reject(new Error(parsed.message || ('Twilio HTTP ' + res.statusCode + ' code:' + (parsed.code || 'unknown'))));
          }
        } catch (e) {
          reject(new Error('Failed to parse Twilio response: ' + e.message));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Twilio request timed out'));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

// ─── Primary sendSms dispatcher ────────────────────────────────────────────────

/**
 * Send SMS with multi-provider failover:
 *   Fast2SMS → Twilio → Mock
 */
const sendSms = async ({ to, message }) => {
  const deliveryId = 'SMS-' + Math.floor(10000 + Math.random() * 90000);
  const normalizedRecipient = normalizePhoneNumber(to) || '+917019182324';

  // ── 1. Fast2SMS (preferred for Indian numbers) ──────────────────────────────
  if (isFast2SmsConfigured) {
    try {
      const f2sRes = await sendFast2Sms(normalizedRecipient, message);
      console.log('[SMS Service] ✅ Fast2SMS sent to ' + normalizedRecipient + ' (ID: ' + f2sRes.messageId + ')');
      return {
        success: true,
        delivered: true,
        mode: 'fast2sms',
        messageId: f2sRes.messageId,
        recipient: normalizedRecipient
      };
    } catch (err) {
      console.warn('[SMS Service] Fast2SMS failed: ' + err.message + '. Trying Twilio...');
    }
  }

  // ── 2. Twilio fallback ──────────────────────────────────────────────────────
  if (isTwilioConfigured && normalizedRecipient && message) {
    try {
      const twilioRes = await sendTwilioRestSms(normalizedRecipient, message);
      console.log('[SMS Service] ✅ Twilio SMS sent to ' + normalizedRecipient + ' (SID: ' + twilioRes.messageId + ')');
      return {
        success: true,
        delivered: true,
        mode: 'twilio',
        messageId: twilioRes.messageId,
        recipient: normalizedRecipient
      };
    } catch (err) {
      console.warn('[SMS Service] Twilio failed: ' + err.message + '. Falling back to mock.');
    }
  }

  // ── 3. Mock receipt fallback ────────────────────────────────────────────────
  const mockReceipt = {
    id: deliveryId,
    to: normalizedRecipient,
    message,
    sentAt: new Date().toISOString(),
    status: 'DELIVERED_MOCK',
    mode: 'mock'
  };
  mockSmsOutbox.push(mockReceipt);
  if (mockSmsOutbox.length > 100) mockSmsOutbox.shift();

  console.log('[SMS Service] Mock SMS saved for ' + normalizedRecipient + ' (ID: ' + deliveryId + ')');

  return {
    success: true,
    delivered: true,
    mode: 'mock',
    messageId: deliveryId,
    recipient: normalizedRecipient
  };
};

// ─── Typed dispatch helpers ────────────────────────────────────────────────────

/**
 * Dispatch Document Uploaded SMS notification
 */
const sendDocumentUploadedSms = async ({ to, documentTitle, expiryDate, daysLeft = null, status = 'ACTIVE' }) => {
  const isExpired = status === 'EXPIRED' || (daysLeft !== null && daysLeft < 0);
  const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && !isExpired;

  let message = '';
  if (isExpired) {
    message = '[DocTrack AI] "' + documentTitle + '" uploaded. ALERT: This document EXPIRED on ' + (expiryDate || 'N/A') + '. Renew at doc-track-ai.vercel.app';
  } else if (isExpiringSoon) {
    message = '[DocTrack AI] "' + documentTitle + '" uploaded. NOTICE: Expires in ' + daysLeft + ' days (' + expiryDate + '). Renew at doc-track-ai.vercel.app';
  } else {
    message = '[DocTrack AI] "' + documentTitle + '" uploaded & secured in your vault. Status: ' + (status || 'ACTIVE') + (expiryDate && expiryDate !== 'Perpetual' ? ', Expiry: ' + expiryDate : '') + '.';
  }

  return sendSms({ to, message });
};

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  isConfigured: () => isFast2SmsConfigured || isTwilioConfigured,
  isFast2SmsConfigured: () => isFast2SmsConfigured,
  isTwilioConfigured: () => isTwilioConfigured,
  normalizePhoneNumber,
  sendSms,
  sendDocumentUploadedSms,
  getMockOutbox: () => mockSmsOutbox
};
