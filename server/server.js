const app = require('./src/app');
const { port } = require('./src/config/env');
const { connectDB } = require('./src/config/db');

// Connect to local MongoDB instance
connectDB();

const server = app.listen(port, () => {
  console.log(`==================================================`);
  console.log(`🚀 DocTrack AI API Server is running`);
  console.log(`📡 URL: http://localhost:${port}`);
  console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
  console.log(`📁 Uploads dir: http://localhost:${port}/uploads`);
  console.log(`==================================================`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
