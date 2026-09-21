const { ocrService, mockOCRService } = require('../services/ocr');
const { classificationService } = require('../services/classification');

/**
 * Process a file, text string, or template through the OCR engine
 * POST /api/ocr/process
 */
const processOCR = async (req, res, next) => {
  try {
    const { text, templateId, fileName } = req.body;
    let input = '';
    let options = {};

    let result;

    if (templateId) {
      result = await mockOCRService.extractText(null, { templateId });
    } else if (req.file) {
      input = req.file.path;
      options.fileName = req.file.originalname;
      result = await ocrService.extractText(input, options);
    } else if (text) {
      input = text;
      options.fileName = fileName || 'input_text.txt';
      result = await ocrService.extractText(input, options);
    } else {
      // Return default template extraction for sample testing
      result = await mockOCRService.extractText(null);
    }

    // Automatically run AI Document Classification on OCR result
    const ocrText = result?.rawText || result?.text || '';
    if (result && ocrText) {
      const classification = await classificationService.classify(ocrText, {
        fileName: options.fileName || result.fileName || '',
        title: result.extractedFields?.title || result.fields?.title || '',
        ocrFields: result.extractedFields || result.fields
      });
      result.classification = classification;

      // Also ensure extractedFields has suggested category if not present
      if (result.extractedFields && !result.extractedFields.categoryId) {
        result.extractedFields.categoryId = classification.categoryId;
        result.extractedFields.category = classification.category;
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get available OCR test templates
 * GET /api/ocr/templates
 */
const getTemplates = async (req, res, next) => {
  try {
    const templates = mockOCRService.getTemplates();
    return res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get OCR service health and engine status
 * GET /api/ocr/status
 */
const getStatus = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        status: 'ready',
        activeProvider: 'SmartOCRService (Local On-Device Engine)',
        supportedFormats: ['PDF', 'JPG', 'PNG', 'JPEG', 'TEXT'],
        confidenceThreshold: 0.80,
        features: [
          'Date normalization (DD/MM/YYYY, YYYY-MM-DD, Month Names)',
          'Identity & vehicle number recognition',
          'Issuing authority pattern classification',
          'Full-text transcript retention'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processOCR,
  getTemplates,
  getStatus
};
