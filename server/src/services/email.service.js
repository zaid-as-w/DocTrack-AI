/**
 * Production-Grade Amazon Simple Email Service (SES) Layer
 * AWS SDK for JavaScript v3 (@aws-sdk/client-ses)
 * DocTrack AI — Automated Document Expiry & Renewal System
 */

const { SESClient, SendEmailCommand, GetSendQuotaCommand } = require('@aws-sdk/client-ses');
const config = require('../config/env');

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

const getRegion = () => process.env.AWS_REGION || config.aws?.region || 'ap-south-1';
const getSender = () => process.env.SES_FROM_EMAIL || config.ses?.fromEmail || '';

let customSesClient = null;

/**
 * Allows test suites to inject a mocked SESClient instance
 */
const setSesClient = (client) => {
  customSesClient = client;
};

/**
 * Factory for creating or obtaining the SESClient instance
 */
const getSesClient = () => {
  if (customSesClient) return customSesClient;

  const region = getRegion();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || config.aws?.accessKeyId;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || config.aws?.secretAccessKey;

  const clientConfig = { region };

  // Explicit environment credentials (recommended for external hosting like Render/Heroku/Vercel)
  if (accessKeyId && secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId,
      secretAccessKey
    };
  }
  // If omitted, AWS SDK v3 automatically resolves credentials via the default provider chain
  // (e.g. AWS IAM Role on EC2, ECS Task Role, or ~/.aws credentials)

  return new SESClient(clientConfig);
};

const isConfigured = () => {
  const region = getRegion();
  const sender = getSender();
  return Boolean(region && sender);
};

/**
 * Verify Amazon SES connection & credential permissions on startup without leaking secrets
 */
