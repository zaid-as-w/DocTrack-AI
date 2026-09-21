const ClassificationService = require('./ClassificationService');
const MockClassificationService = require('./MockClassificationService');
const SmartClassificationService = require('./SmartClassificationService');

// Instantiate default classification engine
const smartClassificationService = new SmartClassificationService();
const mockClassificationService = new MockClassificationService();

module.exports = {
  ClassificationService,
  MockClassificationService,
  SmartClassificationService,
  mockClassificationService,
  classificationService: smartClassificationService
};
