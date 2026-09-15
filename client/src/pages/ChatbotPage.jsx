import React, { useState } from 'react';
import { MessageSquare, Send, Bot, User, Sparkles } from 'lucide-react';
import { DEMO_DOCUMENTS } from '../data/demoData';

export default function ChatbotPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hello Zaid! I am your DocTrack AI Assistant. Ask me anything about your stored documents, expiry dates, or renewal procedures.'
    }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = (textToSend) => {
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Rule-based intelligent offline answering (mock assistant)
    setTimeout(() => {
      let reply = "I searched your indexed records. You have 7 documents currently tracked across 4 active profiles.";
      const q = query.toLowerCase();

      if (q.includes('passport')) {
        const passport = DEMO_DOCUMENTS.find(d => d.id === 'doc-passport-01');
        reply = `Your Indian Passport (No: ${passport.docNumber}) expires on ${passport.expiryDate} (${passport.daysLeft} days remaining). You can use our Renewal Assistant for the official renewal checklist.`;
      } else if (q.includes('expired')) {
        const expired = DEMO_DOCUMENTS.filter(d => d.status === 'EXPIRED');
        reply = `You have 1 expired document: ${expired.map(d => `${d.title} (expired ${d.expiryDate})`).join(', ')}.`;
      } else if (q.includes('license') || q.includes('dl')) {
        reply = `Rahul's Driving License (KA03 2019000124) expired on 2026-09-03. Renewal requires Form 1A medical certificate and Sarathi portal submission.`;
      } else if (q.includes('expiring') || q.includes('soon')) {
        const expiring = DEMO_DOCUMENTS.filter(d => d.status === 'EXPIRING_SOON');
        reply = `2 documents are expiring soon: Indian Passport (27 days left) and PUC Certificate (5 days left).`;
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: reply }]);
    }, 400);
  };

  const samplePrompts = [
    'When does my passport expire?',
    'Which documents are expiring soon?',
    'Show my expired documents',
    'What do I need to renew my driving license?'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px', margin: '0 auto', height: 'calc(100vh - 160px)' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-primary)', marginBottom: '0.2rem' }}>
          <Sparkles size={18} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase' }}>Context-Aware AI</span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Document Assistant
        </h1>
      </div>

      {/* Suggested prompts */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 'var(--radius-pill)', fontSize: '0.78rem' }}
            onClick={() => handleSend(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div
        className="card"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1.5rem'
        }}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%'
            }}
          >
            {msg.sender === 'bot' && (
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-light)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Bot size={18} />
              </div>
            )}

            <div
              style={{
                padding: '0.85rem 1.15rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: msg.sender === 'user' ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                fontSize: '0.92rem',
                lineHeight: 1.5,
                boxShadow: msg.sender === 'user' ? 'var(--shadow-brand)' : 'none'
              }}
            >
              {msg.text}
            </div>

            {msg.sender === 'user' && (
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-active)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontWeight: 700,
                  fontSize: '0.82rem'
                }}
              >
                Z
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ display: 'flex', gap: '0.75rem' }}
      >
        <input
          type="text"
          placeholder="Ask a question about your documents..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="search-container"
          style={{ flex: 1, width: 'auto', backgroundColor: '#FFFFFF', padding: '0.75rem 1rem' }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem' }}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
