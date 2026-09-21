/**
 * Production-Ready Google Gemini AI Service Layer
 * 
 * Secure backend-only integration with Gemini LLM.
 * Supports:
 *  - Intelligent Document Classification
 *  - OCR Metadata & Field Extraction
 *  - Contextual Document Chatbot
 *  - Renewal Assistant Guidance
 * 
 * Gracefully falls back to deterministic rule-based / heuristic engine if GEMINI_API_KEY is not set or API fails.
 */

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

const defaultModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

/**
 * Helper to call Gemini model with prompt and safety timeout
 */
async function generateGeminiText(prompt, model = defaultModel, timeoutMs = 8000) {
  if (!aiClient) return null;

  try {
    const callPromise = aiClient.models.generateContent({
      model,
      contents: prompt
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out')), timeoutMs)
    );

    const response = await Promise.race([callPromise, timeoutPromise]);
    return response.text || null;
  } catch (err) {
    // If specific model fails, try standard gemini-1.5-flash if not already attempted
    if (model !== 'gemini-1.5-flash' && err.message && (err.message.includes('not found') || err.message.includes('404') || err.message.includes('no longer available'))) {
      try {
        const fallbackRes = await aiClient.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt
        });
        return fallbackRes.text || null;
      } catch (fallbackErr) {
        console.warn('[Gemini API Fallback Warning]', fallbackErr.message);
        return null;
      }
    }
    console.warn('[Gemini API Warning]', err.message);
    return null;
  }
}

/**
 * Classify document using Gemini
 * Extracts category, subcategory, confidence, sensitivity, and suggested tags.
 */
async function classifyWithGemini(text, metadata = {}) {
  if (!isGeminiConfigured || !text) {
    return null; // Signals controller to use rule-based SmartClassificationService
  }

  const prompt = `
You are DocTrack AI's document classification engine.
Classify the following document content into one of the 9 official DocTrack categories:
1. "Identity Proofs" (identity)
2. "Vehicle Records" (vehicle)
3. "Property & Real Estate" (property)
4. "Financial & Banking" (financial)
5. "Healthcare & Medical" (healthcare)
6. "Education & Academic" (education)
7. "Employment & Career" (employment)
8. "Legal & Statutory" (legal)
9. "Utility & Subscriptions" (utility)

Document Title: ${metadata.title || 'Untitled'}
File Name: ${metadata.fileName || 'Unknown'}
Extracted Content:
"""
${text.slice(0, 1500)}
"""

Respond with ONLY valid JSON adhering to this exact schema (no markdown formatting, no backticks):
{
  "category": "Official category name",
  "categoryId": "identity|vehicle|property|financial|healthcare|education|employment|legal|utility",
  "subCategory": "Specific document type name",
  "confidence": 0.95,
  "confidencePercentage": 95,
  "confidenceLevel": "HIGH",
  "sensitivity": "HIGH|MEDIUM|LOW|STANDARD",
  "sensitivityNotice": "Brief reason for sensitivity classification",
  "suggestedProfileType": "self|family|vehicle|employee",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "reasoning": "Brief explanation of classification"
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

  const prompt = `
Analyze the following OCR document text and extract key metadata fields.
Document Type Hint: ${docType || 'Official Record'}

OCR Text:
"""
${ocrText.slice(0, 2000)}
"""

Respond with ONLY valid JSON adhering to this schema (no markdown, no backticks):
{
  "docNumber": "string or empty",
  "issueDate": "YYYY-MM-DD or empty",
  "expiryDate": "YYYY-MM-DD, Perpetual, or empty",
  "issuingAuthority": "string or empty",
  "placeOfIssue": "string or empty",
  "title": "Clean concise document title",
  "confidence": 0.92
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
 * Answers user question grounded in their indexed documents and warranties
 */
async function chatWithGemini({ query, contextDocs = [], contextWarranties = [], conversationHistory = [] }) {
  if (!isGeminiConfigured || !query) {
    return null; // Fall back to local rule-based aiAssistantService
  }

  // Build compact document inventory context
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
You are the DocTrack AI Assistant, an expert document compliance, expiration tracking, and warranty renewal advisor.
The user is asking a question about their personal/family document vault.

User's Indexed Documents:
${docSummaries || 'No documents currently indexed.'}

User's Warranties:
${warrantySummaries || 'No warranties currently registered.'}

Recent Conversation:
${historySummaries || 'New conversation'}

User Question:
"${query}"

Instructions:
1. Provide a helpful, accurate, and concise answer directly addressing the user's question.
2. Ground your response in their actual documents, dates, and warranties whenever relevant.
3. If they ask about renewing a specific document (e.g. Passport, Driving License, PUC), provide actionable statutory renewal guidance (fees, portals, required forms, slot booking).
4. Tone should be professional, empathetic, and organized with bullet points where appropriate.
`.trim();

  try {
    const answer = await generateGeminiText(prompt, defaultModel, 10000);
    return answer;
  } catch (err) {
    console.warn('[Gemini Chat Fallback]', err.message);
    return null;
  }
}

module.exports = {
  isConfigured: () => isGeminiConfigured,
  classifyWithGemini,
  extractMetadataWithGemini,
  chatWithGemini
};
