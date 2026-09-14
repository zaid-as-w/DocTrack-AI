const ChatbotService = require('./ChatbotService');
const MockChatbotService = require('./MockChatbotService');

// Shared instance
const chatbotService = new MockChatbotService();

module.exports = {
  ChatbotService,
  MockChatbotService,
  chatbotService
};
