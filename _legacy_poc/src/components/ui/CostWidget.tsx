import { useMemo } from 'react';
import { useStore, useItems } from '../../store/useStore';
import { type BudgetTier, deriveLegacyContext } from '../../types/journey';
import {
  estimateCostSummary,
  buildBudgetContext,
  formatINR,
  splitIntoPhases,
  type BudgetInfo,
  type CostPhase,
} from '../../lib/costing';

/** Convert BudgetTier string union to approximate numeric budget */
function budgetTierToValue(budgetTier: BudgetTier | null): number | null {
  switch (budgetTier) {
    case 'budget': return 100000;
    case 'mid-range': return 350000;
    case 'premium': return 700000;
    case 'luxury': return 1500000;
    default: return null;
  }
}

// ── CostWidget: Budget bar + savings + real-world context ──

export function CostWidget() {
  const items = useItems();
  const intakePayload = useStore((s) => s.intakePayload);
  const legacyContext = intakePayload ? deriveLegacyContext(intakePayload) : null;
  const city = legacyContext?.city ?? 'Mumbai';
  const budgetTier = intakePayload?.budgetTier ?? null;
  const userBudget = budgetTierToValue(budgetTier);

  const costSummary = useMemo(() => estimateCostSummary(items, city), [items, city]);
  const budget = useMemo(
    () => buildBudgetContext(items, costSummary, userBudget),
    [items, costSummary, userBudget],
  );
  const phases = useMemo(() => splitIntoPhases(items, costSummary), [items, costSummary]);

  if (items.length === 0) return null;

  return (
    <div style={styles.container}>
      <BudgetBar budget={budget} />
      <RealWorldContext context={budget.realWorldContext} />
      {budget.savingsOpportunities.length > 0 && (
        <SavingsSection opportunities={budget.savingsOpportunities} />
      )}
      <PhaseBreakdown phases={phases} />
    </div>
  );
}

// ── Budget Bar ──

