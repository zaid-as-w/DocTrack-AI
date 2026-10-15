/**
 * Official Google Gmail API Email Service Endpoints (OAuth2)
 * DocTrack AI — Live Email Dispatch & Diagnostic Endpoints
 */

const express = require('express');
const router = express.Router();
const emailService = require('../services/email.service');
const { sendOtp } = require('../controllers/authController');
const {
  dispatchDocumentUploadedNotification,
  checkAndDispatchExpiryNotification
} = require('../services/notificationService');

/**
 * @route   GET /api/email/status
 * @desc    Check Google Gmail API configuration and verify live OAuth2 client
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const isConfigured = emailService.isConfigured();
    const isConnected = await emailService.verifyGmailConnection();

    return res.status(200).json({
      success: true,
      service: 'DocTrack AI Official Gmail API Email Service (OAuth2)',
      provider: 'Gmail API',
      enabled: true,
      configured: isConfigured,
      connected: isConnected,
      mode: isConnected ? 'Gmail API Live (OAuth2 Authorized)' : 'Standby / Unverified Mode',
      sender: process.env.GMAIL_USER || 'Unconfigured',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/email/send-code
 * @desc    Dispatch 6-digit verification code to email for instant password reset
 * @access  Public
 */
router.post('/send-code', sendOtp);

/**
 * @route   POST /api/email/send-test
 * @desc    Send a diagnostic test email via Google Gmail API to any specified email address
 * @access  Public
 */
router.post('/send-test', async (req, res) => {
  try {
    const to = req.body.to || req.body.email || process.env.GMAIL_USER;
    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email address (to) is required.'
      });
    }

    const result = await emailService.sendEmail({
      to,
      subject: 'DocTrack AI — Official Gmail API Email Service Test',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; color: #1e293b; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #10b981; margin-top: 0;">✔ DocTrack AI Gmail API Service is Active</h2>
          <p>This is a live test notification confirming that the official Google Gmail API via OAuth2 authentication is operational.</p>
          <div style="background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 13px;">
            <div><strong>Recipient:</strong> ${to}</div>
            <div><strong>Authenticated Sender:</strong> ${process.env.GMAIL_USER || 'Configured via OAuth2'}</div>
            <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
          </div>
        </div>
      `,
      type: 'TEST'
    });

    return res.status(200).json({
      success: true,
      message: `Test email dispatched via Gmail API to ${to}`,
      result
    });
  } catch (error) {
    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    return res.status(statusCode).json({
      success: false,
      code: error.code || 'GMAIL_DELIVERY_FAILED',
      message: error.message || 'Failed to send test email via Gmail API',
      remediation: error.remediation || null
    });
  }
});

/**
 * @route   POST /api/email/notify-upload
 * @desc    Trigger document upload notification email
 * @access  Public
 */
router.post('/notify-upload', async (req, res) => {
  try {
    const { document, user } = req.body;
    if (!document) {
      return res.status(400).json({ success: false, message: 'Document object is required.' });
    }
    const result = await dispatchDocumentUploadedNotification({ document, user });
    return res.status(200).json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/email/notify-expiry
 * @desc    Trigger document expiry reminder email
 * @access  Public
 */
router.post('/notify-expiry', async (req, res) => {
  try {
    const { document, user, thresholdDays } = req.body;
    if (!document) {
      return res.status(400).json({ success: false, message: 'Document object is required.' });
    }
    const result = await checkAndDispatchExpiryNotification({
      document,
      user,
      thresholdDays: thresholdDays || 30,
      isImmediate: true
    });
    return res.status(200).json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
