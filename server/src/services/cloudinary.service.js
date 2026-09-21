const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const config = require('../config/env');

// Initialize Cloudinary SDK if credentials exist
const rawCloudUrl = process.env.CLOUDINARY_URL || '';
const hasCloudinaryUrl = Boolean(
  rawCloudUrl &&
  !rawCloudUrl.includes('<your_api_key>') &&
  !rawCloudUrl.includes('YOUR_API_KEY') &&
  rawCloudUrl.startsWith('cloudinary://')
);

const isCloudinaryConfigured = Boolean(
  hasCloudinaryUrl ||
  (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret)
);

if (isCloudinaryConfigured) {
  if (!hasCloudinaryUrl) {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true
    });
  }
}

/**
 * Upload a local document or image to Cloudinary
 * 
 * @param {string} filePath - Absolute path to local file on disk
 * @param {Object} options - Custom upload options (folder, tags, etc.)
 * @returns {Promise<{ success: boolean, url: string, publicId: string, format: string, bytes: number }>}
 */
const uploadDocumentFile = async (filePath, options = {}) => {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const isPdf = ext === '.pdf';

  try {
    const uploadOptions = {
      folder: options.folder || 'doctrack/documents',
      resource_type: isPdf ? 'raw' : 'auto',
      use_filename: true,
      unique_filename: true,
      tags: options.tags || ['doctrack', 'document']
    };

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format || (isPdf ? 'pdf' : ext.replace('.', '')),
      bytes: result.bytes
    };
  } catch (error) {
    console.error('[Cloudinary Upload Error]', error.message);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

/**
 * Delete a file from Cloudinary given its publicId or secure_url
 * 
 * @param {string} publicIdOrUrl
 * @returns {Promise<{ success: boolean, result: string }>}
 */
const deleteDocumentFile = async (publicIdOrUrl) => {
  if (!isCloudinaryConfigured || !publicIdOrUrl) {
    return { success: false, reason: 'Cloudinary not configured or empty target' };
  }

  try {
    let publicId = publicIdOrUrl;

    // If a full Cloudinary URL is provided, extract the publicId
    if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://')) {
      if (!publicIdOrUrl.includes('cloudinary.com')) {
        // Not a Cloudinary file (e.g. local /uploads/ URL)
        return { success: false, reason: 'Not a Cloudinary URL' };
      }
      // Extract segment between /upload/(v\d+/)? and extension
      const urlParts = publicIdOrUrl.split('/upload/');
      if (urlParts.length > 1) {
        let postUpload = urlParts[1];
        // Strip optional version prefix e.g. v1726000000/
        postUpload = postUpload.replace(/^v\d+\//, '');
        // Strip file extension if image
        const extIdx = postUpload.lastIndexOf('.');
        if (extIdx !== -1 && !postUpload.endsWith('.pdf')) {
          publicId = postUpload.substring(0, extIdx);
        } else {
          publicId = postUpload;
        }
      }
    }

    const isRaw = publicId.endsWith('.pdf') || publicId.includes('.pdf');
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: isRaw ? 'raw' : 'image'
    });

    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.warn('[Cloudinary Delete Warning]', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  isConfigured: () => isCloudinaryConfigured,
  uploadDocumentFile,
  deleteDocumentFile
};
