const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const { validateIdParam } = require('../middleware/validators');
const {
  getAllRenewals,
  getSingleRenewalGuide,
  postStepToggle
} = require('../controllers/renewalController');

// All renewal routes strictly require authentication
router.use(authenticateJWT);

// @route   GET /api/renewals
// @desc    Get all renewal items with status and urgency for authenticated user
router.get('/', getAllRenewals);

// @route   GET /api/renewals/:docId
// @desc    Get complete renewal guide for document (guarded by ID validation)
router.get('/:docId', validateIdParam('docId'), getSingleRenewalGuide);

// @route   POST /api/renewals/:docId/step-toggle
// @desc    Toggle completion of a checklist step (guarded by ID validation)
router.post('/:docId/step-toggle', validateIdParam('docId'), postStepToggle);

module.exports = router;
