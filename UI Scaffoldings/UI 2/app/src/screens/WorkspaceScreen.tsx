import { useState } from 'react';
import Logo from '../components/Logo';
import FloorPlan from '../components/FloorPlan';
import AIChat from '../components/AIChat';

interface WorkspaceScreenProps {
  onNav: (s: string) => void;
}

export default function WorkspaceScreen({ onNav }: WorkspaceScreenProps) {
  const [view, setView] = useState('2d');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1A1714' }}>
      {/* Header */}
      <div
        style={{
          height: 56,
          padding: '0 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          borderBottom: '2px solid rgba(232,221,208,0.06)',
        }}
      >
        <Logo dark size="sm" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(232,221,208,0.06)',
              borderRadius: 2,
              padding: 3,
              gap: 2,
            }}
          >
            {[
              ['2D PLAN', '2d'],
              ['3D VIEW', '3d'],
            ].map(([label, id]) => (
              <div
                key={id}
                onClick={() => setView(id)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 2,
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: 'var(--fm)',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  background: view === id ? 'rgba(232,221,208,0.1)' : 'transparent',
                  color: view === id ? '#E8DDD0' : 'rgba(232,221,208,0.35)',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Cost chip */}
          <div
            style={{
              background: 'rgba(232,221,208,0.05)',
              border: '2px solid rgba(194,85,45,0.2)',
              borderRadius: 2,
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div
                style={{
                  width: 56,
                  height: 3,
                  background: 'rgba(232,221,208,0.1)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div style={{ width: '76%', height: '100%', background: '#C2552D', borderRadius: 2 }} />
              </div>
              <div
                style={{
                  fontFamily: 'var(--fm)',
                  fontSize: 8,
                  color: 'rgba(232,221,208,0.3)',
                  letterSpacing: '0.06em',
                }}
              >
                76% OF BUDGET
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--fd)',
                fontSize: 20,
                fontWeight: 600,
                color: '#C2552D',
              }}
            >
              ₹2,84,000
            </div>
          </div>

          <button
            onClick={() => onNav('export')}
            style={{
              background: 'transparent',
              border: '2px solid rgba(232,221,208,0.15)',
              color: 'rgba(232,221,208,0.5)',
              padding: '8px 20px',
              fontFamily: 'var(--fb)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              borderRadius: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(232,221,208,0.4)';
              e.currentTarget.style.color = '#E8DDD0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(232,221,208,0.15)';
              e.currentTarget.style.color = 'rgba(232,221,208,0.5)';
            }}
          >
            Export
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left: Canvas */}
        <div
          style={{
            flex: '0 0 58%',
            borderRight: '2px solid rgba(232,221,208,0.06)',
            background: '#14110E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {view === '2d' ? (
            <FloorPlan />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <svg width="160" height="90" viewBox="0 0 160 90">
                <defs>
                  <pattern
                    id="stripe3d"
                    x="0"
                    y="0"
                    width="14"
                    height="14"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(30)"
                  >
                    <rect width="14" height="14" fill="rgba(232,221,208,0.03)" />
                    <rect width="2" height="14" fill="rgba(232,221,208,0.06)" />
                  </pattern>
                </defs>
                <rect width="160" height="90" rx="4" fill="url(#stripe3d)" />
                <text
                  x="80"
                  y="48"
                  textAnchor="middle"
                  fontSize="12"
                  fill="rgba(232,221,208,0.25)"
                  fontFamily="monospace"
                >
                  Three.js 3D view
                </text>
              </svg>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(232,221,208,0.2)',
                  fontFamily: 'monospace',
                }}
              >
                Three.js + React Three Fiber
              </div>
            </div>
          )}
        </div>

        {/* Right: AI Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '2px solid rgba(232,221,208,0.06)',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--fm)',
                fontSize: 10,
                color: 'rgba(232,221,208,0.3)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Design Collaborator
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AIChat />
          </div>
        </div>
      </div>
    </div>
  );
}
