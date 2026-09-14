/**
 * Abstract Base Class: ChatbotService
 * Defines interface for responding to conversational user queries about documents.
 */
class ChatbotService {
  /**
   * Process a user prompt and return a response
   * @param {string} message - User input
   * @param {object} [context] - Contextual data (e.g. user documents, profile)
   * @returns {Promise<{ reply: string, intent: string, suggestedActions?: string[] }>}
   */
  async reply(message, context = {}) { // eslint-disable-line no-unused-vars
    throw new Error('Method reply() must be implemented by subclass');
  }
}

module.exports = ChatbotService;
