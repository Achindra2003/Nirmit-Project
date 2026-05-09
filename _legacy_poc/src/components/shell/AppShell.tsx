import type { ReactNode } from 'react';
import type { CostSummary } from '../../lib/costing';
import type { JourneyScreen } from '../../types/journey';
import CostChip from './CostChip';
import CostDrawer from './CostDrawer';
import ProgressTrail from './ProgressTrail';

interface AppShellProps {
  children: ReactNode;
  screen: JourneyScreen;
  currentStep: number;
  showCost: boolean;
  costSummary: CostSummary;
  costOpen: boolean;
  onCostOpen: () => void;
  onCostClose: () => void;
}

export default function AppShell({
  children,
  screen,
  currentStep,
  showCost,
  costSummary,
  costOpen,
  onCostOpen,
  onCostClose
}: AppShellProps) {
  const isFullWidthScreen = screen === 'plan' || screen === 'style' || screen === 'visions' || screen === 'generating';
  const isFixedViewportScreen = screen === 'plan' || screen === 'style' || screen === 'generating';

  return (
    <div className="min-h-screen bg-[var(--n-50)] text-[var(--brand)]">
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          borderBottom: '1px solid var(--n-200)',
          background: 'rgba(250,250,248,0.92)',
          backdropFilter: 'blur(12px)',
          padding: '0 40px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1440, margin: '0 auto' }}>
          {/* Nirmit wordmark */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{
              fontFamily: 'var(--f-display)',
              fontSize: '1.375rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'var(--brand)',
              lineHeight: 1
            }}>
              Nirmit
            </div>
            <div style={{
              fontFamily: 'var(--f-body)',
              fontSize: '0.625rem',
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              color: 'var(--n-400)'
            }}>
              Interior Planning
            </div>
          </div>

          {/* Progress trail */}
          <ProgressTrail currentStep={currentStep} />

          {/* Spacer */}
          <div style={{ width: 120 }} />
        </div>
      </header>

      {showCost && <CostChip summary={costSummary} onClick={onCostOpen} />}

      <main style={{
        padding: isFullWidthScreen ? 0 : '48px 60px',
        maxWidth: isFullWidthScreen ? 'none' : 1240,
        margin: isFullWidthScreen ? 0 : '0 auto',
        height: isFixedViewportScreen ? 'calc(100vh - 56px)' : 'auto',
        overflow: isFixedViewportScreen ? 'hidden' : 'visible',
      }}>
        {children}
      </main>

      {showCost && <CostDrawer summary={costSummary} open={costOpen} onClose={onCostClose} />}
    </div>
  );
}
