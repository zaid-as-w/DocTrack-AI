const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isDbConnected } = require('../config/db');
const { jwtSecret } = require('../config/env');

// In-memory fallback registry for offline / local-first development
const inMemoryUsers = new Map();

// Seed default demo user in in-memory registry
(async () => {
  const defaultHash = await bcrypt.hash('password123', 10);
  inMemoryUsers.set('zaid@doctrack.ai', {
    id: 'demo-user-zaid-001',
    name: 'Zaid',
    email: 'zaid@doctrack.ai',
    passwordHash: defaultHash,
    createdAt: new Date().toISOString()
  });
})();

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    if (isDbConnected()) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash
      });

      // Issue JWT
      const token = jwt.sign(
        { id: newUser._id.toString(), email: newUser.email, name: newUser.name },
        jwtSecret,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        token,
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email
        }
      });
    } else {
      // Offline fallback store
      if (inMemoryUsers.has(normalizedEmail)) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const id = `user-${Date.now()}`;
      const userRecord = {
        id,
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        createdAt: new Date().toISOString()
      };
      inMemoryUsers.set(normalizedEmail, userRecord);

      const token = jwt.sign(
        { id, email: normalizedEmail, name: userRecord.name },
        jwtSecret,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully (local-mode persistence).',
        token,
        user: {
          id,
          name: userRecord.name,
          email: userRecord.email
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user
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
      userRecord = inMemoryUsers.get(normalizedEmail);
      if (userRecord) {
        userId = userRecord.id;
      }
    }

    if (!userRecord) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.'
      });
    }

    // Verify password hash
    const isMatch = await bcrypt.compare(password, userRecord.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.'
      });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: userId, email: userRecord.email, name: userRecord.name },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Sign in successful.',
      token,
      user: {
        id: userId,
        name: userRecord.name,
        email: userRecord.email
      }
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
    return res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe
};
