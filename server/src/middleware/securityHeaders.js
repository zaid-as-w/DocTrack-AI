/**
 * Security Headers Middleware
 * Applies defense-in-depth HTTP headers and removes fingerprinting vectors.
 */

const CLIENT_ORIGIN = process.env.CLIENT_URL || 'https://doc-track-ai.vercel.app';

const securityHeaders = (req, res, next) => {
  // Remove Express fingerprinting header
  res.removeHeader('X-Powered-By');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Mitigate clickjacking by restricting framing to same origin
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable browser XSS protection filter (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Enforce HTTPS transmission via HSTS (1 year duration, include subdomains)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Limit referrer leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy — tightened for DocTrack AI
  // No unsafe-eval. No wildcard http: or https:.
  // Cloudinary is allowed for media (document previews stored there).
  const cloudinaryHost = 'res.cloudinary.com';
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,       // 'unsafe-inline' retained for Vite SPA hash; remove once nonces are wired
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https://${cloudinaryHost}`,
    `connect-src 'self' ${CLIENT_ORIGIN} https://${cloudinaryHost} https://api.fast2sms.com https://api.twilio.com`,
    `media-src 'self' blob: https://${cloudinaryHost}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);

  // Disable sensitive browser APIs by default
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=(), clipboard-read=(), clipboard-write=()');

  // Cross-Origin policies
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  next();
};

module.exports = securityHeaders;
