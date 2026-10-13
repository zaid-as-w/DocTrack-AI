/**
 * Dedicated Amazon SES Email Service API (AWS SDK v3)
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
 * @desc    Check Amazon SES configuration and verify live SDK client
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const isConfigured = emailService.isConfigured();
    const isConnected = await emailService.verifySesConnection();

    return res.status(200).json({
      success: true,
      service: 'DocTrack AI Amazon SES Email Service (AWS SDK v3)',
      enabled: true,
      configured: isConfigured,
      connected: isConnected,
      mode: isConnected ? 'Amazon SES Live API (ap-south-1)' : 'Standby / Unverified Mode',
      region: process.env.AWS_REGION || 'ap-south-1',
      sender: process.env.SES_FROM_EMAIL || 'Unconfigured',
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
 * @desc    Send a diagnostic test email via Amazon SES to any specified email address
 * @access  Public
 */
router.post('/send-test', async (req, res) => {
  try {
    const to = req.body.to || req.body.email || process.env.SES_FROM_EMAIL;
    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email address (to) is required.'
      });
    }

    const result = await emailService.sendEmail({
      to,
      subject: 'DocTrack AI — Amazon SES Email Service Test',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; color: #1e293b; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #10b981; margin-top: 0;">✓ DocTrack AI Amazon SES Service is Active</h2>
          <p>This is a live test notification confirming that Amazon Simple Email Service (SES) via AWS SDK v3 is operational.</p>
          <div style="background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 13px;">
            <div><strong>Recipient:</strong> ${to}</div>
            <div><strong>AWS Region:</strong> ${process.env.AWS_REGION || 'ap-south-1'}</div>
            <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
          </div>
        </div>
      `,
      type: 'TEST'
    });

    return res.status(200).json({
      success: true,
      message: `Test email dispatched via Amazon SES to ${to}`,
      result
    });
  } catch (error) {
    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    return res.status(statusCode).json({
      success: false,
      code: error.code || 'SES_DELIVERY_FAILED',
      message: error.message || 'Failed to send test email via Amazon SES',
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
