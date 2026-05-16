import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseClass = `btn-${variant}`;
  
  let sizeClass = '';
  if (size === 'sm') {
    sizeClass = 'px-3 py-1.5 text-xs';
  } else if (size === 'md') {
    sizeClass = 'px-6 py-2.5 text-sm';
  } else if (size === 'lg') {
    sizeClass = 'px-8 py-3.5 text-[15px]';
  }

  return (
    <button className={`${baseClass} ${sizeClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
