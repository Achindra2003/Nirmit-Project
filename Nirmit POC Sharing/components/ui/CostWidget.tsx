import { formatINR } from '../../lib/costing';

interface CostWidgetProps {
  low: number;
  high: number;
  confidence: number; // 0 to 100
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

export default function CostWidget({ low, high, confidence, onClick, variant = 'default' }: CostWidgetProps) {
  const Component = onClick ? 'button' : 'div';
  const isCompact = variant === 'compact';
  
  return (
    <Component 
      onClick={onClick}
      className={
        isCompact
          ? `flex w-full items-center justify-between gap-5 rounded-xl border border-[var(--n-200)] bg-white px-4 py-3 text-left transition-all duration-[var(--dur-base)] ease-[var(--ease-out)] ${onClick ? 'cursor-pointer hover:-translate-y-[1px] hover:shadow-[var(--sh-md)] shadow-[var(--sh-sm)]' : ''}`
          : `flex flex-col rounded-2xl border border-[var(--n-200)] bg-white p-3 md:p-4 text-left transition-all duration-[var(--dur-base)] ease-[var(--ease-out)] ${onClick ? 'cursor-pointer hover:-translate-y-[1px] hover:shadow-[var(--sh-md)] shadow-[var(--sh-sm)]' : ''}`
      }
    >
      {isCompact ? (
        <>
          <div className="flex flex-col">
            <span className="font-ui text-[9px] uppercase tracking-[0.14em] text-[var(--n-400)]">Estimate</span>
            <span className="font-display text-[1.2rem] font-normal leading-none text-[var(--brand)]">
              {formatINR(low)} – {formatINR(high)}
            </span>
          </div>
          <div className="h-8 w-px bg-[var(--n-200)]" />
          <div className="flex items-center gap-2">
            <div className="h-[4px] w-24 rounded-[2px] bg-[var(--n-100)] overflow-hidden">
              <div
                className="h-full bg-[var(--brand)] rounded-[2px] transition-all duration-[var(--dur-slow)] ease-[var(--ease-out)]"
                style={{ width: `${Math.max(0, Math.min(100, confidence))}%` }}
              />
            </div>
            <span className="font-ui text-[10px] text-[var(--n-500)] whitespace-nowrap">
              {confidence}%
            </span>
          </div>
        </>
      ) : (
        <>
          <p className="font-ui text-[10px] uppercase tracking-[0.1em] text-[var(--n-400)]">Total Estimate</p>

          <p className="font-display text-[1.5rem] font-normal leading-none text-[var(--brand)] mt-1 mb-2">
            {formatINR(low)} – {formatINR(high)}
          </p>

          <div className="flex items-center gap-2">
            <div className="h-[3px] flex-1 rounded-[2px] bg-[var(--n-100)] overflow-hidden">
              <div
                className="h-full bg-[var(--brand)] rounded-[2px] transition-all duration-[var(--dur-slow)] ease-[var(--ease-out)]"
                style={{ width: `${Math.max(0, Math.min(100, confidence))}%` }}
              />
            </div>
            <span className="font-ui text-[11px] text-[var(--n-500)] whitespace-nowrap">
              {confidence}% confident
            </span>
          </div>
        </>
      )}
    </Component>
  );
}
