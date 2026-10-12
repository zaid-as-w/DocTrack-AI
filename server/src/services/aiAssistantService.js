/**
 * AI Assistant Service
 * Natural Language Query Engine grounded in authenticated user documents,
 * warranties, compliance horizons, and verified statutory renewal procedures.
 */

const mongoose = require('mongoose');
const Document = require('../models/Document');
const Warranty = require('../models/Warranty');
const ChatMessage = require('../models/ChatMessage');
const { isDbConnected } = require('../config/db');
const { evaluateDocument } = require('./expiryEngine');
const { calculateWarrantyStatus } = require('./warrantyStore');
const { getDocuments } = require('./documentStore');
const { getWarranties } = require('./warrantyStore');
const { RENEWAL_KNOWLEDGE_BASE, matchBlueprint } = require('./renewalService');
const geminiService = require('./gemini.service');

// In-memory conversation store for offline fallback: userId -> Array of messages
const memoryChatStore = new Map();

/**
 * Fetch all documents for a user, prioritizing live MongoDB records when connected
 */
async function getUserDocuments(userId) {
  if (isDbConnected()) {
    try {
      const docs = await Document.find({ userId }).sort({ updatedAt: -1 }).lean();
      if (docs && docs.length > 0) {
        return docs.map(d => {
          const evalResult = evaluateDocument({ expiryDate: d.expiryDate });
          return {
            id: d._id ? d._id.toString() : d.id,
            _id: d._id ? d._id.toString() : d.id,
            ...d,
            status: d.status || evalResult.status,
            daysLeft: typeof d.daysLeft === 'number' ? d.daysLeft : evalResult.daysLeft
          };
        });
      }
    } catch (err) {
      console.warn('[AI Assistant] MongoDB document retrieval fallback:', err.message);
    }
  }

  // Fallback to local store
  return getDocuments(userId);
}

/**
 * Fetch all warranties for a user, prioritizing live MongoDB records when connected
 */
async function getUserWarranties(userId) {
  if (isDbConnected()) {
    try {
      const warranties = await Warranty.find({ userId }).sort({ updatedAt: -1 }).lean();
      if (warranties && warranties.length > 0) {
        return warranties.map(w => {
          const { status, daysRemaining } = calculateWarrantyStatus(w.expiryDate);
          return {
            id: w._id ? w._id.toString() : w.id,
            _id: w._id ? w._id.toString() : w.id,
            ...w,
            status: w.status || status,
            daysRemaining: typeof w.daysRemaining === 'number' ? w.daysRemaining : daysRemaining
          };
        });
      }
    } catch (err) {
      console.warn('[AI Assistant] MongoDB warranty retrieval fallback:', err.message);
    }
  }

  // Fallback to local store
  return getWarranties(userId, {});
}

/**
 * Generate contextual prompt suggestions tailored to the user's actual document state
 */
async function getContextualSuggestions(userId) {
  const userDocs = await getUserDocuments(userId);
  const warranties = await getUserWarranties(userId);

  const suggestions = [];

  const expiringSoonDoc = userDocs.find(d => d.status === 'EXPIRING_SOON');
  const expiredDoc = userDocs.find(d => d.status === 'EXPIRED');
  const expiringWarranty = warranties.find(w => w.status === 'EXPIRING_SOON');

  if (expiringSoonDoc) {
    suggestions.push(`When does my ${expiringSoonDoc.title} expire?`);
    suggestions.push(`How do I renew my ${expiringSoonDoc.title}?`);
  }

  if (expiredDoc) {
    suggestions.push(`Show my expired documents`);
    suggestions.push(`What documents do I need to renew my ${expiredDoc.title}?`);
  }

  if (expiringWarranty) {
    suggestions.push(`Which warranty expires next?`);
  }

  if (userDocs.length > 0 && suggestions.length < 3) {
    suggestions.push(`How many documents do I have in my vault?`);
    const anyDoc = userDocs[0];
    suggestions.push(`Show details for ${anyDoc.title}`);
  }

  if (suggestions.length === 0) {
    suggestions.push('How do I upload and OCR a new document?');
    suggestions.push('What documents do I need to renew my passport?');
    suggestions.push('What are the driving licence renewal steps?');
    suggestions.push('How many documents do I have?');
  }

  return suggestions.slice(0, 5);
}

/**
 * Get chat conversation history for an authenticated user
 */
