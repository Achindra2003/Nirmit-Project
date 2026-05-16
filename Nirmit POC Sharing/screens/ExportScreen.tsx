import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import Planner2D from '../components/Planner2D';
import Viewer3D from '../components/Viewer3D';
import { formatINR, type CostSummary } from '../lib/costing';
import { generateBOQ } from '../lib/quotation/billOfQuantities';
import { generateQuotationPDF } from '../lib/quotation/pdfGenerator';
import { generateScopeOfWork } from '../lib/ai/scopeService';
import { useStore } from '../store/useStore';
import type { VibeOption } from '../types/journey';

interface ExportScreenProps {
  selectedVibe?: VibeOption;
  city: string | null;
  summary: CostSummary;
  onBack: () => void;
  onStartOver: () => void;
}

export default function ExportScreen({ selectedVibe, city, summary, onBack, onStartOver }: ExportScreenProps) {
  const room = useStore((s) => s.room);
  const materials = useStore((s) => s.materials);
  const items = useStore((s) => s.items);
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);
  const [scopeText, setScopeText] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const briefRef = useRef<HTMLDivElement>(null);
  const visualsRef = useRef<HTMLDivElement>(null);

  const totalItems = items.length;

  const handleGenerateScope = async () => {
    setGenerating(true);
    try {
      const scope = await generateScopeOfWork({
        room: { type: room.type, width: room.width, length: room.length, shape: room.shape },
        furniture: items,
        materials: { wallColor: materials.wallColor, flooring: materials.flooring, woodFinish: materials.woodFinish },
        city: city ?? 'Mumbai',
      });
      setScopeText(scope);
    } catch {
      // Fallback scope
      setScopeText(
        `This project covers the supply and installation of ${totalItems} furniture pieces in the ${room.type.replace('-', ' ')} as per the floor plan. All wood materials to be CenturyPly BWP-grade 19mm unless otherwise specified. Finish to be ${materials.woodFinish} as per the material schedule. Hardware to be ${selectedVibe?.materialPreset?.hardware ?? 'Hettich'} grade throughout. Wall painting to be completed using ${selectedVibe?.materialPreset?.wallPaintName ?? 'Asian Paints'} (${selectedVibe?.materialPreset?.wallPaintCode ?? 'as specified'}). Flooring installation of ${materials.flooring.replace('-', ' ')} to cover the full ${room.width}ft × ${room.length}ft area. Cleanup post-installation included.`
      );
    }
    setGenerating(false);
    setReady(true);
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      let imageData: string | undefined;
      if (visualsRef.current) {
        const canvas = await html2canvas(visualsRef.current, { scale: 2, useCORS: true });
        imageData = canvas.toDataURL('image/png');
      }

      const boq = generateBOQ(
        items,
        { wallColor: materials.wallColor, flooring: materials.flooring, woodFinish: materials.woodFinish },
        { width: room.width, length: room.length },
        city ?? 'Mumbai'
      );
      generateQuotationPDF(boq, {
        roomType: room.type.replace('-', ' '),
        roomDimensions: `${room.width}ft × ${room.length}ft`,
        city: city ?? 'Mumbai',
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        imageData,
        scope: scopeText
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
    setPdfLoading(false);
  };

  const handleShare = () => {
    const data = {
      room: { type: room.type, width: room.width, length: room.length, shape: room.shape },
      city,
      vibe: selectedVibe?.name,
      items: items.map(i => ({ name: i.name, brand: i.brand, price: i.price, width: i.width, length: i.length })),
      materials: { wallColor: materials.wallColor, flooring: materials.flooring, woodFinish: materials.woodFinish },
      scope: scopeText,
    };
    const encoded = btoa(JSON.stringify(data));
    const url = `${window.location.origin}/share?data=${encoded}`;
    setShareUrl(url);
    try {
      navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API may fail in some contexts
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--n-100)', padding: '32px 20px 80px' }}>
      <div ref={briefRef} style={{ maxWidth: 880, margin: '0 auto', background: 'white', borderRadius: 20, boxShadow: 'var(--sh-xl)', overflow: 'hidden' }}>

        {/* Document header */}
        <div style={{ background: 'var(--brand)', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,250,248,0.45)', marginBottom: 6 }}>
              Nirmit Brief
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: '2rem', fontWeight: 300, color: 'var(--n-50)', lineHeight: 1.1 }}>
              {selectedVibe?.name ?? 'Your Room'} — {city ?? 'India'}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(250,250,248,0.45)' }}>
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}{room.width}ft × {room.length}ft {room.type.replace('-', ' ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(250,250,248,0.45)', marginBottom: 4 }}>Total Estimate</div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.5rem', fontWeight: 300, color: 'var(--n-50)' }}>
              {formatINR(summary.totalLow)} – {formatINR(summary.totalHigh)}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* 2D + 3D previews */}
          <div ref={visualsRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'white' }}>
            <div style={{ border: '1px solid var(--n-200)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--n-200)', background: 'var(--n-50)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--n-400)' }}>2D Floor Plan</div>
              <div style={{ padding: 16, height: 220 }}>
                <Planner2D compact />
              </div>
            </div>
            <div style={{ border: '1px solid var(--n-200)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--n-200)', background: 'var(--n-50)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--n-400)' }}>3D Room View</div>
              <div style={{ height: 220 }}>
                <Viewer3D compact />
              </div>
            </div>
          </div>

          {/* Room spec */}
          <div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--brand)', marginBottom: 16 }}>Room Specification</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  ['Room type', room.type.replace('-', ' ')],
                  ['Dimensions', `${room.width} ft × ${room.length} ft`],
                  ['Layout', room.shape === 'l-shape' ? 'L-shaped' : 'Rectangle'],
                  ['City', city ?? '—'],
                  ['Style', selectedVibe?.name ?? '—'],
                  ['Wall paint', `${selectedVibe?.materialPreset?.wallPaintName ?? '—'} (${selectedVibe?.materialPreset?.wallPaintCode ?? '—'})`],
                  ['Flooring', materials.flooring.replace('-', ' ')],
                  ['Wood finish', materials.woodFinish],
                  ['Hardware', selectedVibe?.materialPreset?.hardware ?? '—'],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid var(--n-100)' }}>
                    <td style={{ padding: '9px 0', color: 'var(--n-500)', width: '40%' }}>{label}</td>
                    <td style={{ padding: '9px 0', color: 'var(--brand)', fontWeight: 500, textTransform: 'capitalize' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Furniture list */}
          {items.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--brand)', marginBottom: 16 }}>Furniture ({totalItems} items)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--n-200)' }}>
                    {['Item', 'Brand', 'Size', 'Price'].map((h, i) => (
                      <th key={h} style={{ padding: '6px 0', textAlign: i === 3 ? 'right' : 'left', fontWeight: 500, color: 'var(--n-400)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--n-100)' }}>
                      <td style={{ padding: '8px 0', color: 'var(--brand)', fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: '8px 0', color: 'var(--n-500)' }}>{item.brand}</td>
                      <td style={{ padding: '8px 0', color: 'var(--n-500)' }}>{item.width.toFixed(2)}m × {item.length.toFixed(2)}m</td>
                      <td style={{ padding: '8px 0', color: 'var(--brand)', fontWeight: 500, textAlign: 'right' }}>₹{item.price.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* AI-generated scope */}
          {scopeText && (
            <div style={{ border: '1px solid var(--n-200)', borderRadius: 16, padding: '20px 24px', background: 'var(--n-50)', animation: 'slideIn 400ms cubic-bezier(0.16,1,0.3,1)' }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--n-400)', marginBottom: 12 }}>Contractor Scope</div>
              <p style={{ fontSize: 13, color: 'var(--n-700)', lineHeight: 1.7, margin: 0, fontFamily: 'var(--f-body)', whiteSpace: 'pre-wrap' }}>{scopeText}</p>
            </div>
          )}

          {/* Cost breakdown */}
          <div style={{ background: 'var(--n-50)', borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--brand)', marginBottom: 16 }}>Cost Breakdown</div>
            {[
              ['Furniture', `${formatINR(summary.furnitureLow)} – ${formatINR(summary.furnitureHigh)}`],
              ['Materials', `${formatINR(summary.materialCost)}`],
              [`Labour (${city ?? 'city'} rate)`, `${formatINR(summary.laborCost)}`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--n-200)', fontSize: 13 }}>
                <span style={{ color: 'var(--n-600)' }}>{label}</span>
                <span style={{ color: 'var(--brand)', fontWeight: 500 }}>{val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 18 }}>
              <span style={{ fontFamily: 'var(--f-display)', fontWeight: 400, color: 'var(--brand)' }}>Total</span>
              <span style={{ fontFamily: 'var(--f-display)', fontWeight: 400, color: 'var(--brand)' }}>{formatINR(summary.totalLow)} – {formatINR(summary.totalHigh)}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 8 }}>Estimate based on {city ?? 'local'} contractor rates. Actual costs may vary ±15%.</p>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div style={{ maxWidth: 880, margin: '24px auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>

        {/* Primary: Download + Share — always available */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" onClick={handleDownloadPDF} disabled={pdfLoading}
            className="btn-primary"
            style={{ padding: '13px 32px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, opacity: pdfLoading ? 0.7 : 1 }}>
            {pdfLoading && <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />}
            {pdfLoading ? 'Generating PDF...' : '📄 Download PDF Quote'}
          </button>
          <button type="button" onClick={handleShare}
            style={{ padding: '13px 32px', borderRadius: 9999, border: '1px solid var(--n-300)', background: 'white', color: 'var(--n-600)', fontSize: 15, cursor: 'pointer', fontFamily: 'var(--f-body)', fontWeight: 500 }}>
            {shareUrl ? '📋 Link Copied' : '🔗 Share with Contractor'}
          </button>
        </div>

        {/* Optional: Generate AI Scope */}
        <div style={{ marginTop: 4, padding: '12px 20px', borderRadius: 14, border: '1px solid var(--n-200)', background: 'white', maxWidth: 520, width: '100%', textAlign: 'center' }}>
          {!ready ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--n-500)', marginBottom: 8, fontFamily: 'var(--f-body)' }}>
                Optional: add a contractor-ready scope of work
              </div>
              <button type="button" onClick={handleGenerateScope} disabled={generating}
                style={{ padding: '9px 24px', borderRadius: 9999, border: '1px solid rgba(200,169,110,0.5)', background: 'transparent', color: 'var(--brand)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--f-body)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 7, opacity: generating ? 0.7 : 1 }}>
                {generating && <span style={{ width: 12, height: 12, border: '2px solid rgba(28,25,23,0.2)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />}
                {generating ? 'AI writing scope…' : '🪄 Generate Scope with AI'}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: 'var(--ok-text)', fontFamily: 'var(--f-body)', fontWeight: 500 }}>
              <span style={{ color: '#22c55e', fontSize: 16 }}>✓</span> Scope added to your brief — it'll appear in the PDF
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
          <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--n-400)', cursor: 'pointer', textDecoration: 'underline' }}>Back to Style</button>
          <button type="button" onClick={onStartOver} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--n-400)', cursor: 'pointer', textDecoration: 'underline' }}>Start a new room</button>
        </div>

        {shareUrl && (
          <div style={{ marginTop: 4, padding: '8px 16px', background: 'var(--ok-bg)', border: '1px solid var(--ok-border)', borderRadius: 8, fontSize: 11, color: 'var(--ok-text)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Share link: {shareUrl}
          </div>
        )}
      </div>
    </div>
  );
}