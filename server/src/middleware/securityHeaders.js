/**
 * Security Headers Middleware
 * Applies defense-in-depth HTTP headers and removes fingerprinting vectors.
 */

const securityHeaders = (req, res, next) => {
  // Remove Express fingerprinting header
  res.removeHeader('X-Powered-By');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Mitigate clickjacking by restricting framing to same origin
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Enable browser XSS protection filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Enforce HTTPS transmission via HSTS (1 year duration)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Limit referrer leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy allowing local assets, data URIs, and previews
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https:; frame-ancestors 'self';"
  );

  // Disable sensitive browser APIs by default
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');

  next();
};

module.exports = securityHeaders;
