const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Strictly supported document extensions & MIME types
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// Configure disk storage for local documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize original file name to prevent directory traversal and injection
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      ext = '.bin';
    }
    const safeBase = path.parse(file.originalname).name
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBase}-${uniqueSuffix}${ext}`);
  }
});

// File filter accepting strictly supported document and image types
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error('Unsupported file format. Supported formats are PDF, JPG, JPEG, and PNG.');
    err.statusCode = 400;
    err.status = 400;
    err.code = 'INVALID_FILE_TYPE';
    err.errorCode = 'INVALID_FILE_TYPE';
    return cb(err, false);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype) && file.mimetype !== 'application/octet-stream') {
    const err = new Error(`Unsupported file type: ${file.mimetype}. Supported formats are PDF, JPG, JPEG, and PNG.`);
    err.statusCode = 400;
    err.status = 400;
    err.code = 'INVALID_FILE_TYPE';
    err.errorCode = 'INVALID_FILE_TYPE';
    return cb(err, false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  }
});

/**
 * Verify Magic Bytes / File Binary Signature
 * Reads the first 16 bytes of the uploaded file to ensure binary signatures match declared format.
 */
const verifyMagicBytes = (filePath, mimetype) => {
  try {
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    // Reject executable and script signatures immediately
    // MZ (Windows exe: 0x4D 0x5A)
    if (buffer[0] === 0x4d && buffer[1] === 0x5a) return false;
    // ELF (Linux executable: 0x7F 0x45 0x4C 0x46)
    if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) return false;
    // Script hashbang (#! : 0x23 0x21)
    if (buffer[0] === 0x23 && buffer[1] === 0x21) return false;

    const ext = path.extname(filePath).toLowerCase();

    // PDF signature: %PDF (0x25 0x50 0x44 0x46)
    if (mimetype === 'application/pdf' || ext === '.pdf') {
      return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    }

    // PNG signature: \x89PNG (0x89 0x50 0x4E 0x47)
    if (mimetype === 'image/png' || ext === '.png') {
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    }

    // JPEG signature: \xFF\xD8\xFF (0xFF 0xD8 0xFF)
    if (mimetype === 'image/jpeg' || ext === '.jpg' || ext === '.jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    return false;
  } catch (err) {
    console.error('Magic bytes verification error:', err);
    return false;
  }
};

/**
 * Middleware: Post-upload security validation to inspect size and binary signature
 */
const validateUploadedFile = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // Reject empty file
  if (req.file.size === 0) {
    try {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch {}
    return res.status(400).json({
      success: false,
      status: 'error',
      code: 'EMPTY_FILE',
      errorCode: 'EMPTY_FILE',
      message: 'Uploaded file is empty. Please select a valid document.'
    });
  }

  const isValid = verifyMagicBytes(req.file.path, req.file.mimetype);

  if (!isValid) {
    // Delete spoofed or unsupported file immediately
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch {}

    return res.status(400).json({
      success: false,
      status: 'error',
      code: 'INVALID_FILE_SIGNATURE',
      errorCode: 'INVALID_FILE_SIGNATURE',
      message: 'File binary signature does not match declared MIME type. Potential spoofing or unsupported format detected.'
    });
  }

  next();
};

module.exports = {
  upload,
  verifyMagicBytes,
  validateUploadedFile,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES
};
