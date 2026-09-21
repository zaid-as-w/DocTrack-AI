import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  MessageSquare,
  FileCheck,
  Clock,
  AlertTriangle,
  ExternalLink,
  Bot,
  User,
  Send,
  Trash2,
  Copy,
  Check,
  CheckSquare,
  Square,
  RefreshCw,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Compass,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  getRenewalItems,
  getRenewalGuide,
  toggleRenewalStep,
  getChatHistory,
  sendChatMessage,
  clearChatHistory,
  getChatSuggestions
} from '../services/api';

export default function DocRenewalAssistantPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Active View Mode: 'checklists' (Step-by-Step Guides) or 'assistant' (Conversational AI)
  const initialTab = searchParams.get('tab') === 'chat' ? 'assistant' : 'checklists';
  const [activeTab, setActiveTab] = useState(initialTab);

  // =========================================================================
  // SECTION A: RENEWAL CHECKLISTS & GUIDES STATE
  // =========================================================================
  const [renewalItems, setRenewalItems] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [activeGuideData, setActiveGuideData] = useState(null);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [copiedPrereqs, setCopiedPrereqs] = useState(false);

  // Load renewal items on mount
  useEffect(() => {
    async function loadItems() {
      try {
        const res = await getRenewalItems();
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setRenewalItems(res.data);
          const paramDocId = searchParams.get('docId');
          const matched = res.data.find(d => d.id === paramDocId);
          setSelectedDocId(matched ? matched.id : res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load renewal items:', err);
      } finally {
        setLoadingItems(false);
      }
    }
    loadItems();
  }, [searchParams]);

  // Load guide for selected document
  useEffect(() => {
    if (!selectedDocId) return;

    let isMounted = true;
    async function loadGuide() {
      setLoadingGuide(true);
      try {
        const res = await getRenewalGuide(selectedDocId);
        if (isMounted && res.success && res.data) {
          setActiveGuideData(res.data);
        }
      } catch (err) {
        console.error('Failed to load renewal guide:', err);
      } finally {
        if (isMounted) setLoadingGuide(false);
      }
    }
    loadGuide();

    return () => {
      isMounted = false;
    };
  }, [selectedDocId]);

  const handleStepToggle = async (stepId, currentStatus) => {
    if (!selectedDocId) return;

    const nextStatus = !currentStatus;
    setActiveGuideData(prev => {
      if (!prev) return prev;
      const updatedSteps = prev.guide.steps.map(s => (s.id === stepId ? { ...s, isCompleted: nextStatus } : s));
      const completedCount = updatedSteps.filter(s => s.isCompleted).length;
      const progressPercent = Math.round((completedCount / updatedSteps.length) * 100);

      return {
        ...prev,
        guide: {
          ...prev.guide,
          steps: updatedSteps,
          completedCount,
          progressPercent
        }
      };
    });

    setRenewalItems(prev =>
      prev.map(item => {
        if (item.id === selectedDocId) {
          const newCompleted = nextStatus ? item.completedStepsCount + 1 : Math.max(0, item.completedStepsCount - 1);
          const progressPercent = Math.round((newCompleted / item.stepsCount) * 100);
          return { ...item, completedStepsCount: newCompleted, progressPercent };
        }
        return item;
      })
    );

    try {
      await toggleRenewalStep(selectedDocId, stepId, nextStatus);
    } catch (err) {
      console.error('Failed to sync step toggle with server:', err);
    }
  };

  const handleCopyPrerequisites = () => {
    if (!activeGuideData?.guide?.requiredDocuments) return;
    const text = activeGuideData.guide.requiredDocuments.map(d => `- ${d}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedPrereqs(true);
    setTimeout(() => setCopiedPrereqs(false), 2000);
  };

  // =========================================================================
  // SECTION B: CONVERSATIONAL AI ASSISTANT STATE
  // =========================================================================
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isInitializingChat, setIsInitializingChat] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'assistant') {
      scrollToBottom();
    }
  }, [messages, chatLoading, activeTab]);

  useEffect(() => {
    let isMounted = true;
    async function initChat() {
      try {
        const [historyRes, suggestionsRes] = await Promise.all([
          getChatHistory(),
          getChatSuggestions()
        ]);

        if (isMounted) {
          if (historyRes.success && Array.isArray(historyRes.data)) {
            setMessages(historyRes.data);
          }
          if (suggestionsRes.success && Array.isArray(suggestionsRes.data)) {
            setSuggestions(suggestionsRes.data);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        if (isMounted) setIsInitializingChat(false);
      }
    }
    initChat();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSendChat = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || chatLoading) return;

    const userMessageId = `msg-user-temp-${Date.now()}`;
    const userMsgObj = {
      id: userMessageId,
      role: 'user',
      content: query,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsgObj]);
    setInputValue('');
    setChatLoading(true);

    try {
      const response = await sendChatMessage(query);
      if (response.success && response.data) {
        setMessages(prev => [...prev, response.data]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: 'I encountered an issue retrieving your documents. Please verify your connection or try asking again.',
          intent: 'error',
          suggestedActions: ['When does my passport expire?', 'Which documents are expiring soon?'],
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setChatLoading(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleClearChat = async () => {
    try {
      await clearChatHistory();
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  // Switch to Chat with a pre-filled prompt for a specific renewal
  const handleAskAIAssistant = (docTitle) => {
    setActiveTab('assistant');
    const prompt = `What are the step-by-step renewal requirements and legal procedures for my ${docTitle}?`;
    setTimeout(() => {
      handleSendChat(prompt);
    }, 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1240px', margin: '0 auto' }}>
      {/* 1. HERO HEADER WITH DUAL-FUNCTIONALITY TABS */}
      <div
        className="card"
        style={{
          padding: '1.75rem 2rem',
          background: 'linear-gradient(135deg, #FFFFFF 0%, var(--bg-subtle) 100%)',
          border: '1px solid var(--border-card)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--gradient-brand)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-brand)'
                }}
              >
                <Sparkles size={20} />
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                Doc Renewal Assistant
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              Interactive renewal roadmaps, official government portal links, and intelligent document AI.
            </p>
          </div>

          {/* Unified Mode Segmented Switcher */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px',
              gap: '4px'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('checklists')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: activeTab === 'checklists' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'checklists' ? 'var(--brand-dark)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'checklists' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <FileCheck size={16} color={activeTab === 'checklists' ? 'var(--brand-primary)' : 'currentColor'} />
              <span>Renewal Checklists & Guides</span>
              {renewalItems.length > 0 && (
                <span
                  style={{
                    backgroundColor: activeTab === 'checklists' ? 'var(--brand-light)' : 'rgba(0,0,0,0.06)',
                    color: activeTab === 'checklists' ? 'var(--brand-dark)' : 'var(--text-muted)',
                    fontSize: '0.7rem',
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-pill)',
                    fontWeight: 800
                  }}
                >
                  {renewalItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('assistant')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: activeTab === 'assistant' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'assistant' ? 'var(--brand-dark)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'assistant' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <Bot size={16} color={activeTab === 'assistant' ? 'var(--brand-primary)' : 'currentColor'} />
              <span>AI Document Assistant</span>
              <span
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  fontSize: '0.7rem',
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-pill)',
                  fontWeight: 800
                }}
              >
                Online
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: RENEWAL CHECKLISTS & INTERACTIVE WORKFLOW
          ========================================================================= */}
      {activeTab === 'checklists' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left: Document Expiry List */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
              Documents Needing Action
            </h2>

            {loadingItems ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                <span>Loading renewals...</span>
              </div>
            ) : renewalItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <ShieldCheck size={32} color="#059669" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>All Documents Up-to-Date</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  No documents in your vault currently require renewal action.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {renewalItems.map(item => {
                  const isSelected = item.id === selectedDocId;
                  const isCritical = item.status === 'EXPIRED';
                  const isWarning = item.status === 'EXPIRING_SOON';

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedDocId(item.id)}
                      style={{
                        textAlign: 'left',
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-light)',
                        backgroundColor: isSelected ? 'var(--brand-light)' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {item.title}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: isCritical ? '#FEE2E2' : isWarning ? '#FEF3C7' : '#E0E7FF',
                            color: isCritical ? '#DC2626' : isWarning ? '#D97706' : '#3730A3'
                          }}
                        >
                          {isCritical ? 'EXPIRED' : isWarning ? 'EXPIRING' : 'ACTIVE'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {item.profileName} • {item.daysLeft < 0 ? `${Math.abs(item.daysLeft)}d ago` : `in ${item.daysLeft}d`}
                      </div>

                      {/* Mini Progress */}
                      <div style={{ marginTop: '0.55rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                          <span>Checklist Progress</span>
                          <span style={{ fontWeight: 700 }}>{item.progressPercent}%</span>
                        </div>
                        <div style={{ height: '5px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${item.progressPercent}%`,
                              backgroundColor: item.progressPercent === 100 ? '#059669' : 'var(--brand-primary)',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Step-by-Step Detail View */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {loadingGuide ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
                <span>Loading official renewal procedure...</span>
              </div>
            ) : activeGuideData ? (
              <>
                {/* Guide Overview Banner */}
                <div
                  className="card"
                  style={{
                    padding: '1.5rem',
                    borderLeft: '4px solid var(--brand-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {activeGuideData.document.title} Renewal Guide
                      </h2>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                        {activeGuideData.document.category}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                      Issuing Authority: <strong>{activeGuideData.guide.issuingAuthority}</strong> • Estimated Timeline: <strong>{activeGuideData.guide.estimatedDays}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                    {/* Ask AI Assistant Button (Direct Integration) */}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAskAIAssistant(activeGuideData.document.title)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                    >
                      <Bot size={15} color="var(--brand-primary)" />
                      <span>Ask AI About This</span>
                    </button>

                    {activeGuideData.guide.officialPortalUrl && (
                      <a
                        href={activeGuideData.guide.officialPortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <span>Official Portal</span>
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Interactive Checklist Steps */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Step-by-Step Procedure Checklist
                    </h3>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                      {activeGuideData.guide.completedCount} of {activeGuideData.guide.steps.length} Steps Completed ({activeGuideData.guide.progressPercent}%)
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {activeGuideData.guide.steps.map((step, index) => {
                      return (
                        <div
                          key={step.id}
                          onClick={() => handleStepToggle(step.id, step.isCompleted)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.85rem',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: step.isCompleted ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-subtle)',
                            border: `1px solid ${step.isCompleted ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-light)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ marginTop: '2px', color: step.isCompleted ? '#059669' : 'var(--text-muted)' }}>
                            {step.isCompleted ? <CheckSquare size={19} /> : <Square size={19} />}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                                STEP {index + 1}
                              </span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.88rem',
                                  color: 'var(--text-primary)',
                                  textDecoration: step.isCompleted ? 'line-through' : 'none'
                                }}
                              >
                                {step.title}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.45 }}>
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Required Documents Checklist Card */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <FileCheck size={18} color="var(--brand-primary)" />
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Required Physical & Digital Documents
                      </h3>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleCopyPrerequisites}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
                    >
                      {copiedPrereqs ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                      <span>{copiedPrereqs ? 'Copied to Clipboard!' : 'Copy Required List'}</span>
                    </button>
                  </div>

                  <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    {activeGuideData.guide.requiredDocuments.map((docReq, idx) => (
                      <li key={idx} style={{ lineHeight: 1.45 }}>
                        {docReq}
                      </li>
                    ))}
                  </ul>

                  {activeGuideData.guide.feeStructure && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <strong>Estimated Statutory Fees:</strong> {activeGuideData.guide.feeStructure}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Select a document from the left column to view its renewal procedure.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: AI CONVERSATIONAL ASSISTANT
          ========================================================================= */}
      {activeTab === 'assistant' && (
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '680px',
            padding: 0,
            overflow: 'hidden',
            border: '1px solid var(--border-card)'
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--brand-light)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bot size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  DocTrack AI Assistant
                </div>
                <div style={{ fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669', display: 'inline-block' }}></span>
                  Grounded in your local document vault
                </div>
              </div>
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClearChat}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
              >
                <Trash2 size={13} />
                <span>Clear History</span>
              </button>
            )}
          </div>

          {/* Chat Messages Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              backgroundColor: '#FAFAFA'
            }}
          >
            {isInitializingChat ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                <span>Initializing assistant...</span>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '480px', padding: '2rem 1rem' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--gradient-brand)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    boxShadow: 'var(--shadow-brand)'
                  }}
                >
                  <Sparkles size={28} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  How can I help with your documents today?
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  I can check expiry dates, tell you which records are due for renewal, explain statutory steps, or answer questions about your vault.
                </p>

                {/* Suggestions Pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {suggestions.slice(0, 3).map((sugg, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendChat(sugg)}
                      style={{
                        padding: '0.65rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--border-light)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}
                    >
                      <span>{sugg}</span>
                      <ChevronRight size={14} color="var(--brand-primary)" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start',
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '82%'
                    }}
                  >
                    {!isUser && (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--brand-light)',
                          color: 'var(--brand-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}
                      >
                        <Bot size={18} />
                      </div>
                    )}

                    <div
                      style={{
                        padding: '0.85rem 1.15rem',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: isUser ? 'var(--brand-primary)' : '#FFFFFF',
                        color: isUser ? '#FFFFFF' : 'var(--text-primary)',
                        border: isUser ? 'none' : '1px solid var(--border-light)',
                        boxShadow: isUser ? 'var(--shadow-brand)' : '0 1px 3px rgba(0,0,0,0.05)',
                        fontSize: '0.88rem',
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {msg.content}

                      {/* Follow-up suggestions */}
                      {!isUser && Array.isArray(msg.suggestedActions) && msg.suggestedActions.length > 0 && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-light)', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {msg.suggestedActions.map((action, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() => handleSendChat(action)}
                              style={{
                                fontSize: '0.75rem',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-pill)',
                                backgroundColor: 'var(--bg-subtle)',
                                border: '1px solid var(--border-light)',
                                color: 'var(--brand-dark)',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-subtle)',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}
                      >
                        <User size={17} />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {chatLoading && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', alignSelf: 'flex-start' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--brand-light)',
                    color: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Bot size={18} />
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.65rem 1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Analyzing documents & generating response...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              gap: '0.75rem'
            }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask anything about your documents, expiries, or renewal requirements..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="search-input"
              style={{
                flex: 1,
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
                fontSize: '0.88rem'
              }}
              disabled={chatLoading}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!inputValue.trim() || chatLoading}
              style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <span>Send</span>
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
