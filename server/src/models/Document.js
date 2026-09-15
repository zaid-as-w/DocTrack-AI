const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    profileId: {
      type: String,
      required: true,
      index: true
    },
    profileName: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true
    },
    categoryId: {
      type: String,
      required: true,
      index: true
    },
    docNumber: {
      type: String,
      trim: true
    },
    issueDate: {
      type: String
    },
    expiryDate: {
      type: String
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED'],
      default: 'ACTIVE',
      index: true
    },
    daysLeft: {
      type: Number
    },
    issuingAuthority: {
      type: String
    },
    placeOfIssue: {
      type: String
    },
    fileName: {
      type: String
    },
    fileSize: {
      type: String
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    },
    renewalRequired: {
      type: Boolean,
      default: false
    },
    renewalUrl: {
      type: String
    },
    summary: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Document', documentSchema);
