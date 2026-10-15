/**
 * Production & Development Environment Validation Module
 * Verifies required and optional configurations without leaking secrets.
 */

const config = require('./env');

/**
 * Mask sensitive string leaving only first and last 2 characters (if length > 4)
 */
const maskSecret = (val) => {
  if (!val) return 'none';
  if (val.length <= 4) return '****';
  return `${val.slice(0, 2)}***${val.slice(-2)}`;
};

/**
 * Sanitize connection URIs (e.g. mongodb://user:pass@host/db -> mongodb://user:***@host/db)
 */
const sanitizeUri = (uri) => {
  if (!uri) return 'not configured';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
};

/**
 * Validate configuration status across services
 * Returns status report object
 */
const validateConfig = () => {
  const isProd = config.isProduction;
  const errors = [];
  const warnings = [];

  // 1. Database
  const hasMongo = Boolean(config.mongodbUri);
  if (!hasMongo) {
    errors.push('MONGODB_URI is required.');
  }

  // 2. JWT Secret
  const hasJwt = Boolean(config.jwtSecret);
  const isDefaultJwt = config.jwtSecret.includes('dev_fallback_secret_key');
  if (!hasJwt) {
    errors.push('JWT_SECRET is required.');
  } else if (isProd && isDefaultJwt) {
    errors.push('JWT_SECRET cannot use default development fallback in production!');
  }

  // 3. Cloudinary (Optional in dev, recommended/required in prod for persistent storage)
  const hasCloudinary = Boolean(
    config.cloudinary.cloudName &&
    config.cloudinary.apiKey &&
    config.cloudinary.apiSecret
  );
  if (!hasCloudinary && isProd) {
    warnings.push('Cloudinary credentials missing. Ephemeral disk storage in production may lose uploaded files across restarts.');
  }

  // 4. Gemini AI (Optional in dev, recommended in prod)
  const hasGemini = Boolean(config.geminiApiKey);
  if (!hasGemini && isProd) {
    warnings.push('GEMINI_API_KEY missing. Fallback heuristic/rule-based OCR and NLP engines will be used.');
  }

  // 5. Google Gmail API (OAuth2)
  const isPlaceholder = (val) => {
    if (!val || typeof val !== 'string') return true;
    const lower = val.toLowerCase();
    return lower.startsWith('your-') || lower.startsWith('your_') || lower.startsWith('change_me');
  };

  const hasGmail = Boolean(
    config.gmail?.user && !isPlaceholder(config.gmail.user) &&
    config.gmail?.clientId && !isPlaceholder(config.gmail.clientId) &&
    config.gmail?.clientSecret && !isPlaceholder(config.gmail.clientSecret) &&
    config.gmail?.refreshToken && !isPlaceholder(config.gmail.refreshToken)
  );
  if (!hasGmail && isProd) {
    warnings.push('Google Gmail API OAuth2 configuration missing (GMAIL_USER, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN). Notifications will fail to dispatch.');
  }

  // 6. Twilio SMS & Voice
  const hasTwilio = Boolean(
    config.twilio.accountSid &&
    (config.twilio.phoneNumber || config.twilio.messagingServiceSid) &&
    (config.twilio.authToken || (config.twilio.apiKey && config.twilio.apiSecret))
  );

  const status = {
    isValid: errors.length === 0,
    isProduction: isProd,
    errors,
    warnings,
    services: {
      mongodb: hasMongo,
      jwt: hasJwt && (!isProd || !isDefaultJwt),
      cloudinary: hasCloudinary,
      gemini: hasGemini,
      gmail: hasGmail,
      ses: hasGmail, // backwards compatibility alias
      smtp: hasGmail, // backwards compatibility alias
      twilio: hasTwilio
    }
  };

  return status;
};

/**
 * Print clean, sanitized configuration summary during server startup
 */
const printConfigBanner = () => {
  const status = validateConfig();

  console.log('==================================================');
  console.log(`🌐 DocTrack AI Environment: [${config.nodeEnv.toUpperCase()}]`);
  console.log('--------------------------------------------------');
  console.log(status.services.mongodb ? '  ✓ MongoDB configured' : '  ✗ MongoDB missing');
  console.log(status.services.jwt ? '  ✓ JWT Authentication configured' : '  ✗ JWT Secret missing or insecure');
  console.log(status.services.cloudinary ? '  ✓ Cloudinary configured' : '  - Cloudinary not configured (local storage fallback active)');
  console.log(status.services.gemini ? '  ✓ Gemini configured' : '  - Gemini not configured (heuristic & rule NLP fallback active)');
  console.log(status.services.gmail ? `  ? Google Gmail API configured (${config.gmail?.user || 'OAuth2'})` : '  - Google Gmail API not configured (OAuth2 credentials missing)');
  console.log(status.services.twilio ? '  ✓ Twilio configured (SMS & Voice active)' : '  - Twilio not configured (SMS & Voice notifications disabled)');
  console.log('==================================================');

  if (status.errors.length > 0) {
    console.error('❌ CONFIGURATION ERRORS:');
    status.errors.forEach(err => console.error(`   - ${err}`));
    if (config.isProduction) {
      throw new Error(`Production startup aborted due to configuration errors: ${status.errors.join(', ')}`);
    }
  }

  if (status.warnings.length > 0 && config.isProduction) {
    console.warn('⚠️  CONFIGURATION NOTICES:');
    status.warnings.forEach(warn => console.warn(`   - ${warn}`));
  }

  return status;
};

module.exports = {
  validateConfig,
  printConfigBanner,
  sanitizeUri,
  maskSecret
};
