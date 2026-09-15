const app = require('./src/app');
const { port } = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const { startExpiryScheduler, stopExpiryScheduler } = require('./src/services/auditScheduler');

// Connect to local MongoDB instance
connectDB();

const server = app.listen(port, () => {
  console.log(`==================================================`);
  console.log(`🚀 DocTrack AI API Server is running`);
  console.log(`📡 URL: http://localhost:${port}`);
  console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
  console.log(`📁 Uploads dir: http://localhost:${port}/uploads`);
  console.log(`⏱️  Expiry Engine: Active`);
  console.log(`==================================================`);

  // Start background periodic document audit scheduler (every 6 hours)
  startExpiryScheduler();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  stopExpiryScheduler();
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  stopExpiryScheduler();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
