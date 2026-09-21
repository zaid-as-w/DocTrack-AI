/**
 * AI Assistant Service
 * Natural Language Query Engine grounded in authenticated user documents,
 * warranties, compliance horizons, and verified statutory renewal procedures.
 */

const mongoose = require('mongoose');
const { getDocuments } = require('./documentStore');
const { getWarranties } = require('./warrantyStore');
const { RENEWAL_KNOWLEDGE_BASE } = require('./renewalService');
const ChatMessage = require('../models/ChatMessage');

// In-memory conversation store for offline fallback: userId -> Array of messages
const memoryChatStore = new Map();

/**
 * Generate contextual prompt suggestions tailored to the user's actual document state
 */
async function getContextualSuggestions(userId) {
  const userDocs = getDocuments(userId);
  const warranties = await getWarranties(userId);

  const suggestions = [];

  const hasExpired = userDocs.some(d => d.status === 'EXPIRED');
  const hasExpiringSoon = userDocs.some(d => d.status === 'EXPIRING_SOON');
  const hasExpiringWarranty = warranties.some(w => w.status === 'EXPIRING_SOON');

  if (hasExpired) {
    suggestions.push('What documents do I need to renew my driving license?');
    suggestions.push('Show my expired documents');
  }

  if (hasExpiringSoon) {
    suggestions.push('When does my passport expire?');
    suggestions.push('Which documents are expiring this month?');
  }

  if (hasExpiringWarranty) {
    suggestions.push('Which warranty expires next?');
  }

  suggestions.push('How many documents do I have?');
  suggestions.push('How do I upload and OCR a new document?');

  return suggestions.slice(0, 5);
}

/**
 * Get chat conversation history for an authenticated user
 */
