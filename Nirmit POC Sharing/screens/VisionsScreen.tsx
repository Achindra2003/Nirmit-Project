import { motion } from 'framer-motion';
import { Sparkles, ChevronRight, Compass, Maximize2, Shield } from 'lucide-react';
import type { LayoutResult } from '../solver/layoutSolver';
import { FurnitureFactory } from '../catalog/FurnitureFactory';
import { type ItemDraft } from '../store/useStore';

function MiniMap({ layout, width, length }: { layout: LayoutResult; width: number; length: number }) {
  return (
    <svg viewBox={`-1 -1 ${width + 2} ${length + 2}`} className="w-full h-full">
      {/* Room outline */}
      <rect x="0" y="0" width={width} height={length}
        fill="white" stroke="var(--brand)" strokeWidth="0.08" rx="0.08" />

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
  rankings: any[];
  roomWidth: number;
  roomLength: number;
  onSelectLayout: (items: ItemDraft[]) => void;
  onBack: () => void;
}

// Generate narrative names for each layout
const VISION_NAMES = [
  { name: 'The Family Anchor', desc: 'Centered around togetherness — the sofa faces the room, storage wraps the walls, mandir sits in its sacred corner.' },
  { name: 'The Open Flow', desc: 'Maximum breathing room and clear walkways. Furniture hugs the walls, the center stays free for movement and play.' },
  { name: 'The Cozy Nest', desc: 'Every corner has purpose. Dense, warm, and layered — for families who fill their home with life.' },
  { name: 'The Balanced Path', desc: 'Neither sparse nor packed. A well-proportioned layout that gives each piece room to breathe.' },
  { name: 'The Corner Studio', desc: 'A dedicated work corner carved from the living space, with a clear boundary between focus and family time.' },
];

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
  layouts, rankings, roomWidth, roomLength, onSelectLayout, onBack
}: VisionsScreenProps) {
  // Convert ft to meters for minimap
  const wM = roomWidth * 0.3048;
  const lM = roomLength * 0.3048;

  const handleSelect = (layoutIndex: number) => {
    const layout = layouts[layoutIndex];
    if (!layout) return;

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
        color: catItem?.pricing.materialOptions['wood_teak']?.colorHex ?? '#8B6914',
        modelPath: catItem?.modelPath.startsWith('primitive:') ? '' : (catItem?.modelPath ?? ''),
        price: catItem?.pricing.baseCost ?? 10000,
        brand: 'Nirmit Verified',
      };
    });

    onSelectLayout(drafts);
  };

  const visionsToShow = rankings.slice(0, 3);

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

            const vision = VISION_NAMES[i] ?? VISION_NAMES[0];
            const features = getVisionFeatures(layout);

            const totalPrice = layout.placements.reduce((sum, p) => {
              const item = FurnitureFactory.getItem(p.catalogId);
              return sum + (item?.pricing.baseCost ?? 0);
            }, 0);

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.12 }}
                whileHover={{ y: -6 }}
                onClick={() => handleSelect(rank.layoutId)}
                className={`group rounded-2xl overflow-hidden cursor-pointer border-2 bg-white flex flex-col transition-all duration-300 ${
                  rank.recommended
                    ? 'border-[var(--brand)] shadow-[var(--sh-lg)] ring-4 ring-[var(--brand)]/10'
                    : 'border-[var(--n-200)] shadow-[var(--sh-md)] hover:border-[var(--n-400)]'
                }`}
              >
                {/* Minimap */}
                <div className="relative h-52 bg-[var(--n-50)] p-4 border-b border-[var(--n-200)] flex items-center justify-center">
                  {rank.recommended && (
                    <span className="absolute top-3 left-3 bg-[var(--brand)] text-[#C8A96E] text-[9px] font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 uppercase tracking-[0.15em] z-10">
                      <Sparkles className="w-3 h-3" /> Recommended
                    </span>
                  )}
                  <div className="w-full h-full transition-transform duration-500 group-hover:scale-[1.03]">
                    <MiniMap layout={layout} width={wM} length={lM} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-display text-[1.5rem] font-normal text-[var(--brand)] mb-2">{vision.name}</h3>
                  <p className="font-ui text-[12px] text-[var(--n-500)] leading-[1.6] mb-5 flex-1">{vision.desc}</p>

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
                  <div className="flex justify-between items-end border-t border-[var(--n-200)] pt-4">
                    <div>
                      <div className="font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--n-400)] mb-1 font-medium">Furniture Estimate</div>
                      <div className="font-display text-[1.25rem] text-[var(--brand)]">₹{(totalPrice / 100000).toFixed(2)}L</div>
                    </div>
                    <span className="font-ui text-[12px] font-medium text-[var(--n-500)] group-hover:text-[var(--brand)] transition-colors flex items-center gap-1 pb-1">
                      Open in Editor <ChevronRight className="w-4 h-4" />
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
