/**
 * Production Twilio Communications Service (SMS & Voice Calls)
 * DocTrack AI — Automated Document Expiry & Renewal System
 * Official Twilio SDK integration
 */

const twilio = require('twilio');
const config = require('../config/env');

let customTwilioClient = null;

/**
 * Dependency injection for automated test suites
 */
const setTwilioClient = (client) => {
  customTwilioClient = client;
};

/**
 * Normalize phone number to strict E.164 format (+[country code][number])
 */
const normalizePhoneNumber = (phone, defaultCountryCode = '+91') => {
  if (!phone) return '';
  const str = String(phone).trim();
  const cleaned = str.replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 11) return defaultCountryCode + cleaned.substring(1);
  if (cleaned.length === 10) return defaultCountryCode + cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return '+' + cleaned;
  return '+' + cleaned;
};

/**
 * Returns true if Twilio credentials & sender identities are configured
 */
const isConfigured = () => {
  const sid = (process.env.TWILIO_ACCOUNT_SID !== undefined ? process.env.TWILIO_ACCOUNT_SID : config.twilio?.accountSid) || '';
  const auth = (process.env.TWILIO_AUTH_TOKEN !== undefined ? process.env.TWILIO_AUTH_TOKEN : config.twilio?.authToken) || (config.twilio?.apiKey && config.twilio?.apiSecret) || '';
  const sender = (process.env.TWILIO_PHONE_NUMBER !== undefined ? process.env.TWILIO_PHONE_NUMBER : config.twilio?.phoneNumber) || process.env.TWILIO_MESSAGING_SERVICE_SID || config.twilio?.messagingServiceSid || '';
  return Boolean(sid && auth && sender);
};

/**
 * Obtain or instantiate Twilio SDK client
 */
const getTwilioClient = () => {
  if (customTwilioClient) return customTwilioClient;

  const accountSid = (process.env.TWILIO_ACCOUNT_SID !== undefined ? process.env.TWILIO_ACCOUNT_SID : config.twilio?.accountSid) || '';
  const authToken = (process.env.TWILIO_AUTH_TOKEN !== undefined ? process.env.TWILIO_AUTH_TOKEN : config.twilio?.authToken) || '';
  const apiKey = (process.env.TWILIO_API_KEY !== undefined ? process.env.TWILIO_API_KEY : config.twilio?.apiKey) || '';
  const apiSecret = (process.env.TWILIO_API_SECRET !== undefined ? process.env.TWILIO_API_SECRET : config.twilio?.apiSecret) || '';

  if (!accountSid) {
    throw new Error('TWILIO_ACCOUNT_SID is not configured.');
  }

  if (authToken) {
    return twilio(accountSid, authToken);
  }

  if (apiKey && apiSecret) {
    return twilio(apiKey, apiSecret, { accountSid });
  }

  throw new Error('Twilio credentials missing. Provide TWILIO_AUTH_TOKEN or TWILIO_API_KEY & TWILIO_API_SECRET.');
};

/**
 * Safe, read-only Twilio diagnostic check
 * Queries Account details without dispatching messages or making calls.
 */
const verifyTwilioConnection = async () => {
  if (!isConfigured()) {
    return {
      connected: false,
      reason: 'Twilio configuration is incomplete (Account SID, Auth Token/API Key, or Phone Number missing).'
    };
  }

  try {
    const client = getTwilioClient();
    const accountSid = process.env.TWILIO_ACCOUNT_SID || config.twilio?.accountSid;
    const account = await client.api.v2010.accounts(accountSid).fetch();

    return {
      connected: true,
      status: account.status,
      type: account.type, // 'Trial' or 'Full'
      friendlyName: account.friendlyName,
      senderNumber: process.env.TWILIO_PHONE_NUMBER || config.twilio?.phoneNumber || 'MessagingService'
    };
  } catch (err) {
    return {
      connected: false,
      code: err.code || 'TWILIO_AUTH_FAILED',
      message: err.message
    };
  }
};

/**
 * Parse Twilio error codes and provide actionable, safe remediation
 */
