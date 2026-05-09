import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IntakePayload } from '../types/journey';
import { getAIRankedLayouts, type AIRankedLayout } from '../lib/ai/layoutService';
import type { LayoutResult } from '../solver/layoutSolver';
import { FurnitureFactory } from '../catalog/FurnitureFactory';
import { trackTiming, trackEvent } from '../lib/analytics';
import { generateAllRenders, type RoomRenderResult } from '../lib/ai/imageService';
import type { MaterialConfig } from '../store/useStore';

interface GeneratingScreenProps {
  intakePayload: IntakePayload;
  onComplete: (data: {
    layouts: LayoutResult[];
    rankings: AIRankedLayout[];
    degraded?: boolean;
    renders: Map<number, RoomRenderResult[]>;
  }) => void;
  onBack: () => void;
}

export default function GeneratingScreen({ intakePayload, onComplete }: GeneratingScreenProps) {
  const { vibe, roomType, room, household } = intakePayload;
  const [narrativeStage, setNarrativeStage] = useState(0);
  const [phase, setPhase] = useState<'narrative' | 'rendering' | 'complete'>('narrative');
  const [completed, setCompleted] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderLabel, setRenderLabel] = useState(0);

  // Stable refs to avoid re-triggering the effect when onComplete changes mid-flight
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  const vibeName = vibe.label ?? '';

  // Compute narrative stage label/detail from intake
  const narratives = useMemo(() => {
    const whoFor = household.hasSeniors || household.hasChildren
      ? `your ${[household.hasSeniors && 'elders', household.hasChildren && 'children'].filter(Boolean).join(' & ')}`
      : '';
    return [
      { label: 'Understanding your space', detail: `${room.width}×${room.length} ft — ${(roomType ?? 'room').replace('-', ' ')}` },
      { label: whoFor ? `Designing for ${whoFor}` : 'Designing for you', detail: `Arranged around your daily life` },
      { label: `Finding the ${vibeName} palette`, detail: `Colours, textures, and materials` },
      { label: 'Creating your room', detail: `Bringing everything together` },
    ];
  }, [room.width, room.length, roomType, household.hasSeniors, household.hasChildren, vibeName]);

  // Narrative phase: advance stage every 2.5s
  useEffect(() => {
    if (phase !== 'narrative') return;
    const iv = setInterval(() => {
      setNarrativeStage(prev => {
        if (prev >= 3) {
          setPhase('rendering');
          return prev;
        }
        return prev + 1;
      });
    }, 2500);
    return () => clearInterval(iv);
  }, [phase]);

  // Cycle render messages during rendering phase
  const RENDER_MESSAGES = [
    'Painting your walls…',
    'Placing furniture with care…',
    'Adjusting the lighting…',
    'Adding warm textures…',
    'Framing the perfect shot…',
    'Almost picture-perfect…',
  ];
  useEffect(() => {
    if (phase !== 'rendering') return;
    const iv = setInterval(() => {
      setRenderLabel(prev => (prev + 1) % RENDER_MESSAGES.length);
    }, 2000);
    return () => clearInterval(iv);
  }, [phase]);

  // Main solver & AI pipeline
  useEffect(() => {
    // Only run when phase transitions to rendering, and never re-enter
    if (phase !== 'rendering' || completedRef.current) return;

    const controller = new AbortController();
    completedRef.current = true; // Prevent re-entry

    // Abort flag for cancelling IN-PROGRESS API work only.
    // Once we have results, the completion sequence is unconditional.
    let aborted = false;

    const run = async () => {
      const w = (room.width * 0.3048);
      const l = (room.length * 0.3048);

      const requiredFurniture: { catalogId: string; priority: 'mandatory' | 'recommended' }[] = [];

      // Derive furniture from room type and household profile
      if (roomType === 'bedroom') {
        const bed = FurnitureFactory.search('bed')[0] ?? FurnitureFactory.getByCategory('sleeping')[0];
        if (bed) requiredFurniture.push({ catalogId: bed.id, priority: 'mandatory' });
        const wardrobe = FurnitureFactory.mapLegacyCode('wardrobe-3d');
        if (wardrobe) requiredFurniture.push({ catalogId: wardrobe.id, priority: 'mandatory' });
        const sidetable = FurnitureFactory.search('side table')[0] ?? FurnitureFactory.getByCategory('storage')[0];
        if (sidetable) requiredFurniture.push({ catalogId: sidetable.id, priority: 'recommended' });
      }
      if (roomType === 'living-room') {
        const sofa = FurnitureFactory.mapLegacyCode('sofa-l') ?? FurnitureFactory.getByCategory('seating')[0];
        if (sofa) requiredFurniture.push({ catalogId: sofa.id, priority: 'mandatory' });
        const coffee = FurnitureFactory.search('coffee table')[0] ?? FurnitureFactory.getByCategory('dining')[0];
        if (coffee) requiredFurniture.push({ catalogId: coffee.id, priority: 'mandatory' });
        const tv = FurnitureFactory.mapLegacyCode('tv-unit');
        if (tv) requiredFurniture.push({ catalogId: tv.id, priority: 'recommended' });
      }
      if (roomType === 'kitchen') {
        const dining = FurnitureFactory.search('dining')[0] ?? FurnitureFactory.getByCategory('dining')[0];
        if (dining) requiredFurniture.push({ catalogId: dining.id, priority: 'mandatory' });
      }
      if (roomType === 'study') {
        const desk = FurnitureFactory.mapLegacyCode('desk');
        if (desk) requiredFurniture.push({ catalogId: desk.id, priority: 'mandatory' });
        const chair = FurnitureFactory.search('chair')[0] ?? FurnitureFactory.getByCategory('seating')[0];
        if (chair) requiredFurniture.push({ catalogId: chair.id, priority: 'mandatory' });
      }
      if (roomType === 'dining-room') {
        const dining = FurnitureFactory.search('dining')[0] ?? FurnitureFactory.getByCategory('dining')[0];
        if (dining) requiredFurniture.push({ catalogId: dining.id, priority: 'mandatory' });
      }

      const seen = new Set<string>();
      const deduped = requiredFurniture.filter(f => {
        if (seen.has(f.catalogId)) return false;
        seen.add(f.catalogId);
        return true;
      });

      const vastuEnabled = true; // Vastu always on per Indian market spec

      try {
        const layoutStart = performance.now();
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
            style: vibeName,
            city: intakePayload.city ?? 'Mumbai',
            mustHaves: [] as string[],
            desiredFeeling: vibe.description ?? '',
            whoIsThisRoomFor: household.hasSeniors || household.hasChildren
              ? `family with ${[household.hasSeniors && 'elders', household.hasChildren && 'children'].filter(Boolean).join(' & ')}`
              : '',
            currentRoomFrustration: '',
            lovedItemToKeep: '',
            vastuContext: 'family' as const,
            budgetPhase: (intakePayload.budgetTier === 'budget' ? 'phase1' : intakePayload.budgetTier === 'luxury' ? 'full' : 'full') as 'full' | 'phase1' | 'unsure',
          },
          undefined,
          controller.signal,
        );

        if (result.degraded) {
          setDegraded(true);
        }

        if (aborted) return;

        const materials: MaterialConfig = {
          wallColor: '#F5F0E8',
          flooring: 'vitrified-tiles',
          woodFinish: 'wood_teak',
        };

        trackTiming('ai.layout.generation', 'layoutGen', Math.round(performance.now() - layoutStart));
        const renderStart = performance.now();
        const renderPromise = generateAllRenders(
          result.layouts,
          result.rankings,
          { width: w, length: l },
          materials,
          {
            desiredFeeling: vibe.description ?? '',
            lovedItemToKeep: '',
            whoIsThisRoomFor: household.hasSeniors || household.hasChildren
              ? `family with ${[household.hasSeniors && 'elders', household.hasChildren && 'children'].filter(Boolean).join(' & ')}`
              : '',
          },
        );

        let progressInterval: ReturnType<typeof setInterval> | null = null;
        const progressPromise = new Promise<void>((resolve) => {
          let prog = 0;
          progressInterval = setInterval(() => {
            prog = Math.min(prog + 1, 6);
            setRenderProgress(prog);
            if (prog >= 6) {
              if (progressInterval) clearInterval(progressInterval);
              resolve();
            }
          }, 800);
        });

        const renders = await Promise.race([
          renderPromise.then((r) => {
            trackTiming('ai.render.generation', 'renderGen', Math.round(performance.now() - renderStart));
            if (progressInterval) clearInterval(progressInterval);
            setRenderProgress(6);
            return r;
          }),
          new Promise<Map<number, RoomRenderResult[]>>((resolve) => {
            setTimeout(async () => {
              const r = await renderPromise;
              resolve(r);
            }, 3000);
          }),
        ]);

        if (progressInterval) clearInterval(progressInterval);
        setRenderProgress(6);

        await new Promise(r => setTimeout(r, 600));
        // No abort check here — once we have results, completion is unconditional
        // (cleanup may fire from the phase change re-run, but that must not stop onComplete)

        setCompleted(true);
        setPhase('complete');
        await new Promise(r => setTimeout(r, 800));
        // No abort check — unconditional handoff

        onCompleteRef.current({
          layouts: result.layouts,
          rankings: result.rankings,
          degraded: result.degraded,
          renders,
        });
      } catch {
        trackEvent('generation', 'error', 'layout_pipeline_failed');
        // If aborted during API work, skip completion (nothing to hand off)
        if (aborted) return;
        // Otherwise, completion is unconditional even on error
        setDegraded(true);
        setCompleted(true);
        setPhase('complete');
        await new Promise(r => setTimeout(r, 800));
        // No abort check — unconditional handoff
        onCompleteRef.current({ layouts: [], rankings: [], degraded: true, renders: new Map() });
      }
    };

    run();

    return () => { aborted = true; };
  }, [phase]);

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

      {/* Particle effect around mandala */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <motion.div
          className="w-32 h-32 rounded-full"
          style={{
            boxShadow: `
              0 0 40px rgba(200, 169, 110, 0.15),
              0 0 80px rgba(200, 169, 110, 0.08),
              0 0 120px rgba(200, 169, 110, 0.04)
            `,
          }}
          animate={{
            boxShadow: [
              '0 0 40px rgba(200, 169, 110, 0.15), 0 0 80px rgba(200, 169, 110, 0.08)',
              '0 0 60px rgba(200, 169, 110, 0.25), 0 0 100px rgba(200, 169, 110, 0.12)',
              '0 0 40px rgba(200, 169, 110, 0.15), 0 0 80px rgba(200, 169, 110, 0.08)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Completion burst overlay */}
      <AnimatePresence>
        {completed && phase === 'complete' && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#C8A96E]"
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 30, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * 360;
              const distance = 150 + Math.random() * 200;
              const x = Math.cos((angle * Math.PI) / 180) * distance;
              const y = Math.sin((angle * Math.PI) / 180) * distance;
              const colors = ['#C8A96E', '#8B6914', '#F4F3EE', '#D4B87A', '#E8C97A'];
              return (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                  style={{ background: colors[i % colors.length] }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                  animate={{ x, y, opacity: 0, scale: 1 }}
                  transition={{ duration: 0.7 + Math.random() * 0.5, delay: 0.1, ease: 'easeOut' }}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <article className="relative z-10 w-full max-w-lg p-8 text-center">
        {/* Enhanced mandala spinner — dual ring with opposite rotation */}
        <div className="mx-auto mb-10 relative w-24 h-24">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[rgba(200,169,110,0.2)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-[rgba(200,169,110,0.4)] border-t-[#C8A96E]"
            animate={{ rotate: -360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-4 rounded-full border-2 border-[rgba(200,169,110,0.3)] border-b-[#C8A96E]"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-6 rounded-full border border-[rgba(200,169,110,0.25)] border-r-[#C8A96E]"
            animate={{ rotate: -360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-3 h-3 rounded-full bg-[#C8A96E]"
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>

        {/* Title — phase-aware */}
        {phase === 'narrative' && (
          <AnimatePresence mode="wait">
            <motion.h1
              key={narrativeStage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="font-display text-[clamp(1.5rem,3vw,2.5rem)] font-light leading-[1.1] mb-2"
            >
              {narratives[narrativeStage]?.label}
            </motion.h1>
          </AnimatePresence>
        )}
        {phase === 'rendering' && (
          <motion.h1
            key="rendering-title"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-[clamp(1.5rem,3vw,2.5rem)] font-light leading-[1.1] mb-2"
          >
            Rendering your room
          </motion.h1>
        )}
        {phase === 'complete' && (
          <motion.h1
            key="complete-title"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="font-display text-[clamp(1.5rem,3vw,2.5rem)] font-light leading-[1.1] mb-2"
          >
            Your room is ready
          </motion.h1>
        )}

        {/* Sub-detail */}
        {phase === 'narrative' && (
          <motion.p
            key={`detail-${narrativeStage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="font-ui text-[12px] text-[#C8A96E] uppercase tracking-[0.15em] mb-6"
          >
            {narratives[narrativeStage]?.detail}
          </motion.p>
        )}
        {phase === 'rendering' && (
          <motion.p
            key="rendering-detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="font-ui text-[12px] text-[#C8A96E] uppercase tracking-[0.15em] mb-6"
          >
            Please wait while we finalize your design
          </motion.p>
        )}
        {phase === 'complete' && (
          <motion.p
            key="complete-detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="font-ui text-[12px] text-[#C8A96E] uppercase tracking-[0.15em] mb-6"
          >
            Tap to explore your new room
          </motion.p>
        )}

        {/* Narrative progress dots */}
        {phase === 'narrative' && (
          <div className="flex items-center justify-center gap-2 mb-10">
            {narratives.map((_, i) => {
              const done = narrativeStage > i;
              const active = narrativeStage === i;
              return (
                <motion.div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: done ? 6 : active ? 10 : 6,
                    height: 6,
                    background: active || done ? '#C8A96E' : 'rgba(200,169,110,0.3)',
                    opacity: done ? 0.4 : active ? 1 : 0.4,
                  }}
                  animate={active ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 1, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
                />
              );
            })}
          </div>
        )}

        {/* Rendering progress bar */}
        {phase === 'rendering' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <p className="font-ui text-[11px] text-[rgba(200,169,110,0.6)] uppercase tracking-[0.12em] mb-3">
              View {Math.min(renderProgress + 1, 6)} of 6
            </p>
            <div className="mx-auto w-48 h-1 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #C8A96E, #D4B87A)' }}
                animate={{ width: `${(renderProgress / 6) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}

        {/* Render messages during rendering phase */}
        {phase === 'rendering' && (
          <AnimatePresence mode="wait">
            <motion.p
              key={`render-msg-${renderLabel}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 0.7, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5 }}
              className="font-display text-[14px] italic text-[rgba(200,169,110,0.7)] mb-12"
            >
              {RENDER_MESSAGES[renderLabel]}
            </motion.p>
          </AnimatePresence>
        )}

        {/* Spacer when no messages shown */}
        {phase !== 'rendering' && <div className="mb-12" />}

        {/* Context recap */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {roomType && (
            <span className="font-ui text-[10px] bg-[rgba(255,255,255,0.08)] rounded-full px-3 py-1 uppercase tracking-[0.1em] text-[rgba(250,250,248,0.5)]">
              {roomType.replace('-', ' ')}
            </span>
          )}
          {room.width > 0 && (
            <span className="font-ui text-[10px] bg-[rgba(255,255,255,0.08)] rounded-full px-3 py-1 uppercase tracking-[0.1em] text-[rgba(250,250,248,0.5)]">
              {room.width}×{room.length} ft
            </span>
          )}
          {intakePayload.city && (
            <span className="font-ui text-[10px] bg-[rgba(255,255,255,0.08)] rounded-full px-3 py-1 uppercase tracking-[0.1em] text-[rgba(250,250,248,0.5)]">
              {intakePayload.city}
            </span>
          )}
          <span className="font-ui text-[10px] bg-[rgba(255,255,255,0.08)] rounded-full px-3 py-1 uppercase tracking-[0.1em] text-[rgba(250,250,248,0.5)]">
            {vibeName}
          </span>
        </div>

        {/* Degraded mode notice */}
        {degraded && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-8 mx-auto max-w-sm px-5 py-3 rounded-xl"
            style={{
              background: 'rgba(200, 169, 110, 0.12)',
              border: '1px solid rgba(200, 169, 110, 0.25)',
            }}
          >
            <p className="font-ui text-[11px] text-[rgba(200,169,110,0.8)] leading-relaxed">
              AI is taking a break — showing our best algorithmic layouts instead
            </p>
          </motion.div>
        )}
      </article>
    </section>
  );
}