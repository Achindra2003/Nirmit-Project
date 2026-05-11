import { useStore, VISIONS } from '../store/useStore';
import Logo from '../components/Logo';
import ChamferButton from '../components/ChamferButton';
import { Check } from 'lucide-react';

const BOQ_ITEMS = [
  { item: 'Sofa 3-seater', dims: '220\u00d790\u00d785 cm', buy: '\u20b938,000', build: 'N/A' },
  { item: 'TV Unit', dims: '160\u00d745\u00d755 cm', buy: '\u20b918,000', build: '\u20b911,000' },
  { item: 'Bookshelf', dims: '120\u00d730\u00d7180 cm', buy: '\u20b914,000', build: '\u20b98,500' },
  { item: 'Coffee Table', dims: '100\u00d760\u00d740 cm', buy: '\u20b98,500', build: '\u20b95,200' },
  { item: 'Mandir (wall)', dims: '60\u00d730\u00d7120 cm', buy: '\u20b912,000', build: '\u20b97,000' },
];

export default function ExportPage() {
  const { setScreen, selectedVision } = useStore();
  const vision = VISIONS[selectedVision];

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
          padding: '18px 56px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
        }}
      >
        <Logo size="sm" />
        <ChamferButton variant="ghost" onClick={() => setScreen('studio')}>
          &larr; Back to Studio
        </ChamferButton>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '48px 56px 60px',
        }}
      >
        <div className="appear">
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(32px, 3vw, 42px)',
              fontWeight: 500,
              lineHeight: 1.1,
              marginBottom: 6,
              color: 'var(--text-primary)',
            }}
          >
            Your design is ready
          </div>
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--text-muted)',
              marginTop: 4,
            }}
          >
            {vision.name} &middot; Living Room &middot; Mumbai &middot; {vision.cost}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gap: 48,
            marginTop: 40,
            alignItems: 'start',
          }}
        >
          {/* Left: Quotation */}
          <div
            className="appear-2 chamfer"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              padding: 36,
              boxShadow: '0 4px 24px rgba(44,24,16,0.07)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle grid overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                opacity: 0.15,
                pointerEvents: 'none',
              }}
            />

            {/* PDF header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                borderBottom: '2px solid var(--accent-marigold)',
                paddingBottom: 16,
                marginBottom: 24,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    color: 'var(--text-primary)',
                  }}
                >
                  NIRMIT
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.08em',
                    marginTop: 2,
                  }}
                >
                  Interior Design Quotation
                </div>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                }}
              >
                <div>Design ID: NM-2026-4821</div>
                <div>Dated: 8 May 2026</div>
              </div>
            </div>

            {/* Room render */}
            <div
              className="chamfer"
              style={{
                height: 160,
                background: 'var(--bg-base)',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <img
                src={vision.image}
                alt={vision.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.85,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 12,
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-inverse)',
                  letterSpacing: '0.1em',
                  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
              >
                Room render &middot; Entrance view
              </div>
            </div>

            {/* Summary */}
            <div style={{ marginBottom: 24, position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--accent-marigold)',
                  marginBottom: 12,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Design Summary
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px 24px',
                  fontSize: 12,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {[
                  ['Room', 'Living Room \u00b7 12\u00d714 ft'],
                  ['City', 'Mumbai'],
                  ['Vibe', vision.name],
                  ['Budget', '\u20b93,00,000'],
                  ['Total', vision.cost],
                  ['Remaining', '\u20b916,000'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 56, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{k}</span>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* BOQ Table */}
            <div style={{ marginBottom: 24, position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--accent-marigold)',
                  marginBottom: 12,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Bill of Quantities
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-sans)' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--border-color)' }}>
                    {['#', 'Item', 'Dimensions', 'Buy (Ready)', 'Build (Carpenter)'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '5px 6px',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BOQ_ITEMS.map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '6px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {String(ri + 1).padStart(2, '0')}
                      </td>
                      <td
                        style={{
                          padding: '6px',
                          color: 'var(--text-primary)',
                          fontWeight: 500,
                          fontFamily: 'var(--font-serif)',
                          fontStyle: 'italic',
                        }}
                      >
                        {row.item}
                      </td>
                      <td style={{ padding: '6px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {row.dims}
                      </td>
                      <td style={{ padding: '6px', color: 'var(--text-primary)' }}>{row.buy}</td>
                      <td style={{ padding: '6px', color: 'var(--accent-teak)', fontWeight: 600 }}>{row.build}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Hindi section */}
            <div
              className="chamfer"
              style={{
                background: '#FFF8F0',
                border: '1px solid var(--border-color)',
                padding: 16,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--accent-marigold)',
                  marginBottom: 10,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Carpenter Instructions &middot; बढ़ई का सेक्शन
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.8,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <strong style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 600 }}>टीवी यूनिट:</strong> 160cm × 45cm × 55cm · 18mm BWR प्लाई · टीक विनियर · Hettich soft-close चैनल
                <br />
                <strong style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 600 }}>बुकशेल्फ:</strong> 120cm × 30cm × 180cm · BWR प्लाई · मेलामाइन फिनिश · गोल कोने
              </div>
            </div>
          </div>

          {/* Right: Export options */}
          <div className="appear-3" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 26,
                fontWeight: 500,
                marginBottom: 6,
                color: 'var(--text-primary)',
              }}
            >
              Export options
            </div>

            {[
              {
                label: 'Full Quotation PDF',
                sub: 'All sections — Hindi specs, floor plan, BOQ, execution sequence',
                badge: 'Recommended',
              },
              { label: 'WhatsApp Image', sub: 'Room render + total cost, under 2MB' },
              { label: 'Contractor PDF', sub: 'Floor plan + BOQ + Hindi specs — for your carpenter' },
            ].map((opt) => (
              <div
                key={opt.label}
                className="chamfer"
                style={{
                  background: 'var(--bg-panel)',
                  border: '1.5px solid var(--border-color)',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-marigold)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(212,160,60,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-serif)',
                        fontStyle: 'italic',
                      }}
                    >
                      {opt.label}
                    </div>
                    {opt.badge && (
                      <span
                        className="chamfer-sm"
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          background: 'var(--accent-marigold)',
                          color: '#fff',
                          padding: '2px 8px',
                          fontFamily: 'var(--font-mono)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.sub}</div>
                </div>
                <div style={{ color: 'var(--accent-marigold)', fontSize: 20, flexShrink: 0 }}>&#8595;</div>
              </div>
            ))}

            {/* Share */}
            <div
              className="chamfer"
              style={{
                background: 'var(--bg-panel)',
                border: '1.5px solid var(--border-color)',
                padding: '18px 20px',
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 14,
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                }}
              >
                Share
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Copy Link', 'WhatsApp', 'Email'].map((s) => (
                  <ChamferButton key={s} variant="outline" style={{ fontSize: 12, padding: '8px 0', flex: 1 }}>
                    {s}
                  </ChamferButton>
                ))}
              </div>
            </div>

            {/* Validity */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '12px 2px',
              }}
            >
              <Check size={14} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  lineHeight: 1.7,
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                }}
              >
                Prices valid for 30 days. Verify current product prices before purchase. Installation
                costs not included.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
