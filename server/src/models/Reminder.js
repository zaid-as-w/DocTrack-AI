const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true
    },
    targetType: {
      type: String,
      enum: ['DOCUMENT', 'WARRANTY', 'CUSTOM'],
      default: 'DOCUMENT'
    },
    targetId: {
      type: String,
      default: ''
    },
    targetTitle: {
      type: String,
      required: [true, 'Target title is required']
    },
    expiryDate: {
      type: String,
      default: ''
    },
    thresholdDays: {
      type: Number,
      required: [true, 'Threshold days is required']
    },
    scheduledDate: {
      type: String,
      default: ''
    },
    channels: {
      type: [String],
      default: ['IN_APP', 'EMAIL']
    },
    status: {
      type: String,
      enum: ['PENDING', 'DISPATCHED', 'SNOOZED', 'CANCELLED'],
      default: 'PENDING'
    },
    dispatchedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Reminder', reminderSchema);
