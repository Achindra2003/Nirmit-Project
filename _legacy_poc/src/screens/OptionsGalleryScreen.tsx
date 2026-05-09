import { motion } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { LayoutResult } from '../solver/layoutSolver';
import type { AIRankedLayout } from '../lib/ai/layoutService';
import { FurnitureFactory } from '../catalog/FurnitureFactory';
import { type ItemDraft } from '../store/useStore';

function MiniMap({ layout, width = 3.65, length = 4.57 }: { layout: LayoutResult, width?: number, length?: number }) {
  return (
    <svg viewBox={`-1 -1 ${width + 2} ${length + 2}`} className="w-full h-full text-[var(--brand)]" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>
      <rect x="0" y="0" width={width} height={length} fill="white" stroke="currentColor" strokeWidth="0.08" rx="0.1" />
      {layout.placements.map((p, i) => {
        const item = FurnitureFactory.getItem(p.catalogId);
        if (!item) return null;
        const color = item.pricing.materialOptions['wood_teak']?.colorHex ?? '#C8A96E';
        return (
          <g key={i} transform={`translate(${p.x}, ${p.y}) rotate(${p.rotation * (180 / Math.PI)})`}>
            <rect x={-item.dimensions.width / 2} y={-item.dimensions.depth / 2} width={item.dimensions.width} height={item.dimensions.depth} fill={color} fillOpacity="0.8" stroke="currentColor" strokeWidth="0.04" rx="0.05" />
          </g>
        );
      })}
    </svg>
  );
}

interface OptionsGalleryScreenProps {
  layouts: LayoutResult[];
  rankings: AIRankedLayout[];
  onSelectLayout: (items: ItemDraft[]) => void;
}

export default function OptionsGalleryScreen({ layouts, rankings, onSelectLayout }: OptionsGalleryScreenProps) {
  const catalogSize = FurnitureFactory.getCatalogSize();

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

  return (
    <section className="min-h-screen bg-[var(--n-50)] text-[var(--brand)] py-20 px-6 font-ui">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="font-display text-[3.5rem] md:text-[4.5rem] mb-4 text-[var(--brand)] leading-none tracking-tight">Your layout strategies.</h1>
          <p className="text-[var(--n-600)] mb-16 text-lg max-w-2xl font-ui">
            We analyzed {catalogSize} authentic Indian furniture pieces to generate these {layouts.length} configurations for your flat. Select a base to enter the Editor.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {rankings.slice(0, 3).map((rank, i) => {
            const layout = layouts[rank.layoutId];
            if (!layout) return null;
            
            // Calculate total price using catalog directly instead of full store items
            const totalPrice = layout.placements.reduce((sum, p) => {
              const item = FurnitureFactory.getItem(p.catalogId);
              return sum + (item?.pricing.baseCost ?? 0);
            }, 0);

            return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                whileHover={{ y: -8 }}
                onClick={() => handleSelect(rank.layoutId)}
                className={`group rounded-2xl overflow-hidden cursor-pointer border-2 bg-white flex flex-col shadow-[var(--sh-md)] transition-all ${rank.recommended ? 'border-[var(--brand)] ring-4 ring-[#C8A96E]/20' : 'border-[var(--n-200)] hover:border-[var(--n-400)]'}`}
              >
                <div className="h-56 bg-[var(--n-100)] relative p-5 flex flex-col justify-between items-center overflow-hidden border-b border-[var(--n-200)]">
                  {rank.recommended && (
                    <span className="absolute top-4 left-4 bg-[var(--brand)] text-[#C8A96E] text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 uppercase tracking-widest z-20">
                      <Sparkles className="w-3 h-3"/> Top Choice
                    </span>
                  )}
                  <div className="absolute inset-4 z-10 opacity-90 transition-transform duration-700 group-hover:scale-105">
                     <MiniMap layout={layout} />
                  </div>
                  <span className="absolute bottom-4 right-4 text-[var(--brand)] text-[10px] font-bold uppercase tracking-wider bg-white/90 px-2 py-1 rounded shadow-sm backdrop-blur z-20 border border-[var(--n-200)]">
                    {layout.placements.length} Items
                  </span>
                </div>
                <div className="p-6 flex-1 flex flex-col bg-white">
                  <h3 className="font-display text-2xl font-bold mb-2 text-[var(--brand)]">{rank.title}</h3>
                  <p className="text-[var(--n-500)] text-[13px] mb-6 flex-1 leading-relaxed">{rank.description}</p>
                  <div className="flex justify-between items-end border-t border-[var(--n-200)] pt-5">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--n-400)] mb-1 font-bold">Est. Furniture Cost</div>
                      <div className="text-[var(--brand)] font-bold text-xl font-display">₹{(totalPrice / 100000).toFixed(2)}L</div>
                    </div>
                    <span className="text-[13px] font-medium text-[var(--n-600)] group-hover:text-[var(--brand)] transition-colors flex items-center gap-1 pb-1">
                      Open Editor <ChevronRight className="w-4 h-4"/>
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
