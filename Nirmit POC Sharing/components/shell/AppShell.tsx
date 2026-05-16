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
  onBack?: () => void;
}

export default function AppShell({
  children,
  screen,
  currentStep,
  showCost,
  costSummary,
  costOpen,
  onCostOpen,
  onCostClose,
  onBack,
}: AppShellProps) {
  const isFullWidthScreen = screen === 'plan' || screen === 'style' || screen === 'visions' || screen === 'generating';
  const isFixedViewportScreen = screen === 'plan' || screen === 'style' || screen === 'generating';
  const isPlanScreen = screen === 'plan';
  const showFloatingCost = showCost && !isPlanScreen;
  const costChipVariant = isPlanScreen ? 'compact' : 'default';
  const rightColumnWidth = 200;

  return (
    <div className="min-h-screen bg-[var(--n-50)] text-[var(--brand)]">
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          borderBottom: '1px solid rgba(242,235,221,.08)',
          background: 'rgba(26,23,20,0.97)',
          backdropFilter: 'blur(12px)',
          padding: '0 32px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1440, margin: '0 auto' }}>
          {/* Left: Back button + Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 200 }}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 16px', borderRadius: 9999,
                  border: '1px solid rgba(242,235,221,.15)',
                  background: 'rgba(255,255,255,.06)',
                  color: 'rgba(242,235,221,.7)',
                  fontSize: 13,
                  fontFamily: 'var(--f-body)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = 'rgba(242,235,221,.4)';
                  e.currentTarget.style.color = 'rgba(242,235,221,1)';
                  e.currentTarget.style.transform = 'translateX(-2px)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'rgba(242,235,221,.15)';
                  e.currentTarget.style.color = 'rgba(242,235,221,.7)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                ← Back
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--paper, var(--n-50))' }}>Nirmit</span>
              <span style={{ width: 1, height: 22, background: 'rgba(242,235,221,.15)' }} />
              <img src="/nirmit-logo.svg.svg" alt="Nirmit" style={{ height: 30, width: 'auto', opacity: 0.95 }} />
            </div>
          </div>

          {/* Center: Progress trail */}
          <ProgressTrail currentStep={currentStep} />

          {/* Right: balance spacer */}
          <div style={{ minWidth: rightColumnWidth }} />
        </div>
      </header>

      {showFloatingCost && (
        <CostChip
          summary={costSummary}
          onClick={onCostOpen}
          variant={costChipVariant}
        />
      )}

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