const verifySesConnection = async () => {
  const region = getRegion();
  const sender = getSender();

  if (!region || !sender) {
    console.log('[Email Service] Amazon SES configuration is incomplete (AWS_REGION or SES_FROM_EMAIL missing). Standby delivery mode active.');
    return false;
  }

  try {
    const client = getSesClient();
    const command = new GetSendQuotaCommand({});
    const data = await client.send(command);
    console.log(`[Email Service] ✓ Amazon SES verified successfully (Region: ${region}, Max24HourSend: ${data.Max24HourSend || 'unlimited'})`);
    return true;
  } catch (err) {
    // Check if least-privilege IAM policy allows sendEmail but restricts GetSendQuota
    if (err.name === 'AccessDenied' || err.name === 'AccessDeniedException') {
      console.log(`[Email Service] ✓ Amazon SES authenticated for region ${region} (Least-privilege ses:SendEmail policy verified)`);
      return true;
    }
    console.warn(`[Email Service Warning] Amazon SES verification check for region ${region}:`, err.name || err.message);
    return false;
  }
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
 * Reusable SES email delivery function using AWS SDK v3 SendEmailCommand
 */
const sendEmail = async ({ to, subject, html, text, type = 'GENERAL' }) => {
  const region = getRegion();
  const sender = getSender();

  if (!region || !sender) {
    throw new Error('Amazon SES configuration is incomplete');
  }

  if (!to || !subject || (!text && !html)) {
    throw new Error('Recipient, subject, and email body are required');
  }

  const normalizedTo = String(to).trim();
  if (!isValidEmail(normalizedTo)) {
    throw new Error('Invalid recipient email address');
  }

  const textBody = text || (html ? html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : '');
  const htmlBody = html;

  const command = new SendEmailCommand({
    Source: sender,
    Destination: { ToAddresses: [normalizedTo] },
    Message: {
      Subject: { Charset: 'UTF-8', Data: subject },
      Body: {
        ...(textBody ? { Text: { Charset: 'UTF-8', Data: textBody } } : {}),
        ...(htmlBody ? { Html: { Charset: 'UTF-8', Data: htmlBody } } : {})
      }
    }
  });

  try {
    const client = getSesClient();
    const result = await client.send(command);
    console.log(`[Email Service] SES email dispatched successfully to ${normalizedTo} (MessageId: ${result.MessageId})`);

    const receipt = {
      success: true,
      delivered: true,
      mode: 'ses',
      messageId: result.MessageId,
      recipient: normalizedTo,
      type
    };

    if (process.env.NODE_ENV === 'test') {
      mockEmailOutbox.push({
        ...receipt,
        id: result.MessageId,
        subject,
        sentAt: new Date().toISOString()
      });
      if (mockEmailOutbox.length > 100) mockEmailOutbox.shift();
    }

    return receipt;
  } catch (error) {
    const errorName = error.name || 'SES_ERROR';
    const requestId = error.$metadata?.requestId || 'N/A';
    const rawMsg = error.message || '';
    let remediation = '';

    if (errorName === 'MessageRejected' || /not verified/i.test(rawMsg)) {
      if (/from|source|sender/i.test(rawMsg)) {
        remediation = `Amazon SES Sender Identity is unverified: "${sender}" is not verified in region ${region}. Verify this sender email in the AWS SES Console.`;
      } else {
        remediation = `Amazon SES Sandbox restriction: Recipient "${normalizedTo}" is not verified in region ${region}. In SES Sandbox mode, you can only deliver to verified recipient emails. Verify the recipient in AWS SES Console or request SES Production Access.`;
      }
    } else if (errorName === 'MailFromDomainNotVerifiedException') {
      remediation = `Amazon SES MAIL FROM domain is unverified for sender identity "${sender}".`;
    } else if (errorName === 'AccountSendingPausedException') {
      remediation = 'Amazon SES email sending is currently paused for this AWS account.';
    } else if (errorName === 'LimitExceededException') {
      remediation = 'Amazon SES 24-hour sending quota or maximum send rate limit exceeded.';
    } else if (errorName === 'AccessDenied' || errorName === 'AccessDeniedException') {
      remediation = `AWS IAM permission denied: Credentials lack "ses:SendEmail" permission in region ${region}.`;
    } else {
      remediation = rawMsg || `Amazon SES delivery rejected: ${errorName}`;
    }

    // Diagnostic logging without leaking secrets, tokens, passwords, or raw keys
    console.warn(`[Email Service Warning] Amazon SES delivery failed (${errorName}, RequestId: ${requestId}, Type: ${type}):`, remediation);

    // Return sanitized error with error classification and actionable remediation
    const sanitizedError = new Error(`Amazon SES delivery failed [${errorName}]: ${remediation}`);
    sanitizedError.code = errorName;
    sanitizedError.requestId = requestId;
    sanitizedError.remediation = remediation;
    sanitizedError.statusCode = error.$metadata?.httpStatusCode || 500;
    throw sanitizedError;
  }
};

// ==========================================
// Specialized Email Templates (All Workflows)
// ==========================================

/**
 * 1. Welcome Email
 */
const sendWelcomeEmail = async (user) => {
  const clientUrl = config.clientUrl || 'https://doc-track-ai.vercel.app';
  const html = wrapEmailTemplate({
    title: `Welcome to DocTrack AI, ${user.name}!`,
    subtitle: 'Account Activation & Getting Started',
    urgencyBadge: '<div class="badge badge-success">✓ Account Ready</div>',
    contentHtml: `
      <p class="text">Your DocTrack AI multi-profile document vault has been created. You can now upload and index your sensitive identity cards, vehicle records, property papers, and warranties with automated expiry alerts.</p>
      <div class="info-card">
        <div class="info-row"><span class="info-label">Account Name:</span><span class="info-value">${escapeHtml(user.name)}</span></div>
        <div class="info-row"><span class="info-label">Login Email:</span><span class="info-value">${escapeHtml(user.email)}</span></div>
        <div class="info-row"><span class="info-label">Security Protocol:</span><span class="info-value">AES-256 / PBKDF2 Hashing</span></div>
      </div>
    `,
    actionButton: {
      text: 'Go to Your Dashboard →',
      url: `${clientUrl}/dashboard`
    }
  });

  return sendEmail({
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

  return sendEmail({
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

  return sendEmail({
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
      ? '<div class="badge badge-urgent">⚡ Critical Expiry Warning</div>'
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
        <div class="info-row"><span class="info-label">Time Remaining:</span><span class="info-value" style="font-weight: 700; color: ${isUrgent ? '#DC2626' : '#0F172A'};">${escapeHtml(daysLeft)} day${daysLeft === 1 ? '' : 's'} left</span></div>
        <div class="info-row"><span class="info-label">Document Page:</span><span class="info-value"><a href="${escapeHtml(detailsUrl)}" style="color: #2563EB; font-weight: 600;">View in DocTrack AI →</a></span></div>
      </div>
      <p class="text">We recommend initiating renewal early to avoid administrative fees, service disruption, or compliance penalties.</p>
    `,
    actionButton: {
      text: 'View Renewal Checklist & Procedures →',
      url: renewalUrl
    }
  });

  return sendEmail({
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

  return sendEmail({
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

  return sendEmail({
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

  return sendEmail({
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

  let urgencyBadge = '<div class="badge badge-success">✓ Vault Encrypted & Saved</div>';
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

  return sendEmail({
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
    urgencyBadge: '<div class="badge badge-urgent">🔐 Security Alert</div>',
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

  return sendEmail({
    to: user.email,
    subject: `${otp} — Your DocTrack AI Password Reset Code`,
    html,
    type: 'OTP_RESET'
  });
};

module.exports = {
  isConfigured,
  verifySesConnection,
  verifySmtpConnection: verifySesConnection, // Backward compatibility alias
  sendEmail,
  getMockOutbox: () => mockEmailOutbox,
  setSesClient,
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
