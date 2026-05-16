import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  dark?: boolean;
  children: ReactNode;
}

/**
 * Standardised button with 3 tiers.
 * - **primary**: solid terra fill, prominent CTA
 * - **secondary**: outlined, for secondary actions
 * - **ghost**: subtle border, for tertiary actions
 *
 * Set `dark` to true for dark-background contexts (planner, style).
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  dark = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const classMap: Record<string, string> = {
    primary:   dark ? 'btn-primary-dark' : 'btn-primary',
    secondary: 'btn-secondary',
    ghost:     dark ? 'btn-ghost-dark' : 'btn-ghost',
  };

  const baseClass = classMap[variant] ?? classMap.primary;

  let sizeStyles: React.CSSProperties = {};
  if (size === 'sm')  sizeStyles = { padding: '6px 14px',  fontSize: 12 };
  if (size === 'md')  sizeStyles = {};
  if (size === 'lg')  sizeStyles = { padding: '16px 40px', fontSize: 15 };

  return (
    <button className={`${baseClass} ${className}`} style={sizeStyles} {...props}>
      {children}
    </button>
  );
}
