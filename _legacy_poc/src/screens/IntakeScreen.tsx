import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sofa, Bed, ChefHat, Laptop, Utensils, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { trackEvent } from '../lib/analytics';
import {
  VIBE_TILES,
  ROOM_TYPES,
  COMMON_ROOM_SIZES,
  CONTEXT_CITIES,
  BUDGET_TIERS,
  type VibeTile,
  type RoomType,
  type HouseholdProfile,
  type CityName,
  type BudgetTier,
  type IntakePayload,
} from '../types/journey';

// ─── Props ────────────────────────────────────────────────────────────────────

interface IntakeScreenProps {
  onComplete: (payload: IntakePayload) => void;
}

// ─── Icons per room type ──────────────────────────────────────────────────────

const ROOM_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  'living-room': Sofa,
  'bedroom': Bed,
  'kitchen': ChefHat,
  'study': Laptop,
  'dining-room': Utensils,
};

// ─── Multi-step state machine: 4 steps (Q1→Q2→Q3→Q4) ────────────────────────

type Step = 1 | 2 | 3 | 4;
const TOTAL_STEPS = 4;

// ─── Animation variants ───────────────────────────────────────────────────────

const slideLeft = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

const slideRight = {
  initial: { opacity: 0, x: -60 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 60 },
};

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function IntakeScreen({ onComplete }: IntakeScreenProps) {
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Q1 — Vibe
  const [vibe, setVibe] = useState<VibeTile | null>(null);

  // Q2 — Room type + dimensions
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [roomWidth, setRoomWidth] = useState(12);
  const [roomLength, setRoomLength] = useState(14);
  const [showCustomDimensions, setShowCustomDimensions] = useState(false);

  // Q3 — Household
  const [household, setHousehold] = useState<HouseholdProfile>({
    hasSeniors: false,
    hasChildren: false,
    hasPets: false,
    otherNotes: '',
  });

  // Q4 — Budget + City
  const [city, setCity] = useState<CityName | null>(null);
  const [budgetTier, setBudgetTier] = useState<BudgetTier>('mid-range');

  // ── Navigation ────────────────────────────────────────────────────────────

  const goForward = useCallback(() => {
    if (step < TOTAL_STEPS) {
      setDirection('forward');
      setStep((s) => (s + 1) as Step);
      trackEvent('intake', 'step_complete', `step_${step}`);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setDirection('backward');
      setStep((s) => (s - 1) as Step);
    }
  }, [step]);

  const handleComplete = useCallback(() => {
    if (!vibe || !roomType || !budgetTier) return;

    const payload: IntakePayload = {
      vibe,
      roomType,
      room: { width: roomWidth, length: roomLength },
      household,
      city,
      budgetTier,
    };

    trackEvent('intake', 'complete', `vibe:${vibe.id}`);
    onComplete(payload);
  }, [vibe, roomType, roomWidth, roomLength, household, city, budgetTier, onComplete]);

  // ── Step validation ───────────────────────────────────────────────────────

  const canProceedStep = (s: Step): boolean => {
    switch (s) {
      case 1: return vibe !== null;
      case 2: return roomType !== null && roomWidth >= 6 && roomLength >= 6;
      case 3: return true; // household is always valid (all optional booleans)
      case 4: return budgetTier !== null;
      default: return false;
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div style={styles.screen}>
      {/* ── Progress bar ── */}
      <div style={styles.progressContainer}>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progressPercent}%` }} />
        </div>
        <div style={styles.stepIndicator}>
          Step {step} of {TOTAL_STEPS}
        </div>
      </div>

      {/* ── Step content ── */}
      <div style={styles.contentArea}>
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <motion.div key="q1" variants={fadeIn} initial="initial" animate="animate" exit="exit" style={styles.step}>
              <Q1VibeTiles selected={vibe} onSelect={(v) => { setVibe(v); setTimeout(goForward, 300); }} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="q2" variants={direction === 'forward' ? slideLeft : slideRight} initial="initial" animate="animate" exit="exit" style={styles.step}>
              <Q2RoomDetails
                roomType={roomType}
                onRoomTypeChange={setRoomType}
                width={roomWidth}
                length={roomLength}
                onWidthChange={setRoomWidth}
                onLengthChange={setRoomLength}
                showCustom={showCustomDimensions}
                onToggleCustom={() => setShowCustomDimensions(!showCustomDimensions)}
              />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="q3" variants={direction === 'forward' ? slideLeft : slideRight} initial="initial" animate="animate" exit="exit" style={styles.step}>
              <Q3Household value={household} onChange={setHousehold} vibe={vibe} />
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="q4" variants={direction === 'forward' ? slideLeft : slideRight} initial="initial" animate="animate" exit="exit" style={styles.step}>
              <Q4BudgetCity
                city={city}
                onCityChange={setCity}
                budgetTier={budgetTier}
                onBudgetChange={setBudgetTier}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom navigation ── */}
      <div style={styles.navBar}>
        {step > 1 ? (
          <button style={styles.navButton} onClick={goBack}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS ? (
          <button
            style={{ ...styles.navButton, ...styles.primaryButton, opacity: canProceedStep(step) ? 1 : 0.4 }}
            onClick={goForward}
            disabled={!canProceedStep(step)}
          >
            <span>Continue</span>
            <ArrowRight size={18} />
          </button>
        ) : (
          <button
            style={{ ...styles.navButton, ...styles.primaryButton, ...styles.completeButton, opacity: canProceedStep(step) ? 1 : 0.4 }}
            onClick={handleComplete}
            disabled={!canProceedStep(step)}
          >
            <Sparkles size={18} />
            <span>Design My Room</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Q1 — Vibe Tiles
// ═══════════════════════════════════════════════════════════════════════════════

function Q1VibeTiles({ selected, onSelect }: { selected: VibeTile | null; onSelect: (v: VibeTile) => void }) {
  return (
    <div style={styles.questionWrapper}>
      <h2 style={styles.questionHeading}>What vibe feels like home?</h2>
      <p style={styles.questionSub}>Pick a style — we will design everything around it</p>
      <div style={styles.vibeGrid}>
        {VIBE_TILES.map((vibe) => (
          <motion.button
            key={vibe.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(vibe)}
            style={{
              ...styles.vibeTile,
              background: vibe.gradient,
              outline: selected?.id === vibe.id ? '3px solid #2D2D2D' : '3px solid transparent',
              outlineOffset: '3px',
            }}
          >
            <span style={styles.vibeLabel}>{vibe.label}</span>
            <span style={styles.vibeDesc}>{vibe.description}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Q2 — Room Type + Dimensions
// ═══════════════════════════════════════════════════════════════════════════════

function Q2RoomDetails({
  roomType,
  onRoomTypeChange,
  width,
  length,
  onWidthChange,
  onLengthChange,
  showCustom,
  onToggleCustom,
}: {
  roomType: RoomType | null;
  onRoomTypeChange: (r: RoomType) => void;
  width: number;
  length: number;
  onWidthChange: (w: number) => void;
  onLengthChange: (l: number) => void;
  showCustom: boolean;
  onToggleCustom: () => void;
}) {
  const handlePresetSize = (w: number, l: number) => {
    if (w === 0 && l === 0) {
      onToggleCustom();
      return;
    }
    onWidthChange(w);
    onLengthChange(l);
  };

  return (
    <div style={styles.questionWrapper}>
      <h2 style={styles.questionHeading}>Which room are we designing?</h2>
      <p style={styles.questionSub}>And how big is it?</p>

      {/* Room type chips */}
      <div style={styles.roomGrid}>
        {ROOM_TYPES.map((rt) => {
          const IconComponent = ROOM_ICONS[rt.value];
          const isSelected = roomType === rt.value;
          return (
            <motion.button
              key={rt.value}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onRoomTypeChange(rt.value)}
              style={{
                ...styles.roomChip,
                background: isSelected ? '#2D2D2D' : '#F5F0E8',
                color: isSelected ? '#FFFFFF' : '#2D2D2D',
                border: isSelected ? '2px solid #2D2D2D' : '2px solid #E0D8CC',
              }}
            >
              <IconComponent strokeWidth={1.5} />
              <span style={styles.roomChipLabel}>{rt.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Room size presets */}
      {roomType && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 32 }}>
          <p style={styles.sectionLabel}>Room size</p>
          <div style={styles.sizeChipRow}>
            {COMMON_ROOM_SIZES.map((sz) => {
              const isActive = sz.width === 0
                ? showCustom
                : (sz.width === width && sz.length === length && !showCustom);
              return (
                <button
                  key={sz.label}
                  onClick={() => handlePresetSize(sz.width, sz.length)}
                  style={{
                    ...styles.sizeChip,
                    background: isActive ? '#2D2D2D' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#5C5C5C',
                    border: isActive ? '2px solid #2D2D2D' : '2px solid #DCD5C8',
                  }}
                >
                  {sz.label}
                </button>
              );
            })}
          </div>

          {/* Custom dimensions inputs */}
          {showCustom && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={styles.customDimRow}>
              <div style={styles.dimInputGroup}>
                <label style={styles.dimLabel}>Width (ft)</label>
                <input
                  type="number"
                  min={6}
                  max={20}
                  value={width}
                  onChange={(e) => onWidthChange(Number(e.target.value))}
                  style={styles.dimInput}
                />
              </div>
              <span style={styles.dimX}>&times;</span>
              <div style={styles.dimInputGroup}>
                <label style={styles.dimLabel}>Length (ft)</label>
                <input
                  type="number"
                  min={6}
                  max={20}
                  value={length}
                  onChange={(e) => onLengthChange(Number(e.target.value))}
                  style={styles.dimInput}
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Q3 — Who Lives Here
// ═══════════════════════════════════════════════════════════════════════════════

function Q3Household({
  value,
  onChange,
  vibe,
}: {
  value: HouseholdProfile;
  onChange: (h: HouseholdProfile) => void;
  vibe: VibeTile | null;
}) {
  const toggle = (key: keyof HouseholdProfile) => {
    if (key === 'otherNotes') return;
    onChange({ ...value, [key]: !value[key] });
  };

  const vibeName = vibe?.label ?? 'your style';

  return (
    <div style={styles.questionWrapper}>
      <h2 style={styles.questionHeading}>Who lives here?</h2>
      <p style={styles.questionSub}>
        This helps us tailor {vibeName} to your real life — no extra questions needed
      </p>

      <div style={styles.householdGrid}>
        <ToggleChip
          active={value.hasSeniors}
          onClick={() => toggle('hasSeniors')}
          label="Elders at home"
          description="Rounded edges, no sharp corners, slip-resistant"
        />
        <ToggleChip
          active={value.hasChildren}
          onClick={() => toggle('hasChildren')}
          label="Young kids"
          description="Soft-close, wall-anchored, durable and washable"
        />
        <ToggleChip
          active={value.hasPets}
          onClick={() => toggle('hasPets')}
          label="Pets"
          description="Scratch-resistant fabrics, no delicate surfaces"
        />
      </div>

      <div style={{ marginTop: 28 }}>
        <label style={styles.sectionLabel}>Anything else we should know?</label>
        <textarea
          value={value.otherNotes}
          onChange={(e) => onChange({ ...value, otherNotes: e.target.value })}
          placeholder="e.g. I love the jhoola in my family verandah, we need a prayer corner..."
          rows={3}
          style={styles.textarea}
        />
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  description: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        ...styles.toggleChip,
        background: active ? '#2D2D2D' : '#F5F0E8',
        border: active ? '2px solid #2D2D2D' : '2px solid #E0D8CC',
      }}
    >
      <div style={styles.toggleChipContent}>
        <span style={{ ...styles.toggleLabel, color: active ? '#FFFFFF' : '#2D2D2D' }}>{label}</span>
        <span style={{ ...styles.toggleDesc, color: active ? '#C8C0B4' : '#8C8C8C' }}>{description}</span>
      </div>
      <div style={{
        ...styles.toggleIndicator,
        background: active ? '#4CAF50' : '#DCD5C8',
      }} />
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Q4 — Budget + City
// ═══════════════════════════════════════════════════════════════════════════════

function Q4BudgetCity({
  city,
  onCityChange,
  budgetTier,
  onBudgetChange,
}: {
  city: CityName | null;
  onCityChange: (c: CityName) => void;
  budgetTier: BudgetTier;
  onBudgetChange: (b: BudgetTier) => void;
}) {
  return (
    <div style={styles.questionWrapper}>
      <h2 style={styles.questionHeading}>Last step — budget and location</h2>
      <p style={styles.questionSub}>
        This helps us estimate local pricing and keep things realistic
      </p>

      {/* Budget tiers */}
      <div style={styles.budgetGrid}>
        {BUDGET_TIERS.map((bt) => {
          const isActive = budgetTier === bt.value;
          return (
            <motion.button
              key={bt.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onBudgetChange(bt.value)}
              style={{
                ...styles.budgetCard,
                background: isActive ? '#2D2D2D' : '#F5F0E8',
                border: isActive ? '2px solid #2D2D2D' : '2px solid #E0D8CC',
              }}
            >
              <span style={{ ...styles.budgetLabel, color: isActive ? '#FFFFFF' : '#2D2D2D' }}>
                {bt.label}
              </span>
              <span style={{ ...styles.budgetRange, color: isActive ? '#C8C0B4' : '#8C8C8C' }}>
                {bt.range}
              </span>
              <span style={{ ...styles.budgetDesc, color: isActive ? '#A8A098' : '#A0A0A0' }}>
                {bt.desc}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* City selector */}
      <div style={{ marginTop: 32 }}>
        <label style={styles.sectionLabel}>Your city</label>
        <select
          value={city ?? ''}
          onChange={(e) => onCityChange(e.target.value as CityName)}
          style={styles.citySelect}
        >
          <option value="" disabled>Select your city...</option>
          {CONTEXT_CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles (inline — keeps the screen self-contained, matches Nirmit design
// language: nirmaan palette: cream base, charcoal accents, warm earth tones)
// ═══════════════════════════════════════════════════════════════════════════════

const styles: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #FDF7ED 0%, #F5EDDE 100%)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 24px 32px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: '#2D2D2D',
  },

  // Progress bar
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 40,
    paddingTop: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    background: '#E0D8CC',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#2D2D2D',
    borderRadius: 2,
    transition: 'width 0.5s ease',
  },
  stepIndicator: {
    fontSize: 13,
    color: '#8C8C8C',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },

  // Content
  contentArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 20,
  },
  step: {
    width: '100%',
    maxWidth: 640,
  },

  // Question wrapper
  questionWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  questionHeading: {
    fontSize: 28,
    fontWeight: 700,
    color: '#2D2D2D',
    margin: 0,
    lineHeight: 1.3,
  },
  questionSub: {
    fontSize: 15,
    color: '#8C8C8C',
    margin: '4px 0 28px',
    lineHeight: 1.5,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#8C8C8C',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 10,
    display: 'block',
  },

  // Q1 — Vibe grid
  vibeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
  },
  vibeTile: {
    minHeight: 160,
    borderRadius: 16,
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: 6,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'outline 0.2s ease',
  },
  vibeLabel: {
    fontSize: 20,
    fontWeight: 700,
    color: '#FFFFFF',
    textShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  vibeDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textShadow: '0 1px 3px rgba(0,0,0,0.25)',
    lineHeight: 1.4,
  },

  // Q2 — Room type
  roomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
  },
  roomChip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '20px 12px',
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  roomChipLabel: {
    fontSize: 13,
    fontWeight: 600,
  },

  // Size chips
  sizeChipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  sizeChip: {
    padding: '10px 18px',
    borderRadius: 10,
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
  },
  customDimRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 16,
    marginTop: 16,
    overflow: 'hidden',
  },
  dimInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  dimLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#8C8C8C',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  dimInput: {
    width: 80,
    padding: '10px 12px',
    border: '2px solid #DCD5C8',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'inherit',
    color: '#2D2D2D',
    background: '#FFFFFF',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  dimX: {
    fontSize: 20,
    color: '#BFB5A4',
    paddingBottom: 10,
    fontWeight: 600,
  },

  // Q3 — Household
  householdGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  toggleChip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    width: '100%',
  },
  toggleChipContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: 600,
  },
  toggleDesc: {
    fontSize: 13,
    lineHeight: 1.4,
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    flexShrink: 0,
    marginLeft: 16,
    transition: 'background 0.2s ease',
  },
  textarea: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #DCD5C8',
    borderRadius: 12,
    fontFamily: 'inherit',
    fontSize: 14,
    color: '#2D2D2D',
    background: '#FFFFFF',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.5,
  },

  // Q4 — Budget + City
  budgetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
  },
  budgetCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '20px 16px',
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  budgetLabel: {
    fontSize: 17,
    fontWeight: 700,
  },
  budgetRange: {
    fontSize: 14,
    fontWeight: 600,
  },
  budgetDesc: {
    fontSize: 12,
    lineHeight: 1.4,
    marginTop: 2,
  },
  citySelect: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #DCD5C8',
    borderRadius: 12,
    fontFamily: 'inherit',
    fontSize: 15,
    fontWeight: 500,
    color: '#2D2D2D',
    background: '#FFFFFF',
    outline: 'none',
    cursor: 'pointer',
  },

  // Navigation
  navBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTop: '1px solid #E0D8CC',
    marginTop: 24,
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    borderRadius: 12,
    fontFamily: 'inherit',
    fontSize: 15,
    fontWeight: 600,
    border: '2px solid #DCD5C8',
    background: '#FFFFFF',
    color: '#2D2D2D',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  primaryButton: {
    background: '#2D2D2D',
    color: '#FFFFFF',
    border: '2px solid #2D2D2D',
  },
  completeButton: {
    background: 'linear-gradient(135deg, #C49A6C 0%, #8B6914 100%)',
    border: '2px solid transparent',
    color: '#FFFFFF',
  },
};