const ChatbotService = require('./ChatbotService');

/**
 * MockChatbotService
 * Provides canned rule-based answers to document tracking questions without cloud LLM dependencies.
 */
class MockChatbotService extends ChatbotService {
  async reply(message = '', context = {}) { // eslint-disable-line no-unused-vars
    const lower = message.toLowerCase().trim();

    if (lower.includes('expir') || lower.includes('due') || lower.includes('renew')) {
      return {
        reply: 'You have 1 document expiring soon: Vehicle Insurance is due for renewal on Oct 15, 2026 (14 days remaining).',
        intent: 'query_expirations',
        suggestedActions: ['View Vehicle Insurance', 'Upload Renewal Copy']
      };
    }

    if (lower.includes('passport') || lower.includes('travel')) {
      return {
        reply: 'Your Passport (Z9182736) is Active and valid until Jan 09, 2031.',
        intent: 'query_document_status',
        suggestedActions: ['Download Copy', 'View Profile']
      };
    }

    if (lower.includes('upload') || lower.includes('add')) {
      return {
        reply: 'You can add new documents anytime by clicking "+ Upload Document" in the dashboard. Our local OCR will automatically parse dates and numbers.',
        intent: 'help_upload',
        suggestedActions: ['Go to Upload', 'Supported File Formats']
      };
    }

    return {
      reply: 'Hello! I am DocTrack Assistant. You can ask me about expiring documents, warranty coverage, or document details.',
      intent: 'general_greeting',
      suggestedActions: ['Check Expirations', 'View Documents', 'Help']
    };
  }
}

module.exports = MockChatbotService;
