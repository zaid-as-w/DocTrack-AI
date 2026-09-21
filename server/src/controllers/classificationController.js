const { classificationService } = require('../services/classification');
const geminiService = require('../services/gemini.service');

/**
 * Classify a document based on text, title, or filename
 * POST /api/classification/classify
 */
const classifyDocument = async (req, res, next) => {
  try {
    const { text = '', fileName = '', title = '', ocrFields = {} } = req.body;

    if (!text && !fileName && !title) {
      return res.status(400).json({
        success: false,
        message: 'Either text, fileName, or title is required for classification.'
      });
    }

    let result = null;
    if (geminiService.isConfigured() && text) {
      try {
        result = await geminiService.classifyWithGemini(text, { fileName, title, ocrFields });
      } catch (err) {
        console.warn('[Gemini Classification Notice] Falling back to rule engine:', err.message);
      }
    }

    if (!result) {
      result = await classificationService.classify(text, { fileName, title, ocrFields });
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all 9 official document categories with taxonomy and subcategories
 * GET /api/classification/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = classificationService.getCategories();
    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch classify multiple document entries
 * POST /api/classification/batch
 */
const batchClassify = async (req, res, next) => {
  try {
    const { documents = [] } = req.body;

    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'documents array is required.'
      });
    }

    const results = await Promise.all(
      documents.map(async (doc) => {
        const classified = await classificationService.classify(
          doc.text || doc.ocrText || '',
          { fileName: doc.fileName, title: doc.title, ocrFields: doc.ocrFields }
        );
        return {
          id: doc.id,
          ...classified
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Classification engine health & taxonomy status
 * GET /api/classification/status
 */
const getStatus = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        status: 'ready',
        activeEngine: geminiService.isConfigured()
          ? 'Hybrid Gemini AI LLM + SmartClassification Taxonomy'
          : 'SmartClassificationService (NLP Heuristic + Multi-Tier Taxonomy)',
        geminiEnabled: geminiService.isConfigured(),
        categoriesSupported: 9,
        sensitivityLevels: ['HIGH', 'MEDIUM', 'LOW'],
        features: [
          'Automatic 9-category taxonomy routing',
          'PII / PHI / Government identity sensitivity analysis',
          'Profile recommendation (self, vehicle, family)',
          'Contextual tag extraction',
          'Confidence scoring with human-readable explainability'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  classifyDocument,
  getCategories,
  batchClassify,
  getStatus
};
