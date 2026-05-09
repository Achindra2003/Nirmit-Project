import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { trackEvent, trackTiming } from '../lib/analytics';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import Planner2D from '../components/Planner2D';
import Viewer3D from '../components/Viewer3D';
import { formatINR, type CostSummary } from '../lib/costing';
import { generateBOQ } from '../lib/quotation/billOfQuantities';
import type { BOQ } from '../lib/quotation/billOfQuantities';
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

// ── Toast Notification Component ──

interface ToastState {
  message: string;
  visible: boolean;
}

function Toast({ message, visible }: ToastState) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: '-50%' }}
      animate={visible ? { opacity: 1, y: 0, x: '-50%' } : { opacity: 0, y: -20, x: '-50%' }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        zIndex: 9999,
        padding: '12px 24px',
        borderRadius: 12,
        background: 'var(--brand)',
        color: 'var(--n-50)',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'var(--f-body)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </motion.div>
  );
}

// ── Count-up animation component ──

function CountUp({ from, to, duration = 1500 }: { from: number; to: number; duration?: number }) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    let start: number | null = null;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setValue(from + (to - from) * ease);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [from, to, duration]);

  return <>{formatINR(Math.round(value))}</>;
}

// ── Confetti particles component ──

function ConfettiCelebration() {
  const particles = Array.from({ length: 40 }).map((_, i) => {
    const colors = ['#C8A96E', '#8B6914', '#F4F3EE', '#D4B87A', '#E8C97A', '#22c55e', '#6BB3D9', '#F59E0B'];
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = 2 + Math.random() * 3;
    const size = 4 + Math.random() * 8;
    return (
      <div
        key={i}
        className="confetti-particle"
        style={{
          left: `${left}%`,
          width: size,
          height: size * (0.5 + Math.random()),
          background: colors[i % colors.length],
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
        }}
      />
    );
  });

  return <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">{particles}</div>;
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });
  const briefRef = useRef<HTMLDivElement>(null);
  const visualsRef = useRef<HTMLDivElement>(null);
  const viewer3DRef = useRef<HTMLDivElement>(null);

  const totalItems = items.length;

  // ── Generate BOQ for execution planning ──
  const boq: BOQ = useMemo(() => generateBOQ(
    items,
    { wallColor: materials.wallColor, flooring: materials.flooring, woodFinish: materials.woodFinish },
    { width: room.width, length: room.length },
    city ?? 'Mumbai'
  ), [items, materials, room.width, room.length, city]);

  // Trigger confetti on mount
  useEffect(() => {
    setShowConfetti(true);
    const timeout = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timeout);
  }, []);

  // ── Toast helper ──
  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  }, []);

  const handleGenerateScope = async () => {
    setGenerating(true);
    trackEvent('export', 'scope.start', 'export_screen');
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
    trackEvent('export', 'pdf.download');
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
      const layoutItems = items.map((item) => ({
        name: item.name,
        x: item.x,
        y: item.y,
        width: item.width,
        length: item.length,
        rotation: item.rotation,
        code: item.code,
      }));
      generateQuotationPDF(boq, {
        roomType: room.type.replace('-', ' '),
        roomDimensions: `${room.width}ft × ${room.length}ft`,
        city: city ?? 'Mumbai',
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        imageData,
        scope: scopeText,
        roomW: room.width,
        roomL: room.length,
        layoutItems,
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
    setPdfLoading(false);
  };

  // ── Enhanced Share ──
  const handleShare = async () => {
    trackEvent('export', 'share.contractor');
    const totalEstimate = `₹${(summary.totalLow / 100000).toFixed(1)}L – ₹${(summary.totalHigh / 100000).toFixed(1)}L`;
    const shareText = `I designed my dream ${room.type.replace('-', ' ')} with Nirmit! 🏠 ${totalItems} items, ${totalEstimate} estimated. Check it out!`;

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Nirmit Room Design',
          text: shareText,
        });
        showToast('✨ Shared successfully!');
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      showToast('📋 Design summary copied to clipboard!');
    } catch {
      // Clipboard API may fail in some contexts
      showToast('📋 Share not available — try on mobile!');
    }
  };

  // ── Copy Link ──
  const handleCopyLink = async () => {
    trackEvent('export', 'share.link');
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
      await navigator.clipboard.writeText(url);
      showToast('🔗 Share link copied to clipboard!');
    } catch {
      showToast('🔗 Link ready — copy it manually below');
    }
  };

  // ── Screenshot Capture ──
  const handleCapture3D = async () => {
    setCapturing(true);
    trackEvent('export', 'capture.3d');
    try {
      // Find the 3D viewer canvas element
      const viewerEl = document.querySelector('#export-3d-viewer canvas');
      if (viewerEl) {
        const canvas = await html2canvas(viewerEl as HTMLElement, { scale: 2, useCORS: true });
        const dataUrl = canvas.toDataURL('image/png');

        // Trigger download
        const link = document.createElement('a');
        link.download = `nirmit-3d-view-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        showToast('📸 3D view captured and downloaded!');
      } else {
        // Fallback: capture the entire viewer container
        const container = document.getElementById('export-3d-viewer');
        if (container) {
          const canvas = await html2canvas(container, { scale: 2, useCORS: true });
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `nirmit-3d-view-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
          showToast('📸 3D view captured and downloaded!');
        } else {
          showToast('⚠️ Could not find 3D viewer to capture');
        }
      }
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      showToast('⚠️ Screenshot capture failed — try again');
    }
    setCapturing(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--n-100)', padding: '32px 20px 80px' }}>
      {/* Toast notification */}
      <Toast message={toast.message} visible={toast.visible} />

      {/* Confetti celebration */}
      {showConfetti && <ConfettiCelebration />}

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
              <CountUp from={0} to={summary.totalLow} /> – <CountUp from={0} to={summary.totalHigh} />
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
            <div id="export-3d-viewer" ref={viewer3DRef} style={{ border: '1px solid var(--n-200)', borderRadius: 14, overflow: 'hidden' }}>
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
                ].map(([label, value], idx) => (
                  <motion.tr
                    key={label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + idx * 0.04, duration: 0.3 }}
                    style={{ borderBottom: '1px solid var(--n-100)' }}
                  >
                    <td style={{ padding: '9px 0', color: 'var(--n-500)', width: '40%' }}>{label}</td>
                    <td style={{ padding: '9px 0', color: 'var(--brand)', fontWeight: 500, textTransform: 'capitalize' }}>{value}</td>
                  </motion.tr>
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
                  {items.map((item, idx) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      style={{ borderBottom: '1px solid var(--n-100)' }}
                    >
                      <td style={{ padding: '8px 0', color: 'var(--brand)', fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: '8px 0', color: 'var(--n-500)' }}>{item.brand}</td>
                      <td style={{ padding: '8px 0', color: 'var(--n-500)' }}>{item.width.toFixed(2)}m × {item.length.toFixed(2)}m</td>
                      <td style={{ padding: '8px 0', color: 'var(--brand)', fontWeight: 500, textAlign: 'right' }}>₹{item.price.toLocaleString('en-IN')}</td>
                    </motion.tr>
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

          {/* Execution Sequence — Phased Timeline */}
          {boq.executionSequence.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              style={{ border: '1px solid var(--n-200)', borderRadius: 16, padding: '20px 24px', background: 'var(--n-50)' }}
            >
              <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--brand)', marginBottom: 12 }}>
                Execution Plan
              </div>

              {/* Build vs Buy Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ background: 'white', borderRadius: 12, padding: 14, border: '1px solid var(--ok-border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ok-text)', marginBottom: 8 }}>
                    ✓ Buy (Factory-made)
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--n-600)', lineHeight: 1.6 }}>
                    {(() => {
                      const buyItems = boq.furniture.filter(i => i.procurement === 'buy' || i.procurement === 'buy-or-build');
                      return buyItems.length > 0 ? (
                        buyItems.slice(0, 6).map((item, i) => (
                          <div key={i} style={{ padding: '2px 0' }}>• {item.description}</div>
                        )).concat(buyItems.length > 6 ? [
                          <div key="more" style={{ color: 'var(--n-400)', fontSize: 11, marginTop: 2 }}>
                            +{buyItems.length - 6} more items
                          </div>
                        ] : [])
                      ) : (
                        <div style={{ color: 'var(--n-400)', fontStyle: 'italic' }}>No factory-made items</div>
                      );
                    })()}
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: 12, padding: 14, border: '1px solid var(--n-200)' }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--n-400)', marginBottom: 8 }}>
                    🔨 Build (On-site)
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--n-600)', lineHeight: 1.6 }}>
                    {(() => {
                      const buildItems = boq.furniture.filter(i => i.procurement === 'build' || i.procurement === 'buy-or-build');
                      return buildItems.length > 0 ? (
                        buildItems.slice(0, 6).map((item, i) => (
                          <div key={i} style={{ padding: '2px 0' }}>• {item.description}</div>
                        )).concat(buildItems.length > 6 ? [
                          <div key="more" style={{ color: 'var(--n-400)', fontSize: 11, marginTop: 2 }}>
                            +{buildItems.length - 6} more items
                          </div>
                        ] : [])
                      ) : (
                        <div style={{ color: 'var(--n-400)', fontStyle: 'italic' }}>All items ready-made</div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Phased Execution Timeline */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--n-400)', marginBottom: 10 }}>
                  Execution Sequence
                </div>
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  {/* Vertical timeline line */}
                  <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 2, background: 'var(--n-200)', borderRadius: 1 }} />
                  {boq.executionSequence.map((phase, idx) => (
                    <motion.div
                      key={phase.phase}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.1, duration: 0.3 }}
                      style={{ position: 'relative', marginBottom: 14, paddingLeft: 16 }}
                    >
                      {/* Timeline dot */}
                      <div style={{
                        position: 'absolute',
                        left: -16,
                        top: 4,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: phase.phase === 'carpentry' || phase.phase === 'furnishing' ? 'var(--brand)' : 'var(--ok-text)',
                        border: '2px solid white',
                        boxShadow: '0 0 0 2px var(--n-200)',
                        zIndex: 1,
                      }} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-700)', marginBottom: 2 }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '1px 8px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 500,
                          marginRight: 8,
                          background: phase.phase === 'carpentry' || phase.phase === 'furnishing' || phase.phase === 'finishing' ? '#FFF7ED' : 'var(--ok-bg)',
                          color: phase.phase === 'carpentry' || phase.phase === 'furnishing' || phase.phase === 'finishing' ? '#C2410C' : 'var(--ok-text)',
                        }}>
                          {phase.label}
                        </span>
                        ~{phase.durationDays} days
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--n-500)', lineHeight: 1.5 }}>
                        {phase.items.length > 0
                          ? phase.items.map(i => i.description).join(' • ')
                          : '(preparatory work — see contractor scope)'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--n-400)', marginTop: 2 }}>
                        ₹{formatINR(phase.phaseTotal)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Cost breakdown */}
          <div style={{ background: 'var(--n-50)', borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.25rem', fontWeight: 400, color: 'var(--brand)', marginBottom: 16 }}>Cost Breakdown</div>
            {[
              ['Furniture', `${formatINR(summary.furnitureLow)} – ${formatINR(summary.furnitureHigh)}`],
              ['Materials', `${formatINR(summary.materialCost)}`],
              [`Labour (${city ?? 'city'} rate)`, `${formatINR(summary.laborCost)}`],
            ].map(([label, val], idx) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.08 }}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--n-200)', fontSize: 13 }}
              >
                <span style={{ color: 'var(--n-600)' }}>{label}</span>
                <span style={{ color: 'var(--brand)', fontWeight: 500 }}>{val}</span>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 18 }}
            >
              <span style={{ fontFamily: 'var(--f-display)', fontWeight: 400, color: 'var(--brand)' }}>Subtotal (Excl. Tax)</span>
              <span style={{ fontFamily: 'var(--f-display)', fontWeight: 400, color: 'var(--brand)' }}>
                <CountUp from={0} to={summary.totalLow} /> – <CountUp from={0} to={summary.totalHigh} />
              </span>
            </motion.div>

            {/* Tax breakdown */}
            <div style={{ marginTop: 12, padding: '12px 16px', background: 'white', borderRadius: 12, border: '1px solid var(--n-200)' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--n-500)', marginBottom: 8 }}>GST Breakdown</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                <span style={{ color: 'var(--n-500)' }}>CGST @9%</span>
                <span style={{ color: 'var(--brand)', fontWeight: 500 }}>{formatINR(summary.taxBreakdown.cgst)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                <span style={{ color: 'var(--n-500)' }}>SGST @9%</span>
                <span style={{ color: 'var(--brand)', fontWeight: 500 }}>{formatINR(summary.taxBreakdown.sgst)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid var(--n-200)', marginTop: 4, fontSize: 13 }}>
                <span style={{ color: 'var(--n-700)', fontWeight: 500 }}>Total GST</span>
                <span style={{ color: 'var(--brand)', fontWeight: 600 }}>{formatINR(summary.taxBreakdown.totalTax)}</span>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 8, borderTop: '2px solid var(--brand)', fontSize: 18 }}
            >
              <span style={{ fontFamily: 'var(--f-display)', fontWeight: 400, color: 'var(--brand)' }}>Grand Total (Incl. Tax)</span>
              <span style={{ fontFamily: 'var(--f-display)', fontWeight: 400, color: 'var(--brand)' }}>
                <CountUp from={0} to={summary.totalLowWithTax} /> – <CountUp from={0} to={summary.totalHighWithTax} />
              </span>
            </motion.div>
            <p style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 8 }}>Estimate based on {city ?? 'local'} contractor rates. GST: 18% on furniture, 28% on luxury items. Actual costs may vary ±15%.</p>
          </div>
        </div>
      </div>

      {/* Warm thank-you message */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        style={{ maxWidth: 880, margin: '20px auto 0', textAlign: 'center' }}
      >
        <p className="font-display text-[clamp(1.1rem,2vw,1.4rem)] italic text-warm">
          Your dream home is just a carpenter away! 🏠
        </p>
      </motion.div>

      {/* CTAs */}
      <div style={{ maxWidth: 880, margin: '24px auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {/* Primary: Generate Scope or Show Ready */}
        <button type="button" onClick={ready ? undefined : handleGenerateScope} disabled={generating}
          className="btn-primary"
          style={{ padding: '14px 40px', fontSize: 15, opacity: generating ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          {generating && <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />}
          {generating ? 'AI writing scope…' : ready ? '✓ Scope Generated' : '🪄 Generate Scope with AI'}
        </button>

        {/* Secondary: PDF + Share + Capture (only after ready) */}
        {ready && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" onClick={handleDownloadPDF} disabled={pdfLoading}
              className="glow-pulse"
              style={{
                padding: '12px 28px', borderRadius: 9999, border: '1px solid var(--brand)',
                background: 'white', color: 'var(--brand)', fontSize: 14, cursor: 'pointer',
                fontFamily: 'var(--f-body)', fontWeight: 500,
              }}>
              {pdfLoading ? 'Generating PDF...' : '📄 Download PDF Quote'}
            </button>
            <button type="button" onClick={handleShare}
              className="glow-pulse"
              style={{
                padding: '12px 28px', borderRadius: 9999, border: '1px solid var(--n-300)',
                background: 'white', color: 'var(--n-600)', fontSize: 14, cursor: 'pointer',
                fontFamily: 'var(--f-body)', fontWeight: 500,
                animationDelay: '0.3s',
              }}>
              🔗 Share with Contractor
            </button>
            <button type="button" onClick={handleCopyLink}
              className="glow-pulse"
              style={{
                padding: '12px 28px', borderRadius: 9999, border: '1px solid var(--n-300)',
                background: 'white', color: 'var(--n-600)', fontSize: 14, cursor: 'pointer',
                fontFamily: 'var(--f-body)', fontWeight: 500,
                animationDelay: '0.5s',
              }}>
              {shareUrl ? '📋 Link Copied' : '📋 Copy Link'}
            </button>
            <button type="button" onClick={handleCapture3D} disabled={capturing}
              className="glow-pulse"
              style={{
                padding: '12px 28px', borderRadius: 9999, border: '1px solid var(--n-300)',
                background: 'white', color: 'var(--n-600)', fontSize: 14, cursor: 'pointer',
                fontFamily: 'var(--f-body)', fontWeight: 500,
                animationDelay: '0.7s',
                opacity: capturing ? 0.7 : 1,
              }}>
              {capturing ? '📸 Capturing...' : '📸 Capture 3D View'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--n-400)', cursor: 'pointer', textDecoration: 'underline' }}>Back to Style</button>
          <button type="button" onClick={onStartOver} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--n-400)', cursor: 'pointer', textDecoration: 'underline' }}>Start a new room</button>
        </div>

        {shareUrl && (
          <div style={{ marginTop: 8, padding: '8px 16px', background: 'var(--ok-bg)', border: '1px solid var(--ok-border)', borderRadius: 8, fontSize: 11, color: 'var(--ok-text)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Share link: {shareUrl}
          </div>
        )}
      </div>
    </div>
  );
}
