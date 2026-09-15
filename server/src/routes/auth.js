const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const authenticateJWT = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user account
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Authenticate user and return JWT
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/me
// @desc    Get currently authenticated user details
// @access  Protected
router.get('/me', authenticateJWT, getMe);

module.exports = router;
