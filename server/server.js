const app = require('./src/app');
const { port, nodeEnv } = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/db');
const { printConfigBanner } = require('./src/config/validation');
const { verifySmtpConnection } = require('./src/services/email.service');
const { startExpiryScheduler, stopExpiryScheduler } = require('./src/services/auditScheduler');

// 1. Startup configuration validation
printConfigBanner();

// 2. Connect to MongoDB (local or Atlas)
connectDB();

// 3. Verify SMTP email transport if configured
verifySmtpConnection().catch(() => {});

// 4. Bind HTTP server to 0.0.0.0 and dynamic PORT for Render/Docker/PaaS readiness
const HOST = '0.0.0.0';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : port;

const server = app.listen(PORT, HOST, () => {
  console.log(`==================================================`);
  console.log(`🚀 DocTrack AI API Server is running`);
  console.log(`📡 Host: ${HOST} | Port: ${PORT}`);
  console.log(`🌐 Mode: ${nodeEnv.toUpperCase()}`);
  console.log(`🏥 Health Check: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/health`);
  console.log(`⏱️  Expiry Engine: Active`);
  console.log(`==================================================`);

  // Start background periodic document audit scheduler (every 6 hours)
  startExpiryScheduler();
});

// Handle graceful shutdown on termination signals
const handleGracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} signal received: commencing graceful shutdown...`);
  stopExpiryScheduler();

  server.close(async () => {
    console.log('🔒 HTTP server closed.');
    await disconnectDB();
    console.log('👋 DocTrack AI shutdown complete.');
    process.exit(0);
  });

  // Force exit after 10s timeout if hung
  setTimeout(() => {
    console.error('⚠️  Graceful shutdown timed out, force terminating.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
