import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, Compass, Maximize2, Shield, Users, Wind, Archive, Eye, Map } from 'lucide-react';
import type { LayoutResult } from '../solver/layoutSolver';
import type { AIRankedLayout } from '../lib/ai/layoutService';
import { FurnitureFactory } from '../catalog/FurnitureFactory';
import { type ItemDraft } from '../store/useStore';
import { type RoomRenderResult, generateFallbackRender } from '../lib/ai/imageService';

function MiniMap({ layout, width, length, animate }: { layout: LayoutResult; width: number; length: number; animate?: boolean }) {
  return (
    <svg viewBox={`-1 -1 ${width + 2} ${length + 2}`} className="w-full h-full">
      {/* Room outline with stroke-dashoffset draw animation */}
      <rect x="0" y="0" width={width} height={length}
        fill="white" stroke="var(--brand)" strokeWidth="0.08" rx="0.08"
        strokeDasharray={animate ? `${(width + length) * 2}` : 'none'}
        strokeDashoffset={animate ? `${(width + length) * 2}` : '0'}
        style={animate ? { animation: 'strokeDraw 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' } : undefined}
      />

      {/* Grid */}
      {Array.from({ length: Math.floor(width) }).map((_, i) => (
        <line key={`vg${i}`} x1={i + 1} y1={0} x2={i + 1} y2={length}
          stroke="var(--n-200)" strokeWidth="0.02" />
      ))}
      {Array.from({ length: Math.floor(length) }).map((_, i) => (
        <line key={`hg${i}`} x1={0} y1={i + 1} x2={width} y2={i + 1}
          stroke="var(--n-200)" strokeWidth="0.02" />
      ))}

      {/* Door indicator */}
      <rect x={width / 2 - 0.3} y={length - 0.08} width={0.6} height={0.08}
        fill="var(--brand)" rx="0.02" />

      {/* Window indicator */}
      <rect x={width - 0.08} y={length / 2 - 0.4} width={0.08} height={0.8}
        fill="#6BB3D9" rx="0.02" />

      {/* Furniture */}
      {layout.placements.map((p, i) => {
        const item = FurnitureFactory.getItem(p.catalogId);
        if (!item) return null;
        const w = item.dimensions.width;
        const d = item.dimensions.depth;
        const isPooja = item.category === 'pooja';
        const isSofa = item.category === 'seating';
        const isStorage = item.category === 'storage';
        const fill = isPooja ? '#C8A96E' : isSofa ? '#8B7355' : isStorage ? '#6B5D4F' : '#9B8F80';
        return (
          <g key={i} transform={`translate(${p.x}, ${p.y}) rotate(${p.rotation})`}>
            <rect
              x={-w / 2} y={-d / 2} width={w} height={d}
              fill={fill} fillOpacity="0.85"
              stroke="var(--brand)" strokeWidth="0.03" rx="0.04"
            />
          </g>
        );
      })}

      {/* Compass */}
      <g transform={`translate(${width - 0.35}, 0.35)`}>
        <circle cx="0" cy="0" r="0.2" fill="rgba(255,255,255,0.9)" stroke="var(--n-300)" strokeWidth="0.02" />
        <text x="0" y="0.06" textAnchor="middle" fontSize="0.16" fill="var(--brand)" fontWeight="700">N</text>
      </g>
    </svg>
  );
}

interface VisionsScreenProps {
  layouts: LayoutResult[];
  rankings: AIRankedLayout[];
  roomWidth: number;
  roomLength: number;
  renders: Map<number, RoomRenderResult[]>;
  onSelectLayout: (items: ItemDraft[]) => void;
  onBack: () => void;
}

