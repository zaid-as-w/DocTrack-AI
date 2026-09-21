/**
 * Warranty Controller
 * DocTrack AI — Iteration 10: Warranty Tracking Engine
 */

const Warranty = require('../models/Warranty');
const { isDbConnected } = require('../config/db');
const {
  getWarranties: getLocalWarranties,
  getWarrantyById: getLocalWarrantyById,
  addWarranty: addLocalWarranty,
  updateWarranty: updateLocalWarranty,
  deleteWarranty: deleteLocalWarranty,
  getWarrantySummary: getLocalWarrantySummary,
  calculateWarrantyStatus,
  calculateExpiryDate
} = require('../services/warrantyStore');

/**
 * Generate brand-specific warranty claim guidance
 */
const generateClaimGuide = (warranty) => {
  const brand = (warranty.brand || '').toLowerCase();
  const category = (warranty.category || '').toLowerCase();

  const checklist = [
    'Original Retail Tax Invoice / Cash Memo',
    'Product Serial Number (on chassis or original box)',
    'Original Warranty Card or Extended AMC certificate',
    'Government Issued Photo ID for verification'
  ];

  let officialPortal = warranty.claimPortal || 'https://consumercomplaints.nic.in';
  let officialPhone = warranty.claimContact || '1800 11 4000 (National Consumer Helpline)';
  let tips = 'Register your claim as soon as an issue occurs to ensure service within the active warranty window.';

  if (brand.includes('apple')) {
    officialPortal = 'https://support.apple.com/en-in';
    officialPhone = '000800 100 9009 (AppleCare India)';
    tips = 'Book a Genius Bar appointment at an Apple Authorised Service Provider. Back up your device to iCloud before handing it in.';
  } else if (brand.includes('sony')) {
    officialPortal = 'https://www.sony.co.in/electronics/support';
    officialPhone = '1800 103 7799 (Sony Toll Free)';
    tips = 'For televisions > 32", Sony provides doorstep on-site service. Keep the invoice and serial number sticker accessible.';
  } else if (brand.includes('samsung')) {
    officialPortal = 'https://www.samsung.com/in/support';
    officialPhone = '1800 5 7267864 (Samsung 24x7)';
    tips = 'Visit any Samsung Smart Café or Authorized Service Plaza. For Galaxy devices, remove screen protectors or SIM trays if instructed.';
  } else if (brand.includes('lg')) {
    officialPortal = 'https://www.lg.com/in/support';
    officialPhone = '1800 315 9999 (LG India Care)';
    tips = 'LG offers direct home visit for washing machines, ACs, and refrigerators. Note down error codes displayed on the digital panel.';
  } else if (brand.includes('dyson')) {
    officialPortal = 'https://www.dyson.in/support';
    officialPhone = '1800 258 6688 (Dyson Help)';
    tips = 'Dyson arranges courier pickup and return for cordless vacuums and air purifiers across major cities.';
  }

  return {
    productName: warranty.productName,
    brand: warranty.brand,
    status: warranty.status,
    daysRemaining: warranty.daysRemaining,
    officialPortal,
    officialPhone,
    checklist,
    tips
  };
};

/**
 * Get all warranties with optional filters
 * GET /api/warranties
 */