async function getChatHistory(userId, userName = '') {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const messages = await ChatMessage.find({ userId }).sort({ createdAt: 1 }).lean();
      if (messages && messages.length > 0) {
        return messages;
      }
    } catch (err) {
      // Mongo offline fallback
    }
  }

  // Fallback to in-memory store or starter welcome
  if (!memoryChatStore.has(userId)) {
    const displayName = userName ? userName.trim() : (userId === 'demo-user-zaid-001' ? 'Zaid' : '');
    const greetingName = displayName ? ` ${displayName}` : '';
    const starterGreeting = `Hello${greetingName}! I am your DocTrack AI Assistant, powered by Google Gemini. I have indexed your secure vault documents, warranties, and compliance dates. Ask me anything about your documents, expirations, renewal requirements, or warranty coverage.`;

    const starterSuggestions = await getContextualSuggestions(userId);

    const starter = [
      {
        id: 'msg-welcome-01',
        userId,
        role: 'assistant',
        content: starterGreeting,
        reply: starterGreeting,
        intent: 'welcome',
        suggestedActions: starterSuggestions.length > 0 ? starterSuggestions : [
          'How many documents do I have?',
          'Which documents are expiring soon?',
          'What documents do I need to renew my passport?',
          'How do I upload a new document?'
        ],
        createdAt: new Date().toISOString()
      }
    ];
    memoryChatStore.set(userId, starter);
  }

  return memoryChatStore.get(userId) || [];
}

/**
 * Clear chat history for an authenticated user
 */
async function clearChatHistory(userId) {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      await ChatMessage.deleteMany({ userId });
    } catch (err) {
      // Mongo offline fallback
    }
  }

  memoryChatStore.set(userId, []);
  return { success: true, message: 'Chat history cleared' };
}

/**
 * Core natural language understanding & response generator
 * Analyzes query against user-scoped documents and warranties
 */
