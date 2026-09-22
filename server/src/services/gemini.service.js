/**
 * Production-Ready Google Gemini AI Service Layer
 * 
 * Secure backend-only integration with Gemini LLM.
 * Supports:
 *  - Multimodal Document Vision OCR (Directly extracts text, dates, and metadata from images/PDFs)
 *  - Intelligent Document Classification
 *  - OCR Metadata & Field Extraction
 *  - Contextual Document Chatbot
 *  - Renewal Assistant Guidance
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const config = require('../config/env');

let aiClient = null;

const isGeminiConfigured = Boolean(config.geminiApiKey && config.geminiApiKey.trim());

if (isGeminiConfigured) {
  try {
    aiClient = new GoogleGenAI({ apiKey: config.geminiApiKey.trim() });
  } catch (err) {
    console.warn('[Gemini AI Init Warning] Could not initialize GoogleGenAI client:', err.message);
    aiClient = null;
  }
}

const defaultModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const fallbackModels = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];

/**
 * Helper to call Gemini model with prompt and safety timeout, with automatic model fallback on 503
 */
async function generateGeminiText(prompt, model = defaultModel, timeoutMs = 25000) {
  if (!aiClient) return null;

  const modelsToTry = [model, ...fallbackModels.filter(m => m !== model)];

  for (const targetModel of modelsToTry) {
    try {
      const callPromise = aiClient.models.generateContent({
        model: targetModel,
        contents: prompt
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API call timed out')), timeoutMs)
      );

      const response = await Promise.race([callPromise, timeoutPromise]);
      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn(`[Gemini API Warning on ${targetModel}]`, err.message);
      // If 503 or model error, loop continues to try next available model
    }
  }

  return null;
}

/**
 * Multimodal Document Vision OCR & Extraction
 * Passes the actual file buffer (JPEG, PNG, WebP, PDF) to Gemini Vision.
 */
async function analyzeDocumentFileWithGemini(filePathOrBuffer, mimeType = 'image/jpeg', fileName = 'document', timeoutMs = 25000) {
  if (!aiClient) return null;

  let buffer = null;
  let detectedMime = mimeType;

  try {
    if (typeof filePathOrBuffer === 'string') {
      if (!fs.existsSync(filePathOrBuffer)) return null;
      buffer = fs.readFileSync(filePathOrBuffer);
      const ext = path.extname(filePathOrBuffer).toLowerCase();
      if (ext === '.pdf') return null; // PDF inlineData is not supported in direct generateContent
      if (ext === '.png') detectedMime = 'image/png';
      else if (ext === '.webp') detectedMime = 'image/webp';
      else detectedMime = 'image/jpeg';
    } else if (Buffer.isBuffer(filePathOrBuffer)) {
      buffer = filePathOrBuffer;
    }

    if (!buffer || buffer.length === 0) return null;

    const base64Data = buffer.toString('base64');
    const todayStr = new Date().toISOString().split('T')[0];

    const prompt = `
You are DocTrack AI's high-precision document OCR and classification engine.
Analyze this document image/file. Perform comprehensive OCR and extract all compliance metadata.
Today's Date: ${todayStr}
Original File Name: ${fileName}

Instructions:
1. Extract ALL visible text as "rawText".
2. Identify the document type and classify into one of the official DocTrack categories:
   - "Identity Proofs" (categoryId: "identity") -> Passport, Aadhaar, PAN Card, Voter ID, National ID
   - "Vehicle Records" (categoryId: "vehicle") -> Driving License, RC Book, PUC Emission Certificate, Vehicle Permit
   - "Insurance Papers" (categoryId: "insurance") -> Car/Bike Insurance, Health Insurance, Life Insurance, Term Policy
   - "Warranty Bills" (categoryId: "warranty") -> Appliance/Gadget Invoices, Retail Bills with Warranty
   - "Education and Academic" (categoryId: "education") -> Degree Certificate, Marksheet, Diploma, School Passing
   - "Financial and Banking" (categoryId: "financial") -> Bank Statements, Fixed Deposits, Credit Card, Tax Forms
   - "Healthcare and Medical" (categoryId: "healthcare") -> Prescriptions, Medical Reports, Vaccine Records
   - "Employment and Career" (categoryId: "employment") -> Offer Letters, Pay Slips, Experience Letters
   - "Property and Real Estate" (categoryId: "property") -> Title Deeds, Rental Agreements, Tax Receipts
   - "Other Documents" (categoryId: "other")
3. Extract exact dates in YYYY-MM-DD format:
   - "issueDate": When the document was issued / registered / started.
   - "expiryDate": When the document expires / valid till / period to. (If permanently valid like Aadhaar/Degree/Diploma/Marksheet, set to "Perpetual").
   - "dateOfBirth": Holder's birth date in YYYY-MM-DD if present.
4. Extract identifiers:
   - "docNumber": Passport No, License No, Policy No, Registration No, Certificate No, etc.
   - "holderName": Full legal name of the document owner.
   - "issuingAuthority": Official department or company name that issued it.
   - "placeOfIssue": City/State/Country where issued if present.
5. Determine expiration status:
   - If expiryDate is in the past (before ${todayStr}): status MUST be "EXPIRED"
   - If expiryDate is within next 30 days: status MUST be "EXPIRING_SOON"
   - If expiryDate is in the future (> 30 days) or "Perpetual": status MUST be "ACTIVE"

Respond ONLY with a valid JSON object (no markdown formatting, no backticks):
{
  "rawText": "full OCR text transcription",
  "title": "Concise Official Title (e.g. Indian Passport, Driving License, Vehicle Insurance)",
  "category": "Official Category Name",
  "categoryId": "identity|vehicle|insurance|warranty|education|financial|healthcare|employment|property|other",
  "documentType": "Specific document type name",
  "docNumber": "string or empty",
  "holderName": "string or empty",
  "dateOfBirth": "YYYY-MM-DD or empty",
  "issueDate": "YYYY-MM-DD or empty",
  "expiryDate": "YYYY-MM-DD, Perpetual, or empty",
  "issuingAuthority": "string or empty",
  "placeOfIssue": "string or empty",
  "status": "EXPIRED|EXPIRING_SOON|ACTIVE",
  "confidence": 0.98
}
`.trim();

    for (const targetModel of fallbackModels) {
      try {
        const callPromise = aiClient.models.generateContent({
          model: targetModel,
          contents: [
            {
              inlineData: {
                mimeType: detectedMime,
                data: base64Data
              }
            },
            prompt
          ]
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini Vision API timed out')), timeoutMs)
        );

        const response = await Promise.race([callPromise, timeoutPromise]);
        if (!response || !response.text) continue;

        const cleaned = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed && (parsed.rawText || parsed.title)) {
          return {
            ...parsed,
            source: 'GEMINI_VISION_AI'
          };
        }
      } catch (modelErr) {
        console.warn(`[Gemini Vision Notice on ${targetModel}]`, modelErr.message);
      }
    }
  } catch (err) {
    console.warn('[Gemini Vision Extraction Warning]', err.message);
  }

  return null;
}

/**
 * Classify document using Gemini text analysis
 */
async function classifyWithGemini(text, metadata = {}) {
  if (!isGeminiConfigured || !text) {
    return null;
  }

  const prompt = `
You are DocTrack AI's document classification engine.
Classify the following document content into one of the 9 official DocTrack categories:
1. "Identity Proofs" (identity)
2. "Vehicle Records" (vehicle)
3. "Insurance Papers" (insurance)
4. "Warranty Bills" (warranty)
5. "Education and Academic" (education)
6. "Financial and Banking" (financial)
7. "Healthcare and Medical" (healthcare)
8. "Employment and Career" (employment)
9. "Property and Real Estate" (property)

Document Title: ${metadata.title || 'Untitled'}
File Name: ${metadata.fileName || 'Unknown'}
Extracted Content:
"""
${text.slice(0, 2000)}
"""

Respond with ONLY valid JSON adhering to this exact schema (no markdown, no backticks):
{
  "category": "Official category name",
  "categoryId": "identity|vehicle|insurance|warranty|education|financial|healthcare|employment|property",
  "subCategory": "Specific document type name",
  "confidence": 0.96,
  "sensitivity": "HIGH|MEDIUM|LOW|STANDARD",
  "suggestedTags": ["tag1", "tag2"]
}
`.trim();

  try {
    const rawOutput = await generateGeminiText(prompt);
    if (!rawOutput) return null;

    const cleaned = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed && parsed.category && parsed.categoryId) {
      return {
        ...parsed,
        source: 'GEMINI_AI',
        classifiedAt: new Date().toISOString()
      };
    }
  } catch (err) {
    console.warn('[Gemini Classification Parse Fallback]', err.message);
  }

  return null;
}

