interface FloorPlanSVGProps {
  animStage?: number;
}

export default function FloorPlanSVG({ animStage = 99 }: FloorPlanSVGProps) {
  const S = 26;
  const RW = 12 * S;
  const RH = 14 * S;
  const PAD = 48;
  const VW = RW + PAD * 2;
  const VH = RH + PAD * 2;

  const show = (step: number) =>
    animStage >= step ? { opacity: 1, transition: 'opacity 0.8s ease' } : { opacity: 0 };

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <pattern
          id="hatch"
          x="0"
          y="0"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="#2C1810" strokeWidth="0.6" opacity="0.5" />
        </pattern>
        <pattern
          id="hatchTerra"
          x="0"
          y="0"
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="5" stroke="#B85A3A" strokeWidth="0.7" opacity="0.5" />
        </pattern>
        <pattern
          id="hatchLeaf"
          x="0"
          y="0"
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="5" stroke="#5B7A4A" strokeWidth="0.7" opacity="0.6" />
        </pattern>
      </defs>

      <g transform={`translate(${PAD},${PAD})`}>
        {/* Dimension lines */}
        <g style={show(1)}>
          <line x1={0} y1={-24} x2={RW} y2={-24} stroke="#B8A898" strokeWidth="0.5" />
          <line x1={0} y1={-28} x2={0} y2={-20} stroke="#B8A898" strokeWidth="0.5" />
          <line x1={RW} y1={-28} x2={RW} y2={-20} stroke="#B8A898" strokeWidth="0.5" />
          <text
            x={RW / 2}
            y={-30}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="9"
            fill="#7A6B5A"
            letterSpacing="0.1em"
          >
            12'&ndash;0"
          </text>
          <line x1={-24} y1={0} x2={-24} y2={RH} stroke="#B8A898" strokeWidth="0.5" />
          <line x1={-28} y1={0} x2={-20} y2={0} stroke="#B8A898" strokeWidth="0.5" />
          <line x1={-28} y1={RH} x2={-20} y2={RH} stroke="#B8A898" strokeWidth="0.5" />
          <text
            x={-28}
            y={RH / 2}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="9"
            fill="#7A6B5A"
            transform={`rotate(-90,-28,${RH / 2})`}
            letterSpacing="0.1em"
          >
            14'&ndash;0"
          </text>
        </g>

        {/* Walls */}
        {animStage < 99 ? (
          <rect
            width={RW}
            height={RH}
            fill="none"
            stroke="#2C1810"
            strokeWidth="3"
            strokeDasharray="1000"
            strokeDashoffset={animStage >= 1 ? 0 : 1000}
            style={{ transition: 'stroke-dashoffset 2.4s ease' }}
          />
        ) : (
          <rect width={RW} height={RH} fill="none" stroke="#2C1810" strokeWidth="3" />
        )}

        {/* Wall fills */}
        <g style={show(1)}>
          <rect x="0" y="0" width={RW} height="3" fill="#2C1810" opacity="0.85" />
          <rect x="0" y={RH - 3} width={RW} height="3" fill="#2C1810" opacity="0.85" />
          <rect x="0" y="0" width="3" height={RH} fill="#2C1810" opacity="0.85" />
          <rect x={RW - 3} y="0" width="3" height={RH} fill="#2C1810" opacity="0.85" />
        </g>

        {/* Window - north wall */}
        <g style={show(1)}>
          <rect x={84} y={-3} width={96} height={6} fill="#F7F0E6" stroke="#2C1810" strokeWidth="1" />
          <line x1={84} y1={0} x2={180} y2={0} stroke="#2C1810" strokeWidth="0.5" />
          <text
            x={132}
            y={-10}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="8"
            fill="#B8A898"
            letterSpacing="0.1em"
          >
            WINDOW &middot; 4'&ndash;0"
          </text>
        </g>

        {/* Door - south wall */}
        <g style={show(1)}>
          <rect x={48} y={RH - 3} width={48} height={6} fill="#F7F0E6" stroke="#2C1810" strokeWidth="1" />
          <path
            d={`M 48 ${RH} A 48 48 0 0 0 96 ${RH - 48}`}
            fill="none"
            stroke="#7A6B5A"
            strokeWidth="0.7"
            strokeDasharray="2 3"
          />
          <line x1={48} y1={RH} x2={48} y2={RH - 48} stroke="#7A6B5A" strokeWidth="0.8" />
          <text
            x={72}
            y={RH + 16}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="8"
            fill="#B8A898"
            letterSpacing="0.1em"
          >
            DOOR &middot; 2'&ndash;0"
          </text>
        </g>

        {/* TV Unit - north wall */}
        <g style={show(2)}>
          <rect x={42} y={6} width={130} height={26} fill="url(#hatch)" stroke="#2C1810" strokeWidth="1" />
          <text
            x={107}
            y={23}
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontStyle="italic"
            fontSize="11"
            fill="#2C1810"
          >
            TV unit
          </text>
        </g>

        {/* Mandir - NE corner */}
        <g style={show(4)}>
          <rect x={RW - 58} y={6} width={50} height={50} fill="url(#hatchTerra)" stroke="#B85A3A" strokeWidth="1.4" />
          <text
            x={RW - 33}
            y={28}
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontStyle="italic"
            fontSize="11"
            fill="#9E3A1B"
          >
            Mandir
          </text>
          <text
            x={RW - 33}
            y={42}
            textAnchor="middle"
            fontFamily="var(--font-hindi)"
            fontSize="9"
            fill="#9E3A1B"
          >
            मन्दिर
          </text>
        </g>

        {/* Bookshelf - west wall */}
        <g style={show(2)}>
          <rect x={6} y={88} width={20} height={120} fill="url(#hatch)" stroke="#2C1810" strokeWidth="1" />
          <text
            x={16}
            y={150}
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontStyle="italic"
            fontSize="10"
            fill="#2C1810"
            transform="rotate(-90, 16, 150)"
          >
            Books
          </text>
        </g>

        {/* WFH Desk - east wall */}
        <g style={show(3)}>
          <rect x={RW - 44} y={120} width={38} height={84} fill="url(#hatchLeaf)" stroke="#5B7A4A" strokeWidth="1" />
          <text
            x={RW - 25}
            y={166}
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontStyle="italic"
            fontSize="10"
            fill="#5B7A4A"
          >
            Desk
          </text>
          <circle cx={RW - 78} cy={162} r="14" fill="none" stroke="#B8A898" strokeWidth="0.8" strokeDasharray="2 2" />
        </g>

        {/* Sofa - south */}
        <g style={show(2)}>
          <rect
            x={20}
            y={RH - 110}
            width={210}
            height={64}
            rx="6"
            fill="url(#hatch)"
            stroke="#2C1810"
            strokeWidth="1.2"
          />
          <line x1={90} y1={RH - 110} x2={90} y2={RH - 46} stroke="#2C1810" strokeWidth="0.6" />
          <line x1={160} y1={RH - 110} x2={160} y2={RH - 46} stroke="#2C1810" strokeWidth="0.6" />
          <text
            x={125}
            y={RH - 72}
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontStyle="italic"
            fontSize="13"
            fill="#2C1810"
          >
            Sofa &middot; 9'&ndash;0"
          </text>
        </g>

        {/* Coffee Table */}
        <g style={show(3)}>
          <rect x={75} y={RH - 178} width={100} height={48} rx="4" fill="#E4D5C4" stroke="#2C1810" strokeWidth="1" />
          <text
            x={125}
            y={RH - 149}
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontStyle="italic"
            fontSize="10"
            fill="#7A6B5A"
          >
            Coffee table
          </text>
        </g>

        {/* Plant - SW */}
        <g style={show(4)}>
          <circle cx={20} cy={RH - 22} r="14" fill="none" stroke="#5B7A4A" strokeWidth="1.2" />
          <circle cx={20} cy={RH - 22} r="9" fill="none" stroke="#5B7A4A" strokeWidth="0.8" strokeDasharray="1 1.5" />
        </g>

        {/* North Arrow */}
        <g transform={`translate(${RW + 18}, -24)`}>
          <circle cx="0" cy="0" r="14" fill="#F7F0E6" stroke="#2C1810" strokeWidth="0.8" />
          <polygon points="0,-9 3,3 0,0 -3,3" fill="#2C1810" />
          <text
            x="0"
            y="-11"
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="7"
            fill="#2C1810"
            fontWeight="600"
          >
            N
          </text>
        </g>
      </g>

      {/* Title block */}
      <g transform={`translate(${VW - 150}, ${VH - 44})`}>
        <line x1="0" y1="0" x2="130" y2="0" stroke="#B8A898" strokeWidth="0.5" />
        <text x="0" y="14" fontFamily="var(--font-mono)" fontSize="8" fill="#B8A898" letterSpacing="0.12em">
          PLAN &middot; LIVING ROOM
        </text>
        <text x="0" y="26" fontFamily="var(--font-mono)" fontSize="8" fill="#B8A898" letterSpacing="0.12em">
          SCALE 1:48 &middot; NM-0042-A
        </text>
      </g>
    </svg>
  );
}
