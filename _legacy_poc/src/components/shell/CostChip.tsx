import type { CostSummary } from '../../lib/costing';
import { CostWidget } from '../ui/CostWidget';

interface CostChipProps {
  summary: CostSummary;
  onClick: () => void;
}

export default function CostChip({ summary, onClick }: CostChipProps) {
  // Mock confidence based on the range spread. Tighter range = higher confidence.
  const spread = summary.totalHigh - summary.totalLow;
  const avg = (summary.totalHigh + summary.totalLow) / 2;
  const confidence = avg === 0 ? 0 : Math.round(100 - (spread / avg) * 100);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <CostWidget />
    </div>
  );
}
