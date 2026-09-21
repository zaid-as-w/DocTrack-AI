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

  // 5. SMTP Email (Optional in dev, recommended in prod)
  const hasSmtp = Boolean(
    config.smtp.host &&
    config.smtp.user &&
    config.smtp.password
  );
  if (!hasSmtp && isProd) {
    warnings.push('SMTP credentials missing. Notifications will log to mock outbox instead of dispatching real emails.');
  }

  // 6. Twilio SMS (Optional integration)
  const hasTwilio = Boolean(
    config.twilio.accountSid &&
    config.twilio.phoneNumber &&
    (config.twilio.apiKey || config.twilio.apiSecret)
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
      smtp: hasSmtp,
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
  console.log(status.services.smtp ? '  ✓ SMTP configured' : '  - SMTP not configured (mock notification fallback active)');
  console.log(status.services.twilio ? '  ✓ Twilio configured' : '  - Twilio not configured (mock SMS fallback active)');
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
