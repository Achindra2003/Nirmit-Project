import { useState, useRef, useEffect } from 'react';
import { CHAT_INIT } from '../data';

const SUGGESTIONS = ['Bigger sofa', 'Dark leather', 'More storage', "What's my total?", 'Add a bookshelf'];

export default function AIChat() {
  const [msgs, setMsgs] = useState(CHAT_INIT);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [msgs, thinking]);

  const send = () => {
    if (!input.trim()) return;
    const q = input;
    setInput('');
    setMsgs((p) => [...p, { role: 'user', text: q }]);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMsgs((p) => [
        ...p,
        {
          role: 'ai',
          text: `I've noted that \u2014 "${q}". Give me a moment to work it into the layout and update the cost.`,
        },
      ]);
    }, 1100);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Messages */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
              gap: 8,
              animation: 'fadeIn 0.3s ease both',
            }}
          >
            {m.role === 'ai' && (
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#C2552D',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 2,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <circle cx="5" cy="5" r="4" fill="none" stroke="white" strokeWidth="1.5" />
                  <circle cx="5" cy="5" r="1.8" fill="white" />
                </svg>
              </div>
            )}
            <div
              style={{
                maxWidth: '80%',
                padding: '11px 15px',
                fontSize: 13,
                lineHeight: 1.65,
                borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                background: m.role === 'user' ? '#C2552D' : 'rgba(232,221,208,0.08)',
                color: m.role === 'user' ? 'white' : '#E8DDD0',
                border: m.role === 'ai' ? '1px solid rgba(155,144,128,0.15)' : 'none',
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: '#C2552D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <circle cx="5" cy="5" r="4" fill="none" stroke="white" strokeWidth="1.5" />
                <circle cx="5" cy="5" r="1.8" fill="white" />
              </svg>
            </div>
            <div
              style={{
                padding: '11px 15px',
                borderRadius: '4px 14px 14px 14px',
                background: 'rgba(232,221,208,0.06)',
                border: '1px solid rgba(155,144,128,0.1)',
                display: 'flex',
                gap: 5,
                alignItems: 'center',
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#9B9080',
                    animation: `pulse 1.2s ease ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div style={{ padding: '0 16px 10px', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {SUGGESTIONS.map((s) => (
          <div
            key={s}
            onClick={() => setInput(s)}
            style={{
              padding: '6px 13px',
              borderRadius: 100,
              border: '1px solid rgba(155,144,128,0.15)',
              fontSize: 12,
              color: '#9B9080',
              cursor: 'pointer',
              background: 'transparent',
              transition: 'all 0.14s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#C2552D';
              e.currentTarget.style.color = '#C2552D';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(155,144,128,0.15)';
              e.currentTarget.style.color = '#9B9080';
            }}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding: '10px 16px 18px',
          borderTop: '1px solid rgba(155,144,128,0.1)',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Tell me what you'd like to change..."
          style={{
            flex: 1,
            border: '1.5px solid rgba(155,144,128,0.15)',
            borderRadius: 10,
            padding: '11px 14px',
            fontSize: 13,
            fontFamily: 'var(--fb)',
            outline: 'none',
            background: 'rgba(232,221,208,0.06)',
            color: '#E8DDD0',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#C2552D';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(155,144,128,0.15)';
          }}
        />
        <button
          onClick={send}
          style={{
            background: '#C2552D',
            color: 'white',
            border: 'none',
            padding: '11px 18px',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 700,
            transition: 'opacity 0.2s',
          }}
        >
          ↑
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
