const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file located at server/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Filter placeholder values (e.g. YOUR_API_KEY) so unconfigured integrations cleanly fallback
 */
const cleanEnvStr = (val, defaultVal = '') => {
  if (!val || typeof val !== 'string') return defaultVal;
  const trimmed = val.trim();
  if (trimmed.startsWith('YOUR_') || trimmed.startsWith('your_')) return defaultVal;
  return trimmed;
};

const rawMongo = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const safeMongo = cleanEnvStr(rawMongo, 'mongodb://localhost:27017/doctrack');

const config = {
  // Server Configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'https://doc-track-ai.vercel.app',

  // Database Configuration
  mongodbUri: safeMongo,
  dbName: cleanEnvStr(process.env.DB_NAME, 'doctrack').toLowerCase(),

  // Authentication & Security
  // SECURITY: No fallback secret. Production startup fails if JWT_SECRET is not set.
  jwtSecret: (() => {
    const secret = cleanEnvStr(process.env.JWT_SECRET, '');
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start in production without a secure secret.');
        process.exit(1);
      }
      // Development-only fallback — never valid in production
      return 'dev_insecure_fallback_DO_NOT_USE_IN_PRODUCTION';
    }
    if (secret.length < 32) {
      console.warn('[Security Warning] JWT_SECRET is shorter than 32 characters. Please use a longer, randomly generated secret.');
    }
    return secret;
  })(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // Cloudinary Cloud Storage
  cloudinary: {
    cloudName: cleanEnvStr(process.env.CLOUDINARY_CLOUD_NAME),
    apiKey: cleanEnvStr(process.env.CLOUDINARY_API_KEY),
    apiSecret: cleanEnvStr(process.env.CLOUDINARY_API_SECRET)
  },

  // Google Gemini AI
  geminiApiKey: cleanEnvStr(process.env.GEMINI_API_KEY),

  // SMTP Email Configuration
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: cleanEnvStr(process.env.SMTP_USER, 'docktrack0@gmail.com'),
    password: cleanEnvStr(process.env.SMTP_PASSWORD, 'ksfjafaxbtaypohf'),
    from: cleanEnvStr(process.env.EMAIL_FROM, 'DocTrack AI <docktrack0@gmail.com>')
  },
  emailServiceEnabled: process.env.ENABLE_EMAIL_SERVICE !== 'false',

  // External AI / OCR Service URL (Optional FastAPI microservice)
  aiServiceUrl: cleanEnvStr(process.env.AI_SERVICE_URL),

  // Twilio SMS Configuration
  twilio: {
    accountSid: cleanEnvStr(process.env.TWILIO_ACCOUNT_SID),
    apiKey: cleanEnvStr(process.env.TWILIO_API_KEY),
    apiSecret: cleanEnvStr(process.env.TWILIO_API_SECRET),
    phoneNumber: cleanEnvStr(process.env.TWILIO_PHONE_NUMBER)
  },

  // Helper getters
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
};

// Backwards compatibility getter for mongoUri
config.mongoUri = config.mongodbUri;

module.exports = config;