async function processUserMessage(userId, userPrompt = '', userName = '') {
  const query = userPrompt.trim();
  const lower = query.toLowerCase();

  const userDocs = await getUserDocuments(userId);
  const warranties = await getUserWarranties(userId);

  let reply = '';
  let intent = 'general_query';
  let suggestedActions = [];
  let relatedDocuments = [];
  let renewalGuide = null;

  // 1. PRIMARY: Attempt Google Gemini AI real-time response
  if (geminiService.isConfigured()) {
    try {
      const history = await getChatHistory(userId, userName);
      const geminiAnswer = await geminiService.chatWithGemini({
        query,
        contextDocs: userDocs,
        contextWarranties: warranties,
        conversationHistory: history,
        userName
      });

      if (geminiAnswer && geminiAnswer.trim()) {
        reply = geminiAnswer.trim();
        intent = 'gemini_llm_response';
        suggestedActions = await getContextualSuggestions(userId);

        // Find any mentioned documents to attach as related
        relatedDocuments = userDocs.filter(d => {
          const t = (d.title || '').toLowerCase();
          const num = (d.docNumber || '').toLowerCase();
          const h = (d.holderName || '').toLowerCase();
          return (
            (t && (query.toLowerCase().includes(t) || reply.toLowerCase().includes(t))) ||
            (num && num.length > 3 && (query.toLowerCase().includes(num) || reply.toLowerCase().includes(num))) ||
            (h && h.length > 3 && query.toLowerCase().includes(h))
          );
        }).map(d => ({
          id: d.id,
          title: d.title,
          docNumber: d.docNumber,
          category: d.category,
          status: d.status,
          daysLeft: d.daysLeft,
          expiryDate: d.expiryDate
        }));
      }
    } catch (err) {
      console.warn('[Gemini Assistant Warning] Falling back to local vault engine:', err.message);
    }
  }

  // 2. FALLBACK: Smart deterministic vault responses if Gemini was unconfigured or timed out
  if (!reply) {
    // 2a. VAULT SUMMARY & COUNT QUERY
    if (lower.includes('how many') || lower.includes('count') || lower.includes('summary') || lower.includes('summarize') || lower.includes('total') || lower.includes('what documents do i have') || lower.includes('my documents')) {
      intent = 'query_vault_summary';
      const activeDocs = userDocs.filter(d => d.status === 'ACTIVE');
      const expiringDocs = userDocs.filter(d => d.status === 'EXPIRING_SOON');
      const expiredDocs = userDocs.filter(d => d.status === 'EXPIRED');

      if (userDocs.length === 0) {
        reply = `You currently have **0 documents** and **${warranties.length} warranties** in your DocTrack vault.\n\n` +
          `To begin tracking your documents and receiving automated expiration alerts, click **"+ Upload Document"** on the Documents page. We support PDF, PNG, JPG, and WEBP formats!`;
      } else {
        reply = `You currently have **${userDocs.length} total document(s)** and **${warranties.length} warranty asset(s)** in your secure vault:\n\n` +
          `• **Active & Valid (${activeDocs.length}):** ${activeDocs.map(d => d.title).join(', ') || 'None'}\n` +
          `• **Expiring Soon (${expiringDocs.length}):** ${expiringDocs.map(d => `${d.title} (${d.daysLeft}d left)`).join(', ') || 'None'}\n` +
          `• **Expired (${expiredDocs.length}):** ${expiredDocs.map(d => d.title).join(', ') || 'None'}\n\n` +
          `Ask me about any specific document to check its details or view its step-by-step renewal guide.`;
      }
      suggestedActions = await getContextualSuggestions(userId);
    }

    // 2b. EXPIRED DOCUMENTS QUERY
    else if (lower.includes('expired')) {
      intent = 'query_expired_documents';
      const expired = userDocs.filter(d => d.status === 'EXPIRED');
      if (expired.length > 0) {
        reply = `You have **${expired.length} expired document(s)** that require renewal:\n\n` +
          expired.map(d => `• **${d.title}** (Doc #: ${d.docNumber || 'N/A'}, Expired on: ${d.expiryDate})`).join('\n') +
          `\n\nWould you like step-by-step renewal instructions for any of these documents?`;
        suggestedActions = expired.map(d => `How to renew ${d.title}`).slice(0, 3);
        relatedDocuments = expired.map(d => ({
          id: d.id,
          title: d.title,
          docNumber: d.docNumber,
          category: d.category,
          status: d.status,
          daysLeft: d.daysLeft,
          expiryDate: d.expiryDate
        }));
      } else {
        reply = `Great news! You have **no expired documents** in your vault right now. All your recorded documents are in good standing.`;
        suggestedActions = ['Which documents are expiring soon?', 'How many documents do I have?'];
      }
    }

    // 2c. EXPIRING SOON QUERY
    else if (lower.includes('expiring') || lower.includes('expire soon') || lower.includes('upcoming')) {
      intent = 'query_expiring_soon';
      const expiring = userDocs.filter(d => d.status === 'EXPIRING_SOON');
      if (expiring.length > 0) {
        reply = `You have **${expiring.length} document(s) expiring within the next 30 days**:\n\n` +
          expiring.map(d => `• **${d.title}** (Doc #: ${d.docNumber || 'N/A'}, Expires on: ${d.expiryDate} - **${d.daysLeft} days remaining**)`).join('\n') +
          `\n\nWe recommend starting the renewal process soon to avoid statutory penalties or service lapses.`;
        suggestedActions = expiring.map(d => `How to renew ${d.title}`).slice(0, 3);
        relatedDocuments = expiring.map(d => ({
          id: d.id,
          title: d.title,
          docNumber: d.docNumber,
          category: d.category,
          status: d.status,
          daysLeft: d.daysLeft,
          expiryDate: d.expiryDate
        }));
      } else {
        reply = `You have **no documents expiring in the next 30 days**. All tracked documents are safely outside the immediate expiration window.`;
        suggestedActions = ['How many documents do I have?', 'Which warranty expires next?'];
      }
    }

    // 2d. RENEWAL PROCEDURES QUERY
    else if (lower.includes('renew') || lower.includes('renewal') || lower.includes('how to renew') || lower.includes('steps to renew') || lower.includes('checklist')) {
      intent = 'query_renewal_guide';
      // Match against user documents first
      const matchedDoc = userDocs.find(d => {
        const t = (d.title || '').toLowerCase();
        return t && lower.includes(t.split(' ')[0].toLowerCase());
      }) || (userDocs.length > 0 ? userDocs[0] : null);

      const blueprint = matchBlueprint(matchedDoc || { title: query });
      renewalGuide = blueprint;

      reply = `### ${blueprint.title}\n\n` +
        (matchedDoc ? `For your **${matchedDoc.title}** (Doc #: **${matchedDoc.docNumber || 'N/A'}**, Status: **${matchedDoc.status}**):\n\n` : '') +
        `**Prerequisite Documents Required:**\n` +
        blueprint.requiredDocuments.map(d => `• ${d}`).join('\n') + `\n\n` +
        `**Statutory Fee:** ${blueprint.officialFee}\n` +
        `**Official Portal:** [${blueprint.portalName}](${blueprint.portalUrl})\n` +
        `**Grace Period:** ${blueprint.gracePeriod}\n\n` +
        `**Step-by-Step Procedure:**\n` +
        blueprint.steps.map(s => `${s.id}. ${s.text}`).join('\n');

      suggestedActions = ['Open Renewal Assistant', 'Show my expired documents', 'How many documents do I have?'];
      if (matchedDoc) {
        relatedDocuments = [{
          id: matchedDoc.id,
          title: matchedDoc.title,
          docNumber: matchedDoc.docNumber,
          category: matchedDoc.category,
          status: matchedDoc.status,
          daysLeft: matchedDoc.daysLeft,
          expiryDate: matchedDoc.expiryDate
        }];
      }
    }

    // 2e. WARRANTY QUERIES
    else if (lower.includes('warranty') || lower.includes('warranties')) {
      intent = 'query_warranties';
      if (warranties.length > 0) {
        reply = `You have **${warranties.length} registered warranty item(s)** in your vault:\n\n` +
          warranties.map(w => `• **${w.productName}** (${w.brand || 'Brand'}): Status **${w.status}**, Valid till ${w.expiryDate} (${w.daysRemaining} days left)`).join('\n');
        suggestedActions = ['Which warranty expires next?', 'How many documents do I have?'];
      } else {
        reply = `You currently have **no warranty assets** registered. You can add invoices and warranties via the Warranties tab to monitor product coverage and claim portals.`;
        suggestedActions = ['How many documents do I have?', 'Upload a document'];
      }
    }

    // 2f. HELP & FEATURE GUIDANCE
    else if (lower.includes('upload') || lower.includes('ocr') || lower.includes('how to') || lower.includes('help')) {
      intent = 'help_system_features';
      reply = `### How to use DocTrack AI:\n\n` +
        `1. **Upload Documents:** Go to Documents -> click "+ Upload Document". Supported formats include PDF, PNG, JPG, and WEBP.\n` +
        `2. **Automated Multimodal OCR:** Google Gemini Vision AI automatically parses document numbers, holder names, issue dates, and expiration dates.\n` +
        `3. **Expiry Radar & Reminders:** Multi-channel notifications (Email, SMS, In-App) alert you at 90d, 30d, 7d, and 1d thresholds.\n` +
        `4. **Doc Renewal Assistant:** Interactive roadmaps, verified checklists, and official government portal links for seamless renewals.\n` +
        `5. **AI Chatbot:** Real-time answers grounded in your actual uploaded documents and manufacturer warranties.`;

      suggestedActions = await getContextualSuggestions(userId);
    }

    // 2g. DEFAULT CONVERSATIONAL GREETING / FALLBACK
    else {
      intent = 'conversational_general';
      const displayName = userName ? ` ${userName}` : '';
      reply = `Hello${displayName}! I am your **DocTrack AI Assistant**.\n\n` +
        (userDocs.length > 0
          ? `I currently have **${userDocs.length} document(s)** and **${warranties.length} warranty record(s)** indexed in your personal vault. Ask me anything about your documents, upcoming expiration dates, or official renewal steps.`
          : `I am ready to help you track your documents, calculate expiration dates, and guide you through official renewals. You can upload documents anytime to get started!`);

      suggestedActions = await getContextualSuggestions(userId);
    }
  }

  // Persist User Message & Assistant Response
  const userMsgObj = {
    id: `msg-user-${Date.now()}`,
    userId,
    role: 'user',
    content: query,
    createdAt: new Date().toISOString()
  };

  const assistantMsgObj = {
    id: `msg-bot-${Date.now() + 1}`,
    userId,
    role: 'assistant',
    content: reply,
    reply,
    intent,
    suggestedActions,
    relatedDocuments,
    renewalGuide,
    createdAt: new Date(Date.now() + 10).toISOString()
  };

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      await ChatMessage.create(userMsgObj);
      await ChatMessage.create(assistantMsgObj);
    } catch (err) {
      // Mongo offline fallback
    }
  }

  const existing = memoryChatStore.get(userId) || [];
  existing.push(userMsgObj);
  existing.push(assistantMsgObj);
  memoryChatStore.set(userId, existing);

  return assistantMsgObj;
}

module.exports = {
  getUserDocuments,
  getUserWarranties,
  getContextualSuggestions,
  getChatHistory,
  clearChatHistory,
  processUserMessage
};