function BudgetBar({ budget }: { budget: BudgetInfo }) {
  const { statedBudget, currentLow, remaining, percentUsed } = budget;

  // Clamp percentage to 0-100 for display
  const barPercent = Math.min(percentUsed ?? 100, 120);
  const isOverBudget = remaining !== null && remaining < 0;

  return (
    <div style={styles.barSection}>
      <div style={styles.barHeader}>
        <span style={styles.barLabel}>Estimated Cost</span>
        <span style={styles.barTotal}>{formatINR(currentLow)}</span>
      </div>

      {statedBudget && (
        <>
          <div style={styles.barTrack}>
            <div
              style={{
                ...styles.barFill,
                width: `${Math.min(barPercent, 100)}%`,
                background: isOverBudget
                  ? 'linear-gradient(90deg, #E53E3E, #F56565)'
                  : percentUsed && percentUsed > 85
                    ? 'linear-gradient(90deg, #D69E2E, #F6E05E)'
                    : 'linear-gradient(90deg, #38A169, #68D391)',
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>

          <div style={styles.barDetails}>
            <span style={styles.barBudgetText}>Your budget: {formatINR(statedBudget)}</span>
            {remaining !== null && (
              <span
                style={{
                  ...styles.barRemaining,
                  color: isOverBudget ? '#FC8181' : '#68D391',
                }}
              >
                {isOverBudget
                  ? `${formatINR(Math.abs(remaining))} over budget`
                  : `${formatINR(remaining)} remaining`}
              </span>
            )}
          </div>
        </>
      )}

      {!statedBudget && (
        <p style={styles.noBudgetHint}>
          Set a budget in your profile and we'll track it here.
        </p>
      )}
    </div>
  );
}

// ── Real World Context ──

function RealWorldContext({ context }: { context: string }) {
  return (
    <div style={styles.contextBox}>
      <span style={styles.contextIcon}>💡</span>
      <span style={styles.contextText}>{context}</span>
    </div>
  );
}

// ── Savings Opportunities ──

function SavingsSection({
  opportunities,
}: {
  opportunities: BudgetInfo['savingsOpportunities'];
}) {
  const totalSavings = opportunities.reduce((sum, o) => sum + o.amount, 0);

  return (
    <div style={styles.savingsSection}>
      <div style={styles.savingsHeader}>
        <span style={styles.savingsTitle}>💰 Savings Opportunities</span>
        <span style={styles.savingsTotal}>
          Save up to {formatINR(totalSavings)}
        </span>
      </div>

      <div style={styles.savingsList}>
        {opportunities.map((opp, i) => (
          <div key={i} style={styles.savingsItem}>
            <div style={styles.savingsItemLeft}>
              <span style={difficultyStyle(opp.difficulty)}>
                {opp.difficulty === 'easy' ? '✨ Easy' : opp.difficulty === 'moderate' ? '⚡ Moderate' : '🔨 Hard'}
              </span>
              <span style={styles.savingsDesc}>{opp.description}</span>
            </div>
            <span style={styles.savingsAmount}>−{formatINR(opp.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Phase Breakdown ──

function PhaseBreakdown({ phases }: { phases: CostPhase[] }) {
  if (phases.length === 0) return null;

  return (
    <div style={styles.phaseSection}>
      <span style={styles.phaseTitle}>📋 Execution Phases</span>

      <div style={styles.phaseList}>
        {phases.map((phase, i) => (
          <div key={i} style={styles.phaseItem}>
            <div style={styles.phaseHeader}>
              <div style={priorityBadgeStyle(phase.priority)}>
                {phase.priority === 1 ? 'Do Now' : phase.priority === 2 ? 'Next' : 'Later'}
              </div>
              <span style={styles.phaseLabel}>{phase.label}</span>
            </div>
            <p style={styles.phaseDesc}>{phase.description}</p>
            <div style={styles.phaseItems}>
              {phase.items.slice(0, 5).map((item, j) => (
                <span key={j} style={styles.phaseItemTag}>{item}</span>
              ))}
              {phase.items.length > 5 && (
                <span style={styles.phaseItemMore}>+{phase.items.length - 5} more</span>
              )}
            </div>
            <span style={styles.phaseCost}>{formatINR(phase.cost)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Style helpers (standalone functions, not inline callables) ──

function difficultyStyle(difficulty: string): React.CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 600,
    color:
      difficulty === 'easy'
        ? '#68D391'
        : difficulty === 'moderate'
          ? '#F6E05E'
          : '#FC8181',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };
}

function priorityBadgeStyle(priority: number): React.CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 4,
    background:
      priority === 1
        ? 'rgba(56, 161, 105, 0.15)'
        : priority === 2
          ? 'rgba(214, 158, 46, 0.15)'
          : 'rgba(160, 174, 192, 0.1)',
    color:
      priority === 1
        ? '#68D391'
        : priority === 2
          ? '#F6E05E'
          : '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: '16px 0',
  },

  // Budget Bar
  barSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  barHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  barLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  barTotal: {
    fontSize: 20,
    fontWeight: 700,
    color: '#E2E8F0',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  barDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
  },
  barBudgetText: {
    color: '#A0AEC0',
  },
  barRemaining: {
    fontWeight: 600,
  },
  noBudgetHint: {
    margin: 0,
    fontSize: 12,
    color: '#718096',
    fontStyle: 'italic',
  },

  // Real World Context
  contextBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 12px',
    background: 'rgba(200, 169, 110, 0.08)',
    borderRadius: 8,
    border: '1px solid rgba(200, 169, 110, 0.15)',
  },
  contextIcon: {
    fontSize: 14,
    flexShrink: 0,
    marginTop: 1,
  },
  contextText: {
    fontSize: 13,
    color: '#CBD5E0',
    lineHeight: 1.5,
  },

  // Savings
  savingsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  savingsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  savingsTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  savingsTotal: {
    fontSize: 12,
    fontWeight: 600,
    color: '#68D391',
  },
  savingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  savingsItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  savingsItemLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  savingsDesc: {
    fontSize: 12,
    color: '#A0AEC0',
    lineHeight: 1.5,
  },
  savingsAmount: {
    fontSize: 13,
    fontWeight: 600,
    color: '#68D391',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  // Phases
  phaseSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  phaseTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  phaseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  phaseItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  phaseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  phaseLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#E2E8F0',
  },
  phaseDesc: {
    margin: 0,
    fontSize: 12,
    color: '#718096',
    lineHeight: 1.5,
  },
  phaseItems: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  phaseItemTag: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.05)',
    color: '#CBD5E0',
  },
  phaseItemMore: {
    fontSize: 11,
    padding: '2px 8px',
    color: '#718096',
  },
  phaseCost: {
    fontSize: 14,
    fontWeight: 700,
    color: '#C8A96E',
    alignSelf: 'flex-end',
  },
};