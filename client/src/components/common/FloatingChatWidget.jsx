import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Maximize2,
  ChevronRight
} from 'lucide-react';
import { sendChatMessage, getChatSuggestions } from '../../services/api';

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'floating-init',
      role: 'assistant',
      content: 'Hello! I am your DocTrack AI Assistant. Ask me anything about your documents, expiries, or warranties.',
      suggestedActions: ['When does my passport expire?', 'Show expired documents']
    }
  ]);
  const [suggestions, setSuggestions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Keyboard accessibility: ESC key to close widget
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    async function loadSuggestions() {
      try {
        const res = await getChatSuggestions();
        if (res.success && Array.isArray(res.data)) {
          setSuggestions(res.data.slice(0, 3));
        }
      } catch (err) {
        // Fallback
      }
    }
    loadSuggestions();
  }, []);

  const handleSend = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    const userMsg = {
      id: `float-user-${Date.now()}`,
      role: 'user',
      content: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await sendChatMessage(query);
      if (res.success && res.data) {
        setMessages(prev => [...prev, res.data]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `float-err-${Date.now()}`,
          role: 'assistant',
          content: 'Unable to reach assistant engine. Please try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="floating-chat-container" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open DocTrack AI Assistant chat widget"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--brand-primary-accessible)',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: '0 4px 14px rgba(46, 104, 48, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Ask DocTrack AI Assistant"
        >
          <Sparkles size={24} />
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              border: '2px solid #FFFFFF'
            }}
          />
        </button>
      )}

      {/* Floating Chat Drawer Box */}
      {isOpen && (
        <div
          style={{
            width: '380px',
            height: '520px',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--brand-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bot size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.2 }}>DocTrack AI</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>Vault Assistant</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Link
                to="/chatbot"
                onClick={() => setIsOpen(false)}
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '4px'
                }}
                title="Open full page assistant"
              >
                <Maximize2 size={16} />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant chat widget"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          {suggestions.length > 0 && (
            <div
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                gap: '0.35rem',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
              }}
            >
              {suggestions.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(p)}
                  disabled={loading}
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Chat Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              backgroundColor: '#F8FAFC'
            }}
          >
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}
                >
                  <div
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      backgroundColor: isUser ? 'var(--brand-primary)' : '#FFFFFF',
                      color: isUser ? '#FFFFFF' : 'var(--text-primary)',
                      fontSize: '0.82rem',
                      lineHeight: 1.45,
                      border: isUser ? 'none' : '1px solid var(--border-light)',
                      boxShadow: 'var(--shadow-sm)',
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {m.content}
                  </div>

                  {/* Actions */}
                  {!isUser && Array.isArray(m.suggestedActions) && m.suggestedActions.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                      {m.suggestedActions.slice(0, 2).map((act, aIdx) => (
                        <button
                          key={aIdx}
                          type="button"
                          onClick={() => handleSend(act)}
                          style={{
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid var(--border-light)',
                            color: 'var(--brand-primary)',
                            cursor: 'pointer'
                          }}
                        >
                          {act}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', gap: '0.3rem', padding: '0.5rem', alignSelf: 'flex-start' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--brand-primary)', animation: 'pulse 1s infinite' }} />
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--brand-primary)', animation: 'pulse 1s infinite 0.2s' }} />
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--brand-primary)', animation: 'pulse 1s infinite 0.4s' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: '0.6rem 0.75rem',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              gap: '0.5rem'
            }}
          >
            <input
              type="text"
              placeholder="Ask anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
              aria-label="Type your message to DocTrack AI assistant"
              style={{
                flex: 1,
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-pill)',
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="btn btn-primary btn-sm"
              aria-label="Send message"
              style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Send size={14} />
            </button>
          </form>

          {/* AI Advisory Mini Note */}
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.2rem 0.6rem 0.4rem 0.6rem', backgroundColor: '#FFFFFF', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
            AI responses are informational. Please verify critical statutory deadlines with official issuing authorities.
          </div>
        </div>
      )}
    </div>
  );
}
