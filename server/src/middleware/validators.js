/**
 * Request Sanitization & Schema Validation Middlewares
 * Protects against NoSQL injection, XSS attacks, and malformed request payloads.
 */

// Email RFC validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// ISO or YYYY-MM-DD Date regex
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
// Phone number regex (allows + prefix, digits, spaces, hyphens)
const PHONE_REGEX = /^[+]?[0-9\s-]{7,18}$/;

/**
 * Deep sanitization helper to strip keys starting with '$' or containing '.' (NoSQL injection)
 */
function stripNoSqlKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => stripNoSqlKeys(item));
  }

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    // Drop keys with dangerous Mongo operator prefixes ($) or path traversal dots (.)
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = stripNoSqlKeys(val);
  }
  return clean;
}

/**
 * Middleware: Sanitize against NoSQL injection across body, query, and params
 */
const sanitizeNoSql = (req, res, next) => {
  if (req.body) req.body = stripNoSqlKeys(req.body);
  if (req.query) req.query = stripNoSqlKeys(req.query);
  if (req.params) req.params = stripNoSqlKeys(req.params);
  next();
};

/**
 * Deep string escape helper to neutralize XSS vectors (<script>, etc.)
 */
function escapeXss(val) {
  if (typeof val === 'string') {
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  if (Array.isArray(val)) {
    return val.map(item => escapeXss(item));
  }
  if (val && typeof val === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      clean[k] = escapeXss(v);
    }
    return clean;
  }
  return val;
}

/**
 * Middleware: Sanitize against XSS attacks
 */
const sanitizeXss = (req, res, next) => {
  if (req.body) req.body = escapeXss(req.body);
  next();
};

/**
 * Helper to respond with 400 Bad Request on validation errors
 */
const validationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    status: 'error',
    code: 'VALIDATION_ERROR',
    errorCode: 'VALIDATION_ERROR',
    message: errors[0],
    errors
  });
};

/**
 * Validator: User Registration
 */
const validateRegister = (req, res, next) => {
  const { name, email, password, phone } = req.body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long.');
  } else if (name.trim().length > 100) {
    errors.push('Name cannot exceed 100 characters.');
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('Please provide a valid email address.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  if (phone) {
    const cleanPhone = String(phone).trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      errors.push('Please provide a valid 10-digit mobile number.');
    }
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }

  next();
};

/**
 * Validator: User Login
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push('Email is required.');
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push('Please enter a valid email address.');
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }

  next();
};

/**
 * Validator: Document Creation & Updates
 */
const validateDocumentInput = (req, res, next) => {
  const { title, category, categoryId, expiryDate, issueDate } = req.body || {};
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    errors.push('Document title is required and must be at least 2 characters.');
  } else if (title.trim().length > 200) {
    errors.push('Document title cannot exceed 200 characters.');
  }

  if (!category && !categoryId) {
    errors.push('Document category is required.');
  }

  let isPerpetual = false;
  if (!expiryDate || typeof expiryDate !== 'string' || !expiryDate.trim()) {
    errors.push('Expiry date is required.');
  } else {
    const exp = expiryDate.trim();
    isPerpetual = /perpetual|lifetime|never|no expiry/i.test(exp);
    if (!isPerpetual) {
      const parsedExp = new Date(exp);
      if (isNaN(parsedExp.getTime())) {
        errors.push('Expiry date must be a valid date format (YYYY-MM-DD) or "Perpetual".');
      }
    }
  }

  if (issueDate) {
    const iss = String(issueDate).trim();
    const parsedIss = new Date(iss);
    if (isNaN(parsedIss.getTime())) {
      errors.push('Issue date must be a valid date format (YYYY-MM-DD).');
    } else if (!isPerpetual && expiryDate) {
      const parsedExp = new Date(expiryDate.trim());
      if (!isNaN(parsedExp.getTime()) && parsedIss.getTime() > parsedExp.getTime()) {
        errors.push('Issue date cannot be later than expiry date.');
      }
    }
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }

  next();
};

/**
 * Validator: Profile Creation & Updates
 */
