import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Viewer3D from '../components/Viewer3D';
import { useStore } from '../store/useStore';
import { getMaterialRecommendations } from '../lib/ai/materialService';
import type { VibeOption } from '../types/journey';
import { Sparkles, Palette, Check, Wand2 } from 'lucide-react';

interface StyleScreenProps {
  selectedVibe?: VibeOption;
  onBack: () => void;
  onContinue: () => void;
}

const WALL_SWATCHES = ['#F5E9D6', '#ECE6DB', '#E6D8C3', '#D9CFC0', '#C8D4BF', '#C9D6DF', '#C7C0B7', '#A8A29E', '#8A8175'];

const WOOD_FINISHES = [
  { label: 'Light Oak', color: '#D4B895' },
  { label: 'Natural Cane Oak', color: '#D9C5A0' },
  { label: 'Teak Grain', color: '#8B5A2B' },
  { label: 'Royal Teak', color: '#7D4A1A' },
  { label: 'Dark Walnut', color: '#4A3728' },
  { label: 'Dark Cherry', color: '#5C2E2E' },
  { label: 'Wenge', color: '#2C2725' }
];

// ── Encouraging messages that cycle as the user explores ──
const ENCOURAGEMENTS = [
  'Your space is coming together beautifully ✨',
  'These tones feel so warm and inviting',
  'Great choice — that palette is timeless',
  'This room is going to feel amazing to walk into',
  'You have a wonderful eye for colour',
  'Every detail adds personality to your home',
];

// ── Floating particle for the "magic" feel ──
function FloatingParticle({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: [0, 0.6, 0], y: -40, x: [0, x * 0.5, x] }}
      transition={{ duration: 3 + Math.random() * 2, delay, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,169,110,0.5) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}
    />
  );
}

