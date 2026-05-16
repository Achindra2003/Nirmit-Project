import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sofa, Bed, ChefHat, Laptop, Utensils, Users, Baby, GraduationCap, Heart, Dog, Archive, Tv, Coffee, BookOpen, Layers, Shirt, Sparkles, User, UserPlus, BoxSelect } from 'lucide-react';
import {
  CONTEXT_CITIES,
  ROOM_TYPES,
  COMMON_ROOM_SIZES,
  FAMILY_PROFILES,
  MUST_HAVE_OPTIONS_EXPANDED,
  VIBE_OPTIONS,
  type ContextAnswers,
  type BudgetType,
} from '../types/journey';

interface IntakeScreenProps {
  value: ContextAnswers;
  onChange: (next: ContextAnswers) => void;
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="font-ui text-[13px] font-medium text-[var(--n-500)] uppercase tracking-[0.12em]">
          {step} of {TOTAL_STEPS}
        </span>
        <div className="h-[1px] flex-1 bg-[var(--n-200)]" />
      </div>
      <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-light text-[var(--brand)] leading-[1.1]">
        {title}
      </h2>
      <p className="mt-2 font-ui text-[14px] text-[var(--n-500)] leading-[1.5]">{subtitle}</p>
    </div>
  );
}

export default function IntakeScreen({ value, onChange, onComplete }: IntakeScreenProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return value.roomType !== null;
      case 1: return value.familyProfile.length > 0;
      case 2: return value.budget !== null && value.city !== null;
      case 3: return value.selectedVibeId !== null;
      default: return false;
    }
  }, [step, value]);

  const goNext = () => {
    if (!canNext) return;
    // Auto-default vastu to 'somewhat' if not selected before completing step 2
    if (step === 2 && value.vastuPreference === null) {
      onChange({ ...value, vastuPreference: 'somewhat' });
    }
    if (step === TOTAL_STEPS - 1) { onComplete(); return; }
    setDirection(1);
    setStep(s => s + 1);
  };

  const goBack = () => {
    if (step === 0) return;
    setDirection(-1);
    setStep(s => s - 1);
  };

  const mustHavesForRoom = useMemo(
    () => MUST_HAVE_OPTIONS_EXPANDED.filter(opt => !value.roomType || opt.forRoom.includes(value.roomType as any)),
    [value.roomType]
  );

  const selectedVibe = VIBE_OPTIONS.find(v => v.id === value.selectedVibeId);

  const renderIcon = (type: string, className = '') => {
    switch(type) {
      case 'living-room': return <Sofa className={className} strokeWidth={1.5} />;
      case 'bedroom': return <Bed className={className} strokeWidth={1.5} />;
      case 'kitchen': return <ChefHat className={className} strokeWidth={1.5} />;
      case 'study': return <Laptop className={className} strokeWidth={1.5} />;
      case 'dining-room': return <Utensils className={className} strokeWidth={1.5} />;
      case 'couple': return <UserPlus className={className} strokeWidth={1.5} />;
      case 'kids': return <Baby className={className} strokeWidth={1.5} />;
      case 'teens': return <GraduationCap className={className} strokeWidth={1.5} />;
      case 'elderly': return <Heart className={className} strokeWidth={1.5} />;
      case 'wfh': return <Laptop className={className} strokeWidth={1.5} />;
      case 'pets': return <Dog className={className} strokeWidth={1.5} />;
      case 'guests': return <Users className={className} strokeWidth={1.5} />;
      case 'big-sofa': return <Sofa className={className} strokeWidth={1.5} />;
      case 'mandir': return <Sparkles className={className} strokeWidth={1.5} />;
      case 'heavy-storage': return <Archive className={className} strokeWidth={1.5} />;
      case 'wfh-desk': return <Laptop className={className} strokeWidth={1.5} />;
      case 'tv-unit': return <Tv className={className} strokeWidth={1.5} />;
      case 'dining-corner': return <Coffee className={className} strokeWidth={1.5} />;
      case 'kids-play': return <Baby className={className} strokeWidth={1.5} />;
      case 'reading-nook': return <BookOpen className={className} strokeWidth={1.5} />;
      case 'shoe-rack': return <Layers className={className} strokeWidth={1.5} />;
      case 'pet-zone': return <Dog className={className} strokeWidth={1.5} />;
      case 'wardrobe': return <Shirt className={className} strokeWidth={1.5} />;
      case 'vanity': return <User className={className} strokeWidth={1.5} />;
      default: return <BoxSelect className={className} strokeWidth={1.5} />;
    }
  };

  const renderStep = () => {
    switch (step) {
      // ── Step 1: Room type + Dimensions ──
      case 0:
        return (
          <div>
            <StepHeader step={1} title="What room are you designing?" subtitle="Select the space, then set or confirm its dimensions." />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {ROOM_TYPES.map(rt => {
                const sel = value.roomType === rt.value;
                return (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => {
                      const sizes = COMMON_ROOM_SIZES[rt.value];
                      onChange({
                        ...value,
                        roomType: rt.value,
                        roomWidth: sizes?.[0]?.width ?? 12,
                        roomLength: sizes?.[0]?.length ?? 14,
                      });
                    }}
                    className="group relative flex flex-col items-center justify-center py-7 px-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-center"
                    style={{
                      borderColor: sel ? 'var(--brand)' : 'var(--n-200)',
                      background: sel ? 'var(--n-50)' : 'white',
                      boxShadow: sel ? 'var(--sh-md)' : 'var(--sh-xs)',
                      transform: sel ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <span className="text-brand mb-3">{renderIcon(rt.value, "w-7 h-7")}</span>
                    <span className="font-ui text-[14px] font-medium text-[var(--brand)]">{rt.label}</span>
                    <span className="font-ui text-[11px] text-[var(--n-500)] mt-1">{rt.description}</span>
                    {sel && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--brand)] text-white flex items-center justify-center">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {value.roomType && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="font-ui text-[11px] uppercase tracking-[0.1em] text-[var(--n-400)] mb-3">Common sizes for {ROOM_TYPES.find(r => r.value === value.roomType)?.label}</p>
                <div className="flex flex-wrap gap-3 mb-5">
                  {(COMMON_ROOM_SIZES[value.roomType] ?? []).map(size => {
                    const sel = value.roomWidth === size.width && value.roomLength === size.length;
                    return (
                      <button
                        key={size.label}
                        type="button"
                        onClick={() => onChange({ ...value, roomWidth: size.width, roomLength: size.length })}
                        className="rounded-full border px-4 py-2.5 font-ui text-[12px] font-medium transition-all duration-150 cursor-pointer"
                        style={{
                          borderColor: sel ? 'var(--brand)' : 'var(--n-200)',
                          background: sel ? 'var(--brand)' : 'white',
                          color: sel ? 'var(--n-50)' : 'var(--n-600)',
                        }}
                      >
                        {size.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="font-ui text-[10px] uppercase tracking-[0.1em] text-[var(--n-400)] mb-2 block">Width (ft)</label>
                    <input
                      type="number" min={6} max={30} step={1}
                      value={value.roomWidth}
                      onChange={e => onChange({ ...value, roomWidth: Number(e.target.value) || 0 })}
                      className="w-full p-3 rounded-xl border-2 border-[var(--n-300)] font-display text-[1.5rem] font-light text-center text-[var(--brand)] bg-white outline-none focus:border-[var(--brand)] transition-colors"
                    />
                  </div>
                  <span className="font-display text-[1.5rem] text-[var(--n-300)] mt-5">×</span>
                  <div className="flex-1">
                    <label className="font-ui text-[10px] uppercase tracking-[0.1em] text-[var(--n-400)] mb-2 block">Length (ft)</label>
                    <input
                      type="number" min={6} max={30} step={1}
                      value={value.roomLength}
                      onChange={e => onChange({ ...value, roomLength: Number(e.target.value) || 0 })}
                      className="w-full p-3 rounded-xl border-2 border-[var(--n-300)] font-display text-[1.5rem] font-light text-center text-[var(--brand)] bg-white outline-none focus:border-[var(--brand)] transition-colors"
                    />
                  </div>
                  <span className="font-ui text-[12px] text-[var(--n-400)] mt-5">ft</span>
                </div>
                <div className="mt-4 p-3 rounded-xl bg-[var(--n-100)] border border-[var(--n-200)] flex items-center justify-between">
                  <span className="font-ui text-[12px] text-[var(--n-500)]">Area</span>
                  <span className="font-display text-[1.1rem] text-[var(--brand)]">
                    {value.roomWidth * value.roomLength} sq ft
                    <span className="font-ui text-[11px] text-[var(--n-400)] ml-2">
                      ({(value.roomWidth * value.roomLength * 0.0929).toFixed(1)} sq m)
                    </span>
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        );

      // ── Step 2: Lifestyle — Family + Must-haves ──
      case 1:
        return (
          <div>
            <StepHeader step={2} title="Tell us about your life here." subtitle="Who lives in the space and what does this room need?" />
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="font-ui text-[11px] uppercase tracking-[0.1em] text-[var(--n-400)] mb-3 font-medium">Who lives here?</p>
                <div className="flex flex-col gap-2">
                  {FAMILY_PROFILES.map(fp => {
                    const sel = value.familyProfile.includes(fp.id);
                    return (
                      <button
                        key={fp.id}
                        type="button"
                        onClick={() => {
                          const next = sel
                            ? value.familyProfile.filter(f => f !== fp.id)
                            : [...value.familyProfile, fp.id];
                          onChange({ ...value, familyProfile: next });
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-150 cursor-pointer text-left"
                        style={{
                          borderColor: sel ? 'var(--brand)' : 'var(--n-200)',
                          background: sel ? 'var(--n-50)' : 'white',
                        }}
                      >
                        <span className="text-brand flex-shrink-0">{renderIcon(fp.id, "w-5 h-5")}</span>
                        <span className="font-ui text-[13px] font-medium text-[var(--brand)]">{fp.label}</span>
                        {sel && <span className="ml-auto text-[var(--brand)]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="font-ui text-[11px] uppercase tracking-[0.1em] text-[var(--n-400)] mb-3 font-medium">
                  What must this room have?
                  <span className="ml-2 text-[var(--n-300)] normal-case tracking-normal">optional</span>
                </p>
                <div className="flex flex-col gap-2">
                  {mustHavesForRoom.map(opt => {
                    const sel = value.mustHaves.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          const next = sel
                            ? value.mustHaves.filter(m => m !== opt.id)
                            : [...value.mustHaves, opt.id];
                          onChange({ ...value, mustHaves: next });
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-150 cursor-pointer text-left"
                        style={{
                          borderColor: sel ? 'var(--brand)' : 'var(--n-200)',
                          background: sel ? 'var(--n-50)' : 'white',
                        }}
                      >
                        <span className="text-brand flex-shrink-0">{renderIcon(opt.id, "w-4 h-4")}</span>
                        <span className="font-ui text-[12px] font-medium text-[var(--brand)]">{opt.label}</span>
                        {sel && <span className="ml-auto text-[var(--brand)] text-sm">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      // ── Step 3: Preferences — Budget + City + Vastu ──
      case 2:
        return (
          <div>
            <StepHeader step={3} title="Budget, city & preferences." subtitle="This lets us show the right furniture at the right price." />

            <div className="mb-7">
              <label className="font-ui text-[11px] uppercase tracking-[0.1em] text-[var(--n-400)] mb-3 block">Budget Tier</label>
              <div className="grid grid-cols-3 gap-4">
                {([
                  { val: 'economical' as BudgetType, range: '₹1.5L – ₹3L', desc: 'Smart, modular, value-first' },
                  { val: 'mid-range' as BudgetType, range: '₹3L – ₹6L', desc: 'Quality finishes, good longevity' },
                  { val: 'premium' as BudgetType, range: '₹6L+', desc: 'Bespoke materials, luxury pieces' },
                ]).map(opt => {
                  const sel = value.budget === opt.val;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => onChange({ ...value, budget: opt.val })}
                      className="flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-150 cursor-pointer text-left"
                      style={{
                        borderColor: sel ? 'var(--brand)' : 'var(--n-200)',
                        background: sel ? 'var(--n-50)' : 'white',
                        boxShadow: sel ? 'var(--sh-sm)' : 'none',
                      }}
                    >
                      <span className="font-display text-[1.15rem] text-[var(--brand)]">{opt.range}</span>
                      <span className="font-ui text-[11px] text-[var(--n-500)] mt-1">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-7">
              <label className="font-ui text-[11px] uppercase tracking-[0.1em] text-[var(--n-400)] mb-3 block">City</label>
              <div className="flex flex-wrap gap-2">
                {CONTEXT_CITIES.map(city => {
                  const sel = value.city === city;
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => onChange({ ...value, city, homeType: value.homeType || 'owning' })}
                      className="rounded-full border px-4 py-2 font-ui text-[13px] font-medium transition-all duration-150 cursor-pointer"
                      style={{
                        borderColor: sel ? 'var(--brand)' : 'var(--n-200)',
                        background: sel ? 'var(--brand)' : 'white',
                        color: sel ? 'var(--n-50)' : 'var(--n-600)',
                      }}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="font-ui text-[11px] uppercase tracking-[0.1em] text-[var(--n-400)] mb-3 block">
                Vastu preference
                <span className="ml-2 text-[var(--n-300)] normal-case tracking-normal">optional</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'yes' as const, label: 'Yes, follow Vastu', desc: 'Strict placement rules' },
                  { value: 'somewhat' as const, label: 'Somewhat', desc: 'Where practical' },
                  { value: 'no' as const, label: 'No Vastu', desc: 'Pure spatial efficiency' },
                ].map(opt => {
                  const sel = value.vastuPreference === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChange({ ...value, vastuPreference: opt.value })}
                      className="flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-150 cursor-pointer text-left"
                      style={{
                        borderColor: sel ? 'var(--brand)' : 'var(--n-200)',
                        background: sel ? 'var(--n-50)' : 'white',
                      }}
                    >
                      <span className="font-ui text-[13px] font-medium text-[var(--brand)]">{opt.label}</span>
                      <span className="font-ui text-[11px] text-[var(--n-500)] mt-1">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      // ── Step 4: Vibe Selection ──
      case 3:
        return (
          <div>
            <StepHeader step={4} title="Which vibe feels like home?" subtitle="Pick a style direction. You can change everything in the editor." />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {VIBE_OPTIONS.map(vibe => {
                const sel = value.selectedVibeId === vibe.id;
                return (
                  <button
                    key={vibe.id}
                    type="button"
                    onClick={() => onChange({ ...value, selectedVibeId: vibe.id })}
                    className="group flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-200 cursor-pointer text-left"
                    style={{
                      borderColor: sel ? 'var(--brand)' : 'var(--n-200)',
                      boxShadow: sel ? 'var(--sh-md)' : 'var(--sh-xs)',
                      transform: sel ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <div className="flex h-14">
                      {vibe.palette.map((color, i) => (
                        <div key={i} className="flex-1" style={{ background: color }} />
                      ))}
                    </div>
                    <div className="p-4 bg-white flex-1">
                      <div className="font-display text-[1rem] font-normal text-[var(--brand)] mb-1">{vibe.name}</div>
                      <div className="font-ui text-[11px] text-[var(--n-500)] leading-[1.4]">{vibe.subtitle}</div>
                    </div>
                    {sel && (
                      <div className="px-4 pb-3 bg-white flex items-center gap-1.5 text-[var(--brand)]">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-ui text-[11px] font-medium">Selected</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className="min-h-[calc(100vh-56px)] bg-[var(--n-50)] flex flex-col">
      {/* Progress bar */}
      <div className="sticky top-[56px] z-10 bg-white border-b border-[var(--n-200)] px-6">
        <div className="max-w-[900px] mx-auto py-4">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full flex-1 transition-all duration-500"
                style={{
                  background: i < step ? 'var(--brand)' : i === step ? 'var(--n-400)' : 'var(--n-200)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 pt-10 pb-32">
        <div className="w-full max-w-[900px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Summary strip */}
      {step > 0 && (
        <div className="fixed bottom-[72px] left-0 right-0 z-10 bg-white/90 backdrop-blur-sm border-t border-[var(--n-200)] px-6 py-3">
          <div className="max-w-[900px] mx-auto flex items-center gap-3 overflow-x-auto font-ui text-[11px] text-[var(--n-500)]">
            {value.roomType && (
              <span className="flex items-center gap-1.5 bg-[var(--n-100)] rounded-full px-3 py-1 whitespace-nowrap">
                {renderIcon(value.roomType, "w-3 h-3")} {ROOM_TYPES.find(r => r.value === value.roomType)?.label} · {value.roomWidth}×{value.roomLength}ft
              </span>
            )}
            {value.familyProfile.length > 0 && step > 1 && (
              <span className="flex items-center gap-1 bg-[var(--n-100)] rounded-full px-3 py-1 whitespace-nowrap">
                {value.familyProfile.map(f => <span key={f}>{renderIcon(f, "w-3 h-3")}</span>)}
                {value.mustHaves.length > 0 && ` · ${value.mustHaves.length} must-haves`}
              </span>
            )}
            {value.budget && step > 2 && (
              <span className="bg-[var(--n-100)] rounded-full px-3 py-1 whitespace-nowrap capitalize">
                {value.budget} · {value.city}
              </span>
            )}
            {selectedVibe && step > 3 && (
              <span className="bg-[var(--n-100)] rounded-full px-3 py-1 whitespace-nowrap">
                {selectedVibe.name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[var(--n-200)] px-6 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="max-w-[900px] mx-auto flex items-center justify-end gap-6">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="font-ui text-[14px] font-medium text-[var(--n-500)] hover:text-[var(--brand)] transition-colors cursor-pointer"
            >
              ← Back
            </button>
          )}

          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className="btn-primary px-8 py-3 text-[14px]"
            style={{ opacity: canNext ? 1 : 0.38 }}
          >
            {step === TOTAL_STEPS - 1 ? 'Generate My Designs →' : 'Continue →'}
          </button>
        </div>
      </div>
    </section>
  );
}
