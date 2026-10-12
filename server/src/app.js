const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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
const emailRoutes = require('./routes/email');
const securityHeaders = require('./middleware/securityHeaders');
const { apiRateLimiter } = require('./middleware/rateLimiter');
const { sanitizeNoSql, sanitizeXss } = require('./middleware/validators');
const errorHandler = require('./middleware/errorHandler');
const authenticateJWT = require('./middleware/auth');
const Document = require('./models/Document');
const { isDbConnected } = require('./config/db');
const { getDocuments } = require('./services/documentStore');

const app = express();

// 1. Security Headers (HSTS, CSP, nosniff, frame denial, suppression of X-Powered-By)
app.use(securityHeaders);

// 2. Enable Cross-Origin Resource Sharing — only explicitly configured origins allowed.
//    No *.vercel.app wildcard. No blanket localhost in production.
const clientUrlEnv = process.env.CLIENT_URL || 'https://doc-track-ai.vercel.app';
const configuredOrigins = clientUrlEnv.split(',').map(u => u.trim().replace(/\/$/, '')).filter(Boolean);

const devOnlyOrigins = process.env.NODE_ENV !== 'production'
  ? [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ]
  : [];

const allowedOrigins = [...new Set([...configuredOrigins, ...devOnlyOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Reject unknown origins — do NOT log origin to prevent log injection
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// 3. General API Rate Limiting (protects against high-frequency flooding)
app.use('/api', apiRateLimiter);

// 4. Request Body Parsing with Safety Limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Input Sanitization (NoSQL query operator stripping & XSS HTML encoding)
app.use(sanitizeNoSql);
app.use(sanitizeXss);

// 6. Secure Uploads File Serving (Guarded by JWT Authentication & Path Traversal Prevention)
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
    // Strict path traversal mitigation: use only basename component
    const safeFilename = path.basename(rawFilename);
    const filePath = path.resolve(uploadsPath, safeFilename);

    // Reject any path that escapes the uploads directory
    if (!filePath.startsWith(uploadsPath + path.sep) && filePath !== uploadsPath) {
      return res.status(400).json({
        success: false,
        status: 'error',
        code: 'INVALID_PATH',
        errorCode: 'INVALID_PATH',
        message: 'Invalid file path.'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        status: 'error',
        code: 'FILE_NOT_FOUND',
        errorCode: 'FILE_NOT_FOUND',
        message: 'The requested file was not found.'
      });
    }

    // Verify ownership: authenticated user must own the document
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    let doc = null;

    if (isDbConnected()) {
      doc = await Document.findOne({ fileUrl: { $regex: safeFilename, $options: 'i' } });
    }
    if (!doc) {
      const allLocal = getDocuments(currentUserId);
      doc = allLocal.find(d => d.fileUrl && d.fileUrl.includes(safeFilename));
    }

    if (doc && doc.userId && doc.userId.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        code: 'FORBIDDEN_FILE_ACCESS',
        errorCode: 'FORBIDDEN_FILE_ACCESS',
        message: 'Access denied: You do not have permission to view or download this document.'
      });
    }

    // SECURITY: Force browser to download rather than execute the file
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
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
app.use('/api/email', emailRoutes);

// Root operational endpoint for PaaS health pinging (Render / Railway / Fly)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'DocTrack AI API Server',
    message: 'DocTrack AI API is running and operational',
    version: '1.0.0'
  });
});

// Fallback 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'API endpoint not found'
  });
});

// Global error handling middleware
app.use(errorHandler);

module.exports = app;
