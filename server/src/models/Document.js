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
