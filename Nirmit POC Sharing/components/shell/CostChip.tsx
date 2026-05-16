import type { CostSummary } from '../../lib/costing';
import CostWidget from '../ui/CostWidget';

interface CostChipProps {
  summary: CostSummary;
  onClick: () => void;
  offset?: {
    right?: number;
    bottom?: number;
    top?: number;
    left?: number;
  };
  variant?: 'default' | 'compact';
  inline?: boolean;
}

export default function CostChip({ summary, onClick, offset, variant = 'default', inline = false }: CostChipProps) {
  // Mock confidence based on the range spread. Tighter range = higher confidence.
  const spread = summary.totalHigh - summary.totalLow;
  const avg = (summary.totalHigh + summary.totalLow) / 2;
  const confidence = avg === 0 ? 0 : Math.round(100 - (spread / avg) * 100);
  const hasTop = offset?.top !== undefined;
  const hasLeft = offset?.left !== undefined;
  const positionStyle = {
    top: offset?.top,
    bottom: hasTop ? undefined : (offset?.bottom ?? 24),
    left: offset?.left,
    right: hasLeft ? undefined : (offset?.right ?? 24),
  };
  const chipStyle = inline
    ? { width: '100%' }
    : { ...positionStyle, width: variant === 'compact' ? 328 : undefined };
  const chipClass = inline ? 'w-full' : 'fixed z-40';

  return (
    <div className={chipClass} style={chipStyle}>
      <CostWidget
        low={summary.totalLow}
        high={summary.totalHigh}
        confidence={Math.max(40, confidence)} // Minimum 40% confidence for display
        onClick={onClick}
        variant={variant}
      />
    </div>
  );
}
