interface LogoProps {
  dark?: boolean;
  size?: 'sm' | 'md';
}

export default function Logo({ dark = false, size = 'md' }: LogoProps) {
  const fs = size === 'sm' ? 16 : 18;
  const c = dark ? '#E8DDD0' : '#151210';
  const c2 = dark ? 'rgba(232,221,208,0.45)' : '#9B9080';

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, userSelect: 'none', cursor: 'pointer' }}>
      <span style={{ fontFamily: 'var(--fd)', fontSize: fs * 1.1, fontWeight: 600, letterSpacing: '0.02em', color: c }}>
        Nirmit
      </span>
      <span style={{ fontFamily: 'var(--fh)', fontSize: fs * 0.72, color: c2, letterSpacing: '0.04em' }}>
        निर्मित
      </span>
    </div>
  );
}