const formatTwilioError = (err, recipient = '') => {
  const code = err.code || (err.status ? `HTTP_${err.status}` : 'UNKNOWN_TWILIO_ERROR');
  let remediation = '';

  switch (err.code) {
    case 21608:
      remediation = `Twilio Trial restriction: Destination ${recipient} is not a verified Caller ID. Verify this number in Twilio Console > Phone Numbers > Verified Caller IDs or upgrade your Twilio account.`;
      break;
    case 21606:
    case 21212:
      remediation = 'Twilio Sender error: The configured TWILIO_PHONE_NUMBER is not a valid incoming number on this Twilio account.';
      break;
    case 21408:
      remediation = 'Twilio Geo-Permissions: Region permissions for destination country are not enabled in your Twilio Console.';
      break;
    case 20003:
    case 21614:
      remediation = 'Twilio account has insufficient funds or credit balance.';
      break;
    case 21211:
      remediation = `Invalid phone number format: "${recipient}". Phone numbers must follow E.164 format (+[country code][number]).`;
      break;
    case 20001:
      remediation = 'Twilio request lacked valid authentication credentials.';
      break;
    default:
      remediation = err.message || 'Twilio communication dispatch failed.';
  }

  const customError = new Error(`Twilio dispatch failed [Code ${code}]: ${remediation}`);
  customError.code = code;
  customError.statusCode = err.status || 500;
  customError.remediation = remediation;
  customError.provider = 'twilio';
  return customError;
};

/**
 * Dispatch an SMS notification via Twilio REST API
 */
const sendSms = async ({ to, message, statusCallback = null }) => {
  if (!isConfigured()) {
    const err = new Error('Twilio SMS is not configured. Provide TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment.');
    err.code = 'TWILIO_NOT_CONFIGURED';
    err.statusCode = 503;
    throw err;
  }

  const normalizedTo = normalizePhoneNumber(to);
  if (!normalizedTo || normalizedTo.length < 10) {
    const err = new Error(`Invalid recipient phone number: "${to}". Provide a valid phone number with country code.`);
    err.code = 'INVALID_PHONE_NUMBER';
    err.statusCode = 400;
    throw err;
  }

  if (!message || !message.trim()) {
    const err = new Error('SMS message body is required.');
    err.code = 'EMPTY_MESSAGE_BODY';
    err.statusCode = 400;
    throw err;
  }

  const client = getTwilioClient();
  const fromPhone = process.env.TWILIO_PHONE_NUMBER || config.twilio?.phoneNumber;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || config.twilio?.messagingServiceSid;

  const payload = {
    to: normalizedTo,
    body: message.trim()
  };

  if (messagingServiceSid) {
    payload.messagingServiceSid = messagingServiceSid;
  } else if (fromPhone) {
    payload.from = fromPhone;
  }

  const callbackUrl = statusCallback || process.env.TWILIO_STATUS_CALLBACK_URL || config.twilio?.statusCallbackUrl;
  if (callbackUrl) {
    payload.statusCallback = callbackUrl;
  }

  try {
    const res = await client.messages.create(payload);
    console.log(`[Twilio SMS] Message request accepted for ${normalizedTo} (SID: ${res.sid}, Status: ${res.status})`);

    return {
      success: true,
      provider: 'twilio',
      messageId: res.sid,
      status: res.status, // 'queued', 'sending', 'sent'
      recipient: res.to,
      sender: res.from || messagingServiceSid,
      dateCreated: res.dateCreated
    };
  } catch (err) {
    console.warn(`[Twilio SMS Error] Dispatch to ${normalizedTo} failed (Code: ${err.code || 'unknown'}):`, err.message);
    throw formatTwilioError(err, normalizedTo);
  }
};

/**
 * Dispatch an automated Voice Call via Twilio Voice API
 */
