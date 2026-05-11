import TopBar from '../components/TopBar';

interface CoverScreenProps {
  onNav: (s: string) => void;
}

function CoverDrawing() {
  const ink = '#151210';
  const ink2 = '#5C5348';
  const ink3 = '#9B9080';
  const terra = '#C2552D';
  const terraDk = '#8A3C1A';
  const sage = '#6B7A4A';
  const stone = '#E8DDD0';
  const stone2 = '#D4C5B0';

  return (
    <svg viewBox="0 0 580 470" width="100%" style={{ maxHeight: '90vh', overflow: 'visible' }}>
      <defs>
        <pattern id="hatch" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={ink} strokeWidth="0.6" opacity="0.45" />
        </pattern>
        <pattern id="hatchTerra" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={terra} strokeWidth="0.7" opacity="0.5" />
        </pattern>
      </defs>

      {/* Floor line */}
      <line x1="20" y1="390" x2="560" y2="390" stroke={ink} strokeWidth="2" />

      {/* Walls */}
      <line x1="40" y1="390" x2="40" y2="60" stroke={ink} strokeWidth="2.5" />
      <line x1="540" y1="390" x2="540" y2="60" stroke={ink} strokeWidth="2.5" />
      <line x1="40" y1="60" x2="540" y2="60" stroke={ink} strokeWidth="2.5" />

      {/* Sofa elevation */}
      <g style={{ animation: 'fadeDraw 0.8s ease 1.4s both' }}>
        <rect x="120" y="300" width="220" height="90" fill="url(#hatch)" stroke={ink} strokeWidth="1.2" />
        <rect x="120" y="278" width="220" height="36" fill={stone2} stroke={ink} strokeWidth="1" />
        <line x1="183" y1="300" x2="183" y2="390" stroke={ink} strokeWidth="0.5" />
        <line x1="257" y1="300" x2="257" y2="390" stroke={ink} strokeWidth="0.5" />
        <line x1="130" y1="390" x2="130" y2="397" stroke={ink} strokeWidth="1" />
        <line x1="330" y1="390" x2="330" y2="397" stroke={ink} strokeWidth="1" />
      </g>

      {/* TV unit */}
      <g style={{ animation: 'fadeDraw 0.8s ease 1.8s both' }}>
        <rect x="355" y="270" width="160" height="120" fill={stone2} stroke={ink} strokeWidth="1.2" opacity="0.6" />
        <rect x="375" y="190" width="120" height="76" fill={ink} opacity="0.88" />
        <line x1="355" y1="310" x2="515" y2="310" stroke={ink3} strokeWidth="0.5" strokeDasharray="2 3" />
        <line x1="355" y1="345" x2="515" y2="345" stroke={ink3} strokeWidth="0.5" strokeDasharray="2 3" />
      </g>

      {/* Mandir niche */}
      <g style={{ animation: 'fadeDraw 0.8s ease 2.2s both' }}>
        <rect x="54" y="180" width="50" height="100" fill="url(#hatchTerra)" stroke={terra} strokeWidth="1.5" />
        <line x1="54" y1="200" x2="104" y2="200" stroke={terra} strokeWidth="0.8" />
        <circle cx="79" cy="225" r="3.5" fill={terra} />
      </g>

      {/* Pendant light */}
      <g style={{ animation: 'fadeDraw 0.8s ease 2.5s both' }}>
        <line x1="230" y1="60" x2="230" y2="155" stroke={ink} strokeWidth="0.8" />
        <path d="M 207 155 L 253 155 L 244 175 L 216 175 Z" fill={stone} stroke={ink} strokeWidth="1" />
        <ellipse cx="230" cy="300" rx="55" ry="7" fill={terra} opacity="0.06" />
      </g>

      {/* Plant */}
      <g style={{ animation: 'fadeDraw 0.8s ease 2.8s both' }}>
        <rect x="30" y="358" width="22" height="32" fill="none" stroke={sage} strokeWidth="1" />
        <path d="M 32 358 Q 28 325 41 308 Q 54 325 50 358" fill="none" stroke={sage} strokeWidth="1.2" />
        <path d="M 36 356 Q 30 340 26 326" fill="none" stroke={sage} strokeWidth="0.8" />
      </g>

      {/* Scale figure */}
      <g style={{ animation: 'fadeDraw 0.8s ease 3.1s both' }}>
        <circle cx="506" cy="328" r="6" fill={ink2} />
        <rect x="500" y="334" width="12" height="40" fill={ink2} />
        <line x1="506" y1="374" x2="506" y2="390" stroke={ink2} strokeWidth="2" />
      </g>

      {/* Ceiling dimension */}
      <g style={{ animation: 'fadeDraw 0.6s ease 3.3s both' }}>
        <line x1="20" y1="60" x2="20" y2="390" stroke={ink3} strokeWidth="0.5" />
        <line x1="16" y1="60" x2="24" y2="60" stroke={ink3} strokeWidth="0.5" />
        <line x1="16" y1="390" x2="24" y2="390" stroke={ink3} strokeWidth="0.5" />
        <text x="14" y="220" textAnchor="middle" fontFamily="var(--fm)" fontSize="9" fill={ink3} transform="rotate(-90, 14, 220)" letterSpacing="0.1em">
          10&apos;-0&quot; CEIL.
        </text>
      </g>

      {/* Marginalia — Mandir */}
      <g style={{ animation: 'fadeDraw 0.8s ease 3.6s both' }}>
        <text x="54" y="172" fontFamily="var(--fd)" fontStyle="italic" fontSize="13" fill={terraDk}>
          Mandir — northeast,
        </text>
        <text x="54" y="186" fontFamily="var(--fd)" fontStyle="italic" fontSize="13" fill={terraDk}>
          for the morning sun
        </text>
        <line x1="105" y1="200" x2="130" y2="196" stroke={terraDk} strokeWidth="0.6" />
        <circle cx="130" cy="196" r="1.5" fill={terraDk} />
      </g>

      {/* Marginalia — Sofa */}
      <g style={{ animation: 'fadeDraw 0.8s ease 4.0s both' }}>
        <text x="200" y="416" fontFamily="var(--fd)" fontStyle="italic" fontSize="13" fill={ink2}>
          9-ft sofa — for movie nights
        </text>
        <line x1="220" y1="412" x2="225" y2="393" stroke={ink2} strokeWidth="0.6" />
      </g>

      {/* Title block */}
      <g style={{ animation: 'fadeDraw 0.6s ease 4.4s both' }}>
        <line x1="20" y1="440" x2="200" y2="440" stroke={ink3} strokeWidth="0.5" />
        <text x="20" y="456" fontFamily="var(--fm)" fontSize="9" fill={ink3} letterSpacing="0.14em">
          SECTION A–A · LIVING ROOM · DRAFT
        </text>
        <text x="20" y="468" fontFamily="var(--fm)" fontSize="9" fill={ink3} letterSpacing="0.14em">
          SCALE 1:30 · NM-0042
        </text>
      </g>

      <style>{`
        @keyframes fadeDraw { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </svg>
  );
}

export default function CoverScreen({ onNav }: CoverScreenProps) {
  const ink = '#151210';
  const ink2 = '#5C5348';
  const ink3 = '#9B9080';
  const terra = '#C2552D';

  return (
    <div className="paper" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar active="cover" onNav={onNav} />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>
        {/* Left — editorial type */}
        <div
          style={{
            padding: '0 0 64px 64px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Eyebrow */}
          <div style={{ marginBottom: 24, animation: 'appearUp 0.6s ease both' }}>
            <span className="eyebrow">An interior design practice for Indian homes</span>
          </div>

          {/* H1 — massive */}
          <h1
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 'clamp(56px, 6vw, 96px)',
              lineHeight: 0.95,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: ink,
              marginBottom: 16,
              maxWidth: '13ch',
              animation: 'appearUp 0.6s ease 0.1s both',
            }}
          >
            Drawing your home,
            <br />
            <em style={{ fontWeight: 400, color: terra, fontStyle: 'italic' }}>with you.</em>
          </h1>

          {/* Hindi + English subtitle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              marginBottom: 28,
              animation: 'appearUp 0.6s ease 0.2s both',
            }}
          >
            <span style={{ fontFamily: 'var(--fh)', fontSize: 22, color: ink2 }}>आपका घर,</span>
            <span style={{ fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: 22, color: ink2, fontWeight: 400 }}>
              your hand.
            </span>
          </div>

          {/* Body */}
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: ink2,
              marginBottom: 40,
              maxWidth: '42ch',
              animation: 'appearUp 0.6s ease 0.3s both',
            }}
          >
            Answer a few questions about your flat and your family. We design your room, show you three
            versions, and give you everything your carpenter needs.
          </p>

          {/* CTA row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              marginBottom: 56,
              animation: 'appearUp 0.6s ease 0.4s both',
            }}
          >
            <button
              onClick={() => onNav('consult')}
              style={{
                background: ink,
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
                e.currentTarget.style.background = terra;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = ink;
              }}
            >
              Begin a consultation →
            </button>
            <span className="eyebrow">Free · 12 minutes · No account</span>
          </div>

          {/* City list */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              animation: 'appearUp 0.6s ease 0.5s both',
            }}
          >
            {['MUMBAI', 'PUNE', 'BANGALORE', 'DELHI', 'HYDERABAD', 'CHENNAI'].map((c) => (
              <span
                key={c}
                style={{
                  fontFamily: 'var(--fm)',
                  fontSize: 10,
                  color: ink3,
                  letterSpacing: '0.12em',
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Right — section drawing */}
        <div
          style={{
            padding: '24px 64px 64px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <CoverDrawing />
        </div>
      </div>

      <style>{`
        @keyframes appearUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
