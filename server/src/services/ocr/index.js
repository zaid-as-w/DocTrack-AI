const OCRService = require('./OCRService');
const SmartOCRService = require('./SmartOCRService');
const MockOCRService = require('./MockOCRService');

// Primary on-device heuristic & pattern-matching OCR service
const ocrService = new SmartOCRService();
const mockOCRService = new MockOCRService();

module.exports = {
  OCRService,
  SmartOCRService,
  MockOCRService,
  ocrService,
  mockOCRService
};
