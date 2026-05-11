import Logo from './Logo';

interface TopBarProps {
  active: string;
  onNav: (s: string) => void;
  dark?: boolean;
}

const TABS = [
  ['cover', 'I', 'Cover'],
  ['consult', 'II', 'Consult'],
  ['draft', 'III', 'Draft'],
  ['visions', 'IV', 'Visions'],
  ['workspace', 'V', 'Workspace'],
  ['export', 'VI', 'Export'],
];

export default function TopBar({ active, onNav, dark = false }: TopBarProps) {
  return (
    <div
      style={{
        height: 60,
        padding: '0 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        background: dark ? '#1A1714' : '#E8DDD0',
        borderBottom: dark ? '2px solid rgba(232,221,208,0.08)' : '2px solid rgba(155,144,128,0.2)',
      }}
    >
      <div onClick={() => onNav('cover')}>
        <Logo dark={dark} size="sm" />
      </div>

      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {TABS.map(([id, n, label]) => {
          const isAct = active === id;
          return (
            <div
              key={id}
              onClick={() => onNav(id)}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 5,
                cursor: 'pointer',
                padding: '6px 12px',
                borderBottom: isAct ? `2px solid ${dark ? '#D4A03D' : '#C2552D'}` : '2px solid transparent',
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--fm)',
                  fontSize: 9,
                  color: isAct ? (dark ? 'rgba(232,221,208,0.6)' : '#C2552D') : (dark ? 'rgba(232,221,208,0.3)' : '#9B9080'),
                  letterSpacing: '0.12em',
                }}
              >
                {n}
              </span>
              <span
                style={{
                  fontFamily: 'var(--fd)',
                  fontStyle: 'italic',
                  fontSize: 13,
                  fontWeight: 500,
                  color: isAct ? (dark ? '#E8DDD0' : '#151210') : (dark ? 'rgba(232,221,208,0.35)' : '#9B9080'),
                  transition: 'color 0.2s',
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <span
        style={{
          fontFamily: 'var(--fm)',
          fontSize: 10,
          color: dark ? 'rgba(232,221,208,0.35)' : '#9B9080',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Mumbai · Nº 0042
      </span>
    </div>
  );
}
