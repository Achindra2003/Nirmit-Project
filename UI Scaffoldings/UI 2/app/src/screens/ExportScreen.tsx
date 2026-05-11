import { useState } from 'react';
import TopBar from '../components/TopBar';

interface ExportScreenProps {
  onNav: (s: string) => void;
}

export default function ExportScreen({ onNav }: ExportScreenProps) {
  const [copied, setCopied] = useState(false);

  const ink = '#151210';
  const ink2 = '#5C5348';
  const ink3 = '#9B9080';
  const terra = '#C2552D';
  const stone = '#E8DDD0';

  const exportOptions = [
    {
      label: 'Full Quotation PDF',
      sub: 'All 7 sections — Hindi specs, floor plan, BOQ, execution sequence',
      badge: 'RECOMMENDED',
    },
    {
      label: 'WhatsApp Image',
      sub: 'Room render + total cost, under 2MB',
    },
    {
      label: 'Contractor PDF',
      sub: 'Floor plan + BOQ + Hindi specs — for Suresh',
    },
  ];

  const boqItems = [
    ['1', 'Sofa 3-seater', '220×90×85cm', '₹38,000', 'N/A'],
    ['2', 'TV Unit', '160×45×55cm', '₹18,000', '₹11,000'],
    ['3', 'Bookshelf', '120×30×180cm', '₹14,000', '₹8,500'],
    ['4', 'Coffee Table', '100×60×40cm', '₹8,500', '₹5,200'],
    ['5', 'Mandir (wall)', '60×30×120cm', '₹12,000', '₹7,000'],
  ];

  const summaryItems = [
    ['Room', 'Living Room · 12×14 ft'],
    ['City', 'Mumbai'],
    ['Vibe', 'The Gathering'],
    ['Budget', '₹3,00,000'],
    ['Total', '₹2,84,000'],
    ['Remaining', '₹16,000'],
  ];

  return (
    <div className="paper" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar active="export" onNav={onNav} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 56px' }}>
        {/* Back button */}
        <button
          onClick={() => onNav('workspace')}
          style={{
            background: 'transparent',
            border: '2px solid rgba(155,144,128,0.2)',
            color: '#9B9080',
            padding: '8px 18px',
            fontFamily: 'var(--fb)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: 32,
            borderRadius: 2,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = ink;
            e.currentTarget.style.color = ink;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(155,144,128,0.2)';
            e.currentTarget.style.color = ink3;
          }}
        >
          ← Back to Workspace
        </button>

        {/* Header */}
        <div style={{ marginBottom: 6 }}>
          <h2
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 38,
              fontWeight: 500,
              color: ink,
              lineHeight: 1.1,
            }}
          >
            Your Design is Ready
          </h2>
          <p style={{ fontSize: 14, color: ink3, marginTop: 4 }}>
            The Gathering · Living Room · Mumbai · ₹2,84,000
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 48, marginTop: 36, alignItems: 'start' }}>
          {/* Left: PDF Preview */}
          <div
            style={{
              background: '#fff',
              borderRadius: 2,
              border: '1px solid rgba(155,144,128,0.2)',
              padding: 32,
              boxShadow: '0 4px 24px rgba(21,18,16,0.07)',
            }}
          >
            {/* PDF Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid #C2552D',
                paddingBottom: 14,
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--fd)',
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    color: ink,
                  }}
                >
                  NIRMIT
                </div>
                <div style={{ fontSize: 10, color: ink3, marginTop: 2, fontFamily: 'var(--fm)' }}>
                  Interior Design Quotation
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: ink3, fontFamily: 'var(--fm)' }}>
                <div>Design ID: NM-2026-4821</div>
                <div>Dated: 8 May 2026</div>
              </div>
            </div>

            {/* Room render */}
            <div
              style={{
                height: 180,
                background: stone,
                borderRadius: 2,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src="/vision-gathering.jpg"
                alt="Room render"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Summary */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontFamily: 'var(--fm)',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: terra,
                  marginBottom: 10,
                }}
              >
                Design Summary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 20px', fontSize: 12 }}>
                {summaryItems.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: ink3, minWidth: 56, fontFamily: 'var(--fm)', fontSize: 10 }}>{k}</span>
                    <span style={{ fontWeight: 500, color: ink }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* BOQ */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontFamily: 'var(--fm)',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: terra,
                  marginBottom: 10,
                }}
              >
                Bill of Quantities
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(155,144,128,0.2)' }}>
                    {['#', 'Item', 'Dimensions', 'Buy (Ready)', 'Build (Carpenter)'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '4px 6px',
                          color: ink3,
                          fontWeight: 600,
                          fontFamily: 'var(--fm)',
                          fontSize: 9,
                          letterSpacing: '0.06em',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {boqItems.map((row) => (
                    <tr key={row[0]} style={{ borderBottom: '1px solid rgba(155,144,128,0.15)' }}>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          style={{
                            padding: '5px 6px',
                            color: ci === 4 ? terra : ink2,
                            fontWeight: ci === 4 ? 600 : 400,
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Hindi section */}
            <div
              style={{
                background: 'rgba(194,85,45,0.04)',
                border: '1px solid rgba(194,85,45,0.15)',
                borderRadius: 2,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--fm)',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: terra,
                  marginBottom: 8,
                }}
              >
                Carpenter Instructions &middot; बढ़ई का सेक्शन
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: ink2,
                  lineHeight: 1.8,
                  fontFamily: 'var(--fh)',
                }}
              >
                <strong style={{ fontFamily: 'var(--fb)' }}>टीवी यूनिट:</strong> 160cm × 45cm × 55cm · 18mm BWR प्लाई · टीक विनियर · Hettich soft-close चैनल
                <br />
                <strong style={{ fontFamily: 'var(--fb)' }}>बुकशेल्फ:</strong> 120cm × 30cm × 180cm · BWR प्लाई · मेलामाइन फिनिश · गोल कोने
              </div>
            </div>
          </div>

          {/* Right: Export options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3
              style={{
                fontFamily: 'var(--fd)',
                fontSize: 26,
                fontWeight: 500,
                color: ink,
                marginBottom: 6,
              }}
            >
              Export Options
            </h3>

            {exportOptions.map((opt) => (
              <div
                key={opt.label}
                style={{
                  background: '#fff',
                  border: '2px solid rgba(155,144,128,0.15)',
                  borderRadius: 2,
                  padding: '18px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = terra;
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(194,85,45,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(155,144,128,0.15)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: ink, fontFamily: 'var(--fb)' }}>
                      {opt.label}
                    </div>
                    {opt.badge && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          background: 'rgba(194,85,45,0.1)',
                          color: terra,
                          padding: '2px 8px',
                          borderRadius: 100,
                          letterSpacing: '0.06em',
                          fontFamily: 'var(--fm)',
                        }}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: ink3 }}>{opt.sub}</div>
                </div>
                <div style={{ color: terra, fontSize: 20, flexShrink: 0 }}>↓</div>
              </div>
            ))}

            {/* Share */}
            <div
              style={{
                background: '#fff',
                border: '2px solid rgba(155,144,128,0.15)',
                borderRadius: 2,
                padding: '18px 20px',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 14, fontFamily: 'var(--fb)' }}>
                Share
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Copy Link', 'WhatsApp', 'Email'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      if (s === 'Copy Link') {
                        navigator.clipboard.writeText(window.location.href);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '2px solid rgba(155,144,128,0.2)',
                      color: ink3,
                      padding: '8px 0',
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
                      e.currentTarget.style.borderColor = ink;
                      e.currentTarget.style.color = ink;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(155,144,128,0.2)';
                      e.currentTarget.style.color = ink3;
                    }}
                  >
                    {s === 'Copy Link' && copied ? 'Copied!' : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ fontSize: 12, color: ink3, lineHeight: 1.7, padding: '0 2px' }}>
              Prices valid for 30 days. Verify current product prices before purchase. Installation costs are not
              included in this quotation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
