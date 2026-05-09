import { lazy, Suspense, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ErrorBoundary from './components/ErrorBoundary';
import { useStore, type ItemDraft } from './store/useStore';
import type { IntakePayload } from './types/journey';
import type { LayoutResult } from './solver/layoutSolver';
import type { AIRankedLayout } from './lib/ai/layoutService';
import type { RoomRenderResult } from './lib/ai/imageService';
import { estimateCostSummary } from './lib/costing';
import { trackScreenView } from './lib/analytics';

// ── Lazy-loaded screens ──
const LandingScreen = lazy(() => import('./screens/LandingScreen'));
const IntakeScreen = lazy(() => import('./screens/IntakeScreen'));
const GeneratingScreen = lazy(() => import('./screens/GeneratingScreen'));
const VisionsScreen = lazy(() => import('./screens/VisionsScreen'));
const PlannerScreen = lazy(() => import('./screens/PlannerScreen'));
const ExportScreen = lazy(() => import('./screens/ExportScreen'));

// ── Shared screen state in Zustand (extended for router pattern) ──
function ScreenFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--brand)',
        gap: 20,
      }}
    >
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(200,169,110,0.2)' }} />
        <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', border: '2px solid rgba(200,169,110,0.4)', borderTopColor: '#C8A96E' }} />
        <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '2px solid rgba(200,169,110,0.3)', borderBottomColor: '#C8A96E' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C8A96E' }} />
        </div>
      </div>
      <span style={{ color: '#C8A96E', fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.1em' }}>
        Loading...
      </span>
    </div>
  );
}

// ── Wrappers that bridge screen components into the router ──

function LandingWrapper() {
  const navigate = useNavigate();
  return <LandingScreen onStart={() => navigate('/intake')} />;
}

function IntakeWrapper() {
  const navigate = useNavigate();
  const setIntakePayload = useStore((s) => s.setIntakePayload);

  return (
    <IntakeScreen
      onComplete={(payload: IntakePayload) => {
        setIntakePayload(payload);
        navigate('/generating');
      }}
    />
  );
}

function GeneratingWrapper() {
  const navigate = useNavigate();
  const intakePayload = useStore((s) => s.intakePayload);
  const setGeneratedLayouts = useStore((s) => s.setGeneratedLayouts);
  const setGeneratedRankings = useStore((s) => s.setGeneratedRankings);
  const setGeneratedRenders = useStore((s) => s.setGeneratedRenders);
  const setSelectedLayoutId = useStore((s) => s.setSelectedLayoutId);

  const handleComplete = useCallback((result: { layouts: LayoutResult[]; rankings: AIRankedLayout[]; renders: Map<number, RoomRenderResult[]>; degraded?: boolean }) => {
    setGeneratedLayouts(result.layouts);
    if (result.rankings) setGeneratedRankings(result.rankings);
    if (result.renders) setGeneratedRenders(result.renders);
    if (result.layouts.length > 0) {
      setSelectedLayoutId(String(0));
    }
    navigate('/visions');
  }, [navigate, setGeneratedLayouts, setGeneratedRankings, setGeneratedRenders, setSelectedLayoutId]);

  const handleBack = useCallback(() => navigate('/intake'), [navigate]);

  // Guard: if no intake payload, redirect to intake
  if (!intakePayload) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--brand)', gap: 16 }}>
        <span style={{ color: '#C8A96E', fontFamily: 'var(--font-display)', fontSize: 16 }}>Tell us about your space first</span>
        <button onClick={() => navigate('/intake')} style={{ background: '#C8A96E', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
          Go to Intake
        </button>
      </div>
    );
  }

  return (
    <GeneratingScreen
      intakePayload={intakePayload}
      onComplete={handleComplete}
      onBack={handleBack}
    />
  );
}

function VisionsWrapper() {
  const navigate = useNavigate();
  const layouts = useStore((s) => s.generatedLayouts);
  const rankings = useStore((s) => s.generatedRankings);
  const renders = useStore((s) => s.generatedRenders);
  const replaceItems = useStore((s) => s.replaceItems);
  const intakePayload = useStore((s) => s.intakePayload);
  const room = useStore((s) => s.room);

  return (
    <VisionsScreen
      layouts={layouts}
      rankings={rankings}
      roomWidth={room.width}
      roomLength={room.length}
      renders={renders}
      onSelectLayout={(items: ItemDraft[]) => {
        // Load the selected items into the store
        const withIds = items.map((draft, i) => ({
          ...draft,
          id: `item-${i}-${Math.random().toString(36).substring(2, 8)}`,
          rotation: draft.rotation ?? 0,
          color: draft.color ?? '#C8A96E',
          price: draft.price ?? 0,
          brand: draft.brand ?? 'Nirmit Select',
        }));
        replaceItems(withIds);
        navigate('/plan');
      }}
      onBack={() => navigate('/generating')}
    />
  );
}

function PlannerWrapper() {
  const navigate = useNavigate();
  const intakePayload = useStore((s) => s.intakePayload);

  // Fallback to a minimal payload if store is empty (direct URL navigation)
  if (!intakePayload) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--brand)', gap: 16 }}>
        <span style={{ color: '#C8A96E', fontFamily: 'var(--font-display)', fontSize: 16 }}>Session expired</span>
        <button onClick={() => navigate('/')} style={{ background: '#C8A96E', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
          Start Over
        </button>
      </div>
    );
  }

  return (
    <PlannerScreen
      intakePayload={intakePayload}
      onBack={() => navigate('/visions')}
      onContinue={() => navigate('/export')}
    />
  );
}

function ExportWrapper() {
  const navigate = useNavigate();
  const intakePayload = useStore((s) => s.intakePayload);
  const items = useStore((s) => s.items);

  return (
    <ExportScreen
      selectedVibe={intakePayload?.vibe}
      city={intakePayload?.city ?? 'Mumbai'}
      summary={estimateCostSummary(items, intakePayload?.city ?? 'Mumbai')}
      onBack={() => navigate('/plan')}
      onStartOver={() => navigate('/')}
    />
  );
}

// ── Page transition wrapper ──
const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, filter: 'blur(4px)' },
};

const pageTransition = {
  duration: 0.45,
  ease: [0.16, 1, 0.3, 1] as const,
};

function AnimatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </motion.div>
  );
}

// ── App ──

function AnimatedRoutes() {
  const location = useLocation();

  useEffect(() => {
    trackScreenView(location.pathname);
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedRoute><LandingWrapper /></AnimatedRoute>} />
        <Route path="/intake" element={<AnimatedRoute><IntakeWrapper /></AnimatedRoute>} />
        <Route path="/generating" element={<AnimatedRoute><GeneratingWrapper /></AnimatedRoute>} />
        <Route path="/visions" element={<AnimatedRoute><VisionsWrapper /></AnimatedRoute>} />
        <Route path="/plan" element={<AnimatedRoute><PlannerWrapper /></AnimatedRoute>} />
        <Route path="/export" element={<AnimatedRoute><ExportWrapper /></AnimatedRoute>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<ScreenFallback />}>
          <AnimatedRoutes />
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}