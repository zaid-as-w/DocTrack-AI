const ClassificationService = require('./ClassificationService');

/**
 * MockClassificationService
 * Returns predictable classifications for fast development and testing.
 */
class MockClassificationService extends ClassificationService {
  async classify(text = '', metadata = {}) {
    const normalized = `${text} ${metadata.filename || ''}`.toLowerCase();

    if (normalized.includes('passport')) {
      return {
        category: 'Identity',
        subCategory: 'Passport',
        confidence: 0.98,
        tags: ['travel', 'government-id', 'passport']
      };
    }

    if (normalized.includes('driving') || normalized.includes('license') || normalized.includes('dl')) {
      return {
        category: 'Identity',
        subCategory: 'Driving License',
        confidence: 0.95,
        tags: ['vehicle', 'government-id', 'license']
      };
    }

    if (normalized.includes('insurance') || normalized.includes('policy')) {
      return {
        category: 'Insurance',
        subCategory: 'Policy',
        confidence: 0.92,
        tags: ['financial', 'protection', 'insurance']
      };
    }

    if (normalized.includes('warranty') || normalized.includes('invoice')) {
      return {
        category: 'Product',
        subCategory: 'Warranty',
        confidence: 0.90,
        tags: ['appliance', 'purchase', 'warranty']
      };
    }

    return {
      category: 'General',
      subCategory: 'Document',
      confidence: 0.75,
      tags: ['uncategorized']
    };
  }
}

module.exports = MockClassificationService;
