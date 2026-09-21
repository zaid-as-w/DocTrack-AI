const mongoose = require('mongoose');

const warrantySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true
    },
    profileId: {
      type: String,
      default: 'self',
      index: true
    },
    profileName: {
      type: String,
      default: 'Zaid (Self)'
    },
    documentId: {
      type: String,
      default: null
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    category: {
      type: String,
      enum: [
        'Electronics',
        'Home Appliances',
        'Vehicles & Automotive',
        'Mobile & Gadgets',
        'Computing & Accessories',
        'Fitness & Smart Tech',
        'Other'
      ],
      default: 'Electronics'
    },
    brand: {
      type: String,
      trim: true,
      default: ''
    },
    modelNumber: {
      type: String,
      trim: true,
      default: ''
    },
    serialNumber: {
      type: String,
      trim: true,
      default: ''
    },
    purchaseDate: {
      type: String,
      required: [true, 'Purchase date is required']
    },
    durationMonths: {
      type: Number,
      required: [true, 'Warranty duration in months is required'],
      min: 1
    },
    expiryDate: {
      type: String,
      required: [true, 'Warranty expiry date is required']
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: ''
    },
    seller: {
      type: String,
      trim: true,
      default: ''
    },
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED'],
      default: 'ACTIVE'
    },
    daysRemaining: {
      type: Number,
      default: 0
    },
    coverageType: {
      type: String,
      enum: [
        'Manufacturer Standard',
        'Extended Warranty (AMC)',
        'Accidental Damage Protection',
        'Comprehensive'
      ],
      default: 'Manufacturer Standard'
    },
    claimContact: {
      type: String,
      trim: true,
      default: ''
    },
    claimPortal: {
      type: String,
      trim: true,
      default: ''
    },
    serviceNotes: {
      type: String,
      default: ''
    },
    hasDocument: {
      type: Boolean,
      default: false
    },
    documentFileUrl: {
      type: String,
      default: ''
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

module.exports = mongoose.model('Warranty', warrantySchema);
