/**
 * Abstract Base Class: OCRService
 * Defines the contract for all OCR service implementations (Mock, Tesseract, etc.)
 */
class OCRService {
  /**
   * Extract text and metadata from a document file
   * @param {string} filePath - Absolute path to the file on disk
   * @returns {Promise<{ text: string, confidence: number, rawLines: string[] }>}
   */
  async extractText(filePath) { // eslint-disable-line no-unused-vars
    throw new Error('Method extractText() must be implemented by subclass');
  }
}

module.exports = OCRService;
