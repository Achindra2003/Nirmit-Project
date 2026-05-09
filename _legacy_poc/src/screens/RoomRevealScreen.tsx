import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Eye, Info } from 'lucide-react';
import type { LayoutResult } from '../solver/layoutSolver';
import type { AIRankedLayout } from '../lib/ai/layoutService';
import type { RoomRenderResult } from '../lib/ai/imageService';
import type { ItemDraft } from '../store/useStore';
import { FurnitureFactory } from '../catalog/FurnitureFactory';

interface RoomRevealScreenProps {
  layouts: LayoutResult[];
  rankings: AIRankedLayout[];
  roomWidth: number;
  roomLength: number;
  renders: Map<number, RoomRenderResult[]>;
  onSelectLayout: (items: ItemDraft[]) => void;
  onBack: () => void;
}

type ViewAngle = 'entrance' | 'living' | 'top-down';

export default function RoomRevealScreen({
  layouts, rankings, roomWidth, roomLength, renders, onSelectLayout, onBack,
}: RoomRevealScreenProps) {
  const [index, setIndex] = useState(0);
  const [showUI, setShowUI] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [viewAngle, setViewAngle] = useState<ViewAngle>('entrance');
  const [direction, setDirection] = useState(0);

  const ranking = rankings[index];
  const layout = layouts[ranking?.layoutId];
  const layoutRenders = layout ? renders.get(ranking.layoutId) ?? [] : [];

  const currentRender = layoutRenders.find((r) => r.viewAngle === viewAngle);
  const hasNext = index < rankings.length - 1;
  const hasPrev = index > 0;

  useEffect(() => {
    const t = setTimeout(() => setShowUI(true), 2000);
    return () => clearTimeout(t);
  }, [index]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    setDirection(1);
    setIndex((i) => i + 1);
    setShowUI(false);
    setShowWhy(false);
  }, [hasNext]);

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    setDirection(-1);
    setIndex((i) => i - 1);
    setShowUI(false);
    setShowWhy(false);
  }, [hasPrev]);

  const handleSelect = useCallback(() => {
    if (!layout) return;
    const drafts: ItemDraft[] = layout.placements.map((p) => {
      const cat = FurnitureFactory.getItem(p.catalogId) ??
        FurnitureFactory.mapLegacyCode(p.catalogId);
      const name = cat?.label ?? p.catalogId;
      const width = cat?.dimensions.width ?? 0.6;
      const depth = cat?.dimensions.depth ?? 0.6;
      const height = cat?.dimensions.height ?? 0.8;
      const price = cat?.pricing.baseCost ?? 5000;
      const color = cat?.pricing.materialOptions?.['wood_teak']?.colorHex ??
        '#8B6914';
      return {
        code: p.catalogId,
        name,
        x: p.x,
        y: p.y,
        width,
        length: depth,
        height,
        rotation: p.rotation,
        color,
        modelPath: '',
        price,
        brand: 'Nirmit Catalog',
      };
    });
    onSelectLayout(drafts);
  }, [layout, onSelectLayout]);

  return (
    <section className="fixed inset-0 bg-[#1a1a1a] flex flex-col overflow-hidden" style={{ zIndex: 100 }}>
      {/* Room render area */}
      <div className="flex-1 relative flex items-center justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          {currentRender ? (
            <motion.img
              key={`${ranking.layoutId}-${viewAngle}`}
              src={currentRender.imageUrl}
              alt={`${ranking.title} - ${viewAngle} view`}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 40 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full object-contain"
            />
          ) : (
            <motion.div
              key={`placeholder-${ranking.layoutId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full flex items-center justify-center"
              style={{ background: 'radial-gradient(ellipse at center, #2a2520 0%, #1a1a1a 70%)' }}
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-2 border-[#C8A96E]/20 animate-spin" style={{ animationDuration: '4s' }} />
                  <div className="absolute inset-2 rounded-full border-2 border-[#C8A96E]/40 border-t-[#C8A96E] animate-spin" style={{ animationDuration: '2.5s', animationDirection: 'reverse' }} />
                </div>
                <p className="font-display text-[14px] text-[#C8A96E]/50 italic">Generating your room view...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation arrows */}
        {hasPrev && (
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={20} color="white" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
          >
            <ChevronRight size={20} color="white" />
          </button>
        )}

        {/* Camera view toggle */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 rounded-full p-1">
          {(['entrance', 'living', 'top-down'] as ViewAngle[]).map((va) => (
            <button
              key={va}
              onClick={() => setViewAngle(va)}
              className="px-3 py-1.5 rounded-full font-ui text-[11px] cursor-pointer transition-colors"
              style={{
                background: viewAngle === va ? '#C8A96E' : 'transparent',
                color: viewAngle === va ? '#1a1a1a' : 'rgba(255,255,255,0.6)',
              }}
            >
              {va === 'entrance' ? 'Entrance' : va === 'living' ? 'Sitting' : 'Top-Down'}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom info panel */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#1a1a1a] border-t border-white/10 px-6 py-5"
          >
            <div className="max-w-[560px] mx-auto">
              <h2 className="font-display text-[1.75rem] font-light text-white leading-[1.15]">
                {ranking.title}
              </h2>
              <p className="mt-1 font-ui text-[13px] text-white/50">
                {ranking.description}
              </p>

              {ranking.whyThisWasMadeForYou && (
                <button
                  onClick={() => setShowWhy(!showWhy)}
                  className="mt-3 flex items-center gap-1.5 font-ui text-[12px] text-[#C8A96E] cursor-pointer hover:text-[#D4B87A] transition-colors"
                >
                  <Info size={14} />
                  {showWhy ? 'Hide explanation' : 'Why this room?'}
                </button>
              )}

              <AnimatePresence>
                {showWhy && ranking.whyThisWasMadeForYou && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="mt-3 font-display text-[14px] text-white/70 leading-[1.6] italic border-l-2 border-[#C8A96E] pl-4">
                      {ranking.whyThisWasMadeForYou}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleSelect}
                className="mt-6 w-full py-3 rounded-xl font-display text-[16px] cursor-pointer"
                style={{ background: '#C8A96E', color: '#1a1a1a' }}
              >
                Start with this one →
              </button>

              <div className="flex justify-center gap-2 mt-5">
                {rankings.slice(0, 3).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{ background: i === index ? '#C8A96E' : 'rgba(255,255,255,0.2)' }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}