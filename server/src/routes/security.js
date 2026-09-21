const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const { getSecurityOverview, getSecurityLogs, logSecurityEvent } = require('../services/securityAuditService');

// @route   GET /api/security/overview
// @desc    Get system security posture and active control status
router.get('/overview', (req, res) => {
  const overview = getSecurityOverview();
  return res.status(200).json({
    success: true,
    data: overview
  });
});

// @route   GET /api/security/audit-logs
// @desc    Get security audit trail
router.get('/audit-logs', authenticateJWT, (req, res) => {
  const { limit, severity, type } = req.query;
  const logs = getSecurityLogs({ limit, severity, type });
  return res.status(200).json({
    success: true,
    count: logs.length,
    data: logs
  });
});

// @route   POST /api/security/test-log
// @desc    Record a test security audit event
router.post('/test-log', authenticateJWT, async (req, res) => {
  const { type, title, details, severity } = req.body || {};
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const entry = await logSecurityEvent({
    type: type || 'TEST_SECURITY_EVENT',
    userId: req.user?.id || 'authenticated-user',
    ip,
    severity: severity || 'INFO',
    title: title || 'Test Security Event',
    details: details || 'Security logging endpoint verified'
  });

  return res.status(201).json({
    success: true,
    data: entry
  });
});

module.exports = router;