export default function StyleScreen({ onBack, onContinue }: StyleScreenProps) {
  const [aiInput, setAiInput] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [encouragementIdx, setEncouragementIdx] = useState(0);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [pulseSwatch, setPulseSwatch] = useState<string | null>(null);
  const encouragementTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const items = useStore((s) => s.items);
  const room = useStore((s) => s.room);
  const materials = useStore((s) => s.materials);
  const setMaterials = useStore((s) => s.setMaterialConfig);

  // ── Show encouragement toast on material change ──
  const triggerEncouragement = (action: string) => {
    setLastAction(action);
    setShowEncouragement(true);
    setEncouragementIdx((prev) => (prev + 1) % ENCOURAGEMENTS.length);
    if (encouragementTimer.current) clearTimeout(encouragementTimer.current);
    encouragementTimer.current = setTimeout(() => setShowEncouragement(false), 2800);
  };

  useEffect(() => {
    return () => { if (encouragementTimer.current) clearTimeout(encouragementTimer.current); };
  }, []);

  const handleWallChange = (color: string) => {
    setMaterials({ wallColor: color });
    setPulseSwatch(color);
    setTimeout(() => setPulseSwatch(null), 600);
    triggerEncouragement('Wall colour updated');
  };

  const handleFlooringChange = (value: 'vitrified-tiles' | 'wood-laminate' | 'marble') => {
    setMaterials({ flooring: value });
    triggerEncouragement('Flooring updated');
  };

  const handleWoodChange = (value: string) => {
    setMaterials({ woodFinish: value });
    triggerEncouragement('Wood finish updated');
  };

  const handleAi = async () => {
    const text = aiInput.toLowerCase();
    const feedback: string[] = [];

    // Quick local keyword matching for instant response
    if (text.includes('wall') && text.includes('white')) { setMaterials({ wallColor: '#ECE6DB' }); feedback.push('Wall tone shifted to warm white.'); }
    if (text.includes('wall') && text.includes('green')) { setMaterials({ wallColor: '#C8D4BF' }); feedback.push('Wall tone shifted to muted green.'); }
    if (text.includes('wall') && text.includes('blue')) { setMaterials({ wallColor: '#C9D6DF' }); feedback.push('Wall tone shifted to calm blue-grey.'); }
    if (text.includes('floor') && text.includes('marble')) { setMaterials({ flooring: 'marble' }); feedback.push('Flooring updated to marble.'); }
    if (text.includes('floor') && (text.includes('tile') || text.includes('vitrified'))) { setMaterials({ flooring: 'vitrified-tiles' }); feedback.push('Flooring updated to vitrified tiles.'); }
    if (text.includes('floor') && (text.includes('wood') || text.includes('laminate'))) { setMaterials({ flooring: 'wood-laminate' }); feedback.push('Flooring updated to wood laminate.'); }
    if (text.includes('wood') && text.includes('walnut')) { setMaterials({ woodFinish: 'Dark Walnut' }); feedback.push('Wood finish updated to Dark Walnut.'); }
    if (text.includes('wood') && text.includes('oak')) { setMaterials({ woodFinish: 'Light Oak' }); feedback.push('Wood finish updated to Light Oak.'); }

    // Try AI recommendations
    if (text.includes('recommend') || text.includes('suggest') || text.includes('help')) {
      setAiLoading(true);
      try {
        const recs = await getMaterialRecommendations(
          { type: room.type, width: room.width, length: room.length, height: 2.8 },
          'Mumbai',
          text.includes('luxury') ? 'premium' : text.includes('budget') ? 'budget' : 'mid',
          text.includes('luxury') ? 'premium' : text.includes('budget') ? 'budget' : 'mid'
        );
        if (recs.walls.length > 0) {
          feedback.push(`AI suggests: ${recs.walls[0].product} in ${recs.walls[0].color}`);
        }
        if (recs.flooring.length > 0) {
          feedback.push(`Flooring: ${recs.flooring[0].product} — ${recs.flooring[0].color}`);
        }
        if (recs.furnitureFinish.primary) {
          feedback.push(`Furniture: ${recs.furnitureFinish.primary} + ${recs.furnitureFinish.secondary}`);
          setMaterials({ woodFinish: recs.furnitureFinish.primary });
        }
      } catch {
        feedback.push('AI recommendations unavailable — using local suggestions.');
      }
      setAiLoading(false);
    }

    if (feedback.length === 0) feedback.push('Try: "warm white walls", "marble floor", "wood walnut", or "recommend mid budget"');
    setAiFeedback(feedback.join(' '));
    setAiInput('');
    triggerEncouragement('AI suggestion applied');
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', background: 'var(--n-50)' }}>
      {/* ── Encouragement Toast ── */}
      <AnimatePresence>
        {showEncouragement && (
          <motion.div
            initial={{ opacity: 0, y: -16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -16, x: '-50%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: 80,
              left: '50%',
              zIndex: 100,
              padding: '10px 22px',
              borderRadius: 9999,
              background: 'linear-gradient(135deg, rgba(200,169,110,0.15), rgba(200,169,110,0.08))',
              border: '1px solid rgba(200,169,110,0.25)',
              backdropFilter: 'blur(12px)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--brand)',
              fontFamily: 'var(--f-body)',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkles size={14} style={{ color: '#C8A96E' }} />
            {ENCOURAGEMENTS[encouragementIdx]}
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR — materials */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: 300, flexShrink: 0, height: '100%', overflowY: 'auto', borderRight: '1px solid var(--n-200)', background: 'white', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── Header with encouraging copy ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--n-200)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Palette size={18} style={{ color: '#C8A96E' }} />
            <span style={{ fontFamily: 'var(--f-display)', fontSize: '1.15rem', fontWeight: 500, color: 'var(--brand)' }}>
              Make It Yours
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--n-400)', lineHeight: 1.5 }}>
            Every surface tells a story. Choose finishes that feel like <em style={{ color: 'var(--brand)', fontStyle: 'italic' }}>home</em>.
          </p>
        </motion.div>

        {/* ── Wall Finish ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--n-200)' }}
        >
          <div style={{ fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--n-400)', marginBottom: 12 }}>
            Wall Finish
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {WALL_SWATCHES.map((color) => {
              const isSelected = materials.wallColor === color;
              const isPulsing = pulseSwatch === color;
              return (
                <motion.button
                  key={color}
                  type="button"
                  onClick={() => handleWallChange(color)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  animate={isPulsing ? { scale: [1, 1.25, 1] } : { scale: isSelected ? 1.1 : 1 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: isSelected ? '2px solid var(--brand)' : '1px solid var(--n-300)',
                    background: color,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 0 3px rgba(200,169,110,0.2)' : 'none',
                    position: 'relative',
                  }}
                  aria-label={`Wall swatch ${color}`}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        position: 'absolute',
                        inset: -4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={10} style={{ color: 'var(--brand)' }} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Flooring ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          style={{ padding: '16px 20px', borderBottom: '1px solid var(--n-200)' }}
        >
          <div style={{ fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--n-400)', marginBottom: 12 }}>Flooring</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
            {[
              { label: 'Vitrified Tiles', value: 'vitrified-tiles' as const, bg: '#EAEAEA' },
              { label: 'Wood Laminate', value: 'wood-laminate' as const, bg: '#BFA588' },
              { label: 'Marble', value: 'marble' as const, bg: '#F2F2F2' },
            ].map((opt) => {
              const sel = materials.flooring === opt.value;
              return (
                <motion.button
                  key={opt.value}
                  type="button"
                  onClick={() => handleFlooringChange(opt.value)}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(200,169,110,0.06)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: 'none',
                    background: sel ? 'var(--n-100)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 150ms',
                  }}
                >
                  <motion.div
                    animate={sel ? { rotate: [0, -5, 5, 0] } : {}}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    style={{ width: 24, height: 24, borderRadius: 4, background: opt.bg, border: sel ? '2px solid var(--brand)' : '1px solid var(--n-300)', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, fontFamily: 'var(--f-body)', color: sel ? 'var(--brand)' : 'var(--n-600)', fontWeight: sel ? 500 : 400 }}>{opt.label}</span>
                  {sel && <Check size={14} style={{ color: '#C8A96E', marginLeft: 'auto' }} />}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Wood Finish ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          style={{ padding: '16px 20px', borderBottom: '1px solid var(--n-200)' }}
        >
          <div style={{ fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--n-400)', marginBottom: 12 }}>Wood Finish</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {WOOD_FINISHES.map((wood) => {
              const sel = materials.woodFinish === wood.label;
              return (
                <motion.button
                  key={wood.label}
                  type="button"
                  onClick={() => handleWoodChange(wood.label)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 9999,
                    border: sel ? '1.5px solid var(--brand)' : '1px solid var(--n-200)',
                    background: sel ? 'rgba(200,169,110,0.08)' : 'white',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontFamily: 'var(--f-body)',
                    color: sel ? 'var(--brand)' : 'var(--n-600)',
                    fontWeight: sel ? 500 : 400,
                  }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: wood.color, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                  {wood.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── AI Input ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          style={{ padding: '16px 20px', borderBottom: '1px solid var(--n-200)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Wand2 size={13} style={{ color: '#C8A96E' }} />
            <span style={{ fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--n-400)' }}>
              AI Assistant {aiLoading ? '(thinking...)' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.input
              whileFocus={{ scale: 1.01 }}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAi()}
              placeholder="e.g. warm white walls..."
              style={{ flex: 1, padding: '8px 12px', fontSize: 13, fontFamily: 'var(--f-body)', border: '1px solid var(--n-300)', borderRadius: 9999, background: 'var(--n-50)', color: 'var(--brand)', outline: 'none' }}
            />
            <motion.button
              type="button"
              onClick={handleAi}
              disabled={!aiInput.trim() || aiLoading}
              whileHover={aiInput.trim() && !aiLoading ? { scale: 1.08 } : {}}
              whileTap={aiInput.trim() && !aiLoading ? { scale: 0.92 } : {}}
              style={{ padding: '8px 14px', borderRadius: 9999, border: 'none', background: 'var(--brand)', color: 'var(--n-50)', fontSize: 13, cursor: !aiInput.trim() || aiLoading ? 'not-allowed' : 'pointer', opacity: !aiInput.trim() || aiLoading ? 0.5 : 1, flexShrink: 0 }}
            >
              →
            </motion.button>
          </div>
          <AnimatePresence>
            {aiFeedback && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ padding: '10px 12px', background: 'var(--ok-bg)', border: '1px solid var(--ok-border)', borderRadius: 10, fontSize: 12, color: 'var(--ok-text)', lineHeight: 1.5, overflow: 'hidden' }}
              >
                ✓ {aiFeedback}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Room Summary ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          style={{ padding: '16px 20px', flex: 1 }}
        >
          <div style={{ fontSize: 11, color: 'var(--n-500)', lineHeight: 1.6 }}>
            {room.width}ft × {room.length}ft · {items.length} items placed<br />
            Flooring: {materials.flooring.replace('-', ' ')}<br />
            Wood: {materials.woodFinish}
          </div>
        </motion.div>

        {/* ── Actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          style={{ padding: '16px 20px', borderTop: '1px solid var(--n-200)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <motion.button
            type="button"
            className="btn-primary"
            onClick={onContinue}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%', padding: '12px 0', fontSize: 14 }}
          >
            Continue to Final Review
          </motion.button>
          <motion.button
            type="button"
            className="btn-ghost"
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%', padding: '8px 0', fontSize: 13 }}
          >
            Back to Planner
          </motion.button>
        </motion.div>
      </motion.aside>

      {/* ── 3D Viewer with floating particles ── */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        style={{ flex: 1, minWidth: 0, position: 'relative' }}
      >
        {/* Floating magic particles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <FloatingParticle
              key={i}
              delay={i * 0.6}
              x={(i % 2 === 0 ? 1 : -1) * (15 + Math.random() * 30)}
              size={3 + Math.random() * 5}
            />
          ))}
        </div>
        <Viewer3D />
      </motion.main>
    </div>
  );
}