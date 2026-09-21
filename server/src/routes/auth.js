const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, completeOnboarding, forgotPassword, resetPassword, sendOtp, verifyOtpAndReset } = require('../controllers/authController');
const authenticateJWT = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } = require('../middleware/validators');

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

// @route   POST /api/auth/forgot-password
// @desc    Initiate password reset flow and send email link (legacy)
// @access  Public
router.post('/forgot-password', validateForgotPassword, forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset user password using valid token (legacy)
// @access  Public
router.post('/reset-password', validateResetPassword, resetPassword);

// @route   POST /api/auth/send-otp
// @desc    Send a 6-digit OTP code to the registered email for password reset
// @access  Public
router.post('/send-otp', validateForgotPassword, sendOtp);

// @route   POST /api/auth/verify-otp-reset
// @desc    Verify 6-digit OTP and reset password in one step
// @access  Public
router.post('/verify-otp-reset', verifyOtpAndReset);

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
