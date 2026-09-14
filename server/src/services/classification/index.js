const ClassificationService = require('./ClassificationService');
const MockClassificationService = require('./MockClassificationService');

// Instantiate service instance
const classificationService = new MockClassificationService();

module.exports = {
  ClassificationService,
  MockClassificationService,
  classificationService
};
