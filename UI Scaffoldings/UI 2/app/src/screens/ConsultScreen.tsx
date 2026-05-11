import { useState } from 'react';
import TopBar from '../components/TopBar';
import { VIBES, ROOMS, SIZES, CITIES, fmtBudget, truncate, type Brief } from '../data';

interface ConsultScreenProps {
  onNav: (s: string) => void;
  brief: Brief;
  setBrief: (b: Brief) => void;
}

const PAGES = [
  { title: 'What feeling?', sub: 'Not the style \u2014 the feeling. This drives everything else.', kind: 'vibe' as const },
  { title: 'Which room, how big?', sub: 'A rough sense is enough. You can refine it in the planner.', kind: 'room' as const },
  { title: 'Who lives here?', sub: 'Tell us in plain language. The more you share, the more personal the design.', kind: 'who' as const },
  { title: 'Budget and city?', sub: 'For furniture and finishing. Installation costs are separate.', kind: 'budget' as const },
];

export default function ConsultScreen({ onNav, brief, setBrief }: ConsultScreenProps) {
  const [page, setPage] = useState(0);
  const P = PAGES[page];

  const ok = [
    !!brief.vibe,
    !!(brief.room && brief.size),
    !!(brief.who && brief.who.trim().length > 4),
    !!brief.city,
  ];

  const next = () => (page < 3 ? setPage(page + 1) : onNav('draft'));
  const prev = () => (page > 0 ? setPage(page - 1) : onNav('cover'));

  const trail = [
    brief.vibe ? VIBES.find((v) => v.id === brief.vibe)?.name : null,
    brief.room ? `${ROOMS.find((r) => r[0] === brief.room)?.[1]} \u00b7 ${SIZES.find((s) => s.id === brief.size)?.en || ''}` : null,
    brief.who ? truncate(brief.who, 42) : null,
    brief.city ? `${fmtBudget(brief.budget)} \u00b7 ${brief.city}` : null,
  ].filter(Boolean) as string[];

  const prog = ((page + (ok[page] ? 1 : 0)) / 4) * 100;

  return (
    <div className="paper" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar active="consult" onNav={onNav} />

      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(155,144,128,0.2)', flexShrink: 0 }}>
        <div style={{ height: 2, background: '#C2552D', width: `${prog}%`, transition: 'width 0.5s ease' }} />
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 3fr', minHeight: 0, overflow: 'hidden' }}>
        {/* Left — Question */}
        <div
          style={{
            padding: '60px 40px 40px 56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '2px solid rgba(155,144,128,0.2)',
            overflow: 'hidden',
          }}
        >
          <div>
            <div style={{ marginBottom: 28 }}>
              <span className="eyebrow">
                PAGE {String(page + 1).padStart(2, '0')} OF 04
                {page === 0 && ' \u00b7 क्या भाव?'}
                {page === 1 && ' \u00b7 कौन सा कमरा?'}
                {page === 2 && ' \u00b7 कौन रहता है?'}
                {page === 3 && ' \u00b7 बजट और शहर?'}
              </span>
            </div>

            <h2
              key={`q${page}`}
              style={{
                fontFamily: 'var(--fd)',
                fontSize: 'clamp(36px, 4vw, 58px)',
                fontWeight: 500,
                lineHeight: 1.05,
                letterSpacing: '-0.018em',
                marginBottom: 12,
                color: '#151210',
                animation: 'slideUp 0.55s cubic-bezier(0.22,0.7,0,1.05) both',
              }}
            >
              {P.title.split(' ').map((pt, i, arr) => (
                <span key={i}>
                  {i > 0 && ' '}
                  <span style={i === arr.length - 1 ? { fontStyle: 'italic', color: '#C2552D' } : undefined}>
                    {pt}
                  </span>
                </span>
              ))}
            </h2>

            <p
              style={{
                fontFamily: 'var(--fd)',
                fontStyle: 'italic',
                fontSize: 16,
                color: '#5C5348',
                lineHeight: 1.5,
                maxWidth: '32ch',
                animation: 'slideUp 0.55s cubic-bezier(0.22,0.7,0,1.05) 0.08s both',
              }}
            >
              {P.sub}
            </p>
          </div>

          {trail.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 42 }}>
              <span className="eyebrow">So far</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {trail.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span className="eyebrow" style={{ minWidth: 14, fontSize: 9 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--fd)',
                        fontStyle: 'italic',
                        fontSize: 14,
                        color: i === page ? '#C2552D' : '#151210',
                      }}
                    >
                      {t}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Answer */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            key={`a${page}`}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '40px 56px 20px',
              animation: 'slideUp 0.48s cubic-bezier(0.22,0.7,0,1.05) 0.12s both',
            }}
          >
            {P.kind === 'vibe' && <VibeAnswer brief={brief} setBrief={setBrief} />}
            {P.kind === 'room' && <RoomAnswer brief={brief} setBrief={setBrief} />}
            {P.kind === 'who' && <WhoAnswer brief={brief} setBrief={setBrief} />}
            {P.kind === 'budget' && <BudgetAnswer brief={brief} setBrief={setBrief} />}
          </div>

          {/* Nav footer */}
          <div
            style={{
              padding: '16px 56px 32px',
              borderTop: '2px solid rgba(155,144,128,0.15)',
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              onClick={prev}
              style={{
                background: 'transparent',
                border: '2px solid #9B9080',
                color: '#9B9080',
                padding: '10px 20px',
                fontFamily: 'var(--fb)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#151210';
                e.currentTarget.style.color = '#151210';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#9B9080';
                e.currentTarget.style.color = '#9B9080';
              }}
            >
              ← {page === 0 ? 'Cover' : 'Back'}
            </button>
            <button
              onClick={ok[page] ? next : undefined}
              style={{
                background: ok[page] ? '#151210' : '#151210',
                color: '#E8DDD0',
                border: 'none',
                padding: '14px 32px',
                fontFamily: 'var(--fb)',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: ok[page] ? 'pointer' : 'default',
                opacity: ok[page] ? 1 : 0.3,
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                if (ok[page]) e.currentTarget.style.background = '#C2552D';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#151210';
              }}
            >
              {page < 3 ? 'Continue →' : 'Begin drafting →'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ── Answer Components ── */

function VibeAnswer({ brief, setBrief }: { brief: Brief; setBrief: (b: Brief) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {VIBES.map((v, i) => {
        const sel = brief.vibe === v.id;
        return (
          <div
            key={v.id}
            onClick={() => setBrief({ ...brief, vibe: v.id })}
            style={{
              padding: '18px 0',
              borderTop: i === 0 ? '2px solid rgba(155,144,128,0.15)' : 'none',
              borderBottom: '2px solid rgba(155,144,128,0.15)',
              cursor: 'pointer',
              display: 'grid',
              gridTemplateColumns: '28px 1fr 1.2fr 22px',
              gap: 16,
              alignItems: 'baseline',
              background: sel ? 'rgba(194,85,45,0.06)' : 'transparent',
              transition: 'background 0.18s',
              borderLeft: sel ? '2px solid #C2552D' : '2px solid transparent',
              paddingLeft: sel ? 14 : 16,
            }}
            onMouseEnter={(e) => {
              if (!sel) e.currentTarget.style.background = 'rgba(194,85,45,0.03)';
            }}
            onMouseLeave={(e) => {
              if (!sel) e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ fontFamily: 'var(--fm)', fontSize: 10, color: '#9B9080', letterSpacing: '0.1em' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <div
                style={{
                  fontFamily: 'var(--fd)',
                  fontStyle: 'italic',
                  fontSize: 'clamp(18px, 1.6vw, 22px)',
                  fontWeight: 500,
                  color: sel ? '#C2552D' : '#151210',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                {v.name}
                <span style={{ fontFamily: 'var(--fh)', fontSize: 13, color: '#9B9080' }}>{v.hi}</span>
              </div>
              <div style={{ fontSize: 12, color: '#9B9080', marginTop: 2 }}>{v.desc}</div>
            </div>
            <div style={{ fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: 14, color: '#5C5348', lineHeight: 1.55 }}>
              {v.depth}
            </div>
            <div style={{ alignSelf: 'center' }}>
              {sel ? (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    background: '#C2552D',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="9" height="7" viewBox="0 0 9 7">
                    <path
                      d="M1 3.5l2.3 2.3 4.5-5.3"
                      stroke="white"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ) : (
                <div style={{ width: 18, height: 18, border: '1.5px solid rgba(155,144,128,0.25)', borderRadius: '50%' }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoomAnswer({ brief, setBrief }: { brief: Brief; setBrief: (b: Brief) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Room type */}
      <div>
        <span className="eyebrow">Room type</span>
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginTop: 12,
            border: '2px solid rgba(155,144,128,0.15)',
          }}
        >
          {ROOMS.map(([id, en, hi], i) => {
            const sel = brief.room === id;
            return (
              <div
                key={id}
                onClick={() => setBrief({ ...brief, room: id })}
                style={{
                  flex: 1,
                  padding: '16px 10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  borderLeft: i > 0 ? '2px solid rgba(155,144,128,0.15)' : 'none',
                  background: sel ? '#151210' : 'transparent',
                  color: sel ? '#E8DDD0' : '#151210',
                  transition: 'all 0.25s ease',
                }}
              >
                <div style={{ fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: 16, fontWeight: 500 }}>{en}</div>
                <div style={{ fontFamily: 'var(--fh)', fontSize: 11, marginTop: 4, opacity: 0.6 }}>{hi}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Room size */}
      <div>
        <span className="eyebrow">Room size</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}>
          {SIZES.map((rs) => {
            const sel = brief.size === rs.id;
            return (
              <div
                key={rs.id}
                onClick={() => setBrief({ ...brief, size: rs.id })}
                style={{
                  padding: '20px 10px 16px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: `2px solid ${sel ? '#C2552D' : 'rgba(155,144,128,0.15)'}`,
                  background: sel ? 'rgba(194,85,45,0.06)' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <div
                    style={{
                      width: rs.w,
                      height: rs.h,
                      border: `1.5px solid ${sel ? '#C2552D' : '#5C5348'}`,
                      position: 'relative',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -1,
                        left: 6,
                        width: 8,
                        height: 2,
                        background: sel ? '#C2552D' : '#5C5348',
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--fd)',
                    fontStyle: 'italic',
                    fontSize: 17,
                    fontWeight: 500,
                    color: sel ? '#C2552D' : '#151210',
                  }}
                >
                  {rs.en}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--fm)',
                    fontSize: 10,
                    color: '#9B9080',
                    marginTop: 2,
                    letterSpacing: '0.08em',
                  }}
                >
                  {rs.hi} ft
                </div>
                <div
                  style={{
                    fontFamily: 'var(--fd)',
                    fontStyle: 'italic',
                    fontSize: 12,
                    color: '#9B9080',
                    marginTop: 8,
                    lineHeight: 1.4,
                  }}
                >
                  {rs.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WhoAnswer({ brief, setBrief }: { brief: Brief; setBrief: (b: Brief) => void }) {
  const chips = [
    'Young children',
    'Elderly parent',
    'Work from home',
    'Frequent guests',
    'Pets',
    'Just the two of us',
    'Vastu matters',
    'Joint family',
  ];

  const toggle = (c: string) => {
    const arr = brief.chips || [];
    setBrief({ ...brief, chips: arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ position: 'relative' }}>
        <textarea
          value={brief.who || ''}
          onChange={(e) => setBrief({ ...brief, who: e.target.value })}
          placeholder="A family of four — my son is four years old. My mother-in-law visits often. We watch movies together. I work some evenings. We accumulate a lot of toys."
          style={{
            width: '100%',
            height: 190,
            border: 'none',
            borderBottom: '2px solid rgba(155,144,128,0.25)',
            background: 'transparent',
            resize: 'none',
            outline: 'none',
            fontFamily: 'var(--fd)',
            fontSize: 22,
            lineHeight: 1.55,
            color: '#151210',
            padding: '6px 0',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderBottomColor = '#C2552D';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderBottomColor = 'rgba(155,144,128,0.25)';
          }}
        />
        <span
          style={{
            position: 'absolute',
            bottom: 10,
            right: 0,
            fontFamily: 'var(--fm)',
            fontSize: 9.5,
            color: '#9B9080',
          }}
        >
          {(brief.who || '').length} CHARS
        </span>
      </div>

      <div>
        <span className="eyebrow">Or pick what fits</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {chips.map((c) => {
            const on = (brief.chips || []).includes(c);
            return (
              <div
                key={c}
                onClick={() => toggle(c)}
                style={{
                  padding: '9px 18px',
                  cursor: 'pointer',
                  border: `2px solid ${on ? '#151210' : 'rgba(155,144,128,0.2)'}`,
                  background: on ? '#151210' : 'transparent',
                  color: on ? '#E8DDD0' : '#5C5348',
                  fontFamily: 'var(--fd)',
                  fontStyle: 'italic',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.18s ease',
                }}
              >
                {c}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BudgetAnswer({ brief, setBrief }: { brief: Brief; setBrief: (b: Brief) => void }) {
  const v = brief.budget || 300000;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <div>
        <span className="eyebrow">Budget — furniture and finishing</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, margin: '16px 0 28px' }}>
          <span
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 'clamp(52px, 5vw, 78px)',
              fontWeight: 500,
              lineHeight: 1,
              color: '#C2552D',
              letterSpacing: '-0.025em',
            }}
          >
            {fmtBudget(v)}
          </span>
          <span style={{ fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: 16, color: '#9B9080' }}>furniture + finishing</span>
        </div>
        <input
          type="range"
          min={75000}
          max={500000}
          step={25000}
          value={v}
          onChange={(e) => setBrief({ ...brief, budget: +e.target.value })}
          style={{
            WebkitAppearance: 'none',
            width: '100%',
            height: 2,
            background: 'rgba(155,144,128,0.2)',
            outline: 'none',
            borderRadius: 1,
          }}
        />
        <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #151210;
            cursor: pointer;
            border: 3px solid #E8DDD0;
            box-shadow: 0 0 0 1px #151210;
          }
        `}</style>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 12,
            fontFamily: 'var(--fm)',
            fontSize: 9.5,
            color: '#9B9080',
            letterSpacing: '0.08em',
          }}
        >
          <span>75K ESSENTIALS</span>
          <span>1.5L FAMILY</span>
          <span>3L COMPLETE</span>
          <span>5L+ PREMIUM</span>
        </div>
      </div>

      <div>
        <span className="eyebrow">City</span>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0,
            marginTop: 12,
            border: '2px solid rgba(155,144,128,0.15)',
          }}
        >
          {CITIES.map((c, i) => {
            const sel = brief.city === c;
            return (
              <div
                key={c}
                onClick={() => setBrief({ ...brief, city: c })}
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  borderRight: i < CITIES.length - 1 ? '2px solid rgba(155,144,128,0.15)' : 'none',
                  borderBottom: '2px solid rgba(155,144,128,0.15)',
                  flex: '1 1 120px',
                  textAlign: 'center',
                  background: sel ? '#151210' : 'transparent',
                  color: sel ? '#E8DDD0' : '#151210',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: 17, fontWeight: 500 }}>{c}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
