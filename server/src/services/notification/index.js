const NotificationService = require('./NotificationService');
const MockNotificationService = require('./MockNotificationService');

// Shared instance
const notificationService = new MockNotificationService();

module.exports = {
  NotificationService,
  MockNotificationService,
  notificationService
};