const makeVoiceCall = async ({ to, message, documentTitle = 'Document', daysLeft = null, statusCallback = null }) => {
  if (!isConfigured()) {
    const err = new Error('Twilio Voice is not configured. Provide TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment.');
    err.code = 'TWILIO_NOT_CONFIGURED';
    err.statusCode = 503;
    throw err;
  }

  const normalizedTo = normalizePhoneNumber(to);
  if (!normalizedTo || normalizedTo.length < 10) {
    const err = new Error(`Invalid recipient phone number: "${to}". Provide a valid phone number with country code.`);
    err.code = 'INVALID_PHONE_NUMBER';
    err.statusCode = 400;
    throw err;
  }

  const client = getTwilioClient();
  const fromPhone = process.env.TWILIO_PHONE_NUMBER || config.twilio?.phoneNumber;

  if (!fromPhone) {
    const err = new Error('TWILIO_PHONE_NUMBER is required for outbound voice calls.');
    err.code = 'TWILIO_PHONE_MISSING';
    err.statusCode = 503;
    throw err;
  }

  // Construct valid TwiML voice notification XML
  const cleanTitle = String(documentTitle).replace(/[<>&'"]/g, '');
  const spokenText = message
    ? String(message).replace(/[<>&'"]/g, '')
    : (daysLeft !== null && daysLeft <= 0)
      ? `Hello, this is DocTrack AI. Your document, ${cleanTitle}, has expired. Please log in to your DocTrack AI portal to begin renewal immediately.`
      : `Hello, this is DocTrack AI. Important reminder: Your document, ${cleanTitle}, expires in ${daysLeft} days. Please visit your DocTrack AI portal to review renewal steps. Thank you.`;

  const twiml = `
    <Response>
      <Pause length="1"/>
      <Say voice="alice" language="en-US">${spokenText}</Say>
      <Pause length="1"/>
      <Say voice="alice" language="en-US">Goodbye.</Say>
    </Response>
  `.trim();

  const payload = {
    to: normalizedTo,
    from: fromPhone,
    twiml
  };

  const callbackUrl = statusCallback || process.env.TWILIO_STATUS_CALLBACK_URL || config.twilio?.statusCallbackUrl;
  if (callbackUrl) {
    payload.statusCallback = callbackUrl;
  }

  try {
    const res = await client.calls.create(payload);
    console.log(`[Twilio Voice] Call initiated to ${normalizedTo} (CallSid: ${res.sid}, Status: ${res.status})`);

    return {
      success: true,
      provider: 'twilio',
      callSid: res.sid,
      messageId: res.sid,
      status: res.status, // 'queued', 'ringing', 'in-progress'
      recipient: res.to,
      sender: res.from,
      dateCreated: res.dateCreated
    };
  } catch (err) {
    console.warn(`[Twilio Voice Error] Call to ${normalizedTo} failed (Code: ${err.code || 'unknown'}):`, err.message);
    throw formatTwilioError(err, normalizedTo);
  }
};

/**
 * Specialized helper: Document Uploaded SMS
 */
const sendDocumentUploadedSms = async ({ to, documentTitle, expiryDate, daysLeft = null, status = 'ACTIVE' }) => {
  const isExpired = status === 'EXPIRED' || (daysLeft !== null && daysLeft < 0);
  const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && !isExpired;

  let message = '';
  if (isExpired) {
    message = `[DocTrack AI] "${documentTitle}" uploaded. ALERT: This document EXPIRED on ${expiryDate || 'N/A'}. Action required at doc-track-ai.vercel.app/renewal-assistant`;
  } else if (isExpiringSoon) {
    message = `[DocTrack AI] "${documentTitle}" uploaded. NOTICE: Expires in ${daysLeft} days (${expiryDate}). Review renewal at doc-track-ai.vercel.app/renewal-assistant`;
  } else {
    message = `[DocTrack AI] "${documentTitle}" uploaded & secured in your vault. Status: ${status || 'ACTIVE'}${expiryDate && expiryDate !== 'Perpetual' ? `, Expiry: ${expiryDate}` : ''}.`;
  }

  return sendSms({ to, message });
};

module.exports = {
  isConfigured,
  getTwilioClient,
  setTwilioClient,
  verifyTwilioConnection,
  normalizePhoneNumber,
  sendSms,
  makeVoiceCall,
  sendDocumentUploadedSms
};
