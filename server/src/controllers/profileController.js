const Profile = require('../models/Profile');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { isDbConnected } = require('../config/db');

// Seed profiles for offline-first local mode
const initialProfiles = [
  {
    id: 'self',
    userId: 'demo-user-zaid-001',
    name: 'Zaid (Self)',
    type: 'self',
    relation: 'Self',
    icon: 'User',
    description: 'Primary account owner & document vault administrator',
    isPrimary: true,
    createdAt: '2026-08-01T10:00:00.000Z'
  },
  {
    id: 'son',
    userId: 'demo-user-zaid-001',
    name: 'Rahul (Son)',
    type: 'family',
    relation: 'Son',
    icon: 'Users',
    description: 'Dependent family profile for academic records and identity cards',
    isPrimary: false,
    createdAt: '2026-08-02T11:00:00.000Z'
  },
  {
    id: 'car',
    userId: 'demo-user-zaid-001',
    name: 'Honda City (KA01AB1234)',
    type: 'vehicle',
    relation: 'Sedan Vehicle',
    icon: 'Car',
    description: 'Family sedan — vehicle RC, insurance, and PUC monitoring',
    isPrimary: false,
    createdAt: '2026-08-03T12:00:00.000Z'
  },
  {
    id: 'bike',
    userId: 'demo-user-zaid-001',
    name: 'Ather 450X (KA05EV999)',
    type: 'vehicle',
    relation: 'Two-Wheeler EV',
    icon: 'Car',
    description: 'Personal commuter electric scooter',
    isPrimary: false,
    createdAt: '2026-08-04T13:00:00.000Z'
  },
  {
    id: 'emp',
    userId: 'demo-user-zaid-001',
    name: 'Pooja Sharma (Accountant)',
    type: 'employee',
    relation: 'Finance Staff',
    icon: 'Briefcase',
    description: 'Contract employee records and tax certifications',
    isPrimary: false,
    createdAt: '2026-08-05T14:00:00.000Z'
  }
];

let localProfiles = [...initialProfiles];

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
    const userId = req.user?.id || 'demo-user-zaid-001';

    let profiles = [];

    if (isDbConnected()) {
      profiles = await Profile.find({ userId }).sort({ isPrimary: -1, createdAt: 1 });
      if (profiles.length === 0) {
        profiles = localProfiles;
      }
    } else {
      profiles = localProfiles;
    }

    // Attach real document count for each profile
    const result = profiles.map(p => {
      const pid = p._id ? p._id.toString() : p.id;
      return {
        id: pid,
        name: p.name,
        type: p.type,
        relation: p.relation || '',
        icon: p.icon || getIconForType(p.type),
        description: p.description || '',
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
    let profile = null;

    if (isDbConnected()) {
      profile = await Profile.findById(id);
    } else {
      profile = localProfiles.find(p => p.id === id);
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
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
    const userId = req.user?.id || 'demo-user-zaid-001';
    const { name, type = 'family', relation = '', description = '' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Profile name is required.'
      });
    }

    const icon = getIconForType(type);

    let newProfile = null;

    if (isDbConnected()) {
      newProfile = await Profile.create({
        userId,
        name: name.trim(),
        type,
        relation: relation.trim(),
        icon,
        description: description.trim(),
        isPrimary: false
      });
    } else {
      const id = `profile-${Date.now()}`;
      newProfile = {
        id,
        userId,
        name: name.trim(),
        type,
        relation: relation.trim(),
        icon,
        description: description.trim(),
        isPrimary: false,
        createdAt: new Date().toISOString()
      };
      localProfiles.push(newProfile);
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
    const { name, type, relation, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Profile name cannot be empty.'
      });
    }

    let updated = null;

    if (isDbConnected()) {
      updated = await Profile.findByIdAndUpdate(
        id,
        {
          name: name.trim(),
          type: type || 'family',
          relation: relation ? relation.trim() : '',
          description: description ? description.trim() : '',
          icon: getIconForType(type || 'family')
        },
        { new: true }
      );
    } else {
      const index = localProfiles.findIndex(p => p.id === id);
      if (index !== -1) {
        localProfiles[index] = {
          ...localProfiles[index],
          name: name.trim(),
          type: type || localProfiles[index].type,
          relation: relation !== undefined ? relation.trim() : localProfiles[index].relation,
          description: description !== undefined ? description.trim() : localProfiles[index].description,
          icon: getIconForType(type || localProfiles[index].type)
        };
        updated = localProfiles[index];
      }
    }

    if (!updated) {
      return res.status(404).json({
        success: false,
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

    if (id === 'self') {
      return res.status(403).json({
        success: false,
        message: 'The primary owner profile cannot be deleted.'
      });
    }

    let deleted = false;

    if (isDbConnected()) {
      const p = await Profile.findById(id);
      if (p && p.isPrimary) {
        return res.status(403).json({
          success: false,
          message: 'The primary owner profile cannot be deleted.'
        });
      }
      const resDb = await Profile.findByIdAndDelete(id);
      deleted = !!resDb;
    } else {
      const p = localProfiles.find(item => item.id === id);
      if (p && p.isPrimary) {
        return res.status(403).json({
          success: false,
          message: 'The primary owner profile cannot be deleted.'
        });
      }
      const prevLen = localProfiles.length;
      localProfiles = localProfiles.filter(item => item.id !== id);
      deleted = localProfiles.length < prevLen;
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Profile ${id} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile deleted successfully.'
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
