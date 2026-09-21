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
    holderName: {
      type: String,
      trim: true,
      default: ''
    },
    dateOfBirth: {
      type: String,
      trim: true,
      default: ''
    },
    country: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    issueDate: {
      type: String
    },
    expiryDate: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'NO_EXPIRY'],
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
    needsVerification: {
      type: Boolean,
      default: false
    },
    fileName: {
      type: String
    },
    fileUrl: {
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
    },
    ocrText: {
      type: String,
      default: ''
    },
    ocrConfidence: {
      type: Number,
      default: null
    },
    ocrProcessed: {
      type: Boolean,
      default: false
    },
    processingStatus: {
      type: String,
      enum: ['uploading', 'stored', 'processing', 'completed', 'failed', 'needs_review'],
      default: 'processing',
      index: true
    },
    processingStage: {
      type: String,
      default: 'queued'
    },
    processingError: {
      type: String,
      default: ''
    },
    ocrStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    metadataStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    documentType: {
      type: String,
      default: ''
    },
    classificationConfidence: {
      type: Number,
      default: null
    },
    sensitivity: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW', 'STANDARD'],
      default: 'STANDARD'
    },
    tags: [{
      type: String
    }],
    classification: {
      category: { type: String },
      categoryId: { type: String },
      subCategory: { type: String },
      confidence: { type: Number },
      confidencePercentage: { type: Number },
      confidenceLevel: { type: String },
      sensitivity: { type: String },
      sensitivityNotice: { type: String },
      suggestedProfileType: { type: String },
      suggestedTags: [{ type: String }],
      reasoning: { type: String },
      classifiedAt: { type: Date, default: Date.now }
    },
    extractedMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    notificationHistory: [
      {
        type: { type: String, default: 'expiry' },
        channel: { type: String, enum: ['email', 'sms', 'in_app'] },
        thresholdDays: { type: Number },
        sentAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['sent', 'failed', 'skipped'], default: 'sent' },
        recipient: { type: String },
        messageId: { type: String },
        error: { type: String }
      }
    ],
    lastNotificationAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('Document', documentSchema);
