import { useEffect, useState } from 'react';
import type { Act1HandoffPayload } from '../types/journey';
import { getAIRankedLayouts } from '../lib/ai/layoutService';
import type { LayoutResult } from '../solver/layoutSolver';
import { FurnitureFactory } from '../catalog/FurnitureFactory';

interface Act1HandoffScreenProps {
  payload: Act1HandoffPayload | null;
  onBack: () => void;
  onContinue: (data: { layouts: LayoutResult[], rankings: any[] }) => void;
}

export default function Act1HandoffScreen({ payload, onBack, onContinue }: Act1HandoffScreenProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!payload) return;

    let isCancelled = false;

    const runEngine = async () => {
      // 1. Loading basic data
      await new Promise(r => setTimeout(r, 1000));
      if (isCancelled) return;
      setStep(1);

      // 2. Applying rules
      await new Promise(r => setTimeout(r, 1000));
      if (isCancelled) return;
      setStep(2);

      // 3. Prepare Solver Input
      const width = 10 * 0.3048; // convert ft to m if needed, but the current engine uses meters for width/length? 
      // Actually, PlannerScreen uses ft in UI but internal width is 10. Let's use 3.65m by 4.57m.
      const w = 3.65;
      const l = 4.57;
      
      const requiredFurniture = payload.vibeConfig.suggestedFurnitureLayout.map(i => {
         const catItem = FurnitureFactory.mapLegacyCode(i.code);
         return {
           catalogId: catItem ? catItem.id : i.code,
           priority: 'mandatory' as const
         };
      });

      // Add Must Haves
      const mustHaves = payload.context.mustHaves;
      if (mustHaves.includes('Mandir Space')) {
         requiredFurniture.push({ catalogId: FurnitureFactory.mapLegacyCode('pooja-wall')?.id || 'cat_0026', priority: 'mandatory' });
      }
      if (mustHaves.includes('WFH Desk')) {
         requiredFurniture.push({ catalogId: FurnitureFactory.mapLegacyCode('desk')?.id || 'cat_0023', priority: 'mandatory' });
      }

      const result = await getAIRankedLayouts(
        {
          roomVertices: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: l }, { x: 0, y: l }],
          doorPositions: [{ wallIndex: 3, position: 0.5 }],
          windowPositions: [{ wallIndex: 1, position: 0.5 }],
          requiredFurniture,
          constraints: {
            walkwayMinWidth: 0.6,
            vastuRules: true,
            bedOrientation: 'head_south',
            poojaDirection: 'northeast',
            kitchenDirection: 'southeast',
          },
        },
        { style: payload.vibeConfig.name, city: payload.context.city, mustHaves: payload.context.mustHaves }
      );

      if (isCancelled) return;
      setStep(3);

      await new Promise(r => setTimeout(r, 1000));
      if (isCancelled) return;

      onContinue({ layouts: result.layouts, rankings: result.rankings });
    };

    runEngine();

    return () => {
      isCancelled = true;
    };
  }, [onContinue, payload]);

  if (!payload) {
    return (
      <section className="flex h-[calc(100vh-80px)] w-full items-center justify-center bg-[var(--brand)] text-[var(--n-50)] px-4">
         <button onClick={onBack}>Back</button>
      </section>
    );
  }

  const catalogSize = FurnitureFactory.getCatalogSize();
  const checks = [
    `Loading ${payload.context.city} structural data...`,
    `Applying ${payload.context.homeType === 'renting' ? 'renting drill-free' : 'ownership'} rules...`,
    `Scanning ${catalogSize} verified Indian furniture pieces...`,
    `Initializing Nirmit AI Designer & Vastu checks...`
  ];

  return (
    <section className="flex h-[calc(100vh-80px)] w-full items-center justify-center bg-[var(--brand)] text-[var(--n-50)] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.05)_0%,_transparent_70%)]"></div>
      
      <article className="relative w-full max-w-2xl p-8 z-10">
        <div className="flex flex-col items-center justify-center text-center mb-10">
           <div className="h-12 w-12 rounded-full border-[3px] border-[var(--n-800)] border-t-[#C8A96E] animate-spin mb-6"></div>
           <h1 className="font-display text-[3.5rem] md:text-[4.5rem] font-normal tracking-tight">System Compilation</h1>
           <p className="mt-2 text-[#C8A96E] font-ui text-[11px] uppercase tracking-[0.2em]">Generating 3D parameters</p>
        </div>

        <div className="space-y-4 max-w-md mx-auto font-ui">
          {checks.map((check, idx) => {
            const isActive = step === idx;
            const isDone = step > idx;

            return (
              <div 
                key={idx} 
                className={`flex items-center py-3 px-4 rounded-xl transition-all duration-500 ${
                  isDone ? 'text-[var(--n-300)]' : isActive ? 'bg-white/10 text-[var(--n-50)] scale-[1.02] shadow-sm' : 'text-[var(--n-600)]'
                }`}
              >
                <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full mr-4 transition-colors duration-300 ${
                  isDone ? 'bg-white/20 text-[var(--n-100)]' : isActive ? 'bg-[var(--n-50)] text-[#C8A96E]' : 'bg-white/5 text-[var(--n-600)]'
                }`}>
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                  )}
                </div>
                <span className={`text-[13px] ${isActive ? 'font-medium' : ''}`}>
                  {check}
                </span>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
