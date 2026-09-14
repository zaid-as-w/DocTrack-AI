const mongoose = require('mongoose');
const { mongoUri } = require('./env');

let isConnected = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    isConnected = false;
    console.error('--------------------------------------------------');
    console.error('[MongoDB Error] Unable to connect to MongoDB instance.');
    console.error(`Target URI: ${mongoUri}`);
    console.error(`Details: ${error.message}`);
    console.error('ADVISORY: Ensure your local MongoDB daemon is running (e.g. `mongod` or Docker container).');
    console.error('DocTrack AI server will continue running for mock services and health check.');
    console.error('--------------------------------------------------');
  }

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('[MongoDB] Connection lost.');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    console.log('[MongoDB] Reconnected successfully.');
  });
};

const isDbConnected = () => isConnected;

module.exports = {
  connectDB,
  isDbConnected
};
