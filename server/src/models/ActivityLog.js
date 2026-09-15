const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['UPLOAD', 'EXPIRY_ALERT', 'EXPIRED', 'PROFILE_CREATED', 'VERIFIED', 'STATUS_CHANGE'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
