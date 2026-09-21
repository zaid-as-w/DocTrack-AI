/**
 * Resource Ownership Authorization Middleware
 * Enforces strict user-level data isolation to prevent Insecure Direct Object Reference (IDOR)
 * and horizontal privilege escalation attacks across documents, warranties, profiles, and notifications.
 */

const mongoose = require('mongoose');
const Document = require('../models/Document');
const Warranty = require('../models/Warranty');
const Profile = require('../models/Profile');
const { isDbConnected } = require('../config/db');
const { getDocumentById: getLocalDocById } = require('../services/documentStore');
const { getWarrantyById: getLocalWarrantyById } = require('../services/warrantyStore');

/**
 * Guard document ownership for :id routes
 */
const authorizeDocumentOwner = async (req, res, next) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    return res.status(401).json({
      success: false,
      status: 'error',
      code: 'UNAUTHENTICATED',
      errorCode: 'UNAUTHENTICATED',
      message: 'Authentication required to access document resources.'
    });
  }

  const { id } = req.params;
  if (!id) return next();

  let doc = null;
  try {
    if (isDbConnected()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        doc = await Document.findById(id);
      } else {
        doc = await Document.findOne({ $or: [{ id }, { docNumber: id }] });
      }
    }

    if (!doc) {
      doc = getLocalDocById(id);
    }

    if (!doc) {
      // If resource does not exist, pass to route handler to send 404
      return next();
    }

    // Strict ownership verification: resource must belong to authenticated user
    const docOwnerId = doc.userId ? doc.userId.toString() : null;
    if (docOwnerId && docOwnerId !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        code: 'FORBIDDEN_RESOURCE_ACCESS',
        errorCode: 'FORBIDDEN_RESOURCE_ACCESS',
        message: 'Access denied: You do not have authorization to access or modify this document.'
      });
    }

    req.targetDocument = doc;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Guard warranty ownership for :id routes
 */
const authorizeWarrantyOwner = async (req, res, next) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    return res.status(401).json({
      success: false,
      status: 'error',
      code: 'UNAUTHENTICATED',
      errorCode: 'UNAUTHENTICATED',
      message: 'Authentication required to access warranty resources.'
    });
  }

  const { id } = req.params;
  if (!id) return next();

  let warranty = null;
  try {
    if (isDbConnected()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        warranty = await Warranty.findById(id);
      } else {
        warranty = await Warranty.findOne({ id });
      }
    }

    if (!warranty) {
      warranty = getLocalWarrantyById(id, currentUserId);
    }

    if (!warranty) {
      return next();
    }

    const warrantyOwnerId = warranty.userId ? warranty.userId.toString() : null;
    if (warrantyOwnerId && warrantyOwnerId !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        code: 'FORBIDDEN_RESOURCE_ACCESS',
        errorCode: 'FORBIDDEN_RESOURCE_ACCESS',
        message: 'Access denied: You do not have authorization to access or modify this warranty.'
      });
    }

    req.targetWarranty = warranty;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Guard profile ownership for :id routes
 */
const authorizeProfileOwner = async (req, res, next) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    return res.status(401).json({
      success: false,
      status: 'error',
      code: 'UNAUTHENTICATED',
      errorCode: 'UNAUTHENTICATED',
      message: 'Authentication required to access profile resources.'
    });
  }

  const { id } = req.params;
  if (!id) return next();

  try {
    let profile = null;
    if (isDbConnected()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        profile = await Profile.findById(id);
      } else {
        profile = await Profile.findOne({ id });
      }
    }

    if (profile) {
      const profileOwnerId = profile.userId ? profile.userId.toString() : null;
      if (profileOwnerId && profileOwnerId !== currentUserId.toString()) {
        return res.status(403).json({
          success: false,
          status: 'error',
          code: 'FORBIDDEN_RESOURCE_ACCESS',
          errorCode: 'FORBIDDEN_RESOURCE_ACCESS',
          message: 'Access denied: You do not have authorization to access or modify this profile.'
        });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Enforce authenticated user ID on new records
 */
const enforceUserOwnership = (req, res, next) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) {
    return res.status(401).json({
      success: false,
      status: 'error',
      code: 'UNAUTHENTICATED',
      errorCode: 'UNAUTHENTICATED',
      message: 'Authentication required to create resources.'
    });
  }

  if (req.body && typeof req.body === 'object') {
    req.body.userId = currentUserId;
  }
  next();
};

module.exports = {
  authorizeDocumentOwner,
  authorizeWarrantyOwner,
  authorizeProfileOwner,
  enforceUserOwnership
};
