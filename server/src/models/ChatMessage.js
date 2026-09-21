const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
      default: 'user'
    },
    content: {
      type: String,
      required: [true, 'Message content is required']
    },
    intent: {
      type: String,
      default: 'general_query'
    },
    suggestedActions: {
      type: [String],
      default: []
    },
    relatedDocuments: {
      type: [Object],
      default: []
    },
    renewalGuide: {
      type: Object,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
