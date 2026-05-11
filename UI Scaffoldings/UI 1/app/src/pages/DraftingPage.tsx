import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import FloorPlanSVG from '../components/FloorPlanSVG';
import Logo from '../components/Logo';

const STAGES = [
  { en: 'Reading the room', hi: 'कमरा पढ़ना' },
  { en: 'Placing the major pieces', hi: 'मुख्य फ़र्निचर' },
  { en: 'Arranging the smaller ones', hi: 'छोटे तत्व' },
  { en: 'Honouring Vastu, lining up the light', hi: 'वास्तु और प्रकाश' },
  { en: 'Materials, prices, totals', hi: 'सामग्री और मूल्य' },
];

const NOTES = [
  'Northeast corner reserved for prayer',
  'Open centre planned for the children',
  'Marine ply chosen for Mumbai humidity',
  'All items priced to market, May 2026',
  'Checking Vastu alignment...',
];

export default function DraftingPage() {
  const setScreen = useStore((s) => s.setScreen);
  const [stage, setStage] = useState(0);
  const [noteIdx, setNoteIdx] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let s = 0;
    const iv = setInterval(() => {
      s++;
      if (s >= STAGES.length + 1) {
        clearInterval(iv);
        if (!doneRef.current) {
          doneRef.current = true;
          setTimeout(() => setScreen('reveal'), 1400);
        }
      }
      setStage(s);
    }, 2200);
    return () => clearInterval(iv);
  }, [setScreen]);

  useEffect(() => {
    const iv = setInterval(() => setNoteIdx((n) => (n + 1) % NOTES.length), 2600);
    return () => clearInterval(iv);
  }, []);

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
      <div style={{ padding: '22px 56px', flexShrink: 0 }} className="appear">
        <Logo size="sm" />
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left: animated floor plan */}
        <div
          style={{
            padding: '32px 24px 32px 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ width: '100%', height: '100%', maxHeight: 560 }}>
            <FloorPlanSVG animStage={Math.min(stage, 5)} />
          </div>
        </div>

        {/* Right: narration */}
        <div
          style={{
            borderLeft: '1px solid var(--border-color)',
            padding: '48px 36px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span className="eyebrow">The architect&apos;s notes</span>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 'clamp(28px, 2.5vw, 38px)',
                fontWeight: 500,
                lineHeight: 1.1,
                color: 'var(--text-primary)',
                marginTop: 12,
                minHeight: 90,
              }}
            >
              {stage === 0 && 'Beginning to draw...'}
              {stage > 0 && stage <= STAGES.length && STAGES[stage - 1].en}
              {stage > STAGES.length && 'Three rooms ready.'}
            </div>
            <div
              key={noteIdx}
              className="fade-in"
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--text-muted)',
                marginTop: 12,
                lineHeight: 1.5,
                minHeight: 44,
              }}
            >
              &ldquo;{NOTES[noteIdx]}&rdquo;
            </div>
          </div>

          {/* Stage list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span className="eyebrow">Working steps</span>
            {STAGES.map((s, i) => {
              const done = stage > i + 1;
              const current = stage === i + 1;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: done ? 'var(--accent-marigold)' : current ? 'var(--text-primary)' : 'var(--text-muted)',
                      minWidth: 24,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: done ? 'var(--accent-marigold)' : current ? 'var(--text-secondary)' : 'var(--border-color)',
                      marginRight: 12,
                      transition: 'background 0.4s',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      fontSize: 14,
                      color: done || current ? 'var(--text-primary)' : 'var(--text-muted)',
                      flex: '0 0 auto',
                      maxWidth: '60%',
                      textAlign: 'right',
                    }}
                  >
                    {s.en}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
