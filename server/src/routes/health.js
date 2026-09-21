const express = require('express');
const router = express.Router();
const config = require('../config/env');
const { isDbConnected } = require('../config/db');
const cloudinaryService = require('../services/cloudinary.service');
const geminiService = require('../services/gemini.service');
const emailService = require('../services/email.service');
const smsService = require('../services/sms.service');

// @route   GET /api/health
// @desc    Production deployment health check endpoint
// @access  Public
router.get('/', (req, res) => {
  const dbStatus = isDbConnected();

  res.status(200).json({
    status: 'ok',
    service: 'DocTrack AI',
    environment: config.nodeEnv,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus ? 'connected' : 'disconnected',
      type: 'MongoDB / Mongoose'
    },
    integrations: {
      cloudinary: cloudinaryService.isConfigured(),
      gemini: geminiService.isConfigured(),
      smtp: emailService.isConfigured(),
      twilio: smsService.isConfigured()
    }
  });
});

module.exports = router;
