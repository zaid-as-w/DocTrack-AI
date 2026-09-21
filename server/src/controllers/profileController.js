const Profile = require('../models/Profile');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { isDbConnected } = require('../config/db');
const localDb = require('../services/localDb');

// Icon mapping helper
const getIconForType = (type) => {
  switch (type) {
    case 'self':
      return 'User';
    case 'family':
      return 'Users';
    case 'vehicle':
      return 'Car';
    case 'employee':
      return 'Briefcase';
    default:
      return 'Layers';
  }
};

/**
 * Get all profiles for current user with document counts
 * GET /api/profiles
 */
const getProfiles = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let profiles = [];

    if (isDbConnected()) {
      profiles = await Profile.find({ userId }).sort({ isPrimary: -1, createdAt: 1 });
      if (profiles.length === 0) {
        // Automatically allocate default primary profile for user
        const defaultPrimary = await Profile.create({
          userId,
          name: req.user?.name ? req.user.name.trim() : 'Personal Vault',
          type: 'self',
          relation: 'Self',
          icon: 'User',
          description: 'Primary account owner & personal document vault',
          isPrimary: true
        });
        profiles = [defaultPrimary];
      }
    } else {
      profiles = localDb.getProfilesByUserId(userId);
      if (profiles.length === 0) {
        // Automatically allocate default primary profile for user in persistent localDb
        const newPrimary = localDb.createProfile({
          userId,
          name: req.user?.name ? req.user.name.trim() : 'Personal Vault',
          type: 'self',
          relation: 'Self',
          icon: 'User',
          description: 'Primary account owner & personal document vault',
          isPrimary: true
        });
        profiles = [newPrimary];
      }
    }

    // Attach document count and format profile structure
    const result = profiles.map(p => {
      const pid = p._id ? p._id.toString() : p.id;
      return {
        id: pid,
        name: p.name,
        type: p.type,
        relation: p.relation || '',
        icon: p.icon || getIconForType(p.type),
        description: p.description || '',
        color: p.color || '#2E6830',
        isPrimary: !!p.isPrimary,
        createdAt: p.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile details by ID
 * GET /api/profiles/:id
 */
const getProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let profile = null;

    if (isDbConnected()) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(id)) {
        profile = await Profile.findOne({ _id: id, userId });
      } else {
        profile = await Profile.findOne({ id, userId });
      }
    } else {
      profile = localDb.findProfileById(id);
      if (profile && profile.userId !== userId) {
        profile = null;
      }
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        status: 'error',
        code: 'PROFILE_NOT_FOUND',
        errorCode: 'PROFILE_NOT_FOUND',
        message: `Profile ${id} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new user profile
 * POST /api/profiles
 */
const createProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { name, type = 'family', relation = '', description = '', isPrimary, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        status: 'error',
        code: 'VALIDATION_ERROR',
        errorCode: 'VALIDATION_ERROR',
        message: 'Profile name is required.'
      });
    }

    const icon = getIconForType(type);
    const shouldBePrimary = isPrimary !== undefined ? !!isPrimary : (type === 'self');

    let newProfile = null;

    if (isDbConnected()) {
      if (shouldBePrimary) {
        await Profile.updateMany({ userId }, { isPrimary: false });
      }
      newProfile = await Profile.create({
        userId,
        name: name.trim(),
        type,
        relation: relation.trim(),
        icon,
        description: description.trim(),
        color: color || '#2E6830',
        isPrimary: shouldBePrimary
      });
    } else {
      if (shouldBePrimary) {
        const existing = localDb.getProfilesByUserId(userId);
        existing.forEach(p => {
          if (p.isPrimary) localDb.updateProfile(p.id, { isPrimary: false }, userId);
        });
      }
      newProfile = localDb.createProfile({
        userId,
        name: name.trim(),
        type,
        relation: relation.trim(),
        icon,
        description: description.trim(),
        color: color || '#2E6830',
        isPrimary: shouldBePrimary
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Profile created successfully.',
      data: newProfile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing profile
 * PUT /api/profiles/:id
 */
const updateProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { name, type, relation, description, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        status: 'error',
        code: 'VALIDATION_ERROR',
        errorCode: 'VALIDATION_ERROR',
        message: 'Profile name cannot be empty.'
      });
    }

    let updated = null;

    if (isDbConnected()) {
      const mongoose = require('mongoose');
      const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id, userId } : { id, userId };
      updated = await Profile.findOneAndUpdate(
        filter,
        {
          name: name.trim(),
          type: type || 'family',
          relation: relation !== undefined ? relation.trim() : '',
          description: description !== undefined ? description.trim() : '',
          color: color || '#2E6830',
          icon: getIconForType(type || 'family')
        },
        { new: true }
      );
    } else {
      updated = localDb.updateProfile(
        id,
        {
          name: name.trim(),
          type: type || 'family',
          relation: relation !== undefined ? relation.trim() : '',
          description: description !== undefined ? description.trim() : '',
          color: color || '#2E6830',
          icon: getIconForType(type || 'family')
        },
        userId
      );
    }

    if (!updated) {
      return res.status(404).json({
        success: false,
        status: 'error',
        code: 'PROFILE_NOT_FOUND',
        errorCode: 'PROFILE_NOT_FOUND',
        message: `Profile ${id} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a profile
 * DELETE /api/profiles/:id
 */
const deleteProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let isPrimaryProfile = false;

    if (isDbConnected()) {
      const mongoose = require('mongoose');
      const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id, userId } : { id, userId };
      const p = await Profile.findOne(filter);
      if (p && p.isPrimary) isPrimaryProfile = true;
    } else {
      const p = localDb.findProfileById(id);
      if (p && p.userId === userId && p.isPrimary) isPrimaryProfile = true;
    }

    if (isPrimaryProfile || id === 'self') {
      return res.status(403).json({
        success: false,
        status: 'error',
        code: 'PRIMARY_PROFILE_PROTECTED',
        errorCode: 'PRIMARY_PROFILE_PROTECTED',
        message: 'The primary owner profile cannot be deleted.'
      });
    }

    let deleted = false;

    if (isDbConnected()) {
      const mongoose = require('mongoose');
      const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id, userId } : { id, userId };
      const resDb = await Profile.findOneAndDelete(filter);
      deleted = !!resDb;
    } else {
      deleted = localDb.deleteProfile(id, userId);
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        status: 'error',
        code: 'PROFILE_NOT_FOUND',
        errorCode: 'PROFILE_NOT_FOUND',
        message: `Profile ${id} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Profile ${id} deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile
};
