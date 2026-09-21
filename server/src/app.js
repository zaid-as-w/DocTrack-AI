const express = require('express');
const cors = require('cors');
const path = require('path');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const profileRoutes = require('./routes/profiles');
const documentRoutes = require('./routes/documents');
const expiryRoutes = require('./routes/expiry');
const alertRoutes = require('./routes/alerts');
const ocrRoutes = require('./routes/ocr');
const classificationRoutes = require('./routes/classification');
const warrantyRoutes = require('./routes/warranties');
const notificationRoutes = require('./routes/notifications');
const reminderRoutes = require('./routes/reminders');
const chatRoutes = require('./routes/chat');
const renewalRoutes = require('./routes/renewals');
const securityRoutes = require('./routes/security');
const securityHeaders = require('./middleware/securityHeaders');
const { apiRateLimiter } = require('./middleware/rateLimiter');
const { sanitizeNoSql, sanitizeXss } = require('./middleware/validators');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 1. Security Headers (HSTS, CSP, nosniff, frame denial, suppression of X-Powered-By)
app.use(securityHeaders);

// 2. Enable Cross-Origin Resource Sharing with configured origin
const clientUrlEnv = process.env.CLIENT_URL || 'https://doc-track-ai.vercel.app';
const configuredOrigins = clientUrlEnv.split(',').map(u => u.trim().replace(/\/$/, '')).filter(Boolean);
const allowedOrigins = [
  ...configuredOrigins,
  'https://doc-track-ai.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile, tests, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    // Check configured exact origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow any Vercel deployment (*.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    // In development or local testing, allow any localhost / 127.0.0.1 port
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocalhost) {
      return callback(null, true);
    }
    // Safely reject origin without throwing unhandled 500 error
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Bypass-Ratelimit', 'Accept', 'Origin', 'X-Requested-With']
}));

// 3. General API Rate Limiting (protects against high-frequency flooding)
app.use('/api', apiRateLimiter);

// 4. Request Body Parsing with Safety Limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Input Sanitization (NoSQL query operator stripping & XSS tag neutralizing)
app.use(sanitizeNoSql);
app.use(sanitizeXss);

// 6. Secure Uploads File Serving (Guarded by JWT Authentication & Path Traversal Prevention)
const fs = require('fs');
const authenticateJWT = require('./middleware/auth');
const Document = require('./models/Document');
const { isDbConnected } = require('./config/db');
const { getDocuments } = require('./services/documentStore');

const uploadsPath = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  try {
    fs.mkdirSync(uploadsPath, { recursive: true });
  } catch (err) {
    console.warn('[DocTrack Warning] Failed to ensure uploads directory exists:', err.message);
  }
}

app.get('/uploads/:filename', authenticateJWT, async (req, res, next) => {
  try {
    const rawFilename = req.params.filename;
    // Strict path traversal mitigation: prevent directory traversal via basename
    const safeFilename = path.basename(rawFilename);
    const filePath = path.resolve(uploadsPath, safeFilename);

    if (!filePath.startsWith(uploadsPath) || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        status: 'error',
        code: 'FILE_NOT_FOUND',
        errorCode: 'FILE_NOT_FOUND',
        message: 'The requested file was not found on local storage.'
      });
    }

    // Verify ownership of the document associated with this file
    const currentUserId = req.user?.id;
    let doc = null;

    if (isDbConnected()) {
      doc = await Document.findOne({ fileUrl: { $regex: safeFilename, $options: 'i' } });
    }
    if (!doc) {
      const allLocal = getDocuments();
      doc = allLocal.find(d => d.fileUrl && d.fileUrl.includes(safeFilename));
    }

    if (doc && doc.userId && doc.userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        status: 'error',
        code: 'FORBIDDEN_FILE_ACCESS',
        errorCode: 'FORBIDDEN_FILE_ACCESS',
        message: 'Access denied: You do not have permission to view or download this document.'
      });
    }

    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// 7. API Routes & Health Endpoints
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/expiry', expiryRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/classification', classificationRoutes);
app.use('/api/warranties', warrantyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/renewals', renewalRoutes);

// Root operational endpoint for PaaS pinging (Render / Railway / Fly)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'DocTrack AI API Server',
    message: 'DocTrack AI API is running and operational',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      uploads: '/uploads'
    }
  });
});

// Fallback 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `API endpoint ${req.originalUrl} not found`
  });
});

// Global error handling middleware
app.use(errorHandler);

module.exports = app;