/**
 * Extract structured metadata from OCR text using Gemini
 */
async function extractMetadataWithGemini(ocrText, docType = '') {
  if (!isGeminiConfigured || !ocrText) {
    return null;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const prompt = `
Analyze the following OCR document text and extract all metadata fields with high date accuracy.
Today's Date: ${todayStr}
Document Type Hint: ${docType || 'Official Record'}

OCR Text:
"""
${ocrText.slice(0, 3000)}
"""

Instructions:
1. Extract exact issueDate in YYYY-MM-DD.
2. Extract exact expiryDate in YYYY-MM-DD (or "Perpetual" if permanently valid). Even if the expiry date is in the past (e.g. 2019, 2021, 2023), EXTRACT IT ACCURATELY. Do not ignore past dates.
3. Extract docNumber, holderName, dateOfBirth, issuingAuthority, placeOfIssue, clean title.
4. Classify category into "Identity Proofs", "Vehicle Records", "Insurance Papers", "Warranty Bills", "Education and Academic", "Financial and Banking", "Healthcare and Medical", "Employment and Career", "Property and Real Estate".
5. Status:
   - If expiryDate < ${todayStr}: "EXPIRED"
   - If expiryDate within 30 days: "EXPIRING_SOON"
   - Otherwise: "ACTIVE"

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "title": "Clean concise title",
  "category": "category name",
  "categoryId": "category id",
  "documentType": "type name",
  "docNumber": "string or empty",
  "holderName": "string or empty",
  "dateOfBirth": "YYYY-MM-DD or empty",
  "issueDate": "YYYY-MM-DD or empty",
  "expiryDate": "YYYY-MM-DD, Perpetual, or empty",
  "issuingAuthority": "string or empty",
  "placeOfIssue": "string or empty",
  "status": "EXPIRED|EXPIRING_SOON|ACTIVE",
  "confidence": 0.95
}
`.trim();

  try {
    const rawOutput = await generateGeminiText(prompt);
    if (!rawOutput) return null;

    const cleaned = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('[Gemini Metadata Parse Fallback]', err.message);
    return null;
  }
}

/**
 * Conversational Chatbot query answering with Gemini
 */
async function chatWithGemini({ query, contextDocs = [], contextWarranties = [], conversationHistory = [] }) {
  if (!isGeminiConfigured || !query) {
    return null;
  }

  const docSummaries = contextDocs.map(d =>
    `- [Doc] ${d.title} (${d.category}) | Doc#: ${d.docNumber || 'N/A'} | Expiry: ${d.expiryDate || 'N/A'} | Status: ${d.status} | Days Left: ${d.daysLeft}`
  ).join('\n');

  const warrantySummaries = contextWarranties.map(w =>
    `- [Warranty] ${w.productName} (${w.brand || ''}) | Expiry: ${w.expiryDate} | Status: ${w.status} | Coverage: ${w.coverageType || 'Standard'}`
  ).join('\n');

  const historySummaries = conversationHistory.slice(-4).map(m =>
    `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`
  ).join('\n');

  const prompt = `
You are DocTrack AI Assistant, an expert document compliance, expiration tracking, and warranty renewal advisor.
User Question: "${query}"

User Documents:
${docSummaries || 'No documents currently indexed.'}

User Warranties:
${warrantySummaries || 'No warranties currently registered.'}

Recent Conversation:
${historySummaries || 'New conversation'}

Provide a helpful, accurate, concise, and professional answer. Ground your response in their indexed documents and renewal policies.
`.trim();

  try {
    const answer = await generateGeminiText(prompt, defaultModel, 25000);
    return answer;
  } catch (err) {
    console.warn('[Gemini Chat Fallback]', err.message);
    return null;
  }
}

module.exports = {
  isConfigured: () => isGeminiConfigured,
  analyzeDocumentFileWithGemini,
  classifyWithGemini,
  extractMetadataWithGemini,
  chatWithGemini
};
