const OCRService = require('./OCRService');

/**
 * MockOCRService
 * Returns realistic extracted text for instant offline prototyping and tests.
 */
class MockOCRService extends OCRService {
  async extractText(filePath) {
    // Return realistic document extraction payload instantly
    return {
      success: true,
      provider: 'MockOCRService',
      filePath,
      text: [
        'REPUBLIC OF INDIA / PASSPORT',
        'Type: P  Country Code: IND  Passport No: Z9182736',
        'Surname: SHARMA',
        'Given Names: RAHUL',
        'Nationality: INDIAN  Sex: M',
        'Date of Birth: 15/08/1992',
        'Place of Birth: MUMBAI',
        'Date of Issue: 10/01/2021',
        'Date of Expiry: 09/01/2031',
        'P<INDSHARMA<<RAHUL<<<<<<<<<<<<<<<<<<<<<<<<<<',
        'Z9182736<4IND9208153M3101095<<<<<<<<<<<<<<<02'
      ].join('\n'),
      confidence: 0.96,
      extractedFields: {
        documentType: 'Passport',
        documentNumber: 'Z9182736',
        holderName: 'Rahul Sharma',
        issueDate: '2021-01-10',
        expiryDate: '2031-01-09'
      }
    };
  }
}

module.exports = MockOCRService;
