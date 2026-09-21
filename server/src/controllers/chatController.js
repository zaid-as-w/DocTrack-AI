/**
 * Chat Controller
 * Handles conversational queries, history retrieval, and suggestions
 */

const {
  getChatHistory,
  clearChatHistory,
  processUserMessage,
  getContextualSuggestions
} = require('../services/aiAssistantService');

/**
 * Get conversation history for current user
 * GET /api/chat/history
 */
const getHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const messages = await getChatHistory(userId);
    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send user query and obtain AI assistant reply
 * POST /api/chat/message
 */
const postMessage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errorCode: 'VALIDATION_ERROR',
        message: 'Message content cannot be empty'
      });
    }

    const response = await processUserMessage(userId, message);
    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear chat history for user
 * DELETE /api/chat/history
 */
const deleteHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await clearChatHistory(userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get dynamic starter prompts based on vault items
 * GET /api/chat/suggestions
 */
const getSuggestions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const suggestions = await getContextualSuggestions(userId);
    return res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHistory,
  postMessage,
  deleteHistory,
  getSuggestions
};
