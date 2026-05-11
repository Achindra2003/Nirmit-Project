interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  dark?: boolean;
}

export default function Logo({ size = 'md', dark = false }: LogoProps) {
  const sizes = {
    sm: { main: 16, sub: 11 },
    md: { main: 22, sub: 14 },
    lg: { main: 30, sub: 18 },
  };
  const s = sizes[size];
  const textColor = dark ? 'var(--text-inverse)' : 'var(--text-primary)';
  const subColor = dark ? 'rgba(253,248,242,0.5)' : 'var(--text-muted)';

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, userSelect: 'none' }}>
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: s.main,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: textColor,
          lineHeight: 1,
        }}
      >
        Nirmit
      </span>
      <span
        style={{
          fontFamily: 'var(--font-hindi)',
          fontSize: s.sub,
          color: subColor,
          lineHeight: 1,
        }}
      >
        निर्मित
      </span>
    </div>
  );
}
