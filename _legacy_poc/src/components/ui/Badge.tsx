import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'vastu' | 'clash' | 'ok' | 'info';
  children: ReactNode;
  className?: string;
}

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  let colorClass = 'bg-[var(--n-100)] text-[var(--n-600)] border border-[var(--n-200)]';
  
  if (variant === 'vastu') {
    colorClass = 'bg-[var(--vastu-bg)] text-[var(--vastu-text)] border border-[var(--vastu-border)]';
  } else if (variant === 'clash') {
    colorClass = 'bg-[var(--clash-bg)] text-[var(--clash-text)] border border-[var(--clash-border)]';
  } else if (variant === 'ok') {
    colorClass = 'bg-[var(--ok-bg)] text-[var(--ok-text)] border border-[var(--ok-border)]';
  } else if (variant === 'info') {
    colorClass = 'bg-[var(--info-bg)] text-[var(--info-text)] border border-[var(--info-border)]';
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-ui text-[10px] font-medium uppercase tracking-widest ${colorClass} ${className}`}>
      {children}
    </span>
  );
}
