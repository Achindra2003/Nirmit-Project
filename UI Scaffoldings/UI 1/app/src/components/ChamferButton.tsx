import { useState, type ReactNode } from 'react';

interface ChamferButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'filled' | 'outline' | 'ghost';
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function ChamferButton({
  children,
  onClick,
  variant = 'filled',
  disabled = false,
  fullWidth = false,
  className = '',
  style = {},
}: ChamferButtonProps) {
  const [hovered, setHovered] = useState(false);

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '13px 28px',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.32 : 1,
    transition: 'all 0.25s ease',
    border: 'none',
    width: fullWidth ? '100%' : undefined,
    clipPath:
      'polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)',
  };

  const variants = {
    filled: {
      background: hovered && !disabled ? 'var(--accent-marigold)' : 'var(--bg-dark)',
      color: 'var(--text-inverse)',
    },
    outline: {
      background: hovered && !disabled ? 'var(--bg-dark)' : 'transparent',
      color: hovered && !disabled ? 'var(--text-inverse)' : 'var(--bg-dark)',
      boxShadow: 'inset 0 0 0 1.5px var(--bg-dark)',
    },
    ghost: {
      background: 'transparent',
      color: hovered && !disabled ? 'var(--text-primary)' : 'var(--text-muted)',
      textDecoration: 'underline',
      textUnderlineOffset: 3,
      clipPath: 'none',
      padding: '8px 0',
      fontSize: 12,
    },
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...base, ...variants[variant], ...style }}
      className={className}
    >
      {children}
    </button>
  );
}
