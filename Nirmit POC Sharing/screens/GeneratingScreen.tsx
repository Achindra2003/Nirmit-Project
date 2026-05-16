import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ContextAnswers, VibeOption } from '../types/journey';
import { getAIRankedLayouts } from '../lib/ai/layoutService';
import type { LayoutResult } from '../solver/layoutSolver';
import { FurnitureFactory } from '../catalog/FurnitureFactory';

interface GeneratingScreenProps {
  context: ContextAnswers;
  selectedVibe: VibeOption | undefined;
  onComplete: (data: { layouts: LayoutResult[]; rankings: any[] }) => void;
  onBack: () => void;
}

const STAGES = [
  { label: 'Understanding your space', detail: 'Room dimensions and layout analysis' },
  { label: 'Reading your lifestyle', detail: 'Family needs, must-haves, and flow patterns' },
  { label: 'Scanning verified furniture', detail: '600+ pieces from Indian brands' },
  { label: 'Applying Vastu intelligence', detail: 'Placement rules and spatial harmony' },
  { label: 'Generating design visions', detail: 'Multiple furnished possibilities' },
];

export default function GeneratingScreen({ context, selectedVibe, onComplete }: GeneratingScreenProps) {
  const [stage, setStage] = useState(0);
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Stage 0 → 1
      await new Promise(r => setTimeout(r, 900));
      if (cancelled) return;
      setStage(1);

      // Stage 1 → 2
      await new Promise(r => setTimeout(r, 800));
      if (cancelled) return;
      setStage(2);

      // Run the actual solver
      const w = (context.roomWidth * 0.3048); // ft → m
      const l = (context.roomLength * 0.3048);

      const requiredFurniture: { catalogId: string; priority: 'mandatory' | 'recommended' }[] = (selectedVibe?.suggestedFurnitureLayout ?? []).map(item => {
        const catItem = FurnitureFactory.mapLegacyCode(item.code);
        return {
          catalogId: catItem?.id ?? item.code,
          priority: 'mandatory' as const,
        };
      });

      // Add must-haves
      for (const mh of context.mustHaves) {
        if (mh === 'mandir' || mh === 'Mandir Space') {
          const cat = FurnitureFactory.mapLegacyCode('pooja-wall');
          if (cat) requiredFurniture.push({ catalogId: cat.id, priority: 'mandatory' });
        }
        if (mh === 'wfh-desk' || mh === 'WFH Desk') {
          const cat = FurnitureFactory.mapLegacyCode('desk');
          if (cat) requiredFurniture.push({ catalogId: cat.id, priority: 'mandatory' });
        }
        if (mh === 'tv-unit') {
          const cat = FurnitureFactory.mapLegacyCode('tv-unit');
          if (cat) requiredFurniture.push({ catalogId: cat.id, priority: 'mandatory' });
        }
        if (mh === 'heavy-storage') {
          const cat = FurnitureFactory.mapLegacyCode('wardrobe-3d');
          if (cat) requiredFurniture.push({ catalogId: cat.id, priority: 'recommended' });
        }
        if (mh === 'big-sofa') {
          const cat = FurnitureFactory.mapLegacyCode('sofa-l') ?? FurnitureFactory.getByCategory('seating')[0];
          if (cat) requiredFurniture.push({ catalogId: cat.id, priority: 'mandatory' });
        }
        if (mh === 'shoe-rack') {
          const cat = FurnitureFactory.search('shoe rack')[0];
          if (cat) requiredFurniture.push({ catalogId: cat.id, priority: 'recommended' });
        }
        if (mh === 'reading-nook' || mh === 'Reading Nook') {
          const cat = FurnitureFactory.search('single sofa')[0] ?? FurnitureFactory.getByCategory('seating')[3];
          if (cat) requiredFurniture.push({ catalogId: cat.id, priority: 'recommended' });
        }
      }

      // Deduplicate
      const seen = new Set<string>();
      const deduped = requiredFurniture.filter(f => {
        if (seen.has(f.catalogId)) return false;
        seen.add(f.catalogId);
        return true;
      });

      if (cancelled) return;
      setStage(3);
      await new Promise(r => setTimeout(r, 700));

      if (cancelled) return;
      setStage(4);

      const vastuEnabled = context.vastuPreference !== 'no';

      try {
        const result = await getAIRankedLayouts(
          {
            roomVertices: [
              { x: 0, y: 0 },
              { x: w, y: 0 },
              { x: w, y: l },
              { x: 0, y: l },
            ],
            doorPositions: [{ wallIndex: 3, position: 0.5 }],
            windowPositions: [{ wallIndex: 1, position: 0.5 }],
            requiredFurniture: deduped,
            constraints: {
              walkwayMinWidth: 0.6,
              vastuRules: vastuEnabled,
              bedOrientation: vastuEnabled ? 'head_south' : 'any',
              poojaDirection: vastuEnabled ? 'northeast' : 'any',
              kitchenDirection: vastuEnabled ? 'southeast' : 'any',
            },
          },
          {
            style: selectedVibe?.name ?? 'Modern Indian',
            city: context.city ?? 'Mumbai',
            mustHaves: context.mustHaves,
          }
        );

        await new Promise(r => setTimeout(r, 600));
        if (cancelled) return;

        onComplete({ layouts: result.layouts, rankings: result.rankings });
      } catch {
        // Fallback if solver fails
        if (cancelled) return;
        onComplete({ layouts: [], rankings: [] });
      }
    };

    run();
    return () => { cancelled = true; };
  }, [context, selectedVibe, onComplete]);

  return (
    <section className="min-h-[calc(100vh-56px)] bg-[var(--brand)] text-[var(--n-50)] flex items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, white, transparent)' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <article className="relative z-10 w-full max-w-lg p-8 text-center">
        {/* Animated mandala-like loading */}
        <div className="mx-auto mb-10 relative w-20 h-20">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[rgba(200,169,110,0.3)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-[rgba(200,169,110,0.5)] border-t-[#C8A96E]"
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-4 rounded-full border-2 border-[rgba(200,169,110,0.2)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#C8A96E]"
              style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>

        {/* Title */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={stage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="font-display text-[clamp(1.5rem,3vw,2.5rem)] font-light leading-[1.1] mb-2"
          >
            {STAGES[stage]?.label}{dots}
          </motion.h1>
        </AnimatePresence>

        <motion.p
          key={`detail-${stage}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="font-ui text-[12px] text-[#C8A96E] uppercase tracking-[0.15em] mb-12"
        >
          {STAGES[stage]?.detail}
        </motion.p>

        {/* Progress steps */}
        <div className="space-y-3 max-w-sm mx-auto">
          {STAGES.map((s, i) => {
            const done = stage > i;
            const active = stage === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500"
                style={{
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  opacity: done ? 0.4 : active ? 1 : 0.3,
                }}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  done ? 'bg-[rgba(255,255,255,0.15)]' : active ? 'bg-[#C8A96E]' : 'bg-[rgba(255,255,255,0.05)]'
                }`}>
                  {done ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : active ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-current" />
                  )}
                </div>
                <span className={`font-ui text-[12px] ${active ? 'font-medium' : ''}`}>{s.label}</span>
              </motion.div>
            );
          })}
        </div>

        {/* Context recap */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {context.roomType && (
            <span className="font-ui text-[10px] bg-[rgba(255,255,255,0.08)] rounded-full px-3 py-1 uppercase tracking-[0.1em] text-[rgba(250,250,248,0.5)]">
              {context.roomType?.replace('-', ' ')}
            </span>
          )}
          {context.roomWidth > 0 && (
            <span className="font-ui text-[10px] bg-[rgba(255,255,255,0.08)] rounded-full px-3 py-1 uppercase tracking-[0.1em] text-[rgba(250,250,248,0.5)]">
              {context.roomWidth}×{context.roomLength} ft
            </span>
          )}
          {context.city && (
            <span className="font-ui text-[10px] bg-[rgba(255,255,255,0.08)] rounded-full px-3 py-1 uppercase tracking-[0.1em] text-[rgba(250,250,248,0.5)]">
              {context.city}
            </span>
          )}
          {selectedVibe && (
            <span className="font-ui text-[10px] bg-[rgba(255,255,255,0.08)] rounded-full px-3 py-1 uppercase tracking-[0.1em] text-[rgba(250,250,248,0.5)]">
              {selectedVibe.name}
            </span>
          )}
        </div>
      </article>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </section>
  );
}
