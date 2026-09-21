/**
 * Multi-Channel Notification & Reminder Dispatcher
 * DocTrack AI — Iteration 11: Notification & Reminder System
 * Supports Email (HTML templates), SMS, and In-App notifications with Mock-first providers.
 */

const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const emailService = require('./email.service');
const smsService = require('./sms.service');
const config = require('../config/env');
const { getDocuments } = require('./documentStore');
const { getWarranties } = require('./warrantyStore');

// In-memory notifications and reminders outbox
let notificationStore = [];
let reminderRules = [];

/**
 * Render responsive HTML email template for document / warranty reminders
 */
const renderEmailHtml = ({ recipient, title, message, documentTitle, daysLeft, expiryDate, actionUrl }) => {
  const isUrgent = daysLeft !== undefined && daysLeft <= 7;
  const accentColor = isUrgent ? '#DC2626' : '#2563EB';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #F8FAFC; color: #1E293B; }
    .email-wrapper { max-width: 600px; margin: 24px auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .email-header { background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); padding: 24px 32px; color: #FFFFFF; }
    .brand-title { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
    .brand-title span { color: #10B981; }
    .email-body { padding: 32px; }
    .urgency-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; background: ${isUrgent ? '#FEE2E2' : '#EFF6FF'}; color: ${accentColor}; margin-bottom: 16px; }
    .email-title { font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 12px 0; }
    .email-text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
    .info-card { background-color: #F1F5F9; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid ${accentColor}; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #64748B; }
    .info-value { font-weight: 700; color: #0F172A; }
    .btn-action { display: inline-block; background-color: #10B981; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 14px; text-align: center; }
    .email-footer { background-color: #F8FAFC; padding: 20px 32px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div class="brand-title">DocTrack <span>AI</span></div>
      <div style="font-size: 13px; color: #94A3B8; margin-top: 4px;">Automated Document Lifecycle Reminder</div>
    </div>
    <div class="email-body">
      <div class="urgency-badge">${isUrgent ? '⚡ Action Required' : '🔔 Upcoming Expiry Notification'}</div>
      <h1 class="email-title">${title}</h1>
      <p class="email-text">${message}</p>
      
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Document / Asset:</span>
          <span class="info-value">${documentTitle || 'Identity Record'}</span>
        </div>
        ${expiryDate ? `
        <div class="info-row">
          <span class="info-label">Expiry Date:</span>
          <span class="info-value" style="color: ${accentColor};">${expiryDate}</span>
        </div>` : ''}
        ${daysLeft !== undefined ? `
        <div class="info-row">
          <span class="info-label">Horizon Status:</span>
          <span class="info-value">${daysLeft < 0 ? 'Expired' : `${daysLeft} days remaining`}</span>
        </div>` : ''}
      </div>

      <a href="${actionUrl || 'http://localhost:5173/renewal-assistant'}" class="btn-action">
        Open Renewal Checklist & Guide →
      </a>
    </div>
    <div class="email-footer">
      This automated alert was dispatched by DocTrack AI Compliance Engine.<br>
      To manage your notification frequencies, visit <a href="http://localhost:5173/reminders" style="color: #64748B;">Reminder Preferences</a>.
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Format standard SMS text (< 160 characters)
 */
const formatSmsText = ({ title, documentTitle, daysLeft }) => {
  const daysText = daysLeft < 0 ? 'has EXPIRED' : `expires in ${daysLeft} days`;
  return `[DocTrack AI] Reminder: ${documentTitle || title} ${daysText}. Review renewal checklist or warranty service at doctrack.ai/app`;
};

// Seed realistic demo delivery outbox logs
const seedNotifications = () => {
  notificationStore = [
    {
      id: 'notif-01',
      userId: 'demo-user-zaid-001',
      profileId: 'car',
      documentId: 'doc-puc-05',
      title: 'PUC Emission Test Expiring in 5 Days',
      message: 'Your vehicle PUC Emission Certificate KA01-PUC-8812 is valid till 20/09/2026. Physical vehicle emission inspection is mandatory.',
      channel: 'SMS',
      recipient: '+91 98765 43210',
      status: 'DELIVERED',
      severity: 'CRITICAL',
      deliveryReceiptId: 'SMS-TW-98214',
      renderedBody: '[DocTrack AI] URGENT: PUC Certificate KA01-PUC-8812 expires in 5 days. Visit your nearest Koramangala emission station to avoid RTO penalty.',
      readAt: new Date(Date.now() - 3600000),
      sentAt: new Date(Date.now() - 7200000).toISOString(),
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'notif-02',
      userId: 'demo-user-zaid-001',
      profileId: 'self',
      documentId: 'doc-passport-01',
      title: 'Indian Passport Renewal Notice (30-Day Window)',
      message: 'Passport Z9847291 enters its 30-day expiry threshold on 12/10/2026. Tatkaal / Normal reissue slot booking recommended.',
      channel: 'EMAIL',
      recipient: 'zaid@doctrack.ai',
      status: 'DELIVERED',
      severity: 'WARNING',
      deliveryReceiptId: 'EML-NM-44912',
      renderedBody: renderEmailHtml({
        recipient: 'zaid@doctrack.ai',
        title: 'Passport Re-Issue Window Active (27 Days Left)',
        message: 'Your Indian Passport (Ordinary, 36 Pages) expires in 27 days. Passport Seva Kendra appointments typically have a 2-week queue in Bengaluru.',
        documentTitle: 'Indian Passport (Z9847291)',
        daysLeft: 27,
        expiryDate: '2026-10-12',
        actionUrl: 'https://portal2.passportindia.gov.in'
      }),
      readAt: null,
      sentAt: new Date(Date.now() - 18000000).toISOString(),
      createdAt: new Date(Date.now() - 18000000).toISOString()
    },
    {
      id: 'notif-03',
      userId: 'demo-user-zaid-001',
      profileId: 'son',
      warrantyId: 'war-galaxy-s24-04',
      title: 'Samsung Galaxy S24 Ultra Coverage Closes in 6 Days',
      message: 'Samsung Care+ 1-Year Accidental Damage coverage window is closing on 22/09/2026. Check battery health and submit claims if necessary.',
      channel: 'SMS',
      recipient: '+91 98450 12345',
      status: 'DELIVERED',
      severity: 'CRITICAL',
      deliveryReceiptId: 'SMS-TW-78192',
      renderedBody: '[DocTrack AI] URGENT: Samsung Galaxy S24 Ultra Care+ warranty expires in 6 days. Contact 1800 5 7267864 for last-minute claim support.',
      readAt: null,
      sentAt: new Date(Date.now() - 25000000).toISOString(),
      createdAt: new Date(Date.now() - 25000000).toISOString()
    },
    {
      id: 'notif-04',
      userId: 'demo-user-zaid-001',
      profileId: 'son',
      documentId: 'doc-dl-03',
      title: 'Driving License (KA03 2019000124) Expired',
      message: 'Driving License for Rahul Sharma has expired. Please initiate renewal on Parivahan portal within the statutory 30-day grace period.',
      channel: 'IN_APP',
      recipient: 'Rahul (Son)',
      status: 'DELIVERED',
      severity: 'CRITICAL',
      deliveryReceiptId: 'APP-IN-1002',
      renderedBody: 'Driving License expired 12 days ago. Grace period active till 03/10/2026. Penalty applies after grace period.',
      readAt: null,
      sentAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'notif-05',
      userId: 'demo-user-zaid-001',
      profileId: 'self',
      warrantyId: 'war-lg-washer-03',
      title: 'LG Washing Machine 2-Year AMC Opportunity',
      message: 'Product warranty expires in 18 days. LG Authorized AMC plan available for ₹3,200 for 2 additional years.',
      channel: 'EMAIL',
      recipient: 'zaid@doctrack.ai',
      status: 'DELIVERED',
      severity: 'INFO',
      deliveryReceiptId: 'EML-NM-33918',
      renderedBody: renderEmailHtml({
        recipient: 'zaid@doctrack.ai',
        title: 'LG Washing Machine AMC Extension Available',
        message: 'Your 2-year warranty for LG Direct Drive 9Kg AI Washer expires in 18 days. Motor retains 10-year warranty, but electronic board and drum coverage can be extended.',
        documentTitle: 'LG Direct Drive 9Kg Washer',
        daysLeft: 18,
        expiryDate: '2026-10-04',
        actionUrl: 'https://www.lg.com/in/support'
      }),
      readAt: new Date(Date.now() - 100000000),
      sentAt: new Date(Date.now() - 120000000).toISOString(),
      createdAt: new Date(Date.now() - 120000000).toISOString()
    }
  ];
};

seedNotifications();

/**
 * Dispatch a notification across selected channel
 */
const sendNotification = async ({
  userId = 'demo-user-zaid-001',
  profileId = 'self',
  documentId = null,
  warrantyId = null,
  title,
  message,
  channel = 'IN_APP',
  recipient = '',
  severity = 'INFO',
  documentTitle = '',
  daysLeft = undefined,
  expiryDate = ''
}) => {
  const id = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  let renderedBody = message;
  let deliveryReceiptId = '';

  if (channel === 'EMAIL' || channel === 'ALL') {
    deliveryReceiptId = `EML-NM-${Math.floor(10000 + Math.random() * 90000)}`;
    const actionUrl = `${config.clientUrl || 'http://localhost:5173'}/renewal-assistant`;
    renderedBody = renderEmailHtml({
      recipient: recipient || 'zaid@doctrack.ai',
      title,
      message,
      documentTitle: documentTitle || title,
      daysLeft,
      expiryDate,
      actionUrl
    });

    try {
      const emailRes = await emailService.sendEmail({
        to: recipient || 'zaid@doctrack.ai',
        subject: title,
        html: renderedBody,
        type: 'NOTIFICATION'
      });
      if (emailRes && emailRes.messageId) {
        deliveryReceiptId = emailRes.messageId;
      }
    } catch (err) {
      console.warn('[Notification Email Dispatch Notice]', err.message);
    }
  } else if (channel === 'SMS') {
    deliveryReceiptId = `SMS-TW-${Math.floor(10000 + Math.random() * 90000)}`;
    renderedBody = formatSmsText({ title, documentTitle, daysLeft });

    try {
      const smsRes = await smsService.sendSms({
        to: recipient || '+91 7019182324',
        message: renderedBody
      });
      if (smsRes && smsRes.messageId) {
        deliveryReceiptId = smsRes.messageId;
      }
    } catch (err) {
      console.warn('[Notification SMS Dispatch Notice]', err.message);
    }
  } else {
    deliveryReceiptId = `APP-IN-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const notification = {
    id,
    userId,
    profileId,
    documentId,
    warrantyId,
    title,
    message,
    channel,
    recipient: recipient || (channel === 'SMS' ? '+91 7019182324' : 'docktrack0@gmail.com'),
    status: 'DELIVERED', // Mock-first immediate delivery confirmation
    severity,
    deliveryReceiptId,
    renderedBody,
    readAt: null,
    sentAt: now,
    createdAt: now
  };

  notificationStore.unshift(notification);

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      await Notification.create(notification);
    } catch (err) {}
  }

  return notification;
};

/**
 * Get notifications with optional filters
 */
const getNotifications = (userId, filters = {}) => {
  if (!userId) return [];
  let list = notificationStore.filter(n => n.userId === userId);

  if (filters.channel && filters.channel !== 'ALL') {
    list = list.filter(n => n.channel === filters.channel);
  }

  if (filters.unreadOnly === true || filters.unreadOnly === 'true') {
    list = list.filter(n => !n.readAt);
  }

  if (filters.severity && filters.severity !== 'ALL') {
    list = list.filter(n => n.severity === filters.severity);
  }

  return list;
};

/**
 * Get notification summary metrics
 */
const getNotificationSummary = (userId) => {
  if (!userId) {
    return {
      totalCount: 0,
      unreadCount: 0,
      deliveredCount: 0,
      deliveryRatePct: 100,
      emailCount: 0,
      smsCount: 0,
      inAppCount: 0,
      activeChannels: ['IN_APP', 'EMAIL', 'SMS']
    };
  }
  const all = notificationStore.filter(n => n.userId === userId);
  const unreadCount = all.filter(n => !n.readAt).length;
  const deliveredCount = all.filter(n => n.status === 'DELIVERED').length;
  const emailCount = all.filter(n => n.channel === 'EMAIL').length;
  const smsCount = all.filter(n => n.channel === 'SMS').length;
  const inAppCount = all.filter(n => n.channel === 'IN_APP').length;

  return {
    totalCount: all.length,
    unreadCount,
    deliveredCount,
    deliveryRatePct: all.length > 0 ? Math.round((deliveredCount / all.length) * 100) : 100,
    emailCount,
    smsCount,
    inAppCount,
    activeChannels: ['IN_APP', 'EMAIL', 'SMS']
  };
};

/**
 * Mark a single notification as read
 */
const markNotificationAsRead = (id, userId) => {
  if (!userId) return null;
  const item = notificationStore.find(n => n.id === id && n.userId === userId);
  if (item) {
    item.readAt = new Date();
    return item;
  }
  return null;
};

/**
 * Mark all notifications as read
 */
const markAllNotificationsAsRead = (userId) => {
  if (!userId) return 0;
  let count = 0;
  notificationStore.forEach(n => {
    if (n.userId === userId && !n.readAt) {
      n.readAt = new Date();
      count++;
    }
  });
  return count;
};

/**
 * Delete a notification
 */
const deleteNotification = (id, userId) => {
  if (!userId) return false;
  const len = notificationStore.length;
  notificationStore = notificationStore.filter(n => !(n.id === id && n.userId === userId));
  return notificationStore.length < len;
};

/**
 * Build 90d, 30d, 7d, 1d Threshold Schedule Horizon
 * Inspects all documents & warranties and maps them into reminder queues
 */
const getScheduledHorizon = (userId) => {
  const docs = getDocuments(userId);
  const warranties = getWarranties(userId, {});

  const horizon = {
    day90: [], // 31 - 90 days left
    day30: [], // 8 - 30 days left
    day7: [],  // 2 - 7 days left
    day1: [],  // 0 - 1 day left
    expired: [] // < 0 days
  };

  // Process documents
  docs.forEach(doc => {
    const days = doc.daysLeft;
    if (days === undefined || days === 9999) return;

    const item = {
      id: doc.id,
      type: 'DOCUMENT',
      title: doc.title,
      category: doc.category,
      profileName: doc.profileName,
      expiryDate: doc.expiryDate,
      daysLeft: days,
      suggestedChannels: days <= 7 ? ['SMS', 'EMAIL', 'IN_APP'] : ['EMAIL', 'IN_APP']
    };

    if (days < 0) horizon.expired.push(item);
    else if (days <= 1) horizon.day1.push(item);
    else if (days <= 7) horizon.day7.push(item);
    else if (days <= 30) horizon.day30.push(item);
    else if (days <= 90) horizon.day90.push(item);
  });

  // Process warranties
  warranties.forEach(war => {
    const days = war.daysRemaining;
    if (days === undefined) return;

    const item = {
      id: war.id,
      type: 'WARRANTY',
      title: war.productName,
      category: war.category,
      profileName: war.profileName,
      expiryDate: war.expiryDate,
      daysLeft: days,
      suggestedChannels: days <= 7 ? ['SMS', 'EMAIL', 'IN_APP'] : ['EMAIL', 'IN_APP']
    };

    if (days < 0) horizon.expired.push(item);
    else if (days <= 1) horizon.day1.push(item);
    else if (days <= 7) horizon.day7.push(item);
    else if (days <= 30) horizon.day30.push(item);
    else if (days <= 90) horizon.day90.push(item);
  });

  return horizon;
};

/**
 * Resolves user contact information (name, email, phone) with robust multi-layer fallback:
 * 1. Checks user object passed in (req.user / caller user)
 * 2. If missing details or if userId is provided, looks up via Mongoose User model or localDb by userId
 * 3. If userId is a demo user or email is missing/demo, looks up the primary registered user in localDb (e.g. Zaid Attar / sabaattar523@gmail.com)
 */
const resolveUserContact = async ({ user = null, document = null }) => {
  // If user object was explicitly provided with null/empty email but has phone (e.g. phone-only user)
  if (user && (user.email === null || user.email === '') && user.phone) {
    return {
      name: user.name || document?.profileName || 'Valued User',
      email: '',
      phone: String(user.phone).trim()
    };
  }

  // If user object was explicitly provided with null/empty phone but has email (e.g. email-only user)
  if (user && user.email && (user.phone === null || user.phone === '')) {
    return {
      name: user.name || document?.profileName || 'Valued User',
      email: String(user.email).trim(),
      phone: ''
    };
  }

  let name = user?.name || '';
  let email = user?.email || '';
  let phone = user?.phone || '';

  const userId = user?.id || user?._id || document?.userId;

  if ((!email || !phone) && userId && userId !== 'demo-user-zaid-001') {
    try {
      const { isDbConnected } = require('../config/db');
      if (isDbConnected()) {
        const User = require('../models/User');
        const dbUser = await User.findById(userId);
        if (dbUser) {
          name = name || dbUser.name;
          email = email || dbUser.email;
          phone = phone || dbUser.phone;
        }
      }
    } catch (e) {}

    try {
      const localDb = require('./localDb');
      const localUser = localDb.findUserById(userId);
      if (localUser) {
        name = name || localUser.name;
        email = email || localUser.email;
        phone = phone || localUser.phone;
      }
    } catch (e) {}
  }

  // If userId is demo or email is mock demo address, or neither email nor phone is found, fallback to primary registered user
  if ((!email && !phone) || userId === 'demo-user-zaid-001' || email === 'zaid@example.com' || email === 'demo@doctrack.ai') {
    try {
      const localDb = require('./localDb');
      const allUsers = (localDb.getAllUsers ? localDb.getAllUsers() : []) || [];
      const primaryUser = allUsers.find(u => u.email && !u.email.includes('example.com') && !u.email.includes('doctrack.test'));
      if (primaryUser) {
        name = name || primaryUser.name;
        email = primaryUser.email;
        phone = phone || primaryUser.phone;
      }
    } catch (e) {}
  }

  return {
    name: name || document?.profileName || 'Valued User',
    email: email ? String(email).trim() : '',
    phone: phone ? String(phone).trim() : ''
  };
};

/**
 * Immediate & Background Expiry Notification Dispatcher
 * Inspects document expiry date against configured threshold (default 30 days).
 * Dispatches Nodemailer Email + Twilio SMS to user profile.
 * Prevents duplicate notifications per threshold event via notificationHistory.
 * Safe fallback: missing contact details or transport errors do not throw.
 */
const checkAndDispatchExpiryNotification = async ({
  document,
  user = null,
  thresholdDays = 30,
  isImmediate = false
}) => {
  if (!document || !document.expiryDate || typeof document.expiryDate !== 'string') {
    return { triggered: false, reason: 'NO_EXPIRY_DATE' };
  }

  const expiryLower = document.expiryDate.toLowerCase().trim();
  if (expiryLower.includes('perpetual') || expiryLower.includes('lifetime') || expiryLower.includes('no expiry')) {
    return { triggered: false, reason: 'PERPETUAL_DOCUMENT' };
  }

  const target = new Date(document.expiryDate);
  if (isNaN(target.getTime())) {
    return { triggered: false, reason: 'INVALID_EXPIRY_DATE' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Determine threshold bucket
  let eventThreshold = null;
  if (remainingDays < 0) {
    eventThreshold = -1; // EXPIRED
  } else if (remainingDays <= 1) {
    eventThreshold = 1;
  } else if (remainingDays <= 7) {
    eventThreshold = 7;
  } else if (remainingDays <= thresholdDays) {
    eventThreshold = thresholdDays;
  }

  // If outside threshold, skip
  if (eventThreshold === null) {
    return {
      triggered: false,
      remainingDays,
      thresholdDays,
      reason: 'OUTSIDE_THRESHOLD'
    };
  }

  // Duplicate Check: has notification already been sent for this document & threshold?
  const history = Array.isArray(document.notificationHistory) ? document.notificationHistory : [];
  const alreadySent = history.some(item =>
    (item.thresholdDays === eventThreshold || item.thresholdDays === thresholdDays) &&
    item.status === 'sent'
  );

  if (alreadySent) {
    return {
      triggered: false,
      alreadySent: true,
      remainingDays,
      thresholdDays: eventThreshold,
      reason: 'ALREADY_SENT',
      message: `Notification already dispatched for ${eventThreshold === -1 ? 'expired' : eventThreshold + ' days'} threshold.`
    };
  }

  // Resolve user profile for email & phone
  const contact = await resolveUserContact({ user, document });
  const userName = contact.name;
  const userEmail = contact.email;
  const userPhone = contact.phone;

  let emailStatus = 'skipped';
  let emailMessageId = '';
  let emailError = '';

  let smsStatus = 'skipped';
  let smsMessageId = '';
  let smsError = '';

  const docTitle = document.title || 'Document';
  const docType = document.category || 'Official Record';
  const expiryDateFormatted = document.expiryDate;

  // 1. Dispatch Email via existing Nodemailer SMTP
  if (userEmail) {
    const isUrgent = remainingDays <= 7;
    const emailSubject = remainingDays < 0
      ? `[URGENT] ${docTitle} has EXPIRED — DocTrack AI Action Required`
      : `DocTrack AI – Document Expiry Reminder: ${docTitle} expires in ${remainingDays} days`;

    const clientUrl = config.clientUrl || 'http://localhost:5173';
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #F8FAFC; color: #1E293B; }
    .email-box { max-width: 600px; margin: 24px auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .email-header { background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 24px 32px; color: #FFFFFF; }
    .brand { font-size: 20px; font-weight: 800; }
    .brand span { color: #10B981; }
    .content { padding: 32px; }
    .alert-box { background: ${isUrgent || remainingDays < 0 ? '#FEF2F2' : '#EFF6FF'}; border-left: 4px solid ${isUrgent || remainingDays < 0 ? '#EF4444' : '#3B82F6'}; padding: 16px; border-radius: 6px; margin: 16px 0; }
    .info-row { margin: 8px 0; font-size: 14px; }
    .info-label { color: #64748B; font-weight: 500; }
    .info-val { color: #0F172A; font-weight: 700; }
    .btn { display: inline-block; background-color: #10B981; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; margin-top: 16px; }
    .footer { background: #F8FAFC; padding: 16px 32px; font-size: 12px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="email-box">
    <div class="email-header">
      <div class="brand">DocTrack <span>AI</span></div>
      <div style="font-size: 12px; color: #94A3B8; margin-top: 4px;">Smart Document Expiry & Renewal System</div>
    </div>
    <div class="content">
      <p style="font-size: 16px; margin-top: 0;">Hello <strong>${userName}</strong>,</p>
      <p style="font-size: 14px; color: #475569;">
        ${remainingDays < 0
          ? `Your document <strong>"${docTitle}"</strong> has reached its expiration date.`
          : `Your document <strong>"${docTitle}"</strong> is approaching its expiry date.`}
      </p>
      <div class="alert-box">
        <div class="info-row"><span class="info-label">Document: </span><span class="info-val">${docTitle}</span></div>
        <div class="info-row"><span class="info-label">Type / Category: </span><span class="info-val">${docType}</span></div>
        ${document.docNumber ? `<div class="info-row"><span class="info-label">Document Number: </span><span class="info-val">${document.docNumber}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Expiry Date: </span><span class="info-val">${expiryDateFormatted}</span></div>
        <div class="info-row"><span class="info-label">Days Remaining: </span><span class="info-val" style="color: ${isUrgent || remainingDays < 0 ? '#EF4444' : '#2563EB'};">${remainingDays < 0 ? 'EXPIRED' : `${remainingDays} days`}</span></div>
      </div>
      <p style="font-size: 14px; color: #475569;">
        ${remainingDays < 0
          ? 'Please initiate urgent renewal or update your document record.'
          : 'Please renew your document before it expires to avoid penalties or compliance lapses.'}
      </p>
      <a href="${clientUrl}/renewal-assistant" class="btn">View Renewal Guide & Checklist →</a>
      <p style="font-size: 13px; color: #64748B; margin-top: 24px;">
        Regards,<br><strong>DocTrack AI Team</strong>
      </p>
    </div>
    <div class="footer">
      Automated lifecycle notification from DocTrack AI.
    </div>
  </div>
</body>
</html>
    `.trim();

    try {
      const emailRes = await emailService.sendEmail({
        to: userEmail,
        subject: emailSubject,
        html: emailHtml,
        type: 'DOCUMENT_EXPIRY_REMINDER'
      });
      if (emailRes && emailRes.success) {
        emailStatus = 'sent';
        emailMessageId = emailRes.messageId || `EML-${Date.now()}`;
      } else {
        emailStatus = 'failed';
        emailError = 'Transporter rejected delivery';
      }
    } catch (err) {
      console.warn('[Notification Email Failure Notice]', err.message);
      emailStatus = 'failed';
      emailError = err.message;
    }
  } else {
    emailStatus = 'skipped';
    emailError = 'No email configured on user profile';
  }

  // 2. Dispatch SMS via existing Twilio REST integration
  if (userPhone) {
    const smsText = remainingDays < 0
      ? `[DocTrack AI] URGENT: Your ${docTitle} has EXPIRED on ${expiryDateFormatted}. Please initiate renewal immediately to avoid penalty.`
      : `DocTrack AI Reminder: Your ${docTitle} expires in ${remainingDays} day${remainingDays === 1 ? '' : 's'} on ${expiryDateFormatted}. Please renew it before expiry.`;

    try {
      const smsRes = await smsService.sendSms({
        to: userPhone,
        message: smsText
      });
      if (smsRes && smsRes.success) {
        smsStatus = 'sent';
        smsMessageId = smsRes.messageId || `SMS-${Date.now()}`;
      } else {
        smsStatus = 'failed';
        smsError = 'SMS provider rejected delivery';
      }
    } catch (err) {
      console.warn('[Notification SMS Failure Notice]', err.message);
      smsStatus = 'failed';
      smsError = err.message;
    }
  } else {
    smsStatus = 'skipped';
    smsError = 'No mobile phone number configured on user profile';
  }

  // 3. Record in Document notificationHistory & update Document
  const now = new Date();
  const newHistoryEntries = [];

  if (userEmail || emailStatus === 'skipped') {
    newHistoryEntries.push({
      type: 'expiry',
      channel: 'email',
      thresholdDays: eventThreshold,
      sentAt: now,
      status: emailStatus,
      recipient: userEmail || 'N/A',
      messageId: emailMessageId,
      error: emailError
    });
  }

  if (userPhone || smsStatus === 'skipped') {
    newHistoryEntries.push({
      type: 'expiry',
      channel: 'sms',
      thresholdDays: eventThreshold,
      sentAt: now,
      status: smsStatus,
      recipient: userPhone || 'N/A',
      messageId: smsMessageId,
      error: smsError
    });
  }

  document.notificationHistory = [...history, ...newHistoryEntries];
  document.lastNotificationAt = now;

  const docId = document._id ? document._id.toString() : document.id;

  try {
    const { isDbConnected } = require('../config/db');
    if (isDbConnected()) {
      const Document = require('../models/Document');
      await Document.findByIdAndUpdate(docId, {
        notificationHistory: document.notificationHistory,
        lastNotificationAt: document.lastNotificationAt
      });
    } else {
      const { updateDocument: updateLocalDoc } = require('./documentStore');
      updateLocalDoc(docId, {
        notificationHistory: document.notificationHistory,
        lastNotificationAt: document.lastNotificationAt
      });
    }
  } catch (err) {
    console.warn('[Notification History Save Warning]', err.message);
  }

  // 4. Create in-app notification record
  try {
    await sendNotification({
      userId: document.userId || 'demo-user-zaid-001',
      profileId: document.profileId || 'self',
      documentId: docId,
      title: remainingDays < 0 ? `Document Expired: ${docTitle}` : `${docTitle} Expiring in ${remainingDays} Days`,
      message: remainingDays < 0
        ? `Your document ${docTitle} reached its expiration date on ${expiryDateFormatted}.`
        : `Your document ${docTitle} is expiring soon on ${expiryDateFormatted} (${remainingDays} days remaining).`,
      channel: 'IN_APP',
      severity: remainingDays <= 7 ? 'CRITICAL' : 'WARNING',
      documentTitle: docTitle,
      daysLeft: remainingDays,
      expiryDate: expiryDateFormatted
    });
  } catch (err) {}

  const friendlyMessage = remainingDays < 0
    ? `Your ${docTitle} has expired. A reminder has been dispatched to your registered contacts.`
    : `Your ${docTitle} expires in ${remainingDays} day${remainingDays === 1 ? '' : 's'}. A reminder has been sent to your ${emailStatus === 'sent' && smsStatus === 'sent' ? 'email and mobile number' : emailStatus === 'sent' ? 'email' : smsStatus === 'sent' ? 'mobile number' : 'registered account'}.`;

  return {
    triggered: true,
    daysLeft: remainingDays,
    thresholdDays: eventThreshold,
    emailSent: emailStatus === 'sent',
    smsSent: smsStatus === 'sent',
    emailStatus,
    smsStatus,
    emailRecipient: userEmail || null,
    smsRecipient: userPhone || null,
    message: friendlyMessage
  };
};

/**
 * Dispatches Document Uploaded confirmation notifications via Email and SMS
 * Automatically updates document.notificationHistory
 */
const dispatchDocumentUploadedNotification = async ({ document, user = null }) => {
  if (!document) return { triggered: false, reason: 'NO_DOCUMENT' };

  const contact = await resolveUserContact({ user, document });
  const { name, email, phone } = contact;

  const docTitle = document.title || 'Document';
  const expiryDate = document.expiryDate || '';
  const daysLeft = document.daysLeft !== undefined ? document.daysLeft : null;
  const status = document.status || 'ACTIVE';

  let emailStatus = 'skipped';
  let emailMessageId = '';
  let emailError = '';

  let smsStatus = 'skipped';
  let smsMessageId = '';
  let smsError = '';

  // 1. Dispatch Document Uploaded Email via Nodemailer SMTP
  if (email) {
    try {
      const emailRes = await emailService.sendDocumentUploadedEmail({
        user: { name, email },
        document,
        daysLeft,
        status
      });
      if (emailRes && emailRes.success) {
        emailStatus = 'sent';
        emailMessageId = emailRes.messageId || `EML-UPL-${Date.now()}`;
      } else {
        emailStatus = 'failed';
        emailError = 'Transporter rejected upload delivery';
      }
    } catch (err) {
      console.warn('[Upload Notification Email Notice]', err.message);
      emailStatus = 'failed';
      emailError = err.message;
    }
  } else {
    emailStatus = 'skipped';
    emailError = 'No email configured on user profile';
  }

  // 2. Dispatch Document Uploaded SMS via Twilio / mock fallback
  if (phone) {
    try {
      const smsRes = await smsService.sendDocumentUploadedSms({
        to: phone,
        documentTitle: docTitle,
        expiryDate,
        daysLeft,
        status
      });
      if (smsRes && smsRes.success) {
        smsStatus = 'sent';
        smsMessageId = smsRes.messageId || `SMS-UPL-${Date.now()}`;
      } else {
        smsStatus = 'failed';
        smsError = 'SMS provider rejected upload delivery';
      }
    } catch (err) {
      console.warn('[Upload Notification SMS Notice]', err.message);
      smsStatus = 'failed';
      smsError = err.message;
    }
  } else {
    smsStatus = 'skipped';
    smsError = 'No mobile phone configured on user profile';
  }

  // 3. Record in document notificationHistory
  const now = new Date();
  const newHistoryEntries = [];

  if (email) {
    newHistoryEntries.push({
      channel: 'EMAIL',
      type: 'DOCUMENT_UPLOADED',
      recipient: email,
      status: emailStatus,
      messageId: emailMessageId,
      error: emailError || null,
      sentAt: now,
      createdAt: now
    });
  }

  if (phone) {
    newHistoryEntries.push({
      channel: 'SMS',
      type: 'DOCUMENT_UPLOADED',
      recipient: smsService.normalizePhoneNumber ? smsService.normalizePhoneNumber(phone) : phone,
      status: smsStatus,
      messageId: smsMessageId,
      error: smsError || null,
      sentAt: now,
      createdAt: now
    });
  }

  if (!Array.isArray(document.notificationHistory)) {
    document.notificationHistory = [];
  }
  document.notificationHistory.push(...newHistoryEntries);

  return {
    triggered: true,
    email: { status: emailStatus, messageId: emailMessageId, error: emailError, recipient: email },
    sms: { status: smsStatus, messageId: smsMessageId, error: smsError, recipient: phone },
    historyEntries: newHistoryEntries
  };
};

module.exports = {
  sendNotification,
  getNotifications,
  getNotificationSummary,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getScheduledHorizon,
  renderEmailHtml,
  resolveUserContact,
  checkAndDispatchExpiryNotification,
  dispatchDocumentUploadedNotification
};