// Three design philosophies — each with a philosophy tag, one-line desc, and design driver
const PHILOSOPHY_META: Record<string, { name: string; desc: string; designDriver: string; icon: typeof Users; fallbackWhyUs: string }> = {
  gathering: {
    name: 'The Gathering',
    desc: 'Warm, conversation-first layout where everyone faces each other. Built for family time.',
    designDriver: 'Maximizes togetherness',
    icon: Users,
    fallbackWhyUs: 'We noticed your family profile and prioritized a layout where everyone faces each other. The seating is arranged in a natural circle so conversation flows easily. The mandir is placed northeast for Vastu harmony.',
  },
  breath: {
    name: 'The Breath',
    desc: 'Open, minimal, made for peace and space. Light-filled with clear walkways.',
    designDriver: 'Maximizes openness',
    icon: Wind,
    fallbackWhyUs: 'With your room dimensions, we maximized open floor space. The center stays free so light and air move naturally through the room. Perfect for families who love to move freely and entertain.',
  },
  keeper: {
    name: 'The Keeper',
    desc: 'Storage-first design where every wall works hard. Organized, efficient, nothing wasted.',
    designDriver: 'Maximizes storage',
    icon: Archive,
    fallbackWhyUs: 'Based on your must-haves list, we packed in maximum functionality without sacrificing comfort. Every wall earns its keep with modular storage that goes floor to ceiling. The center stays open so the room breathes.',
  },
};

function getVisionFeatures(layout: LayoutResult): string[] {
  const features: string[] = [];
  let hasPooja = false, hasDesk = false, hasTv = false, hasSofa = false;

  for (const p of layout.placements) {
    const item = FurnitureFactory.getItem(p.catalogId);
    if (!item) continue;
    if (item.category === 'pooja') hasPooja = true;
    if (item.category === 'work') hasDesk = true;
    if (item.tags.includes('entertainment') || item.tags.includes('living')) hasTv = true;
    if (item.category === 'seating') hasSofa = true;
  }

  if (hasPooja) features.push('Mandir placed');
  if (hasDesk) features.push('WFH desk');
  if (hasTv) features.push('TV unit');
  if (hasSofa) features.push('Seating zone');
  features.push(`${layout.placements.length} pieces`);
  if (layout.score > 65) features.push('Vastu-friendly');

  return features.slice(0, 4);
}

