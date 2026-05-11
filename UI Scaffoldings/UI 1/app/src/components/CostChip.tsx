interface CostChipProps {
  cost?: string;
  percent?: number;
}

export default function CostChip({ cost = '\u20b92,84,000', percent = 84 }: CostChipProps) {
  return (
    <div
      className="chamfer"
      style={{
        background: '#FFFBF5',
        border: '1.5px solid var(--border-color)',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ width: 56, height: 3, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden' }}>
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: 'var(--accent-marigold)',
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {percent}% of budget
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--accent-marigold)',
        }}
      >
        {cost}
      </div>
    </div>
  );
}
