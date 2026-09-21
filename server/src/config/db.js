const mongoose = require('mongoose');
const { mongodbUri, dbName } = require('./env');
const { sanitizeUri } = require('./validation');

let isConnected = false;

/**
 * Centralized Database Connection Manager
 * Manages Mongoose connection lifecycle, handles error states gracefully,
 * and masks credentials from server output logs.
 */
const connectDB = async () => {
  const safeUri = sanitizeUri(mongodbUri);

  try {
    const options = {
      serverSelectionTimeoutMS: 5000
    };

    if (dbName && dbName.trim()) {
      options.dbName = dbName.trim();
    }

    const conn = await mongoose.connect(mongodbUri, options);
    
    // Perform pre-flight read verification to confirm valid read/write credentials
    await conn.connection.db.collection('users').findOne({}, { projection: { _id: 1 } });

    isConnected = true;
    console.log(`[MongoDB] Connected and authenticated successfully to: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    isConnected = false;
    try {
      await mongoose.disconnect();
    } catch {}
    console.error('--------------------------------------------------');
    console.error('[MongoDB Notice] MongoDB instance is inaccessible or requires authentication credentials.');
    console.error(`Target: ${safeUri}`);
    console.error(`Details: ${error.message}`);
    console.error('DocTrack AI server will safely run on the persistent local disk database (server/data/db.json).');
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

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.error('[MongoDB Error]', err.message);
  });
};

/**
 * Disconnect from MongoDB gracefully during server shutdown
 */
const disconnectDB = async () => {
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      isConnected = false;
      console.log('[MongoDB] Disconnected gracefully.');
    } catch (err) {
      console.error('[MongoDB] Error during disconnect:', err.message);
    }
  }
};

const isDbConnected = () => isConnected && mongoose.connection.readyState === 1;

module.exports = {
  connectDB,
  disconnectDB,
  isDbConnected
};
