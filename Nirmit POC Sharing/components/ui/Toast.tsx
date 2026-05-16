import type { ReactNode } from 'react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps {
  id: string;
  variant?: 'vastu' | 'clash' | 'ok';
  title: string;
  message: ReactNode;
  actions?: ToastAction[];
}

export default function Toast({ id, variant = 'ok', title, message, actions }: ToastProps) {
  let bgClass = 'bg-[var(--ok-bg)]';
  let borderClass = 'border-[var(--ok-border)]';
  let textClass = 'text-[var(--ok-text)]';
  let labelColor = 'text-[var(--ok-label)]';
  let icon = '✓';

  if (variant === 'vastu') {
    bgClass = 'bg-[var(--vastu-bg)]';
    borderClass = 'border-[var(--vastu-border)]';
    textClass = 'text-[var(--vastu-text)]';
    labelColor = 'text-[var(--vastu-label)]';
    icon = '◐';
  } else if (variant === 'clash') {
    bgClass = 'bg-[var(--clash-bg)]';
    borderClass = 'border-[var(--clash-border)]';
    textClass = 'text-[var(--clash-text)]';
    labelColor = 'text-[var(--clash-label)]';
    icon = '⊘';
  }

  return (
    <div
      id={id}
      className={`mb-2 flex gap-3 rounded-xl border ${bgClass} ${borderClass} p-3`}
      style={{ animation: 'slideUpFade var(--dur-slow) var(--ease-out)' }}
    >
      <span className={`mt-0.5 shrink-0 text-[13px] ${labelColor}`}>{icon}</span>
      <div className="flex-1">
        <p className={`mb-1 font-ui text-[13px] font-medium ${textClass}`}>{title}</p>
        <p className={`font-ui text-[12px] leading-[1.55] opacity-80 ${textClass} ${actions?.length ? 'mb-2.5' : ''}`}>
          {message}
        </p>
        {actions && actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={action.onClick}
                className={`rounded border border-transparent px-2 py-1 font-ui text-[11px] font-medium transition hover:border-current ${labelColor}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
