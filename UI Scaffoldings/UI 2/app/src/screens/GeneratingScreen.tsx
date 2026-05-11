import { useState, useEffect, useRef } from 'react';
import TopBar from '../components/TopBar';
import FloorPlan from '../components/FloorPlan';
import { GEN_STAGES, GEN_NOTES } from '../data';

interface GeneratingScreenProps {
  onNav: (s: string) => void;
}

export default function GeneratingScreen({ onNav }: GeneratingScreenProps) {
  const [stage, setStage] = useState(0);
  const [noteIdx, setNoteIdx] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let s = 0;
    const iv = setInterval(() => {
      s++;
      if (s >= GEN_STAGES.length + 1) {
        clearInterval(iv);
        if (!doneRef.current) {
          doneRef.current = true;
          setTimeout(() => onNav('visions'), 1500);
        }
      } else {
        setStage(s);
      }
    }, 2200);
    return () => clearInterval(iv);
  }, [onNav]);

  useEffect(() => {
    const iv = setInterval(() => setNoteIdx((n) => (n + 1) % GEN_NOTES.length), 2600);
    return () => clearInterval(iv);
  }, []);

  const visibleNotes = GEN_NOTES.slice(0, stage).map((txt, i) => ({
    txt,
    pos: [
      [36, 18],
      [36, 36],
      [24, 88],
      [78, 14],
      [18, 56],
      [24, 96],
    ][i] || [20, 50],
  }));

  return (
    <div className="paper" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar active="draft" onNav={onNav} />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0, minHeight: 0 }}>
        {/* Drawing surface */}
        <div
          style={{
            position: 'relative',
            padding: '32px 24px 32px 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '100%', height: '100%', maxHeight: 540, position: 'relative' }}>
            <FloorPlan S={26} animStage={stage} />

            {/* Marginalia overlay */}
            {visibleNotes.map((n, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${n.pos[0]}%`,
                  top: `${n.pos[1]}%`,
                  fontFamily: 'var(--fd)',
                  fontStyle: 'italic',
                  fontSize: 13,
                  color: i === 3 ? '#C2552D' : '#5C5348',
                  maxWidth: 220,
                  lineHeight: 1.4,
                  textShadow: '0 0 12px #E8DDD0',
                  animation: 'fadeIn 0.6s ease both',
                }}
              >
                {n.txt}
              </div>
            ))}
          </div>
        </div>

        {/* Right margin — narration */}
        <div
          style={{
            borderLeft: '2px solid rgba(155,144,128,0.15)',
            padding: '48px 36px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#1A1714',
          }}
        >
          <div>
            <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'rgba(232,221,208,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Architect&apos;s notes
            </span>
            <div
              style={{
                fontFamily: 'var(--fd)',
                fontStyle: 'italic',
                fontSize: 'clamp(24px, 2.2vw, 34px)',
                fontWeight: 500,
                lineHeight: 1.1,
                color: '#E8DDD0',
                marginTop: 14,
                minHeight: 82,
              }}
            >
              {stage === 0 && 'Beginning to draw…'}
              {stage > 0 && stage <= GEN_STAGES.length && GEN_STAGES[stage - 1].en}
              {stage > GEN_STAGES.length && 'Three rooms are ready.'}
            </div>
            <div
              style={{
                fontFamily: 'var(--fh)',
                fontSize: 16,
                color: 'rgba(232,221,208,0.25)',
                marginTop: 8,
              }}
            >
              {stage > 0 && stage <= GEN_STAGES.length && GEN_STAGES[stage - 1].hi}
            </div>
            <div
              key={noteIdx}
              style={{
                fontFamily: 'var(--fd)',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'rgba(232,221,208,0.35)',
                marginTop: 12,
                lineHeight: 1.5,
                minHeight: 44,
                animation: 'fadeIn 0.5s ease both',
              }}
            >
              &ldquo;{GEN_NOTES[noteIdx]}&rdquo;
            </div>
          </div>

          {/* Working steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'rgba(232,221,208,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Working steps
            </span>
            {GEN_STAGES.map((s, i) => {
              const done = stage > i + 1;
              const current = stage === i + 1;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontFamily: 'var(--fm)',
                      fontSize: 9.5,
                      color: done ? '#C2552D' : current ? '#E8DDD0' : 'rgba(232,221,208,0.2)',
                      minWidth: 22,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: done ? '#C2552D' : current ? '#E8DDD0' : 'rgba(232,221,208,0.08)',
                      transition: 'background 0.4s',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--fd)',
                      fontStyle: 'italic',
                      fontSize: 13,
                      color: done || current ? '#E8DDD0' : 'rgba(232,221,208,0.2)',
                      textAlign: 'right',
                      flex: '0 0 auto',
                      maxWidth: '65%',
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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