export default function VisionsScreen({
  layouts, rankings, roomWidth, roomLength, renders, onSelectLayout, onBack
}: VisionsScreenProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Per-card view angle state: layoutId -> 'entrance' | 'living'
  const [viewAngles, setViewAngles] = useState<Record<number, 'entrance' | 'living'>>({});
  // Per-card floor plan toggle
  const [showFloorPlan, setShowFloorPlan] = useState<Record<number, boolean>>({});

  // Convert ft to meters for minimap
  const wM = roomWidth * 0.3048;
  const lM = roomLength * 0.3048;

  /** Get the render for a specific layout and view angle */
  const getRender = (layoutId: number, viewAngle: 'entrance' | 'living'): RoomRenderResult | undefined => {
    const layoutRenders = renders.get(layoutId);
    if (!layoutRenders) return undefined;
    return layoutRenders.find((r) => r.viewAngle === viewAngle);
  };

  /** Toggle view angle for a card */
  const toggleViewAngle = (layoutId: number) => {
    setViewAngles((prev) => ({
      ...prev,
      [layoutId]: prev[layoutId] === 'living' ? 'entrance' : 'living',
    }));
  };

  /** Toggle floor plan for a card */
  const toggleFloorPlan = (layoutId: number) => {
    setShowFloorPlan((prev) => ({
      ...prev,
      [layoutId]: !prev[layoutId],
    }));
  };

  const handleSelect = (layoutIndex: number) => {
    const layout = layouts[layoutIndex];
    if (!layout) return;

    setSelectedId(layoutIndex);

    // Delay actual selection for the expand animation
    setTimeout(() => {
      const drafts: ItemDraft[] = layout.placements.map(p => {
        const catItem = FurnitureFactory.getItem(p.catalogId);
        return {
          code: p.catalogId,
          name: catItem?.label ?? 'Item',
          x: p.x,
          y: p.y,
          width: catItem?.dimensions.width ?? 1,
          length: catItem?.dimensions.depth ?? 1,
          height: catItem?.dimensions.height ?? 1,
          rotation: p.rotation,
          color: catItem?.pricing?.materialOptions?.['wood_teak']?.colorHex ?? '#8B6914',
          modelPath: catItem?.modelPath.startsWith('primitive:') ? '' : (catItem?.modelPath ?? ''),
          price: catItem?.pricing.baseCost ?? 10000,
          brand: 'Nirmit Verified',
        };
      });
      onSelectLayout(drafts);
    }, 400);
  };

  const visionsToShow = rankings.slice(0, 3);

  /** Resolve the philosophy metadata for a ranking, falling back to breath */
  const resolvePhilosophy = (rank: AIRankedLayout) => {
    const phil = rank.philosophy ?? 'breath';
    return PHILOSOPHY_META[phil] ?? PHILOSOPHY_META['breath'];
  };

  return (
    <section className="min-h-[calc(100vh-56px)] bg-[var(--n-50)] text-[var(--brand)] py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-[1px] w-8 bg-[var(--n-300)]" />
            <span className="font-ui text-[11px] uppercase tracking-[0.2em] text-[var(--n-400)]">
              Your Design Visions
            </span>
          </div>
          <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] font-light leading-[1.05] mb-4">
            Three ways your room<br />
            <span className="italic text-[var(--n-500)]">could come alive.</span>
          </h1>
          <p className="font-ui text-[15px] text-[var(--n-600)] max-w-[52ch] leading-[1.6]">
            Each vision is fully furnished with real Indian furniture at real prices.
            Pick one as your starting point — then make it yours in the editor.
          </p>
        </motion.div>

        {/* Vision Cards */}
        <div className="grid lg:grid-cols-3 gap-6">
          {visionsToShow.map((rank, i) => {
            const layout = layouts[rank.layoutId];
            if (!layout) return null;

            const philMeta = resolvePhilosophy(rank);
            const PhilIcon = philMeta.icon;
            const features = getVisionFeatures(layout);
            const isSelected = selectedId === rank.layoutId;
            // Use AI-provided whyThisWasMadeForYou, fall back to static fallbackWhyUs
            const whyText = rank.whyThisWasMadeForYou || philMeta.fallbackWhyUs;

            const totalPrice = layout.placements.reduce((sum, p) => {
              const item = FurnitureFactory.getItem(p.catalogId);
              return sum + (item?.pricing.baseCost ?? 0);
            }, 0);

            const currentView = viewAngles[rank.layoutId] ?? 'entrance';
            const render = getRender(rank.layoutId, currentView);
            const showPlan = showFloorPlan[rank.layoutId] ?? false;

            return (
              <motion.div
                key={i}
                layoutId={`vision-card-${rank.layoutId}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: isSelected ? 1.03 : 1,
                }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.12 }}
                whileHover={isSelected ? {} : { y: -8, boxShadow: '0 20px 40px rgba(92,64,51,0.12)' }}
                onClick={() => handleSelect(rank.layoutId)}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`group rounded-2xl overflow-hidden cursor-pointer border-2 bg-white flex flex-col transition-all duration-300 ${
                  rank.recommended
                    ? 'border-[var(--brand)] shadow-[var(--sh-lg)] ring-4 ring-[var(--brand)]/10'
                    : 'border-[var(--n-200)] shadow-[var(--sh-md)] hover:border-[var(--n-400)]'
                }`}
              >
                {/* Card Header: Name + Philosophy Badge */}
                <div className="p-6 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display text-[1.5rem] font-normal text-[var(--brand)]">{philMeta.name}</h3>
                    {rank.recommended && (
                      <span className="bg-[var(--brand)] text-[#C8A96E] text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 uppercase tracking-[0.12em] flex-shrink-0">
                        <Sparkles className="w-3 h-3" /> Best Match
                      </span>
                    )}
                  </div>
                  {/* Philosophy badge */}
                  <span className="inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-[0.1em] text-[var(--n-500)] bg-[var(--n-100)] rounded-full px-2.5 py-1 mb-3">
                    <PhilIcon className="w-3 h-3" /> {philMeta.designDriver}
                  </span>
                </div>

                {/* Why This Was Made For You — Hero text block */}
                <div className="px-6 pb-4">
                  <p className="font-ui text-[13px] italic leading-[1.7] text-[#8B7355]">
                    &ldquo;{whyText}&rdquo;
                  </p>
                </div>

                {/* Primary Visual: AI Render, Fallback SVG, or Floor Plan */}
                {showPlan ? (
                  <div className="relative h-52 bg-[var(--n-50)] mx-4 border border-[var(--n-200)] rounded-xl flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full p-3">
                      <MiniMap layout={layout} width={wM} length={lM} animate={false} />
                    </div>
                  </div>
                ) : render ? (
                  <div className="relative h-52 bg-[var(--n-100)] mx-4 border border-[var(--n-200)] rounded-xl overflow-hidden group">
                    <img
                      src={render.imageUrl}
                      alt={`${philMeta.name} — ${currentView} view`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    {render.generated && (
                      <span className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> AI
                      </span>
                    )}
                    <span className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-full capitalize">
                      {currentView} view
                    </span>
                  </div>
                ) : (
                  <div className="relative h-52 bg-[var(--n-100)] mx-4 border border-[var(--n-200)] rounded-xl overflow-hidden">
                    <img
                      src={generateFallbackRender(layout, currentView, { width: wM, length: lM, height: 2.7 })}
                      alt={`${philMeta.name} — ${currentView} view (fallback)`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-full capitalize">
                      {currentView} view
                    </span>
                  </div>
                )}

                {/* View controls: carousel + floor plan toggle */}
                <div className="flex items-center justify-between px-4 -mt-1 mb-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleViewAngle(rank.layoutId); }}
                      className="flex items-center gap-1 font-ui text-[10px] text-[var(--n-500)] hover:text-[var(--brand)] transition-colors px-2 py-1 rounded-md hover:bg-[var(--n-100)]"
                    >
                      <Eye className="w-3 h-3" />
                      {currentView === 'entrance' ? 'Living view' : 'Entrance view'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleFloorPlan(rank.layoutId); }}
                    className={`flex items-center gap-1 font-ui text-[10px] transition-colors px-2 py-1 rounded-md ${
                      showPlan
                        ? 'text-[var(--brand)] bg-[var(--n-100)]'
                        : 'text-[var(--n-500)] hover:text-[var(--brand)] hover:bg-[var(--n-100)]'
                    }`}
                  >
                    <Map className="w-3 h-3" />
                    See floor plan
                  </button>
                </div>

                {/* Content: Features + Price */}
                <div className="p-6 pt-4 flex-1 flex flex-col">
                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {features.map(feat => (
                      <span key={feat} className="font-ui text-[10px] bg-[var(--n-100)] text-[var(--n-600)] rounded-full px-2.5 py-1 flex items-center gap-1">
                        {feat.includes('Vastu') && <Compass className="w-3 h-3" />}
                        {feat.includes('pieces') && <Maximize2 className="w-3 h-3" />}
                        {feat.includes('Mandir') && <Shield className="w-3 h-3" />}
                        {feat}
                      </span>
                    ))}
                  </div>

                  {/* Price + CTA */}
                  <div className="flex justify-between items-end border-t border-[var(--n-200)] pt-4 mt-auto">
                    <div>
                      <div className="font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--n-400)] mb-1 font-medium">Furniture Estimate</div>
                      <div className="font-display text-[1.25rem] text-[var(--brand)]">₹{(totalPrice / 100000).toFixed(2)}L</div>
                    </div>
                    <span className="shimmer-overlay font-ui text-[12px] font-medium text-[var(--n-500)] group-hover:text-[var(--brand)] transition-colors flex items-center gap-1 pb-1">
                      Select This Layout <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 text-center"
        >
          <button
            type="button"
            onClick={onBack}
            className="font-ui text-[13px] text-[var(--n-400)] hover:text-[var(--brand)] transition-colors cursor-pointer"
          >
            ← Change my preferences
          </button>
        </motion.div>
      </div>
    </section>
  );
}
