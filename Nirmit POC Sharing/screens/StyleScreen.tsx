import { useState } from 'react';
import Viewer3D from '../components/Viewer3D';
import { useStore } from '../store/useStore';
import { getMaterialRecommendations } from '../lib/ai/materialService';
import type { VibeOption } from '../types/journey';

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

export default function StyleScreen({ onBack, onContinue }: StyleScreenProps) {
  const [aiInput, setAiInput] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const items = useStore((s) => s.items);
  const room = useStore((s) => s.room);
  const materials = useStore((s) => s.materials);
  const setMaterials = useStore((s) => s.setMaterialConfig);

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
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', background: 'var(--n-50)' }}>
      {/* LEFT SIDEBAR — materials */}
      <aside style={{ width: 300, flexShrink: 0, height: '100%', overflowY: 'auto', borderRight: '1px solid var(--n-200)', background: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--n-200)' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--n-400)', marginBottom: 12 }}>Wall Finish</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {WALL_SWATCHES.map((color) => (
              <button key={color} type="button" onClick={() => setMaterials({ wallColor: color })}
                style={{ width: 32, height: 32, borderRadius: '50%', border: materials.wallColor === color ? '2px solid var(--brand)' : '1px solid var(--n-300)', background: color, cursor: 'pointer', transform: materials.wallColor === color ? 'scale(1.1)' : 'scale(1)', transition: 'all 200ms' }}
                aria-label={`Wall swatch ${color}`} />
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--n-200)' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--n-400)', marginBottom: 12 }}>Flooring</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
            {[
              { label: 'Vitrified Tiles', value: 'vitrified-tiles' as const, bg: '#EAEAEA' },
              { label: 'Wood Laminate', value: 'wood-laminate' as const, bg: '#BFA588' },
              { label: 'Marble', value: 'marble' as const, bg: '#F2F2F2' },
            ].map((opt) => {
              const sel = materials.flooring === opt.value;
              return (
                <button key={opt.value} type="button" onClick={() => setMaterials({ flooring: opt.value })}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: sel ? 'var(--n-100)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 150ms' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 4, background: opt.bg, border: sel ? '2px solid var(--brand)' : '1px solid var(--n-300)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontFamily: 'var(--f-body)', color: sel ? 'var(--brand)' : 'var(--n-600)', fontWeight: sel ? 500 : 400 }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--n-200)' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--n-400)', marginBottom: 12 }}>Wood Finish</div>
          <select 
            value={materials.woodFinish} 
            onChange={(e) => setMaterials({ woodFinish: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--f-body)', color: 'var(--brand)', background: 'var(--n-50)', border: '1px solid var(--n-300)', borderRadius: 8, outline: 'none', cursor: 'pointer' }}
          >
            {WOOD_FINISHES.map(wood => (
              <option key={wood.label} value={wood.label}>{wood.label}</option>
            ))}
          </select>
        </div>

        {/* AI Input */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--n-200)' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--n-400)', marginBottom: 10 }}>
            🪄 AI Assistant {aiLoading ? '(thinking...)' : ''}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAi()}
              placeholder="e.g. warm white walls..."
              style={{ flex: 1, padding: '8px 12px', fontSize: 13, fontFamily: 'var(--f-body)', border: '1px solid var(--n-300)', borderRadius: 9999, background: 'var(--n-50)', color: 'var(--brand)', outline: 'none' }} />
            <button type="button" onClick={handleAi} disabled={!aiInput.trim() || aiLoading}
              style={{ padding: '8px 14px', borderRadius: 9999, border: 'none', background: 'var(--brand)', color: 'var(--n-50)', fontSize: 13, cursor: !aiInput.trim() || aiLoading ? 'not-allowed' : 'pointer', opacity: !aiInput.trim() || aiLoading ? 0.5 : 1, flexShrink: 0 }}>→</button>
          </div>
          {aiFeedback && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--ok-bg)', border: '1px solid var(--ok-border)', borderRadius: 10, fontSize: 12, color: 'var(--ok-text)', lineHeight: 1.5, animation: 'slideIn 300ms cubic-bezier(0.16,1,0.3,1)' }}>
              ✓ {aiFeedback}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 20px', flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--n-500)', lineHeight: 1.6 }}>
            {room.width}ft × {room.length}ft · {items.length} items placed<br />
            Flooring: {materials.flooring.replace('-', ' ')}<br />
            Wood: {materials.woodFinish}
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--n-200)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" className="btn-primary" onClick={onContinue} style={{ width: '100%', padding: '12px 0', fontSize: 14 }}>
            Continue to Final Review
          </button>
          <button type="button" className="btn-ghost" onClick={onBack} style={{ width: '100%', padding: '8px 0', fontSize: 13 }}>
            Back to Planner
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <Viewer3D />
      </main>
    </div>
  );
}