import { Suspense, lazy } from 'react';
import { useStore } from '../store/useStore';
import Logo from '../components/Logo';
import ChamferButton from '../components/ChamferButton';

const MaterialStillLife = lazy(() => import('../components/MaterialStillLife'));

export default function CoverPage() {
  const setScreen = useStore((s) => s.setScreen);

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
      {/* Top nav */}
      <div style={{ padding: '28px 56px', flexShrink: 0 }} className="appear">
        <Logo />
      </div>

      {/* Hero split */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1.05fr 1fr',
          minHeight: 0,
          padding: '0 56px 64px',
          gap: 48,
        }}
      >
        {/* Left: editorial text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 0,
            paddingBottom: 24,
          }}
        >
          <div className="appear" style={{ marginBottom: 20 }}>
            <span className="eyebrow">An interior design practice for Indian homes</span>
          </div>

          <h1
            className="appear-2"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(48px, 4.8vw, 78px)',
              lineHeight: 1.02,
              fontWeight: 500,
              letterSpacing: '-0.022em',
              color: 'var(--text-primary)',
              marginBottom: 16,
              maxWidth: '13ch',
            }}
          >
            Your home,
            <br />
            <em style={{ fontWeight: 400, color: 'var(--accent-marigold)', fontStyle: 'italic' }}>
              designed.
            </em>
          </h1>

          <p
            className="appear-3"
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 18,
              color: 'var(--text-secondary)',
              marginBottom: 36,
              maxWidth: '40ch',
              lineHeight: 1.6,
            }}
          >
            Answer four questions about your flat and your family. We design your room, show you
            three versions, and give you everything your carpenter needs.
          </p>

          <div className="appear-4" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
            <ChamferButton
              onClick={() => setScreen('intake')}
              style={{ padding: '15px 36px', fontSize: 14 }}
            >
              Begin &rarr;
            </ChamferButton>
            <span className="eyebrow">Free &middot; 2 minutes &middot; No account</span>
          </div>

          <div className="appear-5" style={{ display: 'flex', gap: 24 }}>
            {['Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Chennai'].map((c) => (
              <span
                key={c}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.12em',
                }}
              >
                {c.toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        {/* Right: 3D still life */}
        <div
          className="appear-3"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ width: '100%', height: '80%', maxHeight: 500 }}>
            <Suspense
              fallback={
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                  }}
                >
                  Loading materials...
                </div>
              }
            >
              <MaterialStillLife />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
