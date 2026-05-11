import { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface Message {
  role: 'ai' | 'user';
  text: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    role: 'ai',
    text: "Welcome to your living room. I've designed it around everything you told me \u2014 the mandir faces northeast for morning light, the centre is open for the little ones, and the sofa is oversized for those movie nights. Take a look around.",
  },
  {
    role: 'user',
    text: 'Make the sofa bigger. Dark leather.',
  },
  {
    role: 'ai',
    text: "Done. A 9-foot 3-seater in deep brown PU leather. The walkway in front stays at 36 inches \u2014 generous. \u20b938,000 instead of \u20b922,000. New total: \u20b93,00,000 \u2014 exactly on budget. I would not go further unless we trade something else down.",
  },
];

const SUGGESTIONS = ['Bigger sofa', 'Dark leather', 'More storage', "What's my total?", 'Add a bookshelf'];

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: `I've noted that \u2014 "${text}". Give me a moment to work it into the layout and update the cost.`,
        },
      ]);
    }, 1100);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
        <span className="eyebrow">Design Collaborator</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className="fade-in"
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
              gap: 8,
            }}
          >
            {m.role === 'ai' && (
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'var(--accent-marigold)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 2,
                }}
              >
                <Sparkles size={13} color="#fff" />
              </div>
            )}
            <div
              style={{
                maxWidth: '80%',
                padding: '11px 15px',
                fontSize: 13,
                lineHeight: 1.65,
                fontFamily: 'var(--font-sans)',
                borderRadius:
                  m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                background: m.role === 'user' ? 'var(--accent-marigold)' : '#fff',
                color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                border: m.role === 'ai' ? '1px solid var(--border-color)' : 'none',
                boxShadow: '0 1px 5px rgba(44,24,16,0.06)',
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
                background: 'var(--accent-marigold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={13} color="#fff" />
            </div>
            <div
              style={{
                padding: '11px 15px',
                borderRadius: '4px 14px 14px 14px',
                background: '#fff',
                border: '1px solid var(--border-color)',
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
                    background: 'var(--text-muted)',
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
            className="chamfer-sm"
            style={{
              padding: '6px 13px',
              border: '1px solid var(--border-color)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              background: '#fff',
              transition: 'all 0.14s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-marigold)';
              e.currentTarget.style.color = 'var(--accent-marigold)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 16px 18px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Tell me what you'd like to change..."
          style={{
            flex: 1,
            border: '1.5px solid var(--border-color)',
            padding: '11px 14px',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            background: '#fff',
            color: 'var(--text-primary)',
            transition: 'border-color 0.2s',
            clipPath:
              'polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-marigold)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        />
        <button
          onClick={sendMessage}
          className="chamfer"
          style={{
            background: 'var(--accent-marigold)',
            color: '#fff',
            border: 'none',
            padding: '11px 18px',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 700,
            transition: 'opacity 0.2s',
            fontFamily: 'var(--font-sans)',
          }}
        >
          &#8593;
        </button>
      </div>
    </div>
  );
}
