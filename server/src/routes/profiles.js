const express = require('express');
const router = express.Router();
const {
  getProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile
} = require('../controllers/profileController');
const authenticateJWT = require('../middleware/auth');
const { authorizeProfileOwner, enforceUserOwnership } = require('../middleware/authorizeOwner');
const { validateProfileInput, validateIdParam } = require('../middleware/validators');

// All profile management routes strictly require authentication
router.use(authenticateJWT);

// @route   GET /api/profiles
// @desc    Get all profiles for authenticated user
router.get('/', getProfiles);

// @route   GET /api/profiles/:id
// @desc    Get a specific profile (guarded by ownership and ID validation)
router.get('/:id', validateIdParam('id'), authorizeProfileOwner, getProfileById);

// @route   POST /api/profiles
// @desc    Create a new profile (validated and bound to user)
router.post('/', validateProfileInput, enforceUserOwnership, createProfile);

// @route   PUT /api/profiles/:id
// @desc    Update an existing profile (guarded by ownership & validation)
router.put('/:id', validateIdParam('id'), authorizeProfileOwner, validateProfileInput, updateProfile);

// @route   DELETE /api/profiles/:id
// @desc    Delete a profile (except primary self; guarded by ownership)
router.delete('/:id', validateIdParam('id'), authorizeProfileOwner, deleteProfile);

module.exports = router;
