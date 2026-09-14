/**
 * Abstract Base Class: NotificationService
 * Defines interface for dispatching and retrieving notifications.
 */
class NotificationService {
  /**
   * Send or record a notification
   * @param {string} userId - Target user ID
   * @param {object} payload - Notification data { documentId, message, type, ... }
   */
  async send(userId, payload) { // eslint-disable-line no-unused-vars
    throw new Error('Method send() must be implemented by subclass');
  }

  /**
   * Retrieve active notifications for a user
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getNotifications(userId) { // eslint-disable-line no-unused-vars
    throw new Error('Method getNotifications() must be implemented by subclass');
  }
}

module.exports = NotificationService;
