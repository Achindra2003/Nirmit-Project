import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, VISIONS } from '../store/useStore';
import Logo from '../components/Logo';
import ChamferButton from '../components/ChamferButton';

export default function RevealPage() {
  const { setScreen, setSelectedVision } = useStore();
  const [vi, setVi] = useState(0);
  const [showWhy, setShowWhy] = useState(false);
  const v = VISIONS[vi];

  const goVision = (i: number) => {
    setVi(i);
    setShowWhy(false);
  };

  const selectVision = (i: number) => {
    setSelectedVision(i);
    setScreen('studio');
  };

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* Thin header */}
      <div
        style={{
          padding: '18px 56px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-panel)',
        }}
      >
        <Logo size="sm" />
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
          Vision {vi + 1} of {VISIONS.length}
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left: room render (full-bleed image) */}
        <div
          style={{
            flex: '0 0 60%',
            position: 'relative',
            background: 'var(--bg-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={v.id}
              src={v.image}
              alt={v.name}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5 }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                inset: 0,
              }}
            />
          </AnimatePresence>

          {/* View tabs overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 0,
              background: 'rgba(44,36,32,0.62)',
              backdropFilter: 'blur(10px)',
              padding: '5px 7px',
            }}
            className="chamfer-sm"
          >
            {['Entrance', 'Living', 'Floor plan'].map((t, i) => (
              <div
                key={t}
                className="chamfer-sm"
                style={{
                  padding: '7px 16px',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: i === 0 ? '#fff' : 'rgba(255,255,255,0.55)',
                  background: i === 0 ? 'rgba(255,255,255,0.14)' : 'transparent',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const,
                }}
              >
                {t}
              </div>
            ))}
          </div>

          {/* Caption */}
          <div style={{ position: 'absolute', left: 32, bottom: 32 }}>
            <span
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
              }}
            >
              View &middot; Entrance
            </span>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 'clamp(20px, 1.8vw, 30px)',
                fontWeight: 500,
                color: '#fff',
                marginTop: 4,
              }}
            >
              {v.name}
            </div>
          </div>
        </div>

        {/* Right: info panel */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-panel)',
            borderLeft: '1px solid var(--border-color)',
            overflow: 'auto',
          }}
        >
          {/* Vision dots */}
          <div style={{ padding: '28px 36px 0', display: 'flex', gap: 8 }}>
            {VISIONS.map((_, i) => (
              <div
                key={i}
                onClick={() => goVision(i)}
                style={{
                  cursor: 'pointer',
                  height: 8,
                  borderRadius: 4,
                  background: i === vi ? 'var(--accent-marigold)' : 'var(--border-color)',
                  width: i === vi ? 28 : 8,
                  transition: 'all 0.28s ease',
                }}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {!showWhy ? (
              <motion.div
                key={`v${vi}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                style={{
                  flex: 1,
                  padding: '24px 36px 36px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 38,
                    fontWeight: 600,
                    lineHeight: 1.1,
                    marginBottom: 6,
                    color: 'var(--text-primary)',
                  }}
                >
                  {v.name}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                    fontFamily: 'var(--font-serif)',
                    marginBottom: 28,
                  }}
                >
                  {v.philosophy}
                </div>

                {/* Palette & Materials */}
                <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
                  <div>
                    <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                      Palette
                    </span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {v.palette.map((c, i) => (
                        <div
                          key={i}
                          style={{
                            width: 32,
                            height: 32,
                            background: c,
                            border: '1px solid rgba(0,0,0,0.08)',
                          }}
                          className="chamfer-sm"
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                      Materials
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                      {v.materials.map((m) => (
                        <span
                          key={m}
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontStyle: 'italic',
                            fontSize: 13,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Insight card */}
                <div
                  className="chamfer"
                  style={{
                    background: '#FFFBF5',
                    border: '1.5px solid var(--border-color)',
                    padding: '18px 20px',
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--accent-marigold)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: 8,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Designed for you
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      fontSize: 15,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                    }}
                  >
                    {v.letter[0]}
                  </div>
                </div>

                {/* Cost */}
                <div style={{ marginBottom: 28 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: 6,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Estimated Total
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 36,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {v.cost}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      marginTop: 2,
                    }}
                  >
                    {v.cushion}
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ChamferButton fullWidth onClick={() => selectVision(vi)} style={{ padding: '15px', fontSize: 15 }}>
                    Take this further &rarr;
                  </ChamferButton>
                  <ChamferButton variant="ghost" onClick={() => setShowWhy(true)}>
                    Why was this designed for me?
                  </ChamferButton>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="why"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                style={{
                  flex: 1,
                  padding: '24px 36px 36px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <ChamferButton variant="ghost" onClick={() => setShowWhy(false)} style={{ marginBottom: 20, alignSelf: 'flex-start' }}>
                  &larr; Back to vision
                </ChamferButton>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 22,
                    fontWeight: 600,
                    marginBottom: 24,
                    color: 'var(--text-primary)',
                  }}
                >
                  Why we designed it this way
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                  {v.letter.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: 'var(--accent-marigold)',
                          opacity: 0.2,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 2,
                        }}
                      >
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: 'var(--accent-marigold)',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontStyle: 'italic',
                          fontSize: 15,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.65,
                        }}
                      >
                        {pt}
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: 8,
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      fontSize: 15,
                      color: 'var(--accent-terracotta)',
                    }}
                  >
                    {v.foot}
                  </div>
                </div>
                <ChamferButton fullWidth onClick={() => selectVision(vi)} style={{ padding: '15px', fontSize: 15, marginTop: 28 }}>
                  Take this further &rarr;
                </ChamferButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
