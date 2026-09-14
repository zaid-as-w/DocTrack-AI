/**
 * Abstract Base Class: ClassificationService
 * Defines the contract for categorizing documents from extracted text or metadata.
 */
class ClassificationService {
  /**
   * Classifies a document based on text content and optional metadata
   * @param {string} text - Extracted OCR text or document description
   * @param {object} [metadata] - Optional filename or user hints
   * @returns {Promise<{ category: string, confidence: number, tags: string[] }>}
   */
  async classify(text, metadata = {}) { // eslint-disable-line no-unused-vars
    throw new Error('Method classify() must be implemented by subclass');
  }
}

module.exports = ClassificationService;
