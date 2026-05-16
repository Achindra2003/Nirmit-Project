import type { CostSummary } from '../../lib/costing';
import { formatINR } from '../../lib/costing';

interface CostDrawerProps {
  summary: CostSummary;
  open: boolean;
  onClose: () => void;
}

export default function CostDrawer({ summary, open, onClose }: CostDrawerProps) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/20"
          aria-label="Close cost panel"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed right-0 top-0 z-40 h-full w-full max-w-sm border-l border-[var(--n-200)] bg-white p-6 shadow-[var(--sh-xl)] transition-transform duration-[var(--dur-dramatic)] ease-[var(--ease-out)]',
          open ? 'translate-x-0' : 'translate-x-full'
        ].join(' ')}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[0.2em] text-[var(--n-400)]">Financial Clarity</p>
            <h3 className="font-display text-3xl leading-tight text-[var(--brand)]">Cost Estimate</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--n-300)] px-3 py-1 font-ui text-sm text-[var(--n-600)] transition hover:bg-[var(--n-100)]"
          >
            Close
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-[var(--n-200)] bg-[var(--n-50)] p-4">
          <p className="font-ui text-xs uppercase tracking-[0.16em] text-[var(--n-400)]">Current Total</p>
          <p className="mt-2 font-display text-2xl text-[var(--brand)]">
            {formatINR(summary.totalLow)} - {formatINR(summary.totalHigh)}
          </p>
          <p className="mt-1 font-ui text-xs text-[var(--n-500)]">Based on {summary.city} labor and current material assumptions</p>
        </div>

        <div className="space-y-3 font-ui text-sm text-[var(--n-600)]">
          <div className="flex items-center justify-between">
            <span>Furniture</span>
            <span>
              {formatINR(summary.furnitureLow)} - {formatINR(summary.furnitureHigh)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--n-100)]">
            <div className="h-full w-[67%] rounded-full bg-[var(--brand)] opacity-80" />
          </div>
          <div className="flex items-center justify-between">
            <span>Materials</span>
            <span>{formatINR(summary.materialCost)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--n-100)]">
            <div className="h-full w-[44%] rounded-full bg-[var(--brand)] opacity-60" />
          </div>
          <div className="flex items-center justify-between">
            <span>Labor ({summary.city})</span>
            <span>{formatINR(summary.laborCost)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--n-100)]">
            <div className="h-full w-[31%] rounded-full bg-[var(--brand)] opacity-40" />
          </div>
          <div className="my-3 border-t border-[var(--n-200)]" />
          <div className="flex items-center justify-between font-display text-xl text-[var(--brand)]">
            <span>Total</span>
            <span>
              {formatINR(summary.totalLow)} - {formatINR(summary.totalHigh)}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-xl border border-[var(--n-200)] bg-[var(--n-50)] p-4">
          <p className="font-ui text-xs text-[var(--n-600)]">
            Low range assumes budget materials with standard hardware.
          </p>
          <p className="font-ui text-xs text-[var(--n-600)]">
            High range assumes premium finishes and upgrades.
          </p>
          <p className="font-ui text-xs italic text-[var(--n-500)]">
            This breakdown is designed to help you negotiate with contractor transparency.
          </p>
        </div>
      </aside>
    </>
  );
}
