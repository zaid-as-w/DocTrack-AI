import React from 'react';

/**
 * Lightweight Markdown & Plaintext Formatter for Chatbot Messages
 * Parses bold, italics, code, links, headers, and bullet lists cleanly.
 */
export default function ChatMessageFormatter({ content = '', isUser = false }) {
  if (!content) return null;

  // Split into lines for structural parsing
  const lines = content.split('\n');
  const elements = [];
  let currentList = [];
  let listType = null; // 'ul' or 'ol'

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`list-${elements.length}`} style={{ paddingLeft: '1.25rem', margin: '0.4rem 0' }}>
            {currentList.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>
                {renderInline(item)}
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`list-${elements.length}`} style={{ paddingLeft: '1.25rem', margin: '0.4rem 0' }}>
            {currentList.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  const renderInline = (text) => {
    if (!text) return '';

    // Regex to tokenise links [label](url), inline code `code`, bold **bold**, and italic *italic*
    const tokens = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // 1. Link: [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      if (linkMatch) {
        tokens.push(
          <a
            key={`link-${keyIdx++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: isUser ? '#FFFFFF' : 'var(--brand-primary, #047857)',
              textDecoration: 'underline',
              fontWeight: 600
            }}
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // 2. Bold: **text** or __text__
      const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
      if (boldMatch) {
        tokens.push(
          <strong key={`bold-${keyIdx++}`} style={{ fontWeight: 700 }}>
            {boldMatch[2]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // 3. Inline code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        tokens.push(
          <code
            key={`code-${keyIdx++}`}
            style={{
              padding: '1px 5px',
              borderRadius: '4px',
              backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
              fontFamily: 'monospace',
              fontSize: '0.88em'
            }}
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // 4. Raw URL: https://...
      const rawUrlMatch = remaining.match(/^(https?:\/\/[^\s<)]+)/);
      if (rawUrlMatch) {
        tokens.push(
          <a
            key={`rawurl-${keyIdx++}`}
            href={rawUrlMatch[1]}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: isUser ? '#FFFFFF' : 'var(--brand-primary, #047857)',
              textDecoration: 'underline'
            }}
          >
            {rawUrlMatch[1]}
          </a>
        );
        remaining = remaining.slice(rawUrlMatch[0].length);
        continue;
      }

      // Plain character
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    return tokens;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      flushList();
      elements.push(
        <hr
          key={`hr-${i}`}
          style={{
            border: 'none',
            borderTop: '1px solid var(--border-light, #E5E7EB)',
            margin: '0.6rem 0'
          }}
        />
      );
      continue;
    }

    // Headings: ###, ##, #
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4
          key={`h4-${i}`}
          style={{
            fontSize: '0.95rem',
            fontWeight: 800,
            margin: '0.5rem 0 0.25rem',
            color: isUser ? '#FFFFFF' : 'var(--text-primary)'
          }}
        >
          {renderInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3
          key={`h3-${i}`}
          style={{
            fontSize: '1rem',
            fontWeight: 800,
            margin: '0.6rem 0 0.3rem',
            color: isUser ? '#FFFFFF' : 'var(--text-primary)'
          }}
        >
          {renderInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }

    // Bullet item (* or -)
    const bulletMatch = rawLine.match(/^(\s*)[*-]\s+(.+)/);
    if (bulletMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      currentList.push(bulletMatch[2]);
      continue;
    }

    // Numbered item (1. or 2.)
    const numberMatch = rawLine.match(/^(\s*)\d+\.\s+(.+)/);
    if (numberMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentList.push(numberMatch[2]);
      continue;
    }

    // Regular line
    flushList();
    if (trimmed === '') {
      elements.push(<div key={`empty-${i}`} style={{ height: '0.4rem' }} />);
    } else {
      elements.push(
        <p key={`p-${i}`} style={{ margin: '0.2rem 0', lineHeight: 1.55 }}>
          {renderInline(rawLine)}
        </p>
      );
    }
  }

  flushList();

  return <div className="chat-formatted-content">{elements}</div>;
}
