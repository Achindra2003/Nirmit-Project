import { useState } from 'react';
import TopBar from '../components/TopBar';
import { VISIONS } from '../data';

interface VisionsScreenProps {
  onNav: (s: string) => void;
}

export default function VisionsScreen({ onNav }: VisionsScreenProps) {
  const [vi, setVi] = useState(0);
  const [why, setWhy] = useState(false);
  const v = VISIONS[vi];

  return (
    <div className="paper" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar active="visions" onNav={onNav} />

      {/* Vision tabs */}
      <div
        style={{
          padding: '20px 48px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '2px solid rgba(155,144,128,0.15)',
          flexShrink: 0,
        }}
      >
        <span className="eyebrow">
          Three rooms drawn for you &middot; {v.cushion}
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          {VISIONS.map((vv, i) => {
            const sel = vi === i;
            return (
              <div
                key={i}
                onClick={() => {
                  setVi(i);
                  setWhy(false);
                }}
                style={{
                  padding: '14px 24px',
                  cursor: 'pointer',
                  borderBottom: sel ? '2px solid #C2552D' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--fm)',
                    fontSize: 10,
                    color: '#9B9080',
                    letterSpacing: '0.14em',
                    marginRight: 8,
                  }}
                >
                  {vv.n}.
                </span>
                <span
                  style={{
                    fontFamily: 'var(--fd)',
                    fontStyle: 'italic',
                    fontSize: 16,
                    fontWeight: 500,
                    color: sel ? '#C2552D' : '#9B9080',
                    transition: 'color 0.2s',
                  }}
                >
                  {vv.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spread */}
      <div
        key={vi}
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '58% 1fr',
          minHeight: 0,
          animation: 'fadeIn 0.35s ease',
        }}
      >
        {/* Left — Room render */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 16px 24px 48px',
            gap: 16,
            minHeight: 0,
          }}
        >
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
            <img
              src={v.image}
              alt={v.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Gradient overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(transparent 40%, rgba(26,23,20,0.7) 100%)',
              }}
            />
            {/* View pills */}
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                display: 'flex',
                background: 'rgba(21,18,16,0.6)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {['ENTRANCE', 'LIVING', 'FLOOR PLAN'].map((t, i) => (
                <div
                  key={t}
                  style={{
                    padding: '7px 14px',
                    fontFamily: 'var(--fm)',
                    fontSize: 9.5,
                    letterSpacing: '0.1em',
                    color: i === 0 ? '#E8DDD0' : 'rgba(232,221,208,0.45)',
                    background: i === 0 ? 'rgba(232,221,208,0.1)' : 'transparent',
                    borderLeft: i > 0 ? '1px solid rgba(232,221,208,0.1)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
            {/* Caption */}
            <div style={{ position: 'absolute', left: 24, bottom: 24 }}>
              <span
                style={{
                  fontFamily: 'var(--fm)',
                  fontSize: 9,
                  color: 'rgba(232,221,208,0.45)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                VIEW &middot; ENTRANCE
              </span>
              <div
                style={{
                  fontFamily: 'var(--fd)',
                  fontStyle: 'italic',
                  fontSize: 'clamp(20px, 1.8vw, 28px)',
                  fontWeight: 500,
                  color: '#E8DDD0',
                  marginTop: 4,
                }}
              >
                {v.name}
              </div>
            </div>
          </div>

          {/* Materials strip */}
          <div style={{ display: 'flex', gap: 32, flexShrink: 0 }}>
            <div>
              <span className="eyebrow">Palette</span>
              <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                {v.palette.map((c, i) => (
                  <div
                    key={i}
                    style={{ width: 36, height: 36, background: c, border: '1px solid rgba(0,0,0,0.06)' }}
                  />
                ))}
              </div>
            </div>
            <div>
              <span className="eyebrow">Materials</span>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                {v.materials.map((m) => (
                  <span
                    key={m}
                    style={{ fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: 13.5, color: '#5C5348' }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Letter panel */}
        <div
          style={{
            borderLeft: '2px solid rgba(155,144,128,0.15)',
            padding: '28px 48px 28px 32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
        >
          {!why ? (
            <div
              key="letter"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.4s ease both' }}
            >
              <div style={{ fontFamily: 'var(--fd)', fontSize: 17, color: '#5C5348', marginBottom: 20 }}>
                <span style={{ fontStyle: 'normal', fontWeight: 500 }}>Dear Priya,</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                {v.letter.map((p, i) => (
                  <p
                    key={i}
                    style={{
                      fontFamily: 'var(--fd)',
                      fontSize: i === 0 ? 18 : 16,
                      lineHeight: 1.65,
                      color: '#151210',
                      fontWeight: i === 0 ? 500 : 400,
                      fontStyle: i === 0 ? 'normal' : 'italic',
                    }}
                  >
                    {p}
                  </p>
                ))}
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: 'var(--fd)',
                    fontStyle: 'italic',
                    fontSize: 15,
                    color: '#C2552D',
                  }}
                >
                  {v.foot}
                </div>
              </div>

              {/* Cost section */}
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 22,
                  borderTop: '2px solid rgba(155,144,128,0.15)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  flexShrink: 0,
                }}
              >
                <div>
                  <span className="eyebrow">Total estimate</span>
                  <div
                    style={{
                      fontFamily: 'var(--fd)',
                      fontSize: 'clamp(28px, 2.8vw, 40px)',
                      fontWeight: 500,
                      color: '#151210',
                      marginTop: 4,
                    }}
                  >
                    {v.cost}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--fd)',
                      fontStyle: 'italic',
                      fontSize: 12.5,
                      color: '#9B9080',
                      marginTop: 2,
                    }}
                  >
                    {v.cushion}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <button
                    onClick={() => onNav('workspace')}
                    style={{
                      background: '#151210',
                      color: '#E8DDD0',
                      border: 'none',
                      padding: '14px 32px',
                      fontFamily: 'var(--fb)',
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#C2552D';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#151210';
                    }}
                  >
                    Take this further →
                  </button>
                  <button
                    onClick={() => setWhy(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--fd)',
                      fontStyle: 'italic',
                      fontSize: 13,
                      color: '#9B9080',
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                      padding: 0,
                    }}
                  >
                    Why was this designed for me?
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div key="why" style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.4s ease both' }}>
              <button
                onClick={() => setWhy(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--fb)',
                  fontSize: 12,
                  color: '#9B9080',
                  textAlign: 'left',
                  marginBottom: 24,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ← Back
              </button>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 500, marginBottom: 22, color: '#151210' }}>
                Why we designed it this way
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                {v.letter.map((pt, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#C2552D',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                      }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8DDD0' }} />
                    </div>
                    <p style={{ fontFamily: 'var(--fd)', fontSize: 15, color: '#5C5348', lineHeight: 1.65 }}>
                      {pt}
                    </p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24, flexShrink: 0 }}>
                <button
                  onClick={() => onNav('workspace')}
                  style={{
                    background: '#151210',
                    color: '#E8DDD0',
                    border: 'none',
                    padding: '14px 32px',
                    fontFamily: 'var(--fb)',
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#C2552D';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#151210';
                  }}
                >
                  Take this further →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