const getAllWarranties = async (req, res, next) => {
  try {
    const { profileId, status, category, q } = req.query;
    const userId = req.user?.id || 'demo-user-zaid-001';

    if (isDbConnected()) {
      const query = { userId };
      if (profileId && profileId !== 'all') query.profileId = profileId;
      if (status && status !== 'ALL') query.status = status;
      if (category && category !== 'ALL') query.category = category;
      if (q && q.trim()) {
        query.$or = [
          { productName: { $regex: q.trim(), $options: 'i' } },
          { brand: { $regex: q.trim(), $options: 'i' } },
          { seller: { $regex: q.trim(), $options: 'i' } },
          { invoiceNumber: { $regex: q.trim(), $options: 'i' } }
        ];
      }

      let warranties = await Warranty.find(query).sort({ expiryDate: 1 });
      if (warranties.length === 0 && userId === 'demo-user-zaid-001' && !profileId && !status && !category && !q) {
        // Fallback to store seed only for demo user
        const fallback = getLocalWarranties('demo-user-zaid-001', { profileId, status, category, q });
        return res.status(200).json({
          success: true,
          count: fallback.length,
          warranties: fallback
        });
      }

      // Re-evaluate daysRemaining dynamically
      const evaluated = warranties.map(w => {
        const plain = w.toObject();
        const { status: currentStatus, daysRemaining } = calculateWarrantyStatus(plain.expiryDate);
        return {
          ...plain,
          id: plain._id.toString(),
          status: currentStatus,
          daysRemaining
        };
      });

      return res.status(200).json({
        success: true,
        count: evaluated.length,
        warranties: evaluated,
        data: evaluated
      });
    } else {
      const warranties = getLocalWarranties(userId, { profileId, status, category, q });
      return res.status(200).json({
        success: true,
        count: warranties.length,
        warranties,
        data: warranties
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get warranty overview metrics & valuation
 * GET /api/warranties/summary/stats
 */
const getWarrantySummary = async (req, res, next) => {
  try {
    const userId = req.user?.id || 'demo-user-zaid-001';

    if (isDbConnected()) {
      const warranties = await Warranty.find({ userId });
      if (warranties.length > 0 || userId !== 'demo-user-zaid-001') {
        const evaluated = warranties.map(w => {
          const plain = w.toObject();
          const { status, daysRemaining } = calculateWarrantyStatus(plain.expiryDate);
          return { ...plain, status, daysRemaining };
        });

        const totalCount = evaluated.length;
        const activeCount = evaluated.filter(w => w.status === 'ACTIVE').length;
        const expiringCount = evaluated.filter(w => w.status === 'EXPIRING_SOON').length;
        const expiredCount = evaluated.filter(w => w.status === 'EXPIRED').length;

        const totalValuation = evaluated.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
        const activeValuation = evaluated
          .filter(w => w.status === 'ACTIVE' || w.status === 'EXPIRING_SOON')
          .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

        const categoriesSummary = {};
        evaluated.forEach(w => {
          const cat = w.category || 'Other';
          if (!categoriesSummary[cat]) {
            categoriesSummary[cat] = { count: 0, totalAmount: 0 };
          }
          categoriesSummary[cat].count += 1;
          categoriesSummary[cat].totalAmount += Number(w.amount) || 0;
        });

        return res.status(200).json({
          success: true,
          summary: {
            totalCount,
            activeCount,
            expiringCount,
            expiredCount,
            totalValuation,
            activeValuation,
            categoriesSummary
          }
        });
      }
    }

    const summary = getLocalWarrantySummary(userId);

    return res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single warranty by ID
 * GET /api/warranties/:id
 */
const getWarrantyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'demo-user-zaid-001';

    let warranty = null;
    if (isDbConnected()) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(id)) {
        warranty = await Warranty.findOne({ _id: id, userId });
      } else {
        warranty = await Warranty.findOne({ id, userId });
      }

      if (warranty) {
        warranty = warranty.toObject();
        warranty.id = warranty._id.toString();
        const { status, daysRemaining } = calculateWarrantyStatus(warranty.expiryDate);
        warranty.status = status;
        warranty.daysRemaining = daysRemaining;
      }
    }

    if (!warranty) {
      warranty = getLocalWarrantyById(id, userId);
    }

    if (!warranty) {
      return res.status(404).json({
        success: false,
        status: 'error',
        code: 'WARRANTY_NOT_FOUND',
        errorCode: 'WARRANTY_NOT_FOUND',
        message: `Warranty with ID "${id}" was not found.`
      });
    }

    const claimGuide = generateClaimGuide(warranty);

    return res.status(200).json({
      success: true,
      warranty,
      claimGuide
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new warranty record
 * POST /api/warranties
 */
const createWarranty = async (req, res, next) => {
  try {
    const userId = req.user?.id || 'demo-user-zaid-001';
    const {
      productName,
      category,
      brand,
      modelNumber,
      serialNumber,
      purchaseDate,
      durationMonths,
      expiryDate: customExpiryDate,
      invoiceNumber,
      seller,
      amount,
      currency,
      coverageType,
      claimContact,
      claimPortal,
      serviceNotes,
      profileId,
      profileName,
      documentId,
      documentFileUrl
    } = req.body;

    if (!productName || !productName.trim()) {
      return res.status(400).json({ success: false, message: 'Product name is required.' });
    }

    if (!purchaseDate) {
      return res.status(400).json({ success: false, message: 'Purchase date is required.' });
    }

    const months = parseInt(durationMonths || 12, 10);
    const calculatedExpiry = customExpiryDate || calculateExpiryDate(purchaseDate, months);
    const { status, daysRemaining } = calculateWarrantyStatus(calculatedExpiry);

    const payload = {
      userId,
      profileId: profileId || 'self',
      profileName: profileName || 'Zaid (Self)',
      productName: productName.trim(),
      category: category || 'Electronics',
      brand: brand ? brand.trim() : '',
      modelNumber: modelNumber ? modelNumber.trim() : '',
      serialNumber: serialNumber ? serialNumber.trim() : '',
      purchaseDate,
      durationMonths: months,
      expiryDate: calculatedExpiry,
      invoiceNumber: invoiceNumber ? invoiceNumber.trim() : '',
      seller: seller ? seller.trim() : '',
      amount: Number(amount) || 0,
      currency: currency || 'INR',
      status,
      daysRemaining,
      coverageType: coverageType || 'Manufacturer Standard',
      claimContact: claimContact ? claimContact.trim() : '',
      claimPortal: claimPortal ? claimPortal.trim() : '',
      serviceNotes: serviceNotes ? serviceNotes.trim() : '',
      documentId: documentId || null,
      documentFileUrl: documentFileUrl || '',
      hasDocument: Boolean(documentFileUrl || documentId)
    };

    let createdWarranty = null;
    if (isDbConnected()) {
      const doc = await Warranty.create(payload);
      createdWarranty = doc.toObject();
      createdWarranty.id = doc._id.toString();
    } else {
      createdWarranty = addLocalWarranty(payload);
    }

    return res.status(201).json({
      success: true,
      message: 'Warranty registered successfully.',
      warranty: createdWarranty
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing warranty
 * PUT /api/warranties/:id
 */
const updateWarranty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'demo-user-zaid-001';

    // Prevent ownership tampering
    delete req.body.userId;

    let updatedWarranty = null;

    if (isDbConnected()) {
      const mongoose = require('mongoose');
      const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id, userId } : { id, userId };
      const existing = await Warranty.findOne(filter);
      if (existing) {
        const purchaseDate = req.body.purchaseDate || existing.purchaseDate;
        const durationMonths = req.body.durationMonths || existing.durationMonths;
        const expiryDate = req.body.expiryDate || calculateExpiryDate(purchaseDate, durationMonths);
        const { status, daysRemaining } = calculateWarrantyStatus(expiryDate);

        Object.assign(existing, req.body, { expiryDate, status, daysRemaining });
        await existing.save();
        updatedWarranty = existing.toObject();
        updatedWarranty.id = existing._id.toString();
      }
    } else {
      updatedWarranty = updateLocalWarranty(id, req.body, userId);
    }

    if (!updatedWarranty) {
      return res.status(404).json({
        success: false,
        status: 'error',
        code: 'WARRANTY_NOT_FOUND',
        errorCode: 'WARRANTY_NOT_FOUND',
        message: `Warranty with ID "${id}" was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Warranty updated successfully.',
      warranty: updatedWarranty
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a warranty
 * DELETE /api/warranties/:id
 */
const deleteWarranty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'demo-user-zaid-001';

    let deleted = false;
    if (isDbConnected()) {
      const mongoose = require('mongoose');
      const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id, userId } : { id, userId };
      const result = await Warranty.deleteOne(filter);
      deleted = result.deletedCount > 0;
    } else {
      deleted = deleteLocalWarranty(id, userId);
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        status: 'error',
        code: 'WARRANTY_NOT_FOUND',
        errorCode: 'WARRANTY_NOT_FOUND',
        message: `Warranty with ID "${id}" was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Warranty removed successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get claim guide for a specific warranty
 * GET /api/warranties/:id/claim-guide
 */
const getClaimGuide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'demo-user-zaid-001';

    let warranty = null;
    if (isDbConnected()) {
      const mongoose = require('mongoose');
      const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id, userId } : { id, userId };
      const found = await Warranty.findOne(filter);
      if (found) {
        warranty = found.toObject();
        warranty.id = found._id.toString();
        const { status, daysRemaining } = calculateWarrantyStatus(warranty.expiryDate);
        warranty.status = status;
        warranty.daysRemaining = daysRemaining;
      }
    }

    if (!warranty) {
      warranty = getLocalWarrantyById(id, userId);
    }

    if (!warranty) {
      return res.status(404).json({
        success: false,
        status: 'error',
        code: 'WARRANTY_NOT_FOUND',
        errorCode: 'WARRANTY_NOT_FOUND',
        message: `Warranty with ID "${id}" was not found.`
      });
    }

    const guide = generateClaimGuide(warranty);
    return res.status(200).json({
      success: true,
      claimGuide: guide
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllWarranties,
  getWarrantySummary,
  getWarrantyById,
  createWarranty,
  updateWarranty,
  deleteWarranty,
  getClaimGuide
};
