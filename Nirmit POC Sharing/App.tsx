import { type ReactElement, useMemo, useState, useCallback } from 'react';
import AppShell from './components/shell/AppShell';
import { estimateCostSummary } from './lib/costing';
import ExportScreen from './screens/ExportScreen';
import GeneratingScreen from './screens/GeneratingScreen';
import IntakeScreen from './screens/IntakeScreen';
import LandingScreen from './screens/LandingScreen';
import PlannerScreen from './screens/PlannerScreen';
import StyleScreen from './screens/StyleScreen';
import VisionsScreen from './screens/VisionsScreen';
import { useStore } from './store/useStore';
import type { LayoutResult } from './solver/layoutSolver';
import {
  buildAct1HandoffPayload,
  getCurrentStep,
  type ContextAnswers,
  type JourneyScreen,
  VIBE_OPTIONS
} from './types/journey';

export default function App() {
  const items = useStore((state) => state.items);
  const replaceItems = useStore((state) => state.replaceItems);
  const setRoomConfig = useStore((state) => state.setRoomConfig);
  const setMaterialConfig = useStore((state) => state.setMaterialConfig);

  const [screen, setScreen] = useState<JourneyScreen>('landing');
  const [generatedLayouts, setGeneratedLayouts] = useState<{layouts: LayoutResult[], rankings: any[]} | null>(null);
  const [costOpen, setCostOpen] = useState(false);
  const [contextAnswers, setContextAnswers] = useState<ContextAnswers>({
    homeType: null,
    city: 'Mumbai',
    budget: null,
    mustHaves: [],
    roomType: null,
    roomWidth: 12,
    roomLength: 14,
    familyProfile: [],
    vastuPreference: null,
    selectedVibeId: null,
  });

  const selectedVibe = useMemo(
    () => VIBE_OPTIONS.find((vibe) => vibe.id === contextAnswers.selectedVibeId),
    [contextAnswers.selectedVibeId]
  );

  const act1Payload = useMemo(
    () => buildAct1HandoffPayload(selectedVibe, contextAnswers),
    [contextAnswers, selectedVibe]
  );

  const currentStep = getCurrentStep(screen);
  const showCost = ['plan', 'style'].includes(screen);
  const costSummary = useMemo(
    () => estimateCostSummary(items, contextAnswers.city ?? 'Mumbai'),
    [items, contextAnswers.city]
  );

  const navigate = (next: JourneyScreen) => {
    setScreen(next);
    setCostOpen(false);
  };

  const backScreenMap: Partial<Record<JourneyScreen, JourneyScreen>> = {
    visions: 'intake',
    plan: 'visions',
    style: 'plan',
    export: 'style',
  };
  const appShellOnBack = backScreenMap[screen] ? () => navigate(backScreenMap[screen]!) : undefined;

  const handleGenerationComplete = useCallback((data: { layouts: LayoutResult[]; rankings: any[] }) => {
    setGeneratedLayouts(data);
    navigate('visions');
  }, []);

  if (screen === 'landing') {
    return <LandingScreen onStart={() => navigate('intake')} />;
  }

  let content: ReactElement;

  if (screen === 'intake') {
    content = (
      <IntakeScreen
        value={contextAnswers}
        onChange={setContextAnswers}
        onComplete={() => navigate('generating')}
      />
    );
  } else if (screen === 'generating') {
    content = (
      <GeneratingScreen
        context={contextAnswers}
        selectedVibe={selectedVibe}
        onComplete={handleGenerationComplete}
        onBack={() => navigate('intake')}
      />
    );
  } else if (screen === 'visions') {
    content = (
      <VisionsScreen
        layouts={generatedLayouts?.layouts ?? []}
        rankings={generatedLayouts?.rankings ?? []}
        roomWidth={contextAnswers.roomWidth}
        roomLength={contextAnswers.roomLength}
        onSelectLayout={(drafts) => {
          // The store + Planner2D use feet natively
          setRoomConfig({
            type: (contextAnswers.roomType as any) ?? 'living-room',
            width: contextAnswers.roomWidth,
            length: contextAnswers.roomLength,
            shape: 'rectangle',
          });
          if (selectedVibe) {
            setMaterialConfig({
              wallColor: selectedVibe.palette[0],
              flooring: selectedVibe.materialPreset.flooring,
              woodFinish: selectedVibe.materialPreset.woodFinish,
            });
          }
          // Solver places items in meters; convert positions to feet for the planner
          const M_TO_FT = 3.28084;
          replaceItems(drafts.map(d => ({
            ...d,
            id: Math.random().toString(36).substring(2, 10),
            x: d.x * M_TO_FT,
            y: d.y * M_TO_FT,
            width: d.width * M_TO_FT,
            length: d.length * M_TO_FT,
            height: d.height * M_TO_FT,
          })));
          navigate('plan');
        }}
        onBack={() => navigate('intake')}
      />
    );
  } else if (screen === 'plan') {
    content = (
      <PlannerScreen
        act1Payload={
          act1Payload ?? {
            selectedVibeId: selectedVibe?.id ?? 'modern-bombay',
            vibeConfig: selectedVibe ?? VIBE_OPTIONS[1],
            context: {
              homeType: contextAnswers.homeType === 'renting' ? 'renting' : 'owning',
              city: contextAnswers.city ?? 'Mumbai',
              budget: contextAnswers.budget ?? 'mid-range',
              mustHaves: contextAnswers.mustHaves
            },
            meta: {
              completedAt: new Date().toISOString(),
              version: 'v1'
            }
          }
        }
        onBack={() => navigate('visions')}
        onContinue={() => navigate('style')}
        onCostOpen={() => setCostOpen(true)}
      />
    );
  } else if (screen === 'style') {
    content = (
      <StyleScreen
        selectedVibe={selectedVibe}
        onBack={() => navigate('plan')}
        onContinue={() => navigate('export')}
      />
    );
  } else {
    content = (
      <ExportScreen
        selectedVibe={selectedVibe}
        city={contextAnswers.city}
        summary={costSummary}
        onBack={() => navigate('style')}
        onStartOver={() => {
          setContextAnswers({
            homeType: null,
            city: 'Mumbai',
            budget: null,
            mustHaves: [],
            roomType: null,
            roomWidth: 12,
            roomLength: 14,
            familyProfile: [],
            vastuPreference: null,
            selectedVibeId: null,
          });
          navigate('intake');
        }}
      />
    );
  }

  return (
    <AppShell
      screen={screen}
      currentStep={currentStep}
      showCost={showCost}
      costSummary={costSummary}
      costOpen={costOpen}
      onCostOpen={() => setCostOpen(true)}
      onCostClose={() => setCostOpen(false)}
      onBack={appShellOnBack}
    >
      {content}
    </AppShell>
  );
}