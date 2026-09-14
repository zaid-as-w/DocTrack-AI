const NotificationService = require('./NotificationService');

/**
 * MockNotificationService
 * Stores notifications in-memory for testing and offline UI prototyping.
 */
class MockNotificationService extends NotificationService {
  constructor() {
    super();
    this.notifications = [
      {
        id: 'mock-notif-1',
        userId: 'demo-user-1',
        documentId: 'doc-101',
        message: 'Vehicle Insurance expires in 14 days',
        type: 'warning',
        read: false,
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      },
      {
        id: 'mock-notif-2',
        userId: 'demo-user-1',
        documentId: 'doc-102',
        message: 'Passport successfully verified by OCR',
        type: 'info',
        read: true,
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      }
    ];
  }

  async send(userId, payload) {
    const item = {
      id: `mock-notif-${Date.now()}`,
      userId,
      documentId: payload.documentId || null,
      message: payload.message || 'New notification',
      type: payload.type || 'info',
      read: false,
      createdAt: new Date().toISOString()
    };
    this.notifications.unshift(item);
    return item;
  }

  async getNotifications(userId) {
    return this.notifications.filter((n) => !userId || n.userId === userId);
  }
}

module.exports = MockNotificationService;
