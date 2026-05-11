interface FloorPlanProps {
  S?: number;
  animStage?: number;
}

export default function FloorPlan({ S = 24, animStage = 99 }: FloorPlanProps) {
  const RW = 12 * S;
  const RH = 14 * S;
  const P = 48;
  const VW = RW + P * 2;
  const VH = RH + P * 2;
  const show = (i: number) => animStage >= i ? { opacity: 1 } : { opacity: 0 };
  const bg = '#E8DDD0';
  const ink = '#151210';
  const ink3 = '#9B9080';
  const terra = '#C2552D';
  const sage = '#6B7A4A';

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <pattern id="fp-hatch" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={ink} strokeWidth="0.55" opacity="0.35" />
        </pattern>
        <pattern id="fp-terra" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={terra} strokeWidth="0.6" opacity="0.4" />
        </pattern>
        <pattern id="fp-sage" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={sage} strokeWidth="0.6" opacity="0.45" />
        </pattern>
      </defs>

      <g transform={`translate(${P},${P})`}>
        {/* Floor grid */}
        {Array.from({ length: 13 }).map((_, i) => (
          <line key={`v${i}`} x1={i * S} y1={0} x2={i * S} y2={RH} stroke={bg} strokeWidth="0.5" />
        ))}
        {Array.from({ length: 15 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * S} x2={RW} y2={i * S} stroke={bg} strokeWidth="0.5" />
        ))}

        {/* Floor background */}
        <rect width={RW} height={RH} fill={`${bg}40`} />

        {/* Dimension lines */}
        <g style={show(1)}>
          {/* Top dimension */}
          <line x1={0} y1={-24} x2={RW} y2={-24} stroke={ink3} strokeWidth="0.5" />
          <line x1={0} y1={-28} x2={0} y2={-20} stroke={ink3} strokeWidth="0.5" />
          <line x1={RW} y1={-28} x2={RW} y2={-20} stroke={ink3} strokeWidth="0.5" />
          <text x={RW / 2} y={-30} textAnchor="middle" fontFamily="var(--fm)" fontSize={9} fill={ink3} letterSpacing="0.1em">
            12&apos;-0&quot;
          </text>
          {/* Left dimension */}
          <line x1={-24} y1={0} x2={-24} y2={RH} stroke={ink3} strokeWidth="0.5" />
          <line x1={-28} y1={0} x2={-20} y2={0} stroke={ink3} strokeWidth="0.5" />
          <line x1={-28} y1={RH} x2={-20} y2={RH} stroke={ink3} strokeWidth="0.5" />
          <text x={-28} y={RH / 2} textAnchor="middle" fontFamily="var(--fm)" fontSize={9} fill={ink3} letterSpacing="0.1em" transform={`rotate(-90, -28, ${RH / 2})`}>
            14&apos;-0&quot;
          </text>
        </g>

        {/* Wall outline */}
        {animStage < 99 ? (
          <rect
            width={RW}
            height={RH}
            fill="none"
            stroke={ink}
            strokeWidth={4}
            strokeDasharray={1200}
            strokeDashoffset={animStage > 0 ? 0 : 1200}
            style={{ transition: 'stroke-dashoffset 2.4s ease' }}
          />
        ) : (
          <rect width={RW} height={RH} fill="none" stroke={ink} strokeWidth={4} />
        )}

        {/* Wall fill */}
        <g style={show(1)}>
          <rect x={0} y={0} width={RW} height={4} fill={ink} opacity="0.9" />
          <rect x={0} y={RH - 4} width={RW} height={4} fill={ink} opacity="0.9" />
          <rect x={0} y={0} width={4} height={RH} fill={ink} opacity="0.9" />
          <rect x={RW - 4} y={0} width={4} height={RH} fill={ink} opacity="0.9" />
        </g>

        {/* Window — N wall */}
        <g style={show(1)}>
          <rect x={80} y={-4} width={100} height={8} fill={bg} stroke={ink} strokeWidth="1" />
          <line x1={80} y1={0} x2={180} y2={0} stroke={ink} strokeWidth="0.5" />
          <text x={130} y={-10} textAnchor="middle" fontFamily="var(--fm)" fontSize={8} fill={ink3} letterSpacing="0.1em">
            WINDOW 4&apos;-0&quot;
          </text>
        </g>

        {/* Door — S wall */}
        <g style={show(1)}>
          <rect x={48} y={RH - 4} width={48} height={8} fill={bg} stroke={ink} strokeWidth="1" />
          <path d={`M 48 ${RH} A 48 48 0 0 0 96 ${RH - 48}`} fill="none" stroke={ink3} strokeWidth="0.7" strokeDasharray="2 3" />
          <line x1={48} y1={RH} x2={48} y2={RH - 48} stroke={ink3} strokeWidth="0.8" />
          <text x={72} y={RH + 16} textAnchor="middle" fontFamily="var(--fm)" fontSize={8} fill={ink3} letterSpacing="0.1em">
            DOOR 2&apos;-0&quot;
          </text>
        </g>

        {/* TV Unit — N wall */}
        <g style={show(2)}>
          <rect x={40} y={6} width={130} height={26} fill="url(#fp-hatch)" stroke={ink} strokeWidth="1" />
          <text x={105} y={23} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize={11} fill={ink}>
            TV unit
          </text>
        </g>

        {/* Mandir — NE, terracotta */}
        <g style={show(4)}>
          <rect x={RW - 54} y={6} width={46} height={46} fill="url(#fp-terra)" stroke={terra} strokeWidth="1.5" />
          <text x={RW - 31} y={28} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize={11} fill={terra}>
            Mandir
          </text>
          <text x={RW - 31} y={42} textAnchor="middle" fontFamily="var(--fh)" fontSize={9} fill={terra}>
            मन्दिर
          </text>
        </g>

        {/* Bookshelf — W */}
        <g style={show(2)}>
          <rect x={5} y={84} width={20} height={110} fill="url(#fp-hatch)" stroke={ink} strokeWidth="1" />
          <text x={15} y={140} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize={9} fill={ink} transform="rotate(-90, 15, 140)">
            Bookshelf
          </text>
        </g>

        {/* WFH Desk — E */}
        <g style={show(3)}>
          <rect x={RW - 44} y={116} width={38} height={84} fill="url(#fp-sage)" stroke={sage} strokeWidth="1" />
          <text x={RW - 25} y={162} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize={10} fill={sage}>
            Desk
          </text>
          <circle cx={RW - 78} cy={158} r="13" fill="none" stroke={ink3} strokeWidth="0.7" strokeDasharray="2 2" />
        </g>

        {/* Sofa */}
        <g style={show(2)}>
          <rect x={18} y={RH - 106} width={210} height={62} rx="5" fill="url(#fp-hatch)" stroke={ink} strokeWidth="1.2" />
          <line x1={88} y1={RH - 106} x2={88} y2={RH - 44} stroke={ink} strokeWidth="0.6" />
          <line x1={158} y1={RH - 106} x2={158} y2={RH - 44} stroke={ink} strokeWidth="0.6" />
          <text x={123} y={RH - 70} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize={13} fill={ink}>
            Sofa · 9&apos;-0&quot;
          </text>
        </g>

        {/* Coffee table */}
        <g style={show(3)}>
          <rect x={72} y={RH - 172} width={100} height={46} rx="3" fill={bg} stroke={ink} strokeWidth="1" />
          <text x={122} y={RH - 144} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize={10} fill={ink3}>
            Coffee table
          </text>
        </g>

        {/* Plant — SW */}
        <g style={show(4)}>
          <circle cx={18} cy={RH - 20} r="13" fill="none" stroke={sage} strokeWidth="1.2" />
          <circle cx={18} cy={RH - 20} r="8" fill="none" stroke={sage} strokeWidth="0.7" strokeDasharray="1 2" />
        </g>

        {/* North arrow */}
        <g transform={`translate(${RW + 18}, -22)`}>
          <circle cx="0" cy="0" r="14" fill={bg} stroke={ink} strokeWidth="0.8" />
          <polygon points="0,-9 3,3 0,0 -3,3" fill={ink} />
          <text x="0" y="-11" textAnchor="middle" fontFamily="var(--fm)" fontSize={7} fill={ink} fontWeight="600">
            N
          </text>
        </g>
      </g>

      {/* Title block */}
      <g transform={`translate(${VW - 155}, ${VH - 40})`}>
        <line x1="0" y1="0" x2="130" y2="0" stroke={ink3} strokeWidth="0.5" />
        <text x="0" y="13" fontFamily="var(--fm)" fontSize={8.5} fill={ink3} letterSpacing="0.13em">
          PLAN · LIVING ROOM
        </text>
        <text x="0" y="25" fontFamily="var(--fm)" fontSize={8.5} fill={ink3} letterSpacing="0.13em">
          SCALE 1:48 · NM-0042-A
        </text>
      </g>
    </svg>
  );
}