const validateProfileInput = (req, res, next) => {
  const { name, type, relation, description } = req.body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Profile name is required (at least 2 characters).');
  } else if (name.trim().length > 100) {
    errors.push('Profile name cannot exceed 100 characters.');
  }

  const validTypes = ['self', 'family', 'vehicle', 'employee', 'custom', 'asset', 'pet', 'other'];
  if (type && !validTypes.includes(type.toLowerCase())) {
    errors.push(`Profile type must be one of: ${validTypes.join(', ')}.`);
  }

  if (relation && typeof relation === 'string' && relation.length > 100) {
    errors.push('Relationship description cannot exceed 100 characters.');
  }

  if (description && typeof description === 'string' && description.length > 500) {
    errors.push('Profile notes cannot exceed 500 characters.');
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }

  next();
};

/**
 * Validator: Warranty Creation & Updates
 */
const validateWarrantyInput = (req, res, next) => {
  const { productName, brand, durationMonths, purchaseDate, amount } = req.body || {};
  const errors = [];

  if (!productName || typeof productName !== 'string' || productName.trim().length < 2) {
    errors.push('Product name is required (at least 2 characters).');
  } else if (productName.trim().length > 200) {
    errors.push('Product name cannot exceed 200 characters.');
  }

  if (!brand || typeof brand !== 'string' || !brand.trim()) {
    errors.push('Brand is required.');
  }

  if (durationMonths === undefined || durationMonths === null || isNaN(Number(durationMonths)) || Number(durationMonths) <= 0) {
    errors.push('Warranty duration must be a positive number of months.');
  }

  if (!purchaseDate || typeof purchaseDate !== 'string') {
    errors.push('Purchase date is required.');
  } else {
    const pDate = new Date(purchaseDate.trim());
    if (isNaN(pDate.getTime())) {
      errors.push('Purchase date must be a valid date (YYYY-MM-DD).');
    }
  }

  if (amount !== undefined && amount !== null && amount !== '' && (isNaN(Number(amount)) || Number(amount) < 0)) {
    errors.push('Purchase amount must be a non-negative number.');
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }

  next();
};

/**
 * Validator: Notification & Test Alert Input
 */
const validateNotificationInput = (req, res, next) => {
  const { title, channel, severity, recipient } = req.body || {};
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    errors.push('Notification title is required (at least 2 characters).');
  }

  const validChannels = ['EMAIL', 'SMS', 'IN_APP', 'WHATSAPP'];
  if (channel && !validChannels.includes(channel.toUpperCase())) {
    errors.push(`Notification channel must be one of: ${validChannels.join(', ')}.`);
  }

  const validSeverities = ['INFO', 'WARNING', 'CRITICAL'];
  if (severity && !validSeverities.includes(severity.toUpperCase())) {
    errors.push(`Notification severity must be one of: ${validSeverities.join(', ')}.`);
  }

  if (recipient && typeof recipient === 'string' && recipient.trim()) {
    if (channel === 'EMAIL' && !EMAIL_REGEX.test(recipient.trim())) {
      errors.push('Please enter a valid email address for recipient.');
    }
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }

  next();
};

/**
 * Validator: Chatbot Message Input
 */
const validateChatInput = (req, res, next) => {
  const { message } = req.body || {};
  const errors = [];

  if (!message || typeof message !== 'string' || !message.trim()) {
    errors.push('Message cannot be empty.');
  } else if (message.trim().length > 1500) {
    errors.push('Message exceeds maximum safety limit of 1500 characters.');
  }

  if (errors.length > 0) {
    return validationError(res, errors);
  }

  next();
};

/**
 * Middleware: Validate Resource ID parameter
 */
const validateIdParam = (paramName = 'id') => (req, res, next) => {
  const val = req.params[paramName];
  if (val) {
    if (typeof val !== 'string' || val.length > 128 || /[<>'"`;$(){}]/.test(val)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        code: 'INVALID_RESOURCE_ID',
        errorCode: 'INVALID_RESOURCE_ID',
        message: `Resource identifier parameter "${paramName}" is malformed.`
      });
    }
  }
  next();
};

module.exports = {
  sanitizeNoSql,
  sanitizeXss,
  validateRegister,
  validateLogin,
  validateDocumentInput,
  validateProfileInput,
  validateWarrantyInput,
  validateNotificationInput,
  validateChatInput,
  validateIdParam
};
