const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    documentId: {
      type: String,
      index: true
    },
    documentTitle: {
      type: String,
      required: true
    },
    profileId: {
      type: String,
      default: 'self'
    },
    profileName: {
      type: String,
      default: 'Self'
    },
    category: {
      type: String,
      default: 'Other Documents'
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'WARNING', 'INFO'],
      default: 'INFO',
      index: true
    },
    type: {
      type: String,
      enum: ['EXPIRED', 'EXPIRING_CRITICAL', 'EXPIRING_WARNING', 'EXPIRING_INFO', 'METADATA_MISSING', 'VERIFICATION_REQUIRED'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SNOOZED', 'DISMISSED', 'READ'],
      default: 'ACTIVE',
      index: true
    },
    snoozedUntil: {
      type: Date,
      default: null
    },
    daysLeft: {
      type: Number,
      default: null
    },
    actionUrl: {
      type: String,
      default: null
    },
    actionLabel: {
      type: String,
      default: 'View Document'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Alert', alertSchema);
