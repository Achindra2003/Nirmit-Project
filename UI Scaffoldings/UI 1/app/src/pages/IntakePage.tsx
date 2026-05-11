import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, VIBES, ROOM_TYPES, ROOM_SIZES, CITIES, WHO_CHIPS, formatBudget } from '../store/useStore';
import Logo from '../components/Logo';
import ChamferButton from '../components/ChamferButton';

const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: [0.22, 0.7, 0, 1.05] as [number, number, number, number] },
};

export default function IntakePage() {
  const { brief, setBrief, setScreen } = useStore();
  const [step, setStep] = useState(0);

  const next = useCallback(() => {
    if (step < 3) setStep(step + 1);
    else setScreen('drafting');
  }, [step, setScreen]);

  const prev = useCallback(() => {
    if (step > 0) setStep(step - 1);
    else setScreen('cover');
  }, [step, setScreen]);

  const canProceed = [
    !!brief.vibe,
    !!(brief.roomType && brief.roomSize),
    !!(brief.who && brief.who.trim().length > 4),
    !!(brief.city),
  ][step];

  const toggleChip = (c: string) => {
    const arr = brief.chips;
    setBrief({ chips: arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c] });
  };

  return (
    <div
      className="texture-overlay"
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '22px 56px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Logo size="sm" />
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: i === step ? 28 : 8,
                height: 8,
                background: i <= step ? 'var(--accent-marigold)' : 'var(--border-color)',
                borderRadius: 4,
                transition: 'all 0.4s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Progress line */}
      <div style={{ height: 2, background: 'var(--border-color)', flexShrink: 0 }}>
        <div
          style={{
            height: 2,
            background: 'var(--accent-marigold)',
            width: `${((step + (canProceed ? 1 : 0)) / 4) * 100}%`,
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflowY: 'auto',
          padding: '40px 24px',
        }}
      >
        <div style={{ maxWidth: 720, width: '100%' }}>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="vibe" {...pageTransition}>
                <div style={{ marginBottom: 8 }}>
                  <span className="eyebrow">Step 01 of 04</span>
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(32px, 3.5vw, 48px)',
                    fontWeight: 500,
                    lineHeight: 1.08,
                    letterSpacing: '-0.018em',
                    marginBottom: 8,
                  }}
                >
                  What feeling do you want
                  <br />
                  <em style={{ color: 'var(--accent-marigold)', fontStyle: 'italic' }}>when you walk in?</em>
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: 'var(--text-secondary)',
                    marginBottom: 36,
                    lineHeight: 1.5,
                  }}
                >
                  Not the style &mdash; the feeling. This drives everything else.
                </p>

                {/* Vibe cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {VIBES.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setBrief({ vibe: v.id })}
                      className="chamfer-lg"
                      style={{
                        padding: 24,
                        cursor: 'pointer',
                        background: brief.vibe === v.id ? 'var(--bg-panel)' : 'transparent',
                        border:
                          brief.vibe === v.id
                            ? '2px solid var(--accent-marigold)'
                            : '1.5px solid var(--border-color)',
                        transition: 'all 0.22s ease',
                        boxShadow:
                          brief.vibe === v.id
                            ? '0 4px 20px rgba(212,160,60,0.15)'
                            : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (brief.vibe !== v.id) {
                          e.currentTarget.style.borderColor = 'var(--accent-marigold)';
                          e.currentTarget.style.background = 'var(--bg-panel)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (brief.vibe !== v.id) {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontStyle: 'italic',
                          fontSize: 22,
                          fontWeight: 500,
                          color: brief.vibe === v.id ? 'var(--accent-marigold)' : 'var(--text-primary)',
                          marginBottom: 4,
                        }}
                      >
                        {v.name}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                        {v.desc}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontStyle: 'italic',
                          fontSize: 14,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                        }}
                      >
                        {v.depth}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="room" {...pageTransition}>
                <div style={{ marginBottom: 8 }}>
                  <span className="eyebrow">Step 02 of 04</span>
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(32px, 3.5vw, 48px)',
                    fontWeight: 500,
                    lineHeight: 1.08,
                    letterSpacing: '-0.018em',
                    marginBottom: 8,
                  }}
                >
                  Which room,
                  <br />
                  <em style={{ color: 'var(--accent-marigold)', fontStyle: 'italic' }}>and how big?</em>
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: 'var(--text-secondary)',
                    marginBottom: 28,
                  }}
                >
                  A rough sense is enough &mdash; we will refine it later.
                </p>

                {/* Room type */}
                <div style={{ marginBottom: 32 }}>
                  <span className="eyebrow" style={{ display: 'block', marginBottom: 12 }}>
                    Room type
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      gap: 0,
                      borderTop: '1px solid var(--border-color)',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    {ROOM_TYPES.map((r, i) => (
                      <div
                        key={r.id}
                        onClick={() => setBrief({ roomType: r.id })}
                        style={{
                          flex: 1,
                          padding: '16px 10px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          borderLeft: i > 0 ? '1px solid var(--border-color)' : 'none',
                          background: brief.roomType === r.id ? 'var(--bg-dark)' : 'transparent',
                          color: brief.roomType === r.id ? 'var(--text-inverse)' : 'var(--text-primary)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontStyle: 'italic',
                            fontSize: 16,
                            fontWeight: 500,
                          }}
                        >
                          {r.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Room size */}
                <div>
                  <span className="eyebrow" style={{ display: 'block', marginBottom: 12 }}>
                    Room size
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                    {ROOM_SIZES.map((rs) => {
                      const sel = brief.roomSize === rs.id;
                      const dims = {
                        compact: [34, 34],
                        standard: [40, 56],
                        large: [56, 64],
                        open: [70, 70],
                      }[rs.id] as [number, number];
                      return (
                        <div
                          key={rs.id}
                          onClick={() => setBrief({ roomSize: rs.id })}
                          className="chamfer"
                          style={{
                            padding: '20px 10px 16px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            background: sel ? 'var(--bg-panel)' : 'transparent',
                            border: sel ? '2px solid var(--accent-marigold)' : '1.5px solid var(--border-color)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div
                            style={{
                              height: 72,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: 10,
                            }}
                          >
                            <div
                              style={{
                                width: dims[0],
                                height: dims[1],
                                border: `1.5px solid ${sel ? 'var(--accent-marigold)' : 'var(--text-secondary)'}`,
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
                                  background: sel ? 'var(--accent-marigold)' : 'var(--text-secondary)',
                                }}
                              />
                            </div>
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontStyle: 'italic',
                              fontSize: 17,
                              fontWeight: 500,
                              color: sel ? 'var(--accent-marigold)' : 'var(--text-primary)',
                            }}
                          >
                            {rs.label}
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 10,
                              color: 'var(--text-muted)',
                              marginTop: 2,
                              letterSpacing: '0.08em',
                            }}
                          >
                            {rs.sub}
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontStyle: 'italic',
                              fontSize: 12,
                              color: 'var(--text-muted)',
                              marginTop: 8,
                              lineHeight: 1.4,
                            }}
                          >
                            {rs.note}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="who" {...pageTransition}>
                <div style={{ marginBottom: 8 }}>
                  <span className="eyebrow">Step 03 of 04</span>
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(32px, 3.5vw, 48px)',
                    fontWeight: 500,
                    lineHeight: 1.08,
                    letterSpacing: '-0.018em',
                    marginBottom: 8,
                  }}
                >
                  Who
                  <em style={{ color: 'var(--accent-marigold)', fontStyle: 'italic' }}> lives here?</em>
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: 'var(--text-secondary)',
                    marginBottom: 28,
                  }}
                >
                  Tell us in your own words. The more you say, the more personal the design.
                </p>

                {/* Textarea */}
                <div style={{ position: 'relative', marginBottom: 24 }}>
                  <textarea
                    value={brief.who}
                    onChange={(e) => setBrief({ who: e.target.value })}
                    placeholder="A family of four &mdash; my son is four years old. My mother-in-law visits often. We watch movies together. I work some evenings. We accumulate a lot of toys."
                    style={{
                      width: '100%',
                      height: 160,
                      border: 'none',
                      borderBottom: '1.5px solid var(--border-color)',
                      background: 'transparent',
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 20,
                      lineHeight: 1.55,
                      color: 'var(--text-primary)',
                      padding: '8px 0',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderBottomColor = 'var(--accent-marigold)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderBottomColor = 'var(--border-color)';
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 0,
                      bottom: 10,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {brief.who.length} CH.
                  </span>
                </div>

                {/* Chips */}
                <div>
                  <span className="eyebrow" style={{ display: 'block', marginBottom: 12 }}>
                    Or pick what fits
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {WHO_CHIPS.map((c) => {
                      const on = brief.chips.includes(c);
                      return (
                        <div
                          key={c}
                          onClick={() => toggleChip(c)}
                          className="chamfer"
                          style={{
                            padding: '9px 18px',
                            cursor: 'pointer',
                            border: `1.5px solid ${on ? 'var(--accent-marigold)' : 'var(--border-color)'}`,
                            background: on ? 'var(--accent-marigold)' : 'transparent',
                            color: on ? '#fff' : 'var(--text-secondary)',
                            fontFamily: 'var(--font-serif)',
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
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="budget" {...pageTransition}>
                <div style={{ marginBottom: 8 }}>
                  <span className="eyebrow">Step 04 of 04</span>
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(32px, 3.5vw, 48px)',
                    fontWeight: 500,
                    lineHeight: 1.08,
                    letterSpacing: '-0.018em',
                    marginBottom: 8,
                  }}
                >
                  What's your
                  <em style={{ color: 'var(--accent-marigold)', fontStyle: 'italic' }}> budget?</em>
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: 'var(--text-secondary)',
                    marginBottom: 36,
                  }}
                >
                  For furniture and finishing. Installation is separate.
                </p>

                {/* Budget slider */}
                <div style={{ marginBottom: 48 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 'clamp(52px, 5vw, 78px)',
                      fontWeight: 500,
                      lineHeight: 1,
                      color: 'var(--accent-marigold)',
                      letterSpacing: '-0.025em',
                      marginBottom: 20,
                    }}
                  >
                    {formatBudget(brief.budget)}
                  </div>
                  <input
                    type="range"
                    min="75000"
                    max="500000"
                    step="25000"
                    value={brief.budget}
                    onChange={(e) => setBrief({ budget: +e.target.value })}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 14,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    <span>75K &middot; ESSENTIALS</span>
                    <span>1.5L &middot; FAMILY</span>
                    <span>3L &middot; COMPLETE</span>
                    <span>5L+ &middot; PREMIUM</span>
                  </div>
                </div>

                {/* City */}
                <div style={{ marginBottom: 32 }}>
                  <span className="eyebrow" style={{ display: 'block', marginBottom: 12 }}>
                    City
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0,
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    {CITIES.map((c, i) => (
                      <div
                        key={c}
                        onClick={() => setBrief({ city: c })}
                        style={{
                          flex: '1 1 0',
                          minWidth: 120,
                          padding: '16px 12px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          borderRight: i < CITIES.length - 1 ? '1px solid var(--border-color)' : 'none',
                          borderBottom: '1px solid var(--border-color)',
                          background: brief.city === c ? 'var(--bg-dark)' : 'transparent',
                          color: brief.city === c ? 'var(--text-inverse)' : 'var(--text-primary)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontStyle: 'italic',
                            fontSize: 16,
                            fontWeight: 500,
                          }}
                        >
                          {c}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final CTA */}
                <ChamferButton onClick={next} disabled={!canProceed} fullWidth style={{ padding: '16px 28px', fontSize: 14 }}>
                  Design My Room &rarr;
                </ChamferButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer nav */}
      {step < 3 && (
        <div
          style={{
            padding: '16px 56px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <ChamferButton variant="ghost" onClick={prev}>
            &larr; Back
          </ChamferButton>
          <ChamferButton onClick={next} disabled={!canProceed}>
            Continue &rarr;
          </ChamferButton>
        </div>
      )}
    </div>
  );
}