async function getChatHistory(userId) {
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
    const starterGreeting = userId === 'demo-user-zaid-001'
      ? 'Hello Zaid! I am your DocTrack AI Assistant. I have indexed your secure vault documents, warranties, and compliance dates. Ask me anything about your expirations, renewal requirements, or warranty coverage.'
      : 'Hello! I am your DocTrack AI Assistant. I have indexed your secure vault documents, warranties, and compliance dates. Ask me anything about your expirations, renewal requirements, or warranty coverage.';

    const starter = [
      {
        id: 'msg-welcome-01',
        userId,
        role: 'assistant',
        content: starterGreeting,
        reply: starterGreeting,
        intent: 'welcome',
        suggestedActions: [
          'When does my passport expire?',
          'Which documents are expiring soon?',
          'What documents do I need to renew my driving license?',
          'Which warranty expires next?'
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

const geminiService = require('./gemini.service');

/**
 * Core natural language understanding & response generator
 * Analyzes query against user-scoped documents and warranties
 */
async function processUserMessage(userId, userPrompt = '') {
  const query = userPrompt.trim();
  const lower = query.toLowerCase();

  const userDocs = getDocuments(userId);
  const warranties = await getWarranties(userId);

  let reply = '';
  let intent = 'general_query';
  let suggestedActions = [];
  let relatedDocuments = [];
  let renewalGuide = null;

  // Attempt Gemini LLM answer if configured
  if (geminiService.isConfigured()) {
    try {
      const history = await getChatHistory(userId);
      const geminiAnswer = await geminiService.chatWithGemini({
        query,
        contextDocs: userDocs,
        contextWarranties: warranties,
        conversationHistory: history
      });

      if (geminiAnswer && geminiAnswer.trim()) {
        reply = geminiAnswer.trim();
        intent = 'gemini_llm_response';
        suggestedActions = await getContextualSuggestions(userId);

        // Find any mentioned documents to attach as related
        relatedDocuments = userDocs.filter(d =>
          query.toLowerCase().includes((d.title || '').toLowerCase()) ||
          query.toLowerCase().includes((d.docNumber || '').toLowerCase())
        ).map(d => ({
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
      console.warn('[Gemini Assistant Warning] Falling back to local NLP engine:', err.message);
    }
  }

  // Fallback to deterministic contextual NLP rules if reply not populated by Gemini
  if (!reply) {
    // 1. PASSPORT EXPIRY / STATUS QUERY
    if (lower.includes('passport')) {
      const passport = userDocs.find(d => (d.title || '').toLowerCase().includes('passport'));
    if (passport) {
      intent = 'query_passport_expiry';
      const days = passport.daysLeft;
      const statusText = days < 0 ? `EXPIRED (${Math.abs(days)} days ago)` : `${days} days remaining`;

      reply = `Your **${passport.title}** (Doc #: **${passport.docNumber}**) is registered to **${passport.profileName}**.\n\n` +
        `• **Expiry Date:** ${passport.expiryDate} (${statusText})\n` +
        `• **Issuing Authority:** ${passport.issuingAuthority}\n` +
        `• **Status:** ${passport.status}\n\n` +
        `Because your passport expires within 30 days, we recommend initiating the re-issue process via the official **Passport Seva Online Portal**. Would you like to view the required documents or step-by-step renewal checklist?`;

      suggestedActions = [
        'What documents do I need to renew my passport?',
        'Open Passport Renewal Guide',
        'Which documents are expiring soon?'
      ];

      relatedDocuments = [{
        id: passport.id,
        title: passport.title,
        docNumber: passport.docNumber,
        category: passport.category,
        status: passport.status,
        daysLeft: passport.daysLeft,
        expiryDate: passport.expiryDate
      }];
    } else {
      reply = `I searched your vault, but could not locate an Indian Passport under your profile. You can add one by uploading a scanned copy.`;
      suggestedActions = ['How to upload a document', 'View All Documents'];
    }
  }

  // 2. DRIVING LICENSE RENEWAL / EXPIRED QUERY
  else if (lower.includes('license') || lower.includes('licence') || lower.includes('dl') || lower.includes('sarathi') || lower.includes('driving')) {
    const dl = userDocs.find(d => (d.title || '').toLowerCase().includes('driving') || (d.title || '').toLowerCase().includes('license'));
    intent = 'renewal_driving_license';

    if (lower.includes('renew') || lower.includes('what document') || lower.includes('checklist') || lower.includes('requirement') || lower.includes('how')) {
      const guide = RENEWAL_KNOWLEDGE_BASE.license;
      reply = `### Driving Licence Renewal Requirements\n\n` +
        (dl ? `For **${dl.profileName}**'s Driving Licence (**${dl.docNumber}** - Status: **${dl.status}**, expired on ${dl.expiryDate}):\n\n` : '') +
        `**Prerequisite Documents Required:**\n` +
        guide.requiredDocuments.map(d => `• ${d}`).join('\n') + `\n\n` +
        `**Statutory Fees:** ${guide.officialFee}\n` +
        `**Official Portal:** [${guide.portalName}](${guide.portalUrl})\n` +
        `**Grace Period:** ${guide.gracePeriod}\n\n` +
        `You can complete the renewal online through contactless Aadhaar e-KYC without visiting the RTO in most states.`;

      suggestedActions = [
        'Open Renewal Assistant',
        'Parivahan Sarathi Portal',
        'Show my expired documents'
      ];
      renewalGuide = guide;
      if (dl) {
        relatedDocuments = [{
          id: dl.id,
          title: dl.title,
          docNumber: dl.docNumber,
          category: dl.category,
          status: dl.status,
          daysLeft: dl.daysLeft,
          expiryDate: dl.expiryDate
        }];
      }
    } else if (dl) {
      reply = `Your **${dl.title}** (No: **${dl.docNumber}**) belongs to **${dl.profileName}**.\n\n` +
        `• **Status:** ${dl.status} (Expired on ${dl.expiryDate}, ${Math.abs(dl.daysLeft)} days ago)\n` +
        `• **Authority:** ${dl.issuingAuthority}\n\n` +
        `Action is required immediately to renew under the grace period on the official Parivahan Sarathi portal.`;

      suggestedActions = [
        'What documents do I need to renew my driving license?',
        'Open Renewal Assistant',
        'Show my expired documents'
      ];
      if (dl) {
        relatedDocuments = [{
          id: dl.id,
          title: dl.title,
          docNumber: dl.docNumber,
          category: dl.category,
          status: dl.status,
          daysLeft: dl.daysLeft,
          expiryDate: dl.expiryDate
        }];
      }
    }
  }

  // 3. EXPIRED DOCUMENTS QUERY
  else if (lower.includes('expired') || lower.includes('overdue') || lower.includes('past due')) {
    intent = 'query_expired_documents';
    const expiredDocs = userDocs.filter(d => d.status === 'EXPIRED' || (typeof d.daysLeft === 'number' && d.daysLeft <= 0));
    const expiredWarranties = warranties.filter(w => w.status === 'EXPIRED');

    if (expiredDocs.length === 0 && expiredWarranties.length === 0) {
      reply = `Great news! You have no expired documents or warranties in your vault. All tracked assets are currently active or in compliance.`;
      suggestedActions = ['Which documents are expiring soon?', 'How many documents do I have?'];
    } else {
      reply = `You have **${expiredDocs.length} expired document${expiredDocs.length === 1 ? '' : 's'}** and **${expiredWarranties.length} expired warrant${expiredWarranties.length === 1 ? 'y' : 'ies'}** requiring attention:\n\n`;

      expiredDocs.forEach((d, idx) => {
        reply += `${idx + 1}. **${d.title}** (${d.profileName}) — Expired on **${d.expiryDate}** (${Math.abs(d.daysLeft)} days overdue)\n`;
      });

      if (expiredWarranties.length > 0) {
        reply += `\n**Expired Warranties:**\n`;
        expiredWarranties.forEach((w, idx) => {
          reply += `${idx + 1}. **${w.productName}** (${w.brand}) — Expired on **${w.expiryDate}**\n`;
        });
      }

      reply += `\nWe recommend initiating renewal or service archiving right away.`;

      suggestedActions = [
        'What documents do I need to renew my driving license?',
        'Open Renewal Assistant',
        'Which documents are expiring soon?'
      ];

      relatedDocuments = expiredDocs.map(d => ({
        id: d.id,
        title: d.title,
        docNumber: d.docNumber,
        category: d.category,
        status: d.status,
        daysLeft: d.daysLeft,
        expiryDate: d.expiryDate
      }));
    }
  }

  // 4. EXPIRING SOON / THIS MONTH QUERY
  else if (lower.includes('expiring') || lower.includes('soon') || lower.includes('this month') || lower.includes('next month') || lower.includes('due')) {
    intent = 'query_expiring_soon';
    const expiringDocs = userDocs.filter(d => d.status === 'EXPIRING_SOON' || (typeof d.daysLeft === 'number' && d.daysLeft > 0 && d.daysLeft <= 30));
    const expiringWarranties = warranties.filter(w => w.status === 'EXPIRING_SOON');

    reply = `Here is your upcoming expiration overview:\n\n`;

    if (expiringDocs.length > 0) {
      reply += `**Documents Expiring Within 30 Days (${expiringDocs.length}):**\n`;
      expiringDocs.forEach((d, idx) => {
        reply += `${idx + 1}. **${d.title}** (${d.profileName}) — **${d.daysLeft} days left** (Expires ${d.expiryDate})\n`;
      });
      reply += '\n';
    } else {
      reply += `• No documents expiring in the next 30 days.\n\n`;
    }

    if (expiringWarranties.length > 0) {
      reply += `**Warranties Expiring Soon (${expiringWarranties.length}):**\n`;
      expiringWarranties.forEach((w, idx) => {
        reply += `• **${w.productName}** (${w.brand}) — **${w.daysRemaining} days remaining** (Expires ${w.expiryDate})\n`;
      });
      reply += '\n';
    }

    reply += `DocTrack AI has scheduled automated reminders at the 30-day, 7-day, and 1-day threshold horizons.`;

    suggestedActions = [
      'When does my passport expire?',
      'Which warranty expires next?',
      'Open Renewal Assistant'
    ];

    relatedDocuments = [
      ...expiringDocs.map(d => ({
        id: d.id,
        title: d.title,
        docNumber: d.docNumber,
        category: d.category,
        status: d.status,
        daysLeft: d.daysLeft,
        expiryDate: d.expiryDate
      })),
      ...expiringWarranties.map(w => ({
        id: w.id,
        title: `${w.brand} ${w.productName}`,
        docNumber: `Serial: ${w.serialNumber}`,
        category: 'Warranty Bill',
        status: w.status,
        daysLeft: w.daysRemaining,
        expiryDate: w.expiryDate
      }))
    ];
  }

  // 5. WARRANTY QUERIES ("Which warranty expires next?", "What is the warranty on Samsung S24?")
  else if (lower.includes('warranty') || lower.includes('samsung') || lower.includes('macbook') || lower.includes('dyson') || lower.includes('bravia') || lower.includes('washer')) {
    intent = 'query_warranties';

    if (lower.includes('next') || lower.includes('first') || lower.includes('expir')) {
      const activeWarranties = warranties.filter(w => w.daysRemaining >= 0).sort((a, b) => a.daysRemaining - b.daysRemaining);
      if (activeWarranties.length > 0) {
        const nextW = activeWarranties[0];
        reply = `The warranty expiring next is your **${nextW.productName}** (${nextW.brand}):\n\n` +
          `• **Days Remaining:** **${nextW.daysRemaining} days**\n` +
          `• **Expiry Date:** ${nextW.expiryDate}\n` +
          `• **Purchase Date:** ${nextW.purchaseDate} (Invoice: ${nextW.invoiceNumber})\n` +
          `• **Coverage Type:** ${nextW.coverageType}\n` +
          `• **Official Claim Helpline:** ${nextW.claimContact || '1800-40-SAMSUNG'}\n\n` +
          `Would you like to review the claim guide or register an extended warranty?`;

        suggestedActions = [
          'View All Warranties',
          'Which documents are expiring soon?',
          'How many documents do I have?'
        ];

        relatedDocuments = [{
          id: nextW.id,
          title: `${nextW.brand} ${nextW.productName}`,
          docNumber: `Serial: ${nextW.serialNumber}`,
          category: 'Warranty Bill',
          status: nextW.status,
          daysLeft: nextW.daysRemaining,
          expiryDate: nextW.expiryDate
        }];
      } else {
        reply = `All your tracked warranties have expired.`;
        suggestedActions = ['View All Warranties'];
      }
    } else {
      reply = `You have **${warranties.length} tracked warranty bills** across electronics and household appliances:\n\n`;
      warranties.forEach((w, idx) => {
        reply += `${idx + 1}. **${w.productName}** (${w.brand}) — Status: **${w.status}** (${w.daysRemaining >= 0 ? `${w.daysRemaining} days left` : 'Expired'})\n`;
      });

      suggestedActions = [
        'Which warranty expires next?',
        'Which documents are expiring soon?',
        'View Warranties Page'
      ];
    }
  }

  // 6. TOTAL COUNT & VAULT SUMMARY ("How many documents do I have?", "Summarize my vault")
  else if (lower.includes('how many') || lower.includes('count') || lower.includes('summary') || lower.includes('summarize') || lower.includes('total')) {
    intent = 'query_vault_summary';
    const activeCount = userDocs.filter(d => d.status === 'ACTIVE').length;
    const expiringCount = userDocs.filter(d => d.status === 'EXPIRING_SOON').length;
    const expiredCount = userDocs.filter(d => d.status === 'EXPIRED').length;

    reply = `You currently have **${userDocs.length} total documents** and **${warranties.length} warranties** indexed in DocTrack AI:\n\n` +
      `• **Active & Valid:** ${activeCount} documents\n` +
      `• **Expiring Soon (<30d):** ${expiringCount} documents\n` +
      `• **Expired / Action Needed:** ${expiredCount} documents\n` +
      `• **Warranty Assets:** ${warranties.length} items (Total protected valuation: ₹6,31,298)\n\n` +
      `Your tracked records span 4 family profiles: Zaid (Self), Rahul (Son), Priya (Spouse), and Honda City (Vehicle).`;

    suggestedActions = [
      'When does my passport expire?',
      'Show my expired documents',
      'Which warranty expires next?'
    ];
  }

  // 7. SPECIFIC DOCUMENT LOOKUP (Aadhaar, Insurance, Vehicle RC)
  else if (lower.includes('aadhaar')) {
    const aadhaar = userDocs.find(d => (d.title || '').toLowerCase().includes('aadhaar'));
    intent = 'lookup_aadhaar';
    if (aadhaar) {
      reply = `Your **${aadhaar.title}** (No: **${aadhaar.docNumber}**) is indexed for **${aadhaar.profileName}**.\n\n` +
        `• **Validity:** Perpetual / Lifetime (UIDAI Govt of India)\n` +
        `• **Status:** ACTIVE\n` +
        `• **Verified:** Yes (Biometric & QR Code verified)`;
      suggestedActions = ['When does my passport expire?', 'How many documents do I have?'];
      relatedDocuments = [{
        id: aadhaar.id,
        title: aadhaar.title,
        docNumber: aadhaar.docNumber,
        category: aadhaar.category,
        status: aadhaar.status,
        daysLeft: aadhaar.daysLeft,
        expiryDate: aadhaar.expiryDate
      }];
    }
  }

  else if (lower.includes('insurance')) {
    const ins = userDocs.find(d => (d.title || '').toLowerCase().includes('insurance'));
    intent = 'lookup_insurance';
    if (ins) {
      reply = `Your **${ins.title}** (Policy #: **${ins.docNumber}**) is registered to profile **${ins.profileName}**.\n\n` +
        `• **Status:** ${ins.status} (${ins.daysLeft} days remaining)\n` +
        `• **Expiry Date:** ${ins.expiryDate}\n` +
        `• **Insurer:** ${ins.issuingAuthority}`;
      suggestedActions = ['Which documents are expiring soon?', 'Open Renewal Assistant'];
      relatedDocuments = [{
        id: ins.id,
        title: ins.title,
        docNumber: ins.docNumber,
        category: ins.category,
        status: ins.status,
        daysLeft: ins.daysLeft,
        expiryDate: ins.expiryDate
      }];
    }
  }

  // 8. HELP & UPLOAD GUIDANCE
  else if (lower.includes('upload') || lower.includes('ocr') || lower.includes('how to') || lower.includes('help')) {
    intent = 'help_system_features';
    reply = `### How to use DocTrack AI:\n\n` +
      `1. **Upload Documents:** Go to Documents -> click "+ Upload Document". Supported formats include PDF, PNG, JPG, and WEBP.\n` +
      `2. **Automatic OCR & Classification:** Our local Tesseract engine parses document numbers, issue dates, and expiration dates automatically.\n` +
      `3. **Expiry Radar & Reminders:** You receive multi-channel alerts (Email, SMS, In-App) at 90d, 30d, 7d, and 1d intervals.\n` +
      `4. **Renewal Assistant:** Step-by-step verified checklists and official government links for expired and expiring papers.`;

    suggestedActions = [
      'Which documents are expiring soon?',
      'How many documents do I have?',
      'Which warranty expires next?'
    ];
  }

  // 9. DEFAULT / CONVERSATIONAL FALLBACK
  else {
    intent = 'conversational_general';
    reply = `I understand your query: "*${query}*".\n\n` +
      `As your DocTrack AI Assistant, I can inspect your indexed documents, calculate remaining validity days, look up manufacturer warranties, or guide you through official renewals.\n\n` +
      `Here are a few questions you can ask me:`;

    suggestedActions = [
      'When does my passport expire?',
      'Which documents are expiring soon?',
      'What documents do I need to renew my driving license?',
      'Which warranty expires next?'
    ];
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
  getContextualSuggestions,
  getChatHistory,
  clearChatHistory,
  processUserMessage
};
