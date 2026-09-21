const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { isDbConnected } = require('../config/db');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const emailService = require('../services/email.service');
const localDb = require('../services/localDb');

/**
 * Register a new user & immediately allocate primary vault profile
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }
    let cleanPhone = '';
    if (phone && phone.trim()) {
      const digitsOnly = phone.trim().replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number if providing phone.' });
      }
      cleanPhone = phone.trim();
    }
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let newUserRecord = null;
    let allocatedProfile = null;

    // 1. Check if user already exists
    if (isDbConnected()) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone: cleanPhone,
        passwordHash,
        onboardingCompleted: true
      });

      const profile = await Profile.create({
        userId: newUser._id.toString(),
        name: newUser.name.trim() || 'Personal Vault',
        type: 'self',
        relation: 'Self',
        icon: 'User',
        description: 'Primary account owner & personal document vault',
        isPrimary: true
      });

      newUserRecord = {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        onboardingCompleted: true
      };
      allocatedProfile = profile;
    } else {
      // Persistent Local Database Store
      const existing = localDb.findUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = localDb.createUser({
        name: name.trim(),
        email: normalizedEmail,
        phone: cleanPhone,
        passwordHash,
        onboardingCompleted: true
      });

      const profile = localDb.createProfile({
        userId: newUser.id,
        name: newUser.name.trim() || 'Personal Vault',
        type: 'self',
        relation: 'Self',
        icon: 'User',
        description: 'Primary account owner & personal document vault',
        isPrimary: true
      });

      newUserRecord = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        onboardingCompleted: true
      };
      allocatedProfile = profile;
    }

    // Issue JWT Token
    const token = jwt.sign(
      {
        id: newUserRecord.id,
        email: newUserRecord.email,
        name: newUserRecord.name,
        phone: newUserRecord.phone,
        onboardingCompleted: true
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn || '7d' }
    );

    // Trigger asynchronous welcome email
    emailService.sendWelcomeEmail({ name: newUserRecord.name, email: newUserRecord.email }).catch(err => {
      console.warn('[Welcome Email Notice] Could not dispatch welcome email:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Account registered and primary vault profile allocated successfully.',
      token,
      user: newUserRecord,
      profile: allocatedProfile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user against database records
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let userRecord = null;
    let userId = null;

    if (isDbConnected()) {
      const dbUser = await User.findOne({ email: normalizedEmail });
      if (dbUser) {
        userRecord = dbUser;
        userId = dbUser._id.toString();
      }
    } else {
      const localUser = localDb.findUserByEmail(normalizedEmail);
      if (localUser) {
        userRecord = localUser;
        userId = localUser.id;
      }
    }

    if (!userRecord) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.'
      });
    }

    // Verify password hash with bcrypt
    const isMatch = await bcrypt.compare(password, userRecord.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.'
      });
    }

    // Ensure allocated profile is ready for user
    let userProfiles = [];
    if (isDbConnected()) {
      userProfiles = await Profile.find({ userId });
      if (userProfiles.length === 0) {
        const defaultProfile = await Profile.create({
          userId,
          name: userRecord.name ? userRecord.name.trim() : 'Personal Vault',
          type: 'self',
          relation: 'Self',
          icon: 'User',
          description: 'Primary personal document vault',
          isPrimary: true
        });
        userProfiles = [defaultProfile];
      }
    } else {
      userProfiles = localDb.getProfilesByUserId(userId);
      if (userProfiles.length === 0) {
        const defaultProfile = localDb.createProfile({
          userId,
          name: userRecord.name ? userRecord.name.trim() : 'Personal Vault',
          type: 'self',
          relation: 'Self',
          icon: 'User',
          description: 'Primary personal document vault',
          isPrimary: true
        });
        userProfiles = [defaultProfile];
      }
    }

    // Sign JWT Token
    const token = jwt.sign(
      {
        id: userId,
        email: userRecord.email,
        name: userRecord.name,
        phone: userRecord.phone || '',
        onboardingCompleted: true
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn || '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Sign in successful.',
      token,
      user: {
        id: userId,
        name: userRecord.name,
        email: userRecord.email,
        phone: userRecord.phone || '',
        onboardingCompleted: true
      },
      profiles: userProfiles
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    let name = req.user.name;
    let email = req.user.email;
    let phone = req.user.phone || '';
    let onboardingCompleted = true;

    if (isDbConnected()) {
      const user = await User.findById(req.user.id);
      if (user) {
        name = user.name;
        email = user.email;
        phone = user.phone || '';
        onboardingCompleted = true;
      }
    } else {
      const localUser = localDb.findUserById(req.user.id) || localDb.findUserByEmail(req.user.email);
      if (localUser) {
        name = localUser.name;
        email = localUser.email;
        phone = localUser.phone || '';
        onboardingCompleted = true;
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name,
        email,
        phone,
        onboardingCompleted
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark onboarding as completed for current user
 * POST /api/auth/complete-onboarding
 */
