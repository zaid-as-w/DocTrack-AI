const express = require('express');
const router = express.Router();
const {
  getHistory,
  postMessage,
  deleteHistory,
  getSuggestions
} = require('../controllers/chatController');
const { validateChatInput } = require('../middleware/validators');
const authenticateJWT = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');

// All chat and AI assistant routes strictly require authentication
router.use(authenticateJWT);

// @route   GET /api/chat/history
// @desc    Get chat message history for authenticated user
router.get('/history', getHistory);

// @route   POST /api/chat/message
// @desc    Post prompt to AI Assistant and get reply (rate-limited, validated for safety and length)
router.post('/message', aiRateLimiter, validateChatInput, postMessage);

// @route   DELETE /api/chat/history
// @desc    Clear conversation history for authenticated user
router.delete('/history', deleteHistory);

// @route   GET /api/chat/suggestions
// @desc    Get contextual prompt recommendations for authenticated user
router.get('/suggestions', getSuggestions);

module.exports = router;
