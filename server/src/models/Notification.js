const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true
    },
    profileId: {
      type: String,
      default: 'self'
    },
    documentId: {
      type: String,
      default: null
    },
    warrantyId: {
      type: String,
      default: null
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required']
    },
    channel: {
      type: String,
      enum: ['IN_APP', 'EMAIL', 'SMS', 'ALL'],
      default: 'IN_APP'
    },
    recipient: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ'],
      default: 'DELIVERED'
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      default: 'INFO'
    },
    deliveryReceiptId: {
      type: String,
      default: ''
    },
    renderedBody: {
      type: String,
      default: ''
    },
    readAt: {
      type: Date,
      default: null
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
