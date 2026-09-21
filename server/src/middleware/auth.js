const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

/**
 * JWT Authentication Middleware
 * Validates the Bearer token from Authorization header or ?token query parameter
 * Attaches the user payload to req.user.
 */
const authenticateJWT = (req, res, next) => {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    // Support token query param for browser media / file download links
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      status: 'error',
      code: 'UNAUTHENTICATED',
      errorCode: 'UNAUTHENTICATED',
      message: 'Access denied. No authentication token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        status: 'error',
        code: 'TOKEN_EXPIRED',
        errorCode: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired. Please sign in again.'
      });
    }

    return res.status(401).json({
      success: false,
      status: 'error',
      code: 'INVALID_TOKEN',
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid authentication token.'
    });
  }
};

module.exports = authenticateJWT;

