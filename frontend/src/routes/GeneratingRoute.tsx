import { useEffect, useState } from "react";

const STAGES = [
  { en: "Reading the room",                  hi: "कमरा पढ़ना" },
  { en: "Placing the major pieces",          hi: "मुख्य फ़र्निचर" },
  { en: "Arranging the smaller ones",        hi: "छोटे तत्व" },
  { en: "Honouring Vastu, lining up light",  hi: "वास्तु और प्रकाश" },
  { en: "Materials, prices, totals",         hi: "सामग्री और मूल्य" },
];

const NOTES = [
  { stage: 1, txt: "Window faces east — morning light captured.",        left: "34%", top: "16%", terra: false },
  { stage: 1, txt: "Family of four. Mother-in-law visits.",              left: "10%", top: "32%", terra: false },
  { stage: 2, txt: "Sofa: south wall, 9 feet. For movie nights.",        left: "14%", top: "72%", terra: false },
  { stage: 3, txt: "Coffee table — generous. Step-around clearance.",    left: "30%", top: "62%", terra: false },
  { stage: 4, txt: "मन्दिर — NE corner. East-facing for the morning sun.", left: "70%", top: "12%", terra: true  },
  { stage: 4, txt: "Storage behind every panel. Toys disappear.",        left: "8%",  top: "48%", terra: false },
  { stage: 5, txt: "Total: ₹2,84,000. Sixteen thousand under budget.",   left: "14%", top: "90%", terra: false },
];

