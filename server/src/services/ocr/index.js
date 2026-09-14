const OCRService = require('./OCRService');
const MockOCRService = require('./MockOCRService');

// Instantiate service instance (defaults to Mock; later iterations can toggle to LocalTesseractOCRService)
const ocrService = new MockOCRService();

module.exports = {
  OCRService,
  MockOCRService,
  ocrService
};
