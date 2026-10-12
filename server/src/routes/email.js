/**
 * Dedicated SMTP Email Service API
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
 * @desc    Check SMTP configuration and verify live transport connection
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const isConfigured = emailService.isConfigured();
    const isConnected = await emailService.verifySmtpConnection();

    return res.status(200).json({
      success: true,
      service: 'DocTrack AI SMTP Email Service',
      enabled: true,
      configured: isConfigured,
      connected: isConnected,
      mode: isConnected ? 'Live Gmail SMTP' : 'Fallback Delivery',
      sender: 'DocTrack AI <docktrack0@gmail.com>',
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
 * @desc    Send a diagnostic test email to any specified email address
 * @access  Public
 */
router.post('/send-test', async (req, res) => {
  try {
    const to = req.body.to || req.body.email || 'docktrack0@gmail.com';
    const result = await emailService.sendEmail({
      to,
      subject: 'DocTrack AI — SMTP Email Service Test',
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #1e293b;">
          <h2 style="color: #10b981;">✓ DocTrack AI Email Service is Active</h2>
          <p>This is a live test notification confirming that the Gmail SMTP service is fully operational.</p>
          <p><strong>Recipient:</strong> ${to}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
      `,
      type: 'TEST'
    });

    return res.status(200).json({
      success: true,
      message: `Test email dispatched to ${to}`,
      result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
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