export function GeneratingRoute() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const visibleNotes = NOTES.filter((n) => n.stage <= stage);
  const current = stage > 0 && stage <= STAGES.length ? STAGES[stage - 1] : null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--paper)" }}>

      {/* Top bar */}
      <div style={{ height: 60, padding: "0 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 500, color: "var(--ink)" }}>Nirmit</span>
          <span style={{ fontFamily: "var(--fh)", fontSize: 15, color: "var(--ink-3)" }}>निर्मित</span>
        </div>
        <span style={{ fontFamily: "var(--fm)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>Drafting · III.</span>
      </div>

      {/* Body — 3fr floor plan / 1fr dark narration */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "3fr 340px", minHeight: 0 }}>

        {/* Left — animated floor plan */}
        <div style={{ position: "relative", padding: "40px 24px 40px 56px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "var(--paper)" }}>
          <div style={{ width: "100%", maxHeight: 540, position: "relative", flex: "0 0 auto" }}>
            <FloorPlan stage={stage} />

            {/* Marginalia overlay */}
            {visibleNotes.map((n, i) => (
              <div
                key={i}
                className="fade"
                style={{
                  position: "absolute",
                  left: n.left,
                  top: n.top,
                  fontFamily: "var(--fd)",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: n.terra ? "var(--terra-dk)" : "var(--ink-2)",
                  maxWidth: 220,
                  lineHeight: 1.4,
                  textShadow: "0 0 16px var(--paper), 0 0 8px var(--paper)",
                  pointerEvents: "none",
                }}
              >
                {n.txt}
              </div>
            ))}
          </div>
        </div>

        {/* Right — dark narration panel */}
        <div style={{ borderLeft: "1px solid rgba(242,235,221,.08)", padding: "48px 32px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "var(--basalt)" }}>

          <div>
            <span style={{ fontFamily: "var(--fm)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(242,235,221,.35)", display: "block", marginBottom: 20 }}>
              The architect&apos;s notes
            </span>

            <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 30, fontWeight: 500, lineHeight: 1.1, color: "rgba(242,235,221,.9)", minHeight: 88 }}>
              {stage === 0 && "Beginning to draw…"}
              {current && current.en}
              {stage > STAGES.length && "Three rooms ready."}
            </div>

            {current && (
              <div style={{ fontFamily: "var(--fh)", fontSize: 16, color: "rgba(242,235,221,.42)", marginTop: 10 }}>
                {current.hi}
              </div>
            )}
          </div>

          {/* Stage list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(242,235,221,.28)", marginBottom: 2 }}>
              Working steps
            </span>
            {STAGES.map((s, i) => {
              const done   = stage > i + 1;
              const active = stage === i + 1;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: done ? "var(--terra)" : active ? "rgba(242,235,221,.9)" : "rgba(242,235,221,.25)", minWidth: 22, flexShrink: 0 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{ flex: 1, height: 1, background: done ? "var(--terra)" : active ? "rgba(242,235,221,.4)" : "rgba(242,235,221,.1)", transition: "background .5s ease" }} />
                  <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 12.5, color: done || active ? "rgba(242,235,221,.75)" : "rgba(242,235,221,.25)", flex: "0 0 auto", maxWidth: "55%", textAlign: "right" as const, transition: "color .4s ease" }}>
                    {s.en}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Animated architectural floor plan */
function FloorPlan({ stage }: { stage: number }) {
  const S = 26;
  const RW = 12 * S; const RH = 14 * S; const PAD = 48;
  const VW = RW + PAD * 2; const VH = RH + PAD * 2;

  const show = (step: number) =>
    stage >= step
      ? { opacity: 1, transition: "opacity .8s ease" }
      : { opacity: 0, transition: "opacity .8s ease" };

  return (
    <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: "visible", maxHeight: 500 }}>
      <defs>
        <pattern id="fp-hatch" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" strokeWidth="0.6" opacity="0.55" />
        </pattern>
        <pattern id="fp-terra" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--terra)" strokeWidth="0.7" opacity="0.55" />
        </pattern>
        <pattern id="fp-leaf" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--leaf)" strokeWidth="0.7" opacity="0.7" />
        </pattern>
      </defs>

      <g transform={`translate(${PAD},${PAD})`}>
        {/* Dimension labels */}
        <g style={show(1)}>
          <line x1={0} y1={-24} x2={RW} y2={-24} stroke="var(--ink-3)" strokeWidth="0.5" />
          <line x1={0} y1={-28} x2={0} y2={-20} stroke="var(--ink-3)" strokeWidth="0.5" />
          <line x1={RW} y1={-28} x2={RW} y2={-20} stroke="var(--ink-3)" strokeWidth="0.5" />
          <text x={RW / 2} y={-30} textAnchor="middle" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-2)" letterSpacing="0.1em">12&apos;-0&quot;</text>
          <line x1={-24} y1={0} x2={-24} y2={RH} stroke="var(--ink-3)" strokeWidth="0.5" />
          <line x1={-28} y1={0} x2={-20} y2={0} stroke="var(--ink-3)" strokeWidth="0.5" />
          <line x1={-28} y1={RH} x2={-20} y2={RH} stroke="var(--ink-3)" strokeWidth="0.5" />
          <text x={-28} y={RH / 2} textAnchor="middle" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-2)" letterSpacing="0.1em" transform={`rotate(-90, -28, ${RH / 2})`}>14&apos;-0&quot;</text>
        </g>

        {/* Walls */}
        <rect width={RW} height={RH} fill="none" stroke="var(--ink)" strokeWidth="3" className="draw-line" style={{ animationDelay: ".1s" }} />
        <g style={show(1)}>
          <rect x="0" y="0" width={RW} height="3" fill="var(--ink)" opacity="0.85" />
          <rect x="0" y={RH - 3} width={RW} height="3" fill="var(--ink)" opacity="0.85" />
          <rect x="0" y="0" width="3" height={RH} fill="var(--ink)" opacity="0.85" />
          <rect x={RW - 3} y="0" width="3" height={RH} fill="var(--ink)" opacity="0.85" />
          <rect x={84} y={-3} width={96} height={6} fill="var(--paper)" stroke="var(--ink)" strokeWidth="1" />
          <line x1={84} y1={0} x2={180} y2={0} stroke="var(--ink)" strokeWidth="0.5" />
          <text x={132} y={-10} textAnchor="middle" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-3)" letterSpacing="0.1em">WINDOW · 4&apos;-0&quot;</text>
          <rect x={48} y={RH - 3} width={48} height={6} fill="var(--paper)" stroke="var(--ink)" strokeWidth="1" />
          <path d={`M 48 ${RH - 3} A 48 48 0 0 0 96 ${RH - 51}`} fill="none" stroke="var(--ink-3)" strokeWidth="0.6" strokeDasharray="2 3" />
          <line x1={48} y1={RH - 3} x2={48} y2={RH - 51} stroke="var(--ink-3)" strokeWidth="0.8" />
          <text x={72} y={RH + 16} textAnchor="middle" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-3)" letterSpacing="0.1em">DOOR · 2&apos;-0&quot;</text>
        </g>

        <g style={show(2)}>
          <rect x={42} y={6} width={120} height={26} fill="url(#fp-hatch)" stroke="var(--ink)" strokeWidth="1" />
          <text x={102} y={23} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize="11" fill="var(--ink)">TV unit</text>
        </g>

        <g style={show(2)}>
          <rect x={20} y={RH - 110} width={210} height={64} rx="6" fill="url(#fp-hatch)" stroke="var(--ink)" strokeWidth="1.2" />
          <line x1={90} y1={RH - 110} x2={90} y2={RH - 46} stroke="var(--ink)" strokeWidth="0.6" />
          <line x1={160} y1={RH - 110} x2={160} y2={RH - 46} stroke="var(--ink)" strokeWidth="0.6" />
          <text x={125} y={RH - 72} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize="12" fill="var(--ink)">Sofa · 9&apos;-0&quot;</text>
        </g>

        <g style={show(2)}>
          <rect x={6} y={88} width={20} height={120} fill="url(#fp-hatch)" stroke="var(--ink)" strokeWidth="1" />
        </g>

        <g style={show(3)}>
          <rect x={75} y={RH - 178} width={100} height={48} rx="4" fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="1" />
          <text x={125} y={RH - 149} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize="10" fill="var(--ink-2)">Coffee</text>
        </g>

        <g style={show(3)}>
          <rect x={RW - 44} y={120} width={38} height={88} fill="url(#fp-leaf)" stroke="var(--leaf)" strokeWidth="1" />
          <text x={RW - 25} y={168} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize="10" fill="var(--leaf)">Desk</text>
        </g>

        <g style={show(4)}>
          <rect x={RW - 58} y={6} width={50} height={50} fill="url(#fp-terra)" stroke="var(--terra)" strokeWidth="1.4" />
          <text x={RW - 33} y={30} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize="10" fill="var(--terra-dk)">Mandir</text>
          <text x={RW - 33} y={44} textAnchor="middle" fontFamily="var(--fh)" fontSize="9" fill="var(--terra-dk)">मन्दिर</text>
        </g>

        <g style={show(4)}>
          <circle cx={20} cy={RH - 22} r="14" fill="none" stroke="var(--leaf)" strokeWidth="1.2" />
          <circle cx={20} cy={RH - 22} r="9" fill="none" stroke="var(--leaf)" strokeWidth="0.8" strokeDasharray="1 1.5" />
        </g>

        {/* North arrow */}
        <g transform={`translate(${RW + 16}, -22)`}>
          <circle cx="0" cy="0" r="13" fill="var(--paper)" stroke="var(--ink)" strokeWidth="0.8" />
          <polygon points="0,-8 3,3 0,0 -3,3" fill="var(--ink)" />
          <text x="0" y="-9.5" textAnchor="middle" fontFamily="var(--fm)" fontSize="7" fill="var(--ink)" fontWeight="600">N</text>
        </g>
      </g>

      {/* Title block */}
      <g transform={`translate(${VW - 148}, ${VH - 38})`}>
        <line x1="0" y1="0" x2="120" y2="0" stroke="var(--ink-3)" strokeWidth="0.5" />
        <text x="0" y="13" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-3)" letterSpacing="0.12em">PLAN · LIVING ROOM</text>
        <text x="0" y="25" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-3)" letterSpacing="0.12em">SCALE 1:48 · No. 0042-A</text>
      </g>
    </svg>
  );
}
