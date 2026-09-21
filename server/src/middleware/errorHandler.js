/**
 * Centralized Production-Ready Error Handler
 * Standardizes error responses, maps database and upload exceptions,
 * and ensures internal server stack traces are never leaked in production.
 */

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || err.status || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.message || 'An internal server error occurred.';
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let errors = err.errors || [];

  // 1. JSON Parse / Syntax Error (Malformed JSON payload)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'MALFORMED_JSON_PAYLOAD';
    message = 'Malformed JSON payload in request body. Please verify JSON syntax.';
  }

  // 2. Multer Upload & File Filter Exceptions
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      code = 'FILE_TOO_LARGE';
      message = 'Uploaded file exceeds the maximum allowed limit of 15MB.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      statusCode = 400;
      code = 'UNEXPECTED_FILE_FIELD';
      message = `Unexpected file field "${err.field}". Expected "file".`;
    } else {
      statusCode = 400;
      code = 'UPLOAD_ERROR';
      message = err.message || 'File upload error.';
    }
  } else if (err.code === 'INVALID_FILE_TYPE' || (err.message && err.message.startsWith('Unsupported file'))) {
    statusCode = 400;
    code = 'INVALID_FILE_TYPE';
    message = err.message;
  }

  // 3. Mongoose Validation Errors
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    code = 'DATABASE_VALIDATION_ERROR';
    errors = Object.values(err.errors).map(e => e.message);
    message = errors[0] || 'Database validation failed.';
  }

  // 4. Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_RESOURCE_ID';
    message = `Invalid format for resource identifier "${err.value}".`;
  }

  // 5. MongoDB Duplicate Key Conflict (Error code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY_CONFLICT';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists.`;
  }

  // 6. JWT Authentication Exceptions
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token provided.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired. Please sign in again.';
  }

  // Strip sensitive internal patterns (filesystem paths, Mongo connection URIs, etc.)
  if (typeof message === 'string') {
    message = message
      .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, 'mongodb://[redacted]')
      .replace(/[A-Z]:\\[^:\n\r]+/g, '[redacted_path]')
      .replace(/\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_/-]+/g, '[redacted_path]');
  }

  // Log error details securely on server console
  console.error(`[${new Date().toISOString()}] [${code}] ${req.method} ${req.originalUrl}:`, message);
  if (process.env.NODE_ENV === 'development' && err.stack) {
    console.error(err.stack);
  }

  // Send uniform, sanitized client response (zero sensitive leaks)
  res.status(statusCode).json({
    success: false,
    status: 'error',
    code,
    errorCode: code,
    message,
    ...(errors.length > 0 && { errors })
  });
};

module.exports = errorHandler;
