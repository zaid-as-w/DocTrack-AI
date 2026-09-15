const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Profile name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['self', 'family', 'vehicle', 'employee', 'custom'],
      default: 'family',
      index: true
    },
    relation: {
      type: String,
      trim: true,
      default: ''
    },
    icon: {
      type: String,
      default: 'User'
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Profile', profileSchema);
