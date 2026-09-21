const express = require('express');
const router = express.Router();
const {
  getAllWarranties,
  getWarrantySummary,
  getWarrantyById,
  createWarranty,
  updateWarranty,
  deleteWarranty,
  getClaimGuide
} = require('../controllers/warrantyController');
const { authorizeWarrantyOwner, enforceUserOwnership } = require('../middleware/authorizeOwner');
const { validateWarrantyInput, validateIdParam } = require('../middleware/validators');
const authenticateJWT = require('../middleware/auth');

// All warranty routes strictly require authentication
router.use(authenticateJWT);

// @route   GET /api/warranties
// @desc    Get all warranties with optional filtering (status, profileId, category, search)
router.get('/', getAllWarranties);

// @route   GET /api/warranties/summary/stats
// @desc    Get aggregate warranty metrics, count breakdowns, and asset valuation
router.get('/summary/stats', getWarrantySummary);

// @route   GET /api/warranties/:id
// @desc    Get single warranty detail & claim guidance (guarded by ownership and ID validation)
router.get('/:id', validateIdParam('id'), authorizeWarrantyOwner, getWarrantyById);

// @route   POST /api/warranties
// @desc    Create/register new warranty bill (guarded by validation & user ownership)
router.post('/', validateWarrantyInput, enforceUserOwnership, createWarranty);

// @route   PUT /api/warranties/:id
// @desc    Update existing warranty (guarded by ownership & validation)
router.put('/:id', validateIdParam('id'), authorizeWarrantyOwner, validateWarrantyInput, updateWarranty);

// @route   DELETE /api/warranties/:id
// @desc    Delete warranty (guarded by ownership)
router.delete('/:id', validateIdParam('id'), authorizeWarrantyOwner, deleteWarranty);

// @route   GET /api/warranties/:id/claim-guide
// @desc    Get brand claim checklist & official portal guidance (guarded by ownership)
router.get('/:id/claim-guide', validateIdParam('id'), authorizeWarrantyOwner, getClaimGuide);

module.exports = router;

