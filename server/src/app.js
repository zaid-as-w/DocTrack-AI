const express = require('express');
const cors = require('cors');
const path = require('path');
const healthRoutes = require('./routes/health');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploaded files statically
const uploadsPath = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api/health', healthRoutes);

// Root info route
app.get('/', (req, res) => {
  res.json({
    message: 'DocTrack AI API is running',
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
