import { useMemo, useState, useRef, useEffect } from 'react';
import Planner2D from '../components/Planner2D';
import Viewer3D from '../components/Viewer3D';
import CostWidget from '../components/ui/CostWidget';
import { estimateCostSummary, formatINR } from '../lib/costing';
import { useStore, type Item, type ItemDraft } from '../store/useStore';
import type { Act1HandoffPayload } from '../types/journey';
import { FurnitureFactory } from '../catalog/FurnitureFactory';
import type { CatalogItem } from '../catalog/types';
import { Send, Sparkles, Search, Sofa, Bed, Archive, Utensils, Laptop, Palette, Wrench, BoxSelect, Pencil, MessageSquare } from 'lucide-react';
import { processUserMessage } from '../lib/ai/chatEngine';

interface PlannerScreenProps {
  act1Payload: Act1HandoffPayload;
  onBack: () => void;
  onContinue: () => void;
  onCostOpen: () => void;
}

const sidebarItems = [
  ...FurnitureFactory.getByCategory('seating').slice(0, 4),
  ...FurnitureFactory.getByCategory('sleeping').slice(0, 3),
  ...FurnitureFactory.getByCategory('storage').slice(0, 3),
  ...FurnitureFactory.getByCategory('dining').slice(0, 2),
  ...FurnitureFactory.getByCategory('work').slice(0, 2),
  ...FurnitureFactory.getByCategory('pooja').slice(0, 1),
];

function getCategoryIcon(category: string, color: string = 'var(--brand)') {
  const props = { size: 16, color, strokeWidth: 1.5 };
  switch(category) {
    case 'seating': return <Sofa {...props} />;
    case 'sleeping': return <Bed {...props} />;
    case 'storage': return <Archive {...props} />;
    case 'dining': return <Utensils {...props} />;
    case 'pooja': return <Sparkles {...props} />;
    case 'kitchen': return <Utensils {...props} />;
    case 'work': return <Laptop {...props} />;
    case 'decor': return <Palette {...props} />;
    case 'fixtures': return <Wrench {...props} />;
    default: return <BoxSelect {...props} />;
  }
}

function getCategoryBg(category: string): string {
  const map: Record<string, string> = {
    seating: '#F0E8D8', sleeping: '#E8E4DC', storage: '#EDEAE4',
    dining: '#F5F0E8', pooja: '#FFF8E7', work: '#E8F0E8',
    decor: '#F8F5F0', kitchen: '#F0ECE4', fixtures: '#EEEBE6',
  };
  return map[category] ?? '#F4F3EE';
}

function buildDraftFromCatalog(item: CatalogItem, overrides?: Partial<{ x: number; y: number; rotation: number }>): ItemDraft {
  return {
    code: item.id,
    name: item.label,
    x: overrides?.x ?? 5,
    y: overrides?.y ?? 5,
    width: item.dimensions.width,
    length: item.dimensions.depth,
    height: item.dimensions.height,
    rotation: overrides?.rotation ?? 0,
    color: item.pricing.materialOptions['wood_teak']?.colorHex ?? '#8B6914',
    modelPath: item.modelPath.startsWith('primitive:') ? '' : item.modelPath,
    price: item.pricing.baseCost,
    brand: 'Nirmit Catalog',
  };
}

function resolveMustHaveGaps(mustHaves: string[], items: Item[]) {
  const codes = items.map((item) => item.code);
  const gaps: string[] = [];
  for (const mh of mustHaves) {
    if (mh === 'WFH Desk' && !codes.some((c) => c.includes('desk'))) gaps.push('WFH Desk is requested but not placed yet.');
    if (mh === 'Heavy Storage' && !codes.some((c) => c.includes('wardrobe') || c.includes('trunk'))) gaps.push('Heavy Storage requested. Add a wardrobe.');
    if (mh === 'Reading Nook' && !codes.some((c) => c.includes('chair') || c.includes('settee'))) gaps.push('Reading Nook requested. Add a lounge chair.');
    if (mh === 'Mandir Space' && !codes.some((c) => c.includes('pooja') || c.includes('mandir'))) gaps.push('Mandir Space requested. Add a pooja unit.');
  }
  return gaps;
}

const SUGGESTED_PROMPTS = [
  'Add a bookshelf near the window',
  'Make the sofa bigger',
  'Switch to marble flooring',
  "What's my total budget?",
  'Add a reading nook',
  'Move the TV unit to the other wall',
];

