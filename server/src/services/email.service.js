/**
 * Official Google Gmail API Email Service (OAuth2)
 * Using googleapis Node.js SDK (google.gmail({ version: 'v1' }))
 * DocTrack AI — Automated Document Expiry & Renewal System
 */

const { google } = require('googleapis');
const config = require('../config/env');

const OAUTH_REDIRECT_URI = 'https://developers.google.com/oauthplayground';

// In-memory outbox history for testing, audits, and diagnostics
const mockEmailOutbox = [];

/**
 * Escapes user-controlled text to prevent HTML injection in rendered templates.
 */
const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * RFC 5322 compliant basic email structure validator
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (email) => {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
};

const getGmailUser = () => {
  const user = process.env.GMAIL_USER || config.gmail?.user || '';
  return typeof user === 'string' ? user.trim() : '';
};

const getClientId = () => {
  const cid = process.env.GOOGLE_CLIENT_ID || config.gmail?.clientId || '';
  return typeof cid === 'string' ? cid.trim() : '';
};

const getClientSecret = () => {
  const sec = process.env.GOOGLE_CLIENT_SECRET || config.gmail?.clientSecret || '';
  return typeof sec === 'string' ? sec.trim() : '';
};

const getRefreshToken = () => {
  const tok = process.env.GOOGLE_REFRESH_TOKEN || config.gmail?.refreshToken || '';
  return typeof tok === 'string' ? tok.trim() : '';
};

let customGmailClient = null;

/**
 * Allows test suites to inject a mocked Gmail client instance
 */
const setGmailClient = (client) => {
  if (client && typeof client.send === 'function' && !client.users) {
    // Adapter for legacy mock clients providing .send()
    customGmailClient = {
      users: {
        getProfile: async () => ({ data: { emailAddress: getGmailUser() || 'mock@gmail.com' } }),
        messages: {
          send: async (params) => {
            const res = await client.send(params);
            return {
              data: {
                id: res?.MessageId || res?.id || `msg-${Date.now()}`,
                threadId: res?.threadId || null
              }
            };
          }
        }
      }
    };
  } else {
    customGmailClient = client;
  }
};

/**
 * Creates an authorized OAuth2 client using googleapis
 */
const createOAuth2Client = () => {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const refreshToken = getRefreshToken();

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    OAUTH_REDIRECT_URI
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
};

/**
 * Factory for creating or obtaining the Gmail API client
 */
const getGmailClient = () => {
  if (customGmailClient) return customGmailClient;

  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Gmail API OAuth2 configuration is incomplete');
  }

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

/**
 * Check whether Gmail API OAuth2 environment variables are configured
 */
const isConfigured = () => {
  const user = getGmailUser();
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const refreshToken = getRefreshToken();

  const isPlaceholder = (val) => {
    if (!val || typeof val !== 'string') return true;
    const lower = val.toLowerCase();
    return lower.startsWith('your-') || lower.startsWith('your_') || lower.startsWith('change_me');
  };

  return Boolean(
    user && !isPlaceholder(user) &&
    clientId && !isPlaceholder(clientId) &&
    clientSecret && !isPlaceholder(clientSecret) &&
    refreshToken && !isPlaceholder(refreshToken)
  );
};

/**
 * Verify Google Gmail API OAuth2 authorization and client health on startup
 */
const verifyGmailConnection = async () => {
  if (!isConfigured()) {
    console.log('[Email Service] Gmail API OAuth2 configuration is incomplete (GMAIL_USER, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN missing). Standby delivery mode active.');
    return false;
  }

  try {
    const client = getGmailClient();
    const res = await client.users.getProfile({ userId: 'me' });
    const verifiedEmail = res.data?.emailAddress || getGmailUser();
    console.log(`[Email Service] ✔ Gmail API OAuth2 verified successfully (Authenticated User: ${verifiedEmail})`);
    return true;
  } catch (err) {
    const errMsg = err.message || '';
    if (/invalid_grant/i.test(errMsg) || err.code === 400 || err.code === 401) {
      console.warn('[Email Service Warning] Gmail API OAuth2 authentication failed: Refresh token is expired, invalid, or revoked. Please re-authenticate via Google OAuth Playground.');
    } else if (/quota/i.test(errMsg) || err.code === 403 || err.code === 429) {
      console.warn('[Email Service Warning] Gmail API quota or rate limit exceeded:', errMsg);
    } else {
      console.warn('[Email Service Warning] Gmail API verification check failed:', err.code || err.name || errMsg);
    }
    return false;
  }
};

/**
 * Build RFC 2822 compliant MIME message supporting Unicode headers and multipart HTML/text
 */
const createMimeMessage = ({ from, to, subject, text, html }) => {
  const boundary = `DocTrack_Boundary_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const normalizedTo = String(to).trim();
  const senderEmail = from || getGmailUser();
  const fromHeader = senderEmail.includes('<') ? senderEmail : `DocTrack AI <${senderEmail}>`;

  // Encode subject according to RFC 2047 for full Unicode and emoji safety
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;

  const plainText = text || (html ? html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : '');
  const textBase64 = Buffer.from(plainText, 'utf-8').toString('base64');
  const htmlBase64 = Buffer.from(html || plainText, 'utf-8').toString('base64');

  const messageLines = [
    `From: ${fromHeader}`,
    `To: ${normalizedTo}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    textBase64,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    htmlBase64,
    '',
    `--${boundary}--`
  ];

  return messageLines.join('\r\n');
};

/**
 * Base64URL encode string according to RFC 4648
 */
const encodeBase64Url = (str) => {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Common HTML wrapper with clean, professional responsive styling
 */
const wrapEmailTemplate = ({ title, subtitle, contentHtml, actionButton, urgencyBadge }) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #F8FAFC; color: #1E293B; }
    .email-container { max-width: 600px; margin: 24px auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .email-header { background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 32px; color: #FFFFFF; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
    .brand span { color: #10B981; }
    .subtitle { font-size: 13px; color: #94A3B8; margin-top: 4px; }
    .email-body { padding: 32px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
    .badge-urgent { background-color: #FEE2E2; color: #DC2626; }
    .badge-info { background-color: #EFF6FF; color: #2563EB; }
    .badge-success { background-color: #ECFDF5; color: #059669; }
    .title { font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 12px 0; }
    .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
    .info-card { background-color: #F1F5F9; border-radius: 8px; padding: 18px; margin-bottom: 24px; border-left: 4px solid #10B981; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #64748B; }
    .info-value { font-weight: 700; color: #0F172A; }
    .btn { display: inline-block; background-color: #10B981; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 700; font-size: 14px; text-align: center; }
    .email-footer { background-color: #F8FAFC; padding: 20px 32px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="brand">DocTrack <span>AI</span></div>
      <div class="subtitle">${escapeHtml(subtitle) || 'Smart Document Expiry & Renewal System'}</div>
    </div>
    <div class="email-body">
      ${urgencyBadge || ''}
      <h1 class="title">${escapeHtml(title)}</h1>
      ${contentHtml}
      ${actionButton ? `<div style="margin-top: 24px;"><a href="${escapeHtml(actionButton.url)}" class="btn">${escapeHtml(actionButton.text)}</a></div>` : ''}
    </div>
    <div class="email-footer">
      Automated lifecycle notification from DocTrack AI.<br>
      To manage alert frequencies, visit your account Reminder Preferences.
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Official Google Gmail API email delivery function using users.messages.send
 */
const sendEmail = async ({ to, subject, html, text, type = 'GENERAL' }) => {
  if (!isConfigured() && !customGmailClient) {
    const missing = [];
    if (!getClientId()) missing.push('GOOGLE_CLIENT_ID');
    if (!getClientSecret()) missing.push('GOOGLE_CLIENT_SECRET');
    if (!getRefreshToken()) missing.push('GOOGLE_REFRESH_TOKEN');
    if (!getGmailUser()) missing.push('GMAIL_USER');

    const err = new Error(`Gmail API OAuth2 configuration is incomplete. Missing: ${missing.join(', ')}`);
    err.code = 'CONFIG_MISSING';
    err.statusCode = 503;
    throw err;
  }

  if (!to || !subject || (!text && !html)) {
    const err = new Error('Recipient, subject, and email body are required');
    err.code = 'INVALID_INPUT';
    err.statusCode = 400;
    throw err;
  }

  const normalizedTo = String(to).trim();
  if (!isValidEmail(normalizedTo)) {
    const err = new Error('Invalid recipient email address');
    err.code = 'INVALID_RECIPIENT';
    err.statusCode = 400;
    throw err;
  }

  const sender = getGmailUser();
  const rawMime = createMimeMessage({
    from: sender,
    to: normalizedTo,
    subject,
    text,
    html
  });

  const encodedMessage = encodeBase64Url(rawMime);

  try {
    const client = getGmailClient();
    console.log(`[Email Service] Attempting to dispatch email (${type}) to ${normalizedTo} via Gmail API...`);

    const result = await client.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    const messageId = result.data?.id;
    if (!messageId) {
      throw new Error('Gmail API response did not contain an accepted message ID');
    }

    console.log(`[Email Service] ✔ Gmail API message accepted successfully (Id: ${messageId}, Recipient: ${normalizedTo}, Type: ${type})`);

    const receipt = {
      success: true,
      delivered: true,
      mode: 'gmail-api',
      messageId,
      threadId: result.data?.threadId || null,
      recipient: normalizedTo,
      type
    };

    if (process.env.NODE_ENV === 'test') {
      mockEmailOutbox.push({
        ...receipt,
        id: messageId,
        subject,
        sentAt: new Date().toISOString()
      });
      if (mockEmailOutbox.length > 100) mockEmailOutbox.shift();
    }

    return receipt;
  } catch (error) {
    const errorName = error.name || 'GMAIL_API_ERROR';
    const rawMsg = error.message || '';
    let remediation = '';
    let code = 'GMAIL_DELIVERY_FAILED';
    let statusCode = 500;

    if (/invalid_grant/i.test(rawMsg) || error.code === 400 || error.code === 401) {
      code = 'OAUTH_INVALID_GRANT';
      statusCode = 401;
      remediation = 'Google OAuth2 refresh token is expired, revoked, or invalid. Please re-authenticate via OAuth Playground with https://www.googleapis.com/auth/gmail.send scope.';
    } else if (/quota/i.test(rawMsg) || error.code === 403 || error.code === 429) {
      code = 'GMAIL_QUOTA_EXCEEDED';
      statusCode = 429;
      remediation = 'Gmail API sending quota or rate limit exceeded for this Google account (max 500/day for consumer Gmail or 2,000/day for Workspace).';
    } else if (/accessNotConfigured/i.test(rawMsg) || /disabled/i.test(rawMsg)) {
      code = 'GMAIL_API_DISABLED';
      statusCode = 403;
      remediation = 'Gmail API is not enabled in your Google Cloud Console project. Enable the Gmail API under APIs & Services.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      code = 'NETWORK_ERROR';
      statusCode = 503;
      remediation = 'Network connection to Google Gmail API servers failed or timed out.';
    } else {
      remediation = rawMsg || 'Gmail API rejected email dispatch.';
    }

    // Diagnostic logging without leaking secrets, tokens, passwords, or raw keys
    console.warn(`[Email Service Warning] Gmail API delivery failed (${code}, Type: ${type}):`, remediation);

    const sanitizedError = new Error(`Gmail API delivery failed [${code}]: ${remediation}`);
    sanitizedError.code = code;
    sanitizedError.statusCode = statusCode;
    sanitizedError.remediation = remediation;
    throw sanitizedError;
  }
};

/**
 * 1. Welcome Email
 */
const sendWelcomeEmail = async (user) => {
  const clientUrl = config.clientUrl || 'https://doc-track-ai.vercel.app';
  const html = wrapEmailTemplate({
    title: `Welcome to DocTrack AI, ${escapeHtml(user.name || 'Valued User')}!`,
    subtitle: 'Smart Document Expiry & Renewal System',
    urgencyBadge: '<div class="badge badge-success">Account Ready</div>',
    contentHtml: `
      <p class="text">Thank you for registering with DocTrack AI. Your private, encrypted document vault has been initialized.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Account Holder:</span><span class="info-value">${escapeHtml(user.name)}</span></div>
        <div class="info-row"><span class="info-label">Vault Email:</span><span class="info-value">${escapeHtml(user.email)}</span></div>
        <div class="info-row"><span class="info-label">Security Status:</span><span class="info-value" style="color: #059669;">Active & Protected</span></div>
      </div>
      <p class="text">DocTrack AI automatically monitors your passports, licenses, insurance policies, and certificates, providing timely multi-channel reminders before expiry dates occur.</p>
    `,
    actionButton: {
      text: 'Go to Your Dashboard →',
      url: `${clientUrl}/dashboard`
    }
  });

  return (module.exports.sendEmail || sendEmail)({
    to: user.email,
    subject: 'Welcome to DocTrack AI — Your Smart Document Vault is Ready',
    html,
    type: 'WELCOME'
  });
};

/**
 * 2. Email Verification Email
 */
const sendEmailVerification = async (user, token) => {
  const clientUrl = config.clientUrl || 'https://doc-track-ai.vercel.app';
  const verifyUrl = `${clientUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const html = wrapEmailTemplate({
    title: 'Verify Your Email Address',
    subtitle: 'DocTrack AI Account Verification',
    urgencyBadge: '<div class="badge badge-info">Action Required</div>',
    contentHtml: `
      <p class="text">Please confirm your email address to enable multi-channel email alerts for document expirations and statutory renewal windows.</p>
    `,
    actionButton: {
      text: 'Verify Email Address →',
      url: verifyUrl
    }
  });

  return (module.exports.sendEmail || sendEmail)({
    to: user.email,
    subject: 'DocTrack AI — Verify your email address',
    html,
    type: 'EMAIL_VERIFICATION'
  });
};

/**
 * 3. Password Reset Email
 */
const sendPasswordReset = async (user, resetToken) => {
  const clientUrl = config.clientUrl || 'https://doc-track-ai.vercel.app';
  const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const html = wrapEmailTemplate({
    title: 'Password Reset Request',
    subtitle: 'Security & Access Recovery',
    urgencyBadge: '<div class="badge badge-urgent">Security Alert</div>',
    contentHtml: `
      <p class="text">We received a request to reset the password for your DocTrack AI account. This link will remain active for 60 minutes.</p>
      <p class="text">If you did not request this password reset, please ignore this email or contact support.</p>
    `,
    actionButton: {
      text: 'Reset Your Password →',
      url: resetUrl
    }
  });

  return (module.exports.sendEmail || sendEmail)({
    to: user.email,
    subject: 'DocTrack AI — Password Reset Request',
    html,
    type: 'PASSWORD_RESET'
  });
};

/**
 * 4. Document Expiry Reminder (180d, 90d, 30d, 7d, 1d)
 */
const sendDocumentExpiryReminder = async ({ user, document, daysLeft, threshold }) => {
  const isUrgent = daysLeft <= 7;
  const clientUrl = config.clientUrl || 'https://doc-track-ai.vercel.app';
  const docId = (document._id ? document._id.toString() : (document.id || '')).trim();
  const detailsUrl = docId ? `${clientUrl}/documents/${docId}` : `${clientUrl}/documents`;
  const renewalUrl = docId ? `${clientUrl}/renewal-assistant?docId=${docId}` : `${clientUrl}/renewal-assistant`;

  const html = wrapEmailTemplate({
    title: `${document.title} Expires in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}`,
    subtitle: `Automated Compliance Reminder (${threshold} Days Threshold)`,
    urgencyBadge: isUrgent
      ? '<div class="badge badge-urgent">⚠️ Critical Expiry Warning</div>'
      : '<div class="badge badge-info">🔔 Upcoming Expiry Notice</div>',
    contentHtml: `
      <p class="text">Hello <strong>${escapeHtml(user.name || 'DocTrack User')}</strong>,</p>
      <p class="text">The following document indexed in your vault is approaching its scheduled expiration date.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Document:</span><span class="info-value">${escapeHtml(document.title)}</span></div>
        <div class="info-row"><span class="info-label">Type / Category:</span><span class="info-value">${escapeHtml(document.documentType || document.category || 'Official Record')}</span></div>
        <div class="info-row"><span class="info-label">Profile / Vault:</span><span class="info-value">${escapeHtml(document.profileName || 'Personal Vault')}</span></div>
        ${document.docNumber ? `<div class="info-row"><span class="info-label">Document Number:</span><span class="info-value">${escapeHtml(document.docNumber)}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Expiry Date:</span><span class="info-value" style="color: ${isUrgent ? '#DC2626' : '#2563EB'}; font-weight: 700;">${escapeHtml(document.expiryDate)}</span></div>
        <div class="info-row"><span class="info-label">Time Remaining:</span><span class="info-value" style="font-weight: 700; color: ${isUrgent ? '#DC2626' : '#0F172A'};"><strong style="color: ${isUrgent ? '#DC2626' : '#2563EB'};">${escapeHtml(daysLeft)} day${daysLeft === 1 ? '' : 's'} left</strong></span></div>
        <div class="info-row"><span class="info-label">Document Page:</span><span class="info-value"><a href="${escapeHtml(detailsUrl)}" style="color: #2563EB; font-weight: 600;">View in DocTrack AI →</a></span></div>
      </div>
      <p class="text">We recommend initiating renewal early to avoid administrative fees, service disruption, or compliance penalties.</p>
    `,
    actionButton: {
      text: 'View Renewal Checklist & Procedures →',
      url: renewalUrl
    }
  });

  return (module.exports.sendEmail || sendEmail)({
    to: user.email,
    subject: `[DocTrack AI] ${document.title} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html,
    type: 'DOCUMENT_EXPIRY_REMINDER'
  });
};

/**
 * 5. Document Expired Notification
 */
const sendDocumentExpiredNotification = async ({ user, document }) => {
  const clientUrl = config.clientUrl || 'https://doc-track-ai.vercel.app';
  const docId = (document._id ? document._id.toString() : (document.id || '')).trim();
  const detailsUrl = docId ? `${clientUrl}/documents/${docId}` : `${clientUrl}/documents`;
  const renewalUrl = docId ? `${clientUrl}/renewal-assistant?docId=${docId}` : `${clientUrl}/renewal-assistant`;

  const html = wrapEmailTemplate({
    title: `Document Expired: ${document.title}`,
    subtitle: 'Statutory Grace Period & Renewal Alert',
    urgencyBadge: '<div class="badge badge-urgent">🚨 Expired Status</div>',
    contentHtml: `
      <p class="text">Hello <strong>${escapeHtml(user.name || 'DocTrack User')}</strong>,</p>
      <p class="text">Your document <strong>${escapeHtml(document.title)}</strong> has officially reached or passed its expiration date (${escapeHtml(document.expiryDate)}). Continued use without renewal may incur penalties or legal invalidity.</p>
      <div class="info-card" style="border-left-color: #DC2626;">
        <div class="info-row"><span class="info-label">Document:</span><span class="info-value">${escapeHtml(document.title)}</span></div>
        <div class="info-row"><span class="info-label">Type / Category:</span><span class="info-value">${escapeHtml(document.documentType || document.category || 'Official Record')}</span></div>
        <div class="info-row"><span class="info-label">Profile / Vault:</span><span class="info-value">${escapeHtml(document.profileName || 'Personal Vault')}</span></div>
        ${document.docNumber ? `<div class="info-row"><span class="info-label">Document Number:</span><span class="info-value">${escapeHtml(document.docNumber)}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Expired Date:</span><span class="info-value" style="color: #DC2626; font-weight: 700;">${escapeHtml(document.expiryDate)} (EXPIRED)</span></div>
        <div class="info-row"><span class="info-label">Document Details:</span><span class="info-value"><a href="${escapeHtml(detailsUrl)}" style="color: #2563EB; font-weight: 600;">View in DocTrack AI →</a></span></div>
      </div>
      <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
        <strong style="color: #DC2626;">⚠️ Immediate Action Recommended:</strong>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #991B1B;">
          Please use our step-by-step Document Renewal Assistant to view required documents, authorized government portals, and procedural fees.
        </p>
      </div>
    `,
    actionButton: {
      text: 'Renew Document (Document Renewal Assistant) →',
      url: renewalUrl
    }
  });

  return (module.exports.sendEmail || sendEmail)({
    to: user.email,
    subject: `[URGENT] ${document.title} has EXPIRED — Action Required`,
    html,
    type: 'DOCUMENT_EXPIRED'
  });
};

/**
 * 6. Renewal Reminder
 */
const sendRenewalReminder = async ({ user, document, renewalGuide }) => {
  const clientUrl = config.clientUrl || 'https://doc-track-ai.vercel.app';

  const html = wrapEmailTemplate({
    title: `Renewal Checklist for ${document.title}`,
    subtitle: 'Official Guidelines & Required Forms',
    urgencyBadge: '<div class="badge badge-info">Renewal Guide</div>',
    contentHtml: `
      <p class="text">Here is your verified step-by-step renewal checklist for <strong>${escapeHtml(document.title)}</strong>.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Official Portal:</span><span class="info-value">${escapeHtml(renewalGuide?.portalName || 'Government Portal')}</span></div>
        <div class="info-row"><span class="info-label">Estimated Statutory Fee:</span><span class="info-value">${escapeHtml(renewalGuide?.officialFee || 'Standard Fee')}</span></div>
        <div class="info-row"><span class="info-label">Grace Period:</span><span class="info-value">${escapeHtml(renewalGuide?.gracePeriod || '30 days')}</span></div>
      </div>
    `,
    actionButton: {
      text: 'Open Full Renewal Guide →',
      url: `${clientUrl}/renewal-assistant`
    }
  });

  return (module.exports.sendEmail || sendEmail)({
    to: user.email,
    subject: `Renewal Assistant Guide: ${document.title}`,
    html,
    type: 'RENEWAL_REMINDER'
  });
};

/**
 * 7. Warranty Expiry Notification
 */
const sendWarrantyExpiryNotification = async ({ user, warranty, daysRemaining }) => {
  const clientUrl = config.clientUrl || 'https://doc-track-ai.vercel.app';
  const isUrgent = daysRemaining <= 7;

  const html = wrapEmailTemplate({
    title: `${warranty.productName} Warranty Closing in ${daysRemaining} Days`,
    subtitle: 'Product Warranty & Service Plan Horizon',
    urgencyBadge: isUrgent
      ? '<div class="badge badge-urgent">Warranty Expiring Soon</div>'
      : '<div class="badge badge-info">Warranty Horizon</div>',
    contentHtml: `
      <p class="text">The warranty coverage for <strong>${escapeHtml(warranty.productName)}</strong> is approaching its expiration date.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Product:</span><span class="info-value">${escapeHtml(warranty.productName)} (${escapeHtml(warranty.brand || 'Appliance')})</span></div>
        <div class="info-row"><span class="info-label">Coverage Type:</span><span class="info-value">${escapeHtml(warranty.coverageType || 'Standard')}</span></div>
        <div class="info-row"><span class="info-label">Expiry Date:</span><span class="info-value">${escapeHtml(warranty.expiryDate)}</span></div>
        <div class="info-row"><span class="info-label">Days Remaining:</span><span class="info-value">${escapeHtml(daysRemaining)} days</span></div>
      </div>
    `,
    actionButton: {
      text: 'View Warranty & Service Contacts →',
      url: `${clientUrl}/warranties`
    }
  });

  return (module.exports.sendEmail || sendEmail)({
    to: user.email,
    subject: `[Warranty Notice] ${warranty.productName} warranty expires in ${daysRemaining} days`,
    html,
    type: 'WARRANTY_EXPIRY'
  });
};

/**
 * 8. Document Upload & Ingestion Confirmation Notification Email
 */
const sendDocumentUploadedEmail = async ({ user, document, daysLeft = null, status = 'ACTIVE' }) => {
  const clientUrl = config.clientUrl || 'https://doc-track-ai.vercel.app';
  const isExpired = status === 'EXPIRED' || (daysLeft !== null && daysLeft < 0);
  const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && !isExpired;
  const docId = (document._id ? document._id.toString() : (document.id || '')).trim();
  const detailsUrl = docId ? `${clientUrl}/documents/${docId}` : `${clientUrl}/documents`;
  const renewalUrl = docId ? `${clientUrl}/renewal-assistant?docId=${docId}` : `${clientUrl}/renewal-assistant`;

  const uploadDateFormatted = document.uploadedAt
    ? new Date(document.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  let urgencyBadge = '<div class="badge badge-success">✔ Vault Encrypted & Saved</div>';
  if (isExpired) {
    urgencyBadge = '<div class="badge badge-urgent">🚨 Document Expired</div>';
  } else if (isExpiringSoon) {
    urgencyBadge = '<div class="badge badge-urgent">⚠️ Expiring Soon</div>';
  }

  let expiryDisplay = '<span style="color: #64748B;">Perpetual / No Expiry Date</span>';
  if (document.expiryDate && document.expiryDate !== 'Perpetual') {
    if (isExpired) {
      expiryDisplay = `<span style="color: #DC2626; font-weight: bold;">${escapeHtml(document.expiryDate)} (EXPIRED)</span>`;
    } else if (isExpiringSoon) {
      expiryDisplay = `<span style="color: #D97706; font-weight: bold;">${escapeHtml(document.expiryDate)} (${escapeHtml(daysLeft)} days remaining)</span>`;
    } else {
      expiryDisplay = `<span style="color: #059669; font-weight: bold;">${escapeHtml(document.expiryDate)}${daysLeft !== null ? ` (${escapeHtml(daysLeft)} days)` : ''}</span>`;
    }
  }

  const html = wrapEmailTemplate({
    title: `Document Uploaded: ${document.title}`,
    subtitle: 'Vault Ingestion & Compliance Confirmation',
    urgencyBadge,
    contentHtml: `
      <p class="text">Hello <strong>${escapeHtml(user.name || 'DocTrack User')}</strong>,</p>
      <p class="text">Your document <strong>"${escapeHtml(document.title)}"</strong> has been successfully uploaded, processed by AI OCR, and securely stored in your DocTrack AI vault.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Document Name:</span><span class="info-value">${escapeHtml(document.title)}</span></div>
        <div class="info-row"><span class="info-label">Document Type:</span><span class="info-value">${escapeHtml(document.documentType || document.category || 'Official Record')}</span></div>
        <div class="info-row"><span class="info-label">Category:</span><span class="info-value">${escapeHtml(document.category || 'General Document')}</span></div>
        <div class="info-row"><span class="info-label">Profile / Vault:</span><span class="info-value">${escapeHtml(document.profileName || 'Personal Vault')}</span></div>
        ${document.docNumber ? `<div class="info-row"><span class="info-label">Document Number:</span><span class="info-value">${escapeHtml(document.docNumber)}</span></div>` : ''}
        ${document.holderName ? `<div class="info-row"><span class="info-label">Holder Name:</span><span class="info-value">${escapeHtml(document.holderName)}</span></div>` : ''}
        ${document.issuingAuthority ? `<div class="info-row"><span class="info-label">Issuing Authority:</span><span class="info-value">${escapeHtml(document.issuingAuthority)}</span></div>` : ''}
        ${document.placeOfIssue ? `<div class="info-row"><span class="info-label">Place of Issue:</span><span class="info-value">${escapeHtml(document.placeOfIssue)}</span></div>` : ''}
        ${document.country ? `<div class="info-row"><span class="info-label">Country:</span><span class="info-value">${escapeHtml(document.country)}</span></div>` : ''}
        ${document.dateOfBirth ? `<div class="info-row"><span class="info-label">Date of Birth:</span><span class="info-value">${escapeHtml(document.dateOfBirth)}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Issue Date:</span><span class="info-value">${escapeHtml(document.issueDate || 'Not specified')}</span></div>
        <div class="info-row"><span class="info-label">Expiry Date:</span><span class="info-value">${expiryDisplay}</span></div>
        <div class="info-row"><span class="info-label">Current Status:</span><span class="info-value" style="font-weight: 700; color: ${isExpired ? '#DC2626' : '#059669'};">${escapeHtml(status || 'ACTIVE')}</span></div>
        <div class="info-row"><span class="info-label">Upload Date:</span><span class="info-value">${escapeHtml(uploadDateFormatted)}</span></div>
        <div class="info-row"><span class="info-label">Document Details:</span><span class="info-value"><a href="${escapeHtml(detailsUrl)}" style="color: #2563EB; font-weight: 600;">Open Document Details Page →</a></span></div>
      </div>
      ${isExpired || isExpiringSoon ? `
        <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
          <strong style="color: #DC2626;">⚠️ Compliance Alert:</strong>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #991B1B;">
            ${isExpired
              ? 'This document has reached or passed its validity date. Continued use without renewal may incur penalties.'
              : `This document enters its scheduled expiration window within ${daysLeft} days. We recommend reviewing renewal procedures.`}
          </p>
        </div>
      ` : ''}
      <p class="text">DocTrack AI automated monitoring is now active for this document. You will receive multi-channel alerts at statutory thresholds.</p>
    `,
    actionButton: {
      text: isExpired ? 'Renew Document (Renewal Assistant) →' : 'View Document Details in Vault →',
      url: isExpired ? renewalUrl : detailsUrl
    }
  });

  return (module.exports.sendEmail || sendEmail)({
    to: user.email,
    subject: isExpired
      ? `[DocTrack AI] Uploaded & Expired: ${document.title}`
      : isExpiringSoon
        ? `[DocTrack AI] Uploaded (Expiring Soon): ${document.title}`
        : `[DocTrack AI] Document Uploaded: ${document.title}`,
    html,
    type: 'DOCUMENT_UPLOADED'
  });
};

/**
 * 9. Password Reset OTP Email
 */
const sendOtpEmail = async (user, otp) => {
  const safeOtp = escapeHtml(otp);
  const html = wrapEmailTemplate({
    title: 'Your Password Reset Code',
    subtitle: 'Security Verification Code',
    urgencyBadge: '<div class="badge badge-urgent">🛡️ Security Alert</div>',
    contentHtml: `
      <p class="text">Hello <strong>${escapeHtml(user.name || 'DocTrack User')}</strong>,</p>
      <p class="text">We received a request to reset your DocTrack AI account password. Use the verification code below to proceed. <strong>This code expires in 10 minutes.</strong></p>
      <div style="text-align: center; margin: 32px 0;">
        <div style="display: inline-block; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius: 12px; padding: 28px 48px;">
          <div style="font-size: 11px; font-weight: 700; color: #94A3B8; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 12px;">Your Verification Code</div>
          <div style="font-size: 42px; font-weight: 900; color: #10B981; letter-spacing: 0.25em; font-family: 'Courier New', monospace;">${safeOtp}</div>
          <div style="font-size: 11px; color: #64748B; margin-top: 12px;">Valid for 10 minutes only</div>
        </div>
      </div>
      <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
        <strong style="color: #DC2626;">⚠️ Security Notice:</strong>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #991B1B;">
          If you did not request this code, your account may be at risk. Please secure your account immediately or contact support.
        </p>
      </div>
      <p class="text" style="margin-top: 20px;">Never share this code with anyone. DocTrack AI staff will never ask for your verification code.</p>
    `
  });

  return (module.exports.sendEmail || sendEmail)({
    to: user.email,
    subject: `${otp} — Your DocTrack AI Password Reset Code`,
    html,
    type: 'OTP_RESET'
  });
};

module.exports = {
  isConfigured,
  verifyGmailConnection,
  verifySesConnection: verifyGmailConnection, // Backward compatibility alias
  verifySmtpConnection: verifyGmailConnection, // Backward compatibility alias
  sendEmail,
  getMockOutbox: () => mockEmailOutbox,
  setGmailClient,
  setSesClient: setGmailClient, // Backward compatibility alias for tests
  createMimeMessage,
  encodeBase64Url,
  escapeHtml,
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordReset,
  sendPasswordResetEmail: sendPasswordReset,
  sendOtpEmail,
  sendDocumentExpiryReminder,
  sendDocumentExpiredNotification,
  sendRenewalReminder,
  sendWarrantyExpiryNotification,
  sendDocumentUploadedEmail
};
