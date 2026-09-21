const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, completeOnboarding } = require('../controllers/authController');
const authenticateJWT = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin } = require('../middleware/validators');

// Apply rate limiting to authentication endpoints
router.use(authRateLimiter);

// @route   POST /api/auth/register
// @desc    Register a new user account
// @access  Public
router.post('/register', validateRegister, register);

// @route   POST /api/auth/login
// @desc    Authenticate user and return JWT
// @access  Public
router.post('/login', validateLogin, login);

// @route   POST /api/auth/logout
// @desc    Sign out authenticated user
// @access  Public
router.post('/logout', logout);

// @route   GET /api/auth/me
// @desc    Get currently authenticated user details
// @access  Protected
router.get('/me', authenticateJWT, getMe);

// @route   POST /api/auth/complete-onboarding
// @desc    Mark onboarding completed for current user
// @access  Protected
router.post('/complete-onboarding', authenticateJWT, completeOnboarding);

module.exports = router;