export default function PlannerScreen({ act1Payload, onContinue, onCostOpen }: PlannerScreenProps) {
  const items = useStore((s) => s.items);
  const activeItemId = useStore((s) => s.activeItemId);
  const room = useStore((s) => s.room);
  const advisories = useStore((s) => s.advisories);
  const addItem = useStore((s) => s.addItem);
  const removeItem = useStore((s) => s.removeItem);
  const rotateItem = useStore((s) => s.rotateItem);
  const setRoomConfig = useStore((s) => s.setRoomConfig);
  const setActiveItem = useStore((s) => s.setActiveItem);

  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [editMode, setEditMode] = useState<'ai' | 'manual'>('ai');
  const [suppressedVastu, setSuppressedVastu] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'ai'|'user', text: string }[]>([
    { role: 'ai', text: `Hi! I'm your Nirmit AI Designer. Your room is set up with ${act1Payload.vibeConfig.name} style. Tell me what to adjust — "add a bookshelf near the window", "make the sofa bigger", "switch to marble flooring", or just ask "what's my total?"` }
  ]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const filteredSidebarItems = useMemo(() => {
    let list = sidebarItems;
    if (activeCategory) list = FurnitureFactory.getByCategory(activeCategory as any);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.label.toLowerCase().includes(q) || i.tags.some(t => t.toLowerCase().includes(q)));
    }
    return list;
  }, [searchQuery, activeCategory]);

  const handleChatSubmit = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages(prev => [...prev, { role: 'user', text }]);
    setChatInput('');
    setChatLoading(true);
    setTimeout(() => {
      const result = processUserMessage(text);
      setChatMessages(prev => [...prev, { role: 'ai', text: result.message }]);
      setChatLoading(false);
    }, 400);
  };

  const activeItem = useMemo(() => items.find((i) => i.id === activeItemId) ?? null, [activeItemId, items]);
  const mustHaveGaps = useMemo(() => resolveMustHaveGaps(act1Payload.context.mustHaves, items), [act1Payload.context.mustHaves, items]);
  const costSummary = useMemo(() => estimateCostSummary(items, act1Payload.context.city), [act1Payload.context.city, items]);
  const costConfidence = useMemo(() => {
    const spread = costSummary.totalHigh - costSummary.totalLow;
    const avg = (costSummary.totalHigh + costSummary.totalLow) / 2;
    const confidence = avg === 0 ? 0 : Math.round(100 - (spread / avg) * 100);
    return Math.max(40, confidence);
  }, [costSummary.totalHigh, costSummary.totalLow]);
  const categories = FurnitureFactory.getCategories().filter(c => c.count > 0);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', background: 'var(--n-50)' }}>

      {/* Left Sidebar — furniture list, only in manual mode */}
      {editMode === 'manual' && (
        <aside style={{ width: 268, flexShrink: 0, height: '100%', overflowY: 'auto', borderRight: '1px solid var(--n-200)', background: 'white', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--n-200)', flexShrink: 0 }}>
            <p style={{ fontFamily: 'var(--f-display)', fontSize: '1.15rem', fontWeight: 400, color: 'var(--brand)', marginBottom: 8, margin: '0 0 8px' }}>Add Furniture</p>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search 600+ pieces..." style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: 9999, border: '1px solid var(--n-200)', fontSize: 12, fontFamily: 'var(--f-body)', outline: 'none', background: 'var(--n-50)' }} />
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setActiveCategory(null)} style={{ padding: '3px 10px', borderRadius: 9999, border: !activeCategory ? '1px solid var(--brand)' : '1px solid var(--n-200)', background: !activeCategory ? 'var(--brand)' : 'white', color: !activeCategory ? 'white' : 'var(--n-500)', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--f-body)' }}>All</button>
              {categories.slice(0, 6).map(c => (
                <button key={c.value} type="button" onClick={() => setActiveCategory(activeCategory === c.value ? null : c.value)} style={{ padding: '3px 10px', borderRadius: 9999, border: activeCategory === c.value ? '1px solid var(--brand)' : '1px solid var(--n-200)', background: activeCategory === c.value ? 'var(--brand)' : 'white', color: activeCategory === c.value ? 'white' : 'var(--n-500)', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--f-body)' }}>{c.label}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1 }}>
            {filteredSidebarItems.length === 0 && <p style={{ fontSize: 12, color: 'var(--n-400)', textAlign: 'center', padding: 20 }}>No items match.</p>}
            {filteredSidebarItems.map((item) => (
              <button key={item.id} type="button" onClick={() => addItem(buildDraftFromCatalog(item, { x: room.width / 2, y: room.length / 2 }))}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--n-200)', borderRadius: 10, background: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--n-400)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--sh-sm)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--n-200)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: getCategoryBg(item.category), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getCategoryIcon(item.category, 'var(--brand)')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--brand)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--n-500)' }}>{item.dimensions.width.toFixed(1)}m × {item.dimensions.depth.toFixed(1)}m · ₹{(item.pricing.baseCost / 1000).toFixed(0)}K</div>
                </div>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Center — Main canvas */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: 'var(--n-50)' }}>

        {/* Toolbar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--n-200)', background: 'white', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>

          {/* Mode toggle: AI vs Manual */}
          <div style={{ display: 'inline-flex', background: 'var(--n-100)', border: '1px solid var(--n-200)', borderRadius: 9999, padding: 3, gap: 2 }}>
            <button
              type="button"
              onClick={() => setEditMode('ai')}
              style={{ padding: '5px 14px', borderRadius: 9999, border: 'none', fontFamily: 'var(--f-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 240ms cubic-bezier(0.16,1,0.3,1)', background: editMode === 'ai' ? 'var(--brand)' : 'transparent', color: editMode === 'ai' ? '#C8A96E' : 'var(--n-500)', boxShadow: editMode === 'ai' ? 'var(--sh-sm)' : 'none' }}
            >
              <Sparkles size={13} />
              AI Collaborate
            </button>
            <button
              type="button"
              onClick={() => setEditMode('manual')}
              style={{ padding: '5px 14px', borderRadius: 9999, border: 'none', fontFamily: 'var(--f-body)', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 240ms cubic-bezier(0.16,1,0.3,1)', background: editMode === 'manual' ? 'var(--brand)' : 'transparent', color: editMode === 'manual' ? 'var(--n-50)' : 'var(--n-500)', boxShadow: editMode === 'manual' ? 'var(--sh-sm)' : 'none' }}
            >
              <Pencil size={13} />
              Edit Manually
            </button>
          </div>

          {/* Room shape (manual mode only) */}
          {editMode === 'manual' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {(['rectangle', 'l-shape'] as const).map((shape) => (
                <button key={shape} type="button" onClick={() => setRoomConfig({ shape })}
                  style={{ padding: '4px 12px', borderRadius: 9999, border: room.shape === shape ? '1px solid var(--brand)' : '1px solid var(--n-200)', background: room.shape === shape ? 'var(--brand)' : 'white', color: room.shape === shape ? 'var(--n-50)' : 'var(--n-600)', fontSize: 11, fontFamily: 'var(--f-body)', fontWeight: 500, cursor: 'pointer' }}>
                  {shape === 'rectangle' ? 'Rectangle' : 'L-Shape'}
                </button>
              ))}
              <span style={{ fontSize: 11, color: 'var(--n-500)', fontFamily: 'var(--f-body)' }}>{room.width}ft × {room.length}ft</span>
              <input type="number" min={6} max={20} step={0.5} value={room.width} onChange={(e) => { const v = Number.parseFloat(e.target.value); if (!Number.isNaN(v)) setRoomConfig({ width: v }); }} style={{ width: 52, padding: '3px 6px', fontSize: 11, border: '1px solid var(--n-200)', borderRadius: 6, textAlign: 'center' }} />
              <span style={{ fontSize: 11, color: 'var(--n-400)' }}>×</span>
              <input type="number" min={6} max={20} step={0.5} value={room.length} onChange={(e) => { const v = Number.parseFloat(e.target.value); if (!Number.isNaN(v)) setRoomConfig({ length: v }); }} style={{ width: 52, padding: '3px 6px', fontSize: 11, border: '1px solid var(--n-200)', borderRadius: 6, textAlign: 'center' }} />
            </div>
          )}

          {editMode === 'ai' && (
            <span style={{ fontSize: 11, color: 'var(--n-500)', fontFamily: 'var(--f-body)' }}>
              {room.width}ft × {room.length}ft · {act1Payload.vibeConfig.name}
            </span>
          )}

          {/* Must-have warning */}
          {mustHaveGaps.length > 0 && (
            <div style={{ marginLeft: 'auto', background: 'var(--clash-bg)', border: '1px solid var(--clash-border)', padding: '3px 12px', borderRadius: 9999, fontFamily: 'var(--f-body)', fontSize: 11, fontWeight: 500, color: 'var(--clash-label)' }}>
              {mustHaveGaps.length} must-have{mustHaveGaps.length > 1 ? 's' : ''} missing
            </div>
          )}
        </div>

        {/* Canvas area */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--basalt)' }}>
          {viewMode === '2D' ? <Planner2D captureId="planner-2d-capture" /> : <Viewer3D />}
        </div>

        {/* Bottom bar */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--n-200)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12 }}>
          <div style={{ display: 'inline-flex', background: 'var(--n-100)', border: '1px solid var(--n-200)', borderRadius: 9999, padding: 3, gap: 2 }}>
            {(['2D', '3D'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setViewMode(mode)}
                style={{ padding: '5px 18px', borderRadius: 9999, border: 'none', fontFamily: 'var(--f-body)', fontSize: 13, fontWeight: 500, letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 240ms cubic-bezier(0.16,1,0.3,1)', background: viewMode === mode ? 'var(--brand)' : 'transparent', color: viewMode === mode ? 'var(--n-50)' : 'var(--n-500)', boxShadow: viewMode === mode ? 'var(--sh-sm)' : 'none' }}>
                {mode}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--n-500)', fontFamily: 'var(--f-body)' }}>
            {items.length} items · ₹{formatINR(costSummary.totalLow)} – ₹{formatINR(costSummary.totalHigh)}
          </div>
          <button type="button" className="btn-primary" onClick={onContinue} disabled={items.length === 0} style={{ padding: '10px 28px', fontSize: 14, opacity: items.length === 0 ? 0.38 : 1 }}>Confirm Layout →</button>
        </div>
      </main>

      {/* Right Panel — AI Chat in ai mode, Advisories in manual mode */}
      {editMode === 'ai' && (
        <aside style={{ width: 360, flexShrink: 0, height: '100%', borderLeft: '1px solid var(--n-200)', background: 'white', display: 'flex', flexDirection: 'column' }}>
          {/* Cost estimate above chat */}
          <div style={{ padding: '0 0 10px', borderBottom: '1px solid var(--n-200)', background: 'var(--n-50)' }}>
            <div>
              <CostWidget
                low={costSummary.totalLow}
                high={costSummary.totalHigh}
                confidence={costConfidence}
                onClick={onCostOpen}
                variant="compact"
              />
            </div>
          </div>

          {/* AI Panel Header */}
          <div style={{ background: 'var(--brand)', color: 'white', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Sparkles size={18} color="#C8A96E" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Nirmit AI Designer</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>600+ verified Indian pieces</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Live</span>
            </div>
          </div>

          {/* Suggested prompts — shown when chat is fresh */}
          {chatMessages.length === 1 && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--n-100)', background: 'var(--n-50)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--n-400)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Try asking</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setChatInput(prompt)}
                    style={{ padding: '4px 10px', borderRadius: 9999, border: '1px solid var(--n-200)', background: 'white', fontSize: 11, color: 'var(--n-600)', cursor: 'pointer', transition: 'all 150ms', fontFamily: 'var(--f-body)' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--n-200)'; e.currentTarget.style.color = 'var(--n-600)'; }}
                  >{prompt}</button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14, background: '#F8F7F5', fontSize: 13, lineHeight: 1.5 }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                {msg.role === 'ai' && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--brand)', color: '#C8A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Sparkles size={14} />
                  </div>
                )}
                <div style={{
                  padding: 12, borderRadius: 14,
                  background: msg.role === 'user' ? 'var(--brand)' : 'white',
                  color: msg.role === 'user' ? 'white' : 'var(--n-800)',
                  border: msg.role === 'ai' ? '1px solid var(--n-200)' : 'none',
                  borderTopRightRadius: msg.role === 'user' ? 4 : 14,
                  borderTopLeftRadius: msg.role === 'ai' ? 4 : 14,
                  whiteSpace: 'pre-wrap', maxWidth: 280,
                  boxShadow: 'var(--sh-sm)',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--brand)', color: '#C8A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={14} />
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'white', border: '1px solid var(--n-200)', borderTopLeftRadius: 4, display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--n-400)', animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div style={{ padding: 12, background: 'white', borderTop: '1px solid var(--n-200)', flexShrink: 0 }}>
            <form
              onSubmit={(e) => { e.preventDefault(); handleChatSubmit(); }}
              style={{ display: 'flex', gap: 8 }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Tell me what to change…"
                style={{ flex: 1, background: '#F8F7F5', borderRadius: 9999, padding: '10px 16px', fontSize: 13, border: '1px solid var(--n-200)', outline: 'none', fontFamily: 'var(--f-body)' }}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', flexShrink: 0, cursor: chatInput.trim() ? 'pointer' : 'not-allowed', opacity: chatInput.trim() ? 1 : 0.5 }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </aside>
      )}

      {/* Right Panel — Cost + Advisories in manual mode */}
      {editMode === 'manual' && (
        <aside style={{ width: 292, flexShrink: 0, height: '100%', overflowY: 'auto', borderLeft: '1px solid var(--n-200)', background: 'white', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--n-200)' }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--n-400)', marginBottom: 4 }}>Running Estimate</div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--brand)', lineHeight: 1 }}>₹{formatINR(costSummary.totalLow)} – ₹{formatINR(costSummary.totalHigh)}</div>
            <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 4 }}>{items.length} items · {act1Payload.context.city} rates</div>
            <div style={{ height: 3, background: 'var(--n-100)', borderRadius: 2, marginTop: 8 }}>
              <div style={{ height: '100%', width: Math.min(20 + items.length * 8, 85) + '%', background: 'var(--brand)', borderRadius: 2, transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
          </div>

          {activeItem && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--n-200)', background: 'var(--n-50)' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--n-400)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Selected</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--brand)', marginBottom: 8 }}>{activeItem.name}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => rotateItem(activeItem.id, 90)} style={{ flex: 1, padding: '6px 8px', borderRadius: 9999, border: '1px solid var(--n-300)', background: 'white', fontSize: 12, color: 'var(--brand)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>↻ Rotate</button>
                <button type="button" onClick={() => { removeItem(activeItem.id); setActiveItem(null); }} style={{ flex: 1, padding: '6px 8px', borderRadius: 9999, border: '1px solid var(--clash-border)', background: 'var(--clash-bg)', fontSize: 12, color: 'var(--clash-label)', cursor: 'pointer' }}>Remove</button>
              </div>
            </div>
          )}

          {/* AI shortcut from manual mode */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--n-100)', background: 'var(--n-50)' }}>
            <button
              type="button"
              onClick={() => setEditMode('ai')}
              style={{ width: '100%', padding: '8px 14px', borderRadius: 9999, border: '1px solid rgba(200,169,110,0.4)', background: 'var(--brand)', color: '#C8A96E', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'var(--f-body)' }}
            >
              <MessageSquare size={14} />
              Switch to AI Collaborate
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {advisories.spatial.map((msg, i) => {
              const isPositive = msg.toLowerCase().includes('clear') || msg.toLowerCase().includes('healthy');
              return (
                <div key={`s${i}`} style={{ padding: 14, background: isPositive ? 'var(--ok-bg)' : 'var(--clash-bg)', border: `1px solid ${isPositive ? 'var(--ok-border)' : 'var(--clash-border)'}`, borderRadius: 12, animation: 'slideIn 300ms cubic-bezier(0.16,1,0.3,1)', transition: 'transform 200ms', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform='translateY(0)'}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}><span style={{ fontSize: 13, color: isPositive ? 'var(--ok-label)' : 'var(--clash-label)', flexShrink: 0 }}>{isPositive ? '✓' : '⊘'}</span><span style={{ fontSize: 12, fontWeight: 500, color: isPositive ? 'var(--ok-text)' : 'var(--clash-text)', lineHeight: 1.4 }}>{isPositive ? 'Layout check' : 'Space constraint'}</span></div>
                  <p style={{ fontSize: 11, color: isPositive ? 'var(--ok-text)' : 'var(--clash-text)', opacity: 0.85, lineHeight: 1.55, margin: 0 }}>{msg}</p>
                </div>
              );
            })}
            {advisories.vastu.filter((msg) => !suppressedVastu.has(msg)).map((msg, i) => (
              <div key={`v${i}`} style={{ padding: 14, background: 'var(--vastu-bg)', border: '1px solid var(--vastu-border)', borderRadius: 12, animation: 'slideIn 300ms cubic-bezier(0.16,1,0.3,1)', transition: 'transform 200ms', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform='translateY(0)'}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}><span style={{ fontSize: 13, color: 'var(--vastu-label)', flexShrink: 0 }}>◐</span><span style={{ fontSize: 12, fontWeight: 500, color: 'var(--vastu-text)', lineHeight: 1.4 }}>Vastu advisory</span></div>
                <p style={{ fontSize: 11, color: 'var(--vastu-text)', opacity: 0.85, lineHeight: 1.55, marginBottom: 10, marginTop: 0 }}>{msg}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 9999, border: '1px solid var(--vastu-border)', background: 'transparent', color: 'var(--vastu-label)', cursor: 'pointer' }}>Move it</button>
                  <button type="button" onClick={() => setSuppressedVastu((prev) => new Set([...prev, msg]))} style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 9999, border: '1px solid var(--vastu-border)', background: 'transparent', color: 'var(--vastu-label)', cursor: 'pointer' }}>Keep here</button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
