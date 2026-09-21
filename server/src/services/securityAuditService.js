/**
 * Security Audit & Event Logging Service
 * Records authentication events, authorization rejections, rate limits,
 * and malicious signature detections.
 */

const ActivityLog = require('../models/ActivityLog');
const mongoose = require('mongoose');

// In-memory security audit log store for fast diagnostics and offline fallback
const securityLogStore = [
  {
    id: 'sec-log-01',
    type: 'SYSTEM_HARDENED',
    userId: 'system',
    ip: '127.0.0.1',
    severity: 'INFO',
    title: 'Security Defense-in-Depth Initialized',
    details: 'HTTP security headers, sliding-window rate limiters, and magic-byte inspection active.',
    timestamp: new Date().toISOString()
  }
];

/**
 * Log a security event
 */
const logSecurityEvent = async ({
  type = 'SECURITY_EVENT',
  userId = 'anonymous',
  ip = '127.0.0.1',
  severity = 'INFO',
  title = '',
  details = ''
}) => {
  const logEntry = {
    id: `sec-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    userId,
    ip,
    severity,
    title: title || type,
    details,
    timestamp: new Date().toISOString()
  };

  securityLogStore.unshift(logEntry);
  if (securityLogStore.length > 200) {
    securityLogStore.pop();
  }

  // Persist to ActivityLog if Mongo is connected
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      await ActivityLog.create({
        userId,
        type: 'STATUS_CHANGE',
        title: `[Security: ${severity}] ${title || type}`,
        description: `${details} (IP: ${ip})`,
        timestamp: new Date()
      });
    } catch {
      // ignore
    }
  }

  return logEntry;
};

/**
 * Get recent security audit entries
 */
const getSecurityLogs = (filters = {}) => {
  let logs = [...securityLogStore];

  if (filters.severity) {
    logs = logs.filter(l => l.severity === filters.severity);
  }

  if (filters.type) {
    logs = logs.filter(l => l.type === filters.type);
  }

  const limit = Number(filters.limit) || 50;
  return logs.slice(0, limit);
};

/**
 * Get comprehensive overview of active security controls
 */
const getSecurityOverview = () => {
  return {
    status: 'ACTIVE_PROTECTED',
    lastAuditTimestamp: new Date().toISOString(),
    controls: {
      securityHeaders: {
        status: 'ENFORCED',
        headers: [
          'X-Content-Type-Options: nosniff',
          'X-Frame-Options: SAMEORIGIN',
          'X-XSS-Protection: 1; mode=block',
          'Strict-Transport-Security: 1yr',
          'Content-Security-Policy: restricted',
          'X-Powered-By: suppressed'
        ]
      },
      rateLimiting: {
        status: 'ENFORCED',
        authLimit: '20 req / 15 min per IP',
        apiLimit: '600 req / 5 min per IP'
      },
      inputSanitization: {
        status: 'ENFORCED',
        protections: ['NoSQL operator stripping ($ / .)', 'XSS HTML entity escaping', 'Schema validations']
      },
      fileUploadSecurity: {
        status: 'ENFORCED',
        maxFileSize: '15MB',
        magicBytesInspection: ['PDF (%PDF-)', 'PNG (\\x89PNG)', 'JPEG (\\xFF\\xD8\\xFF)', 'WEBP (RIFF...WEBP)']
      },
      dataIsolation: {
        status: 'ENFORCED',
        mechanism: 'Resource-level user ownership checks on all mutating and lookup operations'
      },
      errorHandling: {
        status: 'ENFORCED',
        mechanism: 'Sanitized error responses, automated DB exception translation, zero stack leaks in production'
      }
    },
    metrics: {
      totalLoggedEvents: securityLogStore.length,
      recentAlerts: securityLogStore.filter(l => l.severity === 'WARNING' || l.severity === 'CRITICAL').length
    }
  };
};

module.exports = {
  logSecurityEvent,
  getSecurityLogs,
  getSecurityOverview
};