const completeOnboarding = async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (isDbConnected()) {
      await User.findByIdAndUpdate(userId, { onboardingCompleted: true });
    } else {
      localDb.updateUser(userId, { onboardingCompleted: true });
    }

    return res.status(200).json({
      success: true,
      message: 'Onboarding marked as completed.',
      onboardingCompleted: true
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log out user session
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Sign out successful.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset token and send email
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your registered email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    if (isDbConnected()) {
      user = await User.findOne({ email: normalizedEmail });
    } else {
      user = localDb.findUserByEmail(normalizedEmail);
    }

    if (!user) {
      // Don't leak user existence; return generic success confirmation
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email address, a password reset link has been dispatched.'
      });
    }

    // Generate secure 32-byte hex token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    if (isDbConnected()) {
      user.resetPasswordToken = hashedResetToken;
      user.resetPasswordExpires = resetExpires;
      await user.save();
    } else {
      localDb.updateUser(user.id, {
        resetPasswordToken: hashedResetToken,
        resetPasswordExpires: resetExpires.toISOString()
      });
    }

    // Send reset email via Nodemailer SMTP service (non-blocking)
    setImmediate(() => {
      emailService.sendPasswordReset({ name: user.name, email: user.email }, rawResetToken).catch(err => {
        console.warn('[Password Reset Email Warning]', err.message);
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset link dispatched to your email address. Valid for 60 minutes.',
      ...(process.env.NODE_ENV !== 'production' ? { devResetToken: rawResetToken } : {})
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using valid time-limited token
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Password reset token is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    let user = null;

    if (isDbConnected()) {
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() }
      });
    } else {
      user = localDb.findUserByResetToken(hashedToken);
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired. Please request a new one.'
      });
    }

    const newPasswordHash = await bcrypt.hash(password, 10);

    if (isDbConnected()) {
      user.passwordHash = newPasswordHash;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
    } else {
      localDb.updateUser(user.id, {
        passwordHash: newPasswordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a 6-digit OTP code to the user's email for password reset
 * POST /api/auth/send-otp
 */
const sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your registered email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    if (isDbConnected()) {
      user = await User.findOne({ email: normalizedEmail });
    } else {
      user = localDb.findUserByEmail(normalizedEmail);
    }

    // Always respond generically to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email is registered, a 6-digit code has been sent to your inbox.'
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = String(Math.floor(100000 + (crypto.randomBytes(3).readUIntBE(0, 3) % 900000)));
    const hashedOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (isDbConnected()) {
      user.resetPasswordToken = hashedOtp;
      user.resetPasswordExpires = otpExpires;
      await user.save();
    } else {
      localDb.updateUser(user.id, {
        resetPasswordToken: hashedOtp,
        resetPasswordExpires: otpExpires.toISOString()
      });
    }

    // Send OTP email (non-blocking, fire and forget)
    setImmediate(() => {
      emailService.sendOtpEmail({ name: user.name, email: user.email }, rawOtp).catch(err => {
        console.warn('[OTP Email Notice] Could not dispatch OTP email:', err.message);
      });
    });

    return res.status(200).json({
      success: true,
      message: 'A 6-digit verification code has been sent to your email. Valid for 10 minutes.',
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: rawOtp } : {})
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP code and reset password in one step
 * POST /api/auth/verify-otp-reset
 */
const verifyOtpAndReset = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    if (!otp || String(otp).trim().length !== 6) {
      return res.status(400).json({ success: false, message: 'Please enter the 6-digit code from your email.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hashedOtp = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
    let user = null;

    if (isDbConnected()) {
      user = await User.findOne({
        email: normalizedEmail,
        resetPasswordToken: hashedOtp,
        resetPasswordExpires: { $gt: new Date() }
      });
    } else {
      const candidate = localDb.findUserByEmail(normalizedEmail);
      if (candidate &&
          candidate.resetPasswordToken === hashedOtp &&
          candidate.resetPasswordExpires &&
          new Date(candidate.resetPasswordExpires) > new Date()) {
        user = candidate;
      }
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please request a new one.'
      });
    }

    const newPasswordHash = await bcrypt.hash(password, 10);

    if (isDbConnected()) {
      user.passwordHash = newPasswordHash;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
    } else {
      localDb.updateUser(user.id, {
        passwordHash: newPasswordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now sign in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  completeOnboarding,
  forgotPassword,
  resetPassword,
  sendOtp,
  verifyOtpAndReset
};
