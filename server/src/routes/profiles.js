const express = require('express');
const router = express.Router();
const {
  getProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile
} = require('../controllers/profileController');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

// Permissive JWT parser for profiles
const permissiveAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, jwtSecret);
    } catch {
      req.user = { id: 'demo-user-zaid-001', name: 'Zaid', email: 'zaid@doctrack.ai' };
    }
  } else {
    req.user = { id: 'demo-user-zaid-001', name: 'Zaid', email: 'zaid@doctrack.ai' };
  }
  next();
};

router.use(permissiveAuth);

// @route   GET /api/profiles
// @desc    Get all profiles for current user
router.get('/', getProfiles);

// @route   GET /api/profiles/:id
// @desc    Get a specific profile
router.get('/:id', getProfileById);

// @route   POST /api/profiles
// @desc    Create a new profile
router.post('/', createProfile);

// @route   PUT /api/profiles/:id
// @desc    Update an existing profile
router.put('/:id', updateProfile);

// @route   DELETE /api/profiles/:id
// @desc    Delete a profile (except primary self)
router.delete('/:id', deleteProfile);

module.exports = router;
