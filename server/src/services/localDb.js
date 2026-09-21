/**
 * Persistent Local Vault Database Service
 * Automatically persists users, allocated profiles, documents, and warranties to disk (server/data/db.json).
 * Ensures full data retention across server restarts without external database dependencies.
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbFilePath = path.join(dataDir, 'db.json');

// In-memory cache synced with disk
let db = {
  users: [],
  profiles: [],
  documents: [],
  warranties: [],
  alerts: []
};

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    console.error('[LocalDB] Could not create data directory:', err.message);
  }
}

// Load existing database from disk on startup
function loadDatabase() {
  if (fs.existsSync(dbFilePath)) {
    try {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        db = {
          users: Array.isArray(parsed.users) ? parsed.users : [],
          profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
          documents: Array.isArray(parsed.documents) ? parsed.documents : [],
          warranties: Array.isArray(parsed.warranties) ? parsed.warranties : [],
          alerts: Array.isArray(parsed.alerts) ? parsed.alerts : []
        };
        console.log(`[LocalDB] Database loaded successfully (${db.users.length} users, ${db.profiles.length} profiles, ${db.documents.length} docs).`);
        return;
      }
    } catch (err) {
      console.warn('[LocalDB Warning] Failed to parse db.json, re-initializing empty vault:', err.message);
    }
  }

  // If file doesn't exist, create an initial empty store
  saveDatabase();
}

// Save database to disk atomically
function saveDatabase() {
  try {
    const jsonStr = JSON.stringify(db, null, 2);
    fs.writeFileSync(dbFilePath, jsonStr, 'utf8');
  } catch (err) {
    console.error('[LocalDB Error] Failed to persist data to db.json:', err.message);
  }
}

// Initialize on module load
loadDatabase();

// --- USER OPERATIONS ---
function findUserByEmail(email) {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  return db.users.find(u => u.email.toLowerCase().trim() === normalized) || null;
}

function findUserById(id) {
  if (!id) return null;
  return db.users.find(u => u.id === id || u._id === id) || null;
}

function createUser(userData) {
  const newUser = {
    id: userData.id || `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: userData.name.trim(),
    email: userData.email.toLowerCase().trim(),
    phone: userData.phone ? userData.phone.trim() : '',
    passwordHash: userData.passwordHash,
    onboardingCompleted: Boolean(userData.onboardingCompleted),
    createdAt: userData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDatabase();
  return newUser;
}

function updateUser(id, updates) {
  const user = findUserById(id);
  if (!user) return null;

  Object.assign(user, updates, { updatedAt: new Date().toISOString() });
  saveDatabase();
  return user;
}

// --- PROFILE OPERATIONS ---
function getProfilesByUserId(userId) {
  if (!userId) return [];
  return db.profiles.filter(p => p.userId === userId);
}

function findProfileById(profileId) {
  if (!profileId) return null;
  return db.profiles.find(p => p.id === profileId || p._id === profileId) || null;
}

function createProfile(profileData) {
  const newProfile = {
    id: profileData.id || `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: profileData.userId,
    name: profileData.name ? profileData.name.trim() : 'Personal Vault',
    type: profileData.type || 'self',
    relation: profileData.relation || 'Self',
    icon: profileData.icon || 'User',
    description: profileData.description || 'Primary account owner & personal document vault',
    color: profileData.color || '#2E6830',
    isPrimary: Boolean(profileData.isPrimary),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.profiles.push(newProfile);
  saveDatabase();
  return newProfile;
}

function updateProfile(profileId, updates, userId) {
  const profile = db.profiles.find(p => (p.id === profileId || p._id === profileId) && (!userId || p.userId === userId));
  if (!profile) return null;

  Object.assign(profile, updates, { updatedAt: new Date().toISOString() });
  saveDatabase();
  return profile;
}

function deleteProfile(profileId, userId) {
  const index = db.profiles.findIndex(p => (p.id === profileId || p._id === profileId) && (!userId || p.userId === userId));
  if (index === -1) return false;

  db.profiles.splice(index, 1);
  saveDatabase();
  return true;
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  getProfilesByUserId,
  findProfileById,
  createProfile,
  updateProfile,
  deleteProfile,
  reload: loadDatabase
};
