import { useEffect, useRef, useState } from "react";
import { TopNav } from "@/components/shell/TopNav";
import { useAppStore } from "@/store/useAppStore";

const STAGES = [
  { label: "Reading the room",               t: 0    },
  { label: "Placing the major pieces",        t: 2200 },
  { label: "Arranging the smaller ones",      t: 4400 },
  { label: "Honouring Vastu, lining up light", t: 6600 },
  { label: "Materials, prices, totals",       t: 8800 },
];
const TOTAL_MS = 11000;

const NOTES = [
  { stage: 1, txt: "Window faces east — morning light captured.",        left: "34%", top: "16%", terra: false },
  { stage: 1, txt: "Family of four. Mother-in-law visits.",              left: "10%", top: "32%", terra: false },
  { stage: 2, txt: "Sofa: south wall, 9 feet. For movie nights.",        left: "14%", top: "72%", terra: false },
  { stage: 3, txt: "Coffee table — generous. Step-around clearance.",    left: "30%", top: "62%", terra: false },
  { stage: 4, txt: "Mandir — NE corner. East-facing for the morning sun.", left: "70%", top: "12%", terra: true  },
  { stage: 4, txt: "Storage behind every panel. Toys disappear.",        left: "8%",  top: "48%", terra: false },
  { stage: 5, txt: "Total: ₹2,84,000. Sixteen thousand under budget.",   left: "14%", top: "90%", terra: false },
];

export function GeneratingRoute() {
  const visionsLoaded = useAppStore((s) => s.visionsLoaded);
  const advanceStage  = useAppStore((s) => s.setStage);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      const e = now - startRef.current;
      setElapsed(e);
      if (e < TOTAL_MS + 400) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Discrete stage number derived from elapsed for narration & notes
  const stage = STAGES.reduce((acc, s, i) => (elapsed >= s.t ? i + 1 : acc), 0);
  const animationDone = elapsed >= TOTAL_MS;

  useEffect(() => {
    if (animationDone && visionsLoaded) advanceStage("reveal");
  }, [animationDone, visionsLoaded, advanceStage]);

  const visibleNotes = NOTES.filter((n) => n.stage <= stage);
  const current = stage > 0 && stage <= STAGES.length ? STAGES[stage - 1].label : null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--paper)" }}>

      <TopNav stage="generating" hideTrail rightContent={
        <span className="eyebrow" style={{ color: "var(--ink-3)" }}>Drafting your room…</span>
      } />

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "3fr 340px", minHeight: 0 }}>

        {/* Left — animated floor plan */}
        <div style={{ position: "relative", padding: "40px 24px 40px 56px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "var(--paper)" }}>
          <div style={{ width: "100%", maxHeight: 540, position: "relative", flex: "0 0 auto" }}>
            <FloorPlan elapsed={elapsed} />

            {/* Marginalia overlay — fade in continuously */}
            {visibleNotes.map((n, i) => {
              const noteStart = STAGES[n.stage - 1]?.t ?? 0;
              const noteProgress = Math.min(1, Math.max(0, (elapsed - noteStart - 400) / 700));
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: n.left,
                    top: n.top,
                    fontFamily: "var(--fd)",
                    fontStyle: "italic",
                    fontSize: 14,
                    color: n.terra ? "var(--terra-dk)" : "var(--ink-2)",
                    maxWidth: 220,
                    lineHeight: 1.5,
                    padding: "6px 10px",
                    background: "rgba(245, 237, 223, 0.85)",
                    backdropFilter: "blur(2px)",
                    borderLeft: `2px solid ${n.terra ? "var(--terra)" : "var(--line)"}`,
                    pointerEvents: "none",
                    opacity: noteProgress,
                    transform: `translateY(${(1 - noteProgress) * 6}px)`,
                    transition: "none",
                  }}
                >
                  {n.txt}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — dark narration panel */}
        <div style={{ borderLeft: "1px solid rgba(242,235,221,.08)", padding: "48px 32px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "var(--basalt)" }}>

          <div>
            <span style={{ fontFamily: "var(--fm)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(242,235,221,.35)", display: "block", marginBottom: 20 }}>
              The architect&apos;s notes
            </span>

            <div style={{ fontFamily: "var(--fd)", fontSize: 30, fontWeight: 600, lineHeight: 1.1, color: "rgba(242,235,221,.9)", minHeight: 88, transition: "opacity .4s ease" }}>
              {stage === 0 && "Beginning to draw…"}
              {current}
              {animationDone && (visionsLoaded ? "Three rooms ready." : "Finalising…")}
            </div>
          </div>

          {/* Stage list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ fontFamily: "var(--fm)", fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(242,235,221,.28)", marginBottom: 2 }}>
              Working steps
            </span>
            {STAGES.map((s, i) => {
              const stageStart = s.t;
              const stageEnd   = STAGES[i + 1]?.t ?? TOTAL_MS;
              const progress   = Math.min(1, Math.max(0, (elapsed - stageStart) / (stageEnd - stageStart)));
              const done   = elapsed >= stageEnd;
              const active = elapsed >= stageStart && elapsed < stageEnd;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: done ? "var(--terra)" : active ? "rgba(242,235,221,.9)" : "rgba(242,235,221,.25)", minWidth: 22, flexShrink: 0, transition: "color .3s ease" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {/* Progress fill bar that grows during the active stage */}
                  <div style={{ flex: 1, height: 1, background: "rgba(242,235,221,.1)", position: "relative" }}>
                    <div style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: `${(done ? 1 : active ? progress : 0) * 100}%`,
                      background: done ? "var(--terra)" : "rgba(242,235,221,.55)",
                    }} />
                  </div>
                  <span style={{ fontFamily: "var(--fb)", fontSize: 12, color: done || active ? "rgba(242,235,221,.75)" : "rgba(242,235,221,.25)", flex: "0 0 auto", maxWidth: "55%", textAlign: "right" as const, transition: "color .4s ease" }}>
                    {s.label}
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

/* ──────────────────────────────────────────────────────────────────────
   Animated architectural floor plan — continuous time-based progression.
   Each element gets a start time + duration. Computed progress drives
   stroke-dashoffset for line drawing and opacity for fills/text.
─────────────────────────────────────────────────────────────────────── */
interface AnimSpec {
  start: number;   // ms after begin
  duration: number; // ms
}
function lerp(elapsed: number, spec: AnimSpec): number {
  return Math.min(1, Math.max(0, (elapsed - spec.start) / spec.duration));
}

function FloorPlan({ elapsed }: { elapsed: number }) {
  const S = 26;
  const RW = 12 * S; const RH = 14 * S; const PAD = 48;
  const VW = RW + PAD * 2; const VH = RH + PAD * 2;

  // ── Animation timeline (ms from start) ─────────────────────────────
  const T = {
    // Phase 1: room shell (0–2.2s)
    wallTop:    { start:    0, duration: 700 },
    wallRight:  { start:  500, duration: 700 },
    wallBottom: { start: 1000, duration: 700 },
    wallLeft:   { start: 1500, duration: 700 },
    windowDoor: { start: 1800, duration: 600 },
    dimensions: { start: 2000, duration: 500 },
    // Phase 2: major furniture (2.2–4.4s)
    sofa:       { start: 2400, duration: 900 },
    tv:         { start: 2900, duration: 700 },
    bookshelf:  { start: 3300, duration: 700 },
    // Phase 3: smaller items (4.4–6.6s)
    coffee:     { start: 4600, duration: 700 },
    desk:       { start: 5100, duration: 700 },
    // Phase 4: mandir + light (6.6–8.8s)
    mandir:     { start: 6800, duration: 800 },
    lightPool:  { start: 7400, duration: 800 },
    // Phase 5: title block (8.8–11s)
    titleBlock: { start: 8800, duration: 700 },
  };

  // Drawing animation: element starts invisible, dashoffset → 0
  const draw = (spec: AnimSpec, length: number) => {
    const p = lerp(elapsed, spec);
    return { strokeDasharray: length, strokeDashoffset: length * (1 - p) };
  };
  // Fade animation: opacity 0 → 1 with slight rise
  const fade = (spec: AnimSpec) => {
    const p = lerp(elapsed, spec);
    return { opacity: p, transform: `translateY(${(1 - p) * 4}px)` };
  };

  return (
    <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: "visible", maxHeight: 500 }} shapeRendering="geometricPrecision">
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
        {/* ── Walls — draw one edge at a time so the pen feels continuous ── */}
        <line x1={0}  y1={0}  x2={RW} y2={0}  stroke="var(--ink)" strokeWidth="3" strokeLinecap="square" style={draw(T.wallTop,    RW)} />
        <line x1={RW} y1={0}  x2={RW} y2={RH} stroke="var(--ink)" strokeWidth="3" strokeLinecap="square" style={draw(T.wallRight,  RH)} />
        <line x1={RW} y1={RH} x2={0}  y2={RH} stroke="var(--ink)" strokeWidth="3" strokeLinecap="square" style={draw(T.wallBottom, RW)} />
        <line x1={0}  y1={RH} x2={0}  y2={0}  stroke="var(--ink)" strokeWidth="3" strokeLinecap="square" style={draw(T.wallLeft,   RH)} />

        {/* Window + door — fade in once walls land */}
        <g style={fade(T.windowDoor)}>
          <rect x={84} y={-3} width={96} height={6} fill="var(--paper)" stroke="var(--ink)" strokeWidth="1" />
          <line x1={84} y1={0} x2={180} y2={0} stroke="var(--ink)" strokeWidth="0.5" />
          <text x={132} y={-10} textAnchor="middle" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-3)" letterSpacing="0.1em">WINDOW · 4&apos;-0&quot;</text>
          <rect x={48} y={RH - 3} width={48} height={6} fill="var(--paper)" stroke="var(--ink)" strokeWidth="1" />
          <path d={`M 48 ${RH - 3} A 48 48 0 0 0 96 ${RH - 51}`} fill="none" stroke="var(--ink-3)" strokeWidth="0.6" strokeDasharray="2 3" />
          <line x1={48} y1={RH - 3} x2={48} y2={RH - 51} stroke="var(--ink-3)" strokeWidth="0.8" />
          <text x={72} y={RH + 16} textAnchor="middle" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-3)" letterSpacing="0.1em">DOOR · 2&apos;-0&quot;</text>
        </g>

        {/* Dimension labels */}
        <g style={fade(T.dimensions)}>
          <line x1={0} y1={-24} x2={RW} y2={-24} stroke="var(--ink-3)" strokeWidth="0.5" />
          <line x1={0} y1={-28} x2={0} y2={-20} stroke="var(--ink-3)" strokeWidth="0.5" />
          <line x1={RW} y1={-28} x2={RW} y2={-20} stroke="var(--ink-3)" strokeWidth="0.5" />
          <text x={RW / 2} y={-30} textAnchor="middle" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-2)" letterSpacing="0.1em">12&apos;-0&quot;</text>
          <line x1={-24} y1={0} x2={-24} y2={RH} stroke="var(--ink-3)" strokeWidth="0.5" />
          <line x1={-28} y1={0} x2={-20} y2={0} stroke="var(--ink-3)" strokeWidth="0.5" />
          <line x1={-28} y1={RH} x2={-20} y2={RH} stroke="var(--ink-3)" strokeWidth="0.5" />
          <text x={-28} y={RH / 2} textAnchor="middle" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-2)" letterSpacing="0.1em" transform={`rotate(-90, -28, ${RH / 2})`}>14&apos;-0&quot;</text>
        </g>

        {/* TV unit — outline draws then fill fades */}
        <rect x={42} y={6} width={120} height={26} fill="none" stroke="var(--ink)" strokeWidth="1" style={draw(T.tv, 2 * (120 + 26))} />
        <rect x={42} y={6} width={120} height={26} fill="url(#fp-hatch)" stroke="none" style={fade({ start: T.tv.start + T.tv.duration - 100, duration: 400 })} />
        <text x={102} y={23} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize="11" fill="var(--ink)" style={fade({ start: T.tv.start + T.tv.duration, duration: 400 })}>TV unit</text>

        {/* Sofa — drawn outline then hatched fill */}
        <rect x={20} y={RH - 110} width={210} height={64} rx="6" fill="none" stroke="var(--ink)" strokeWidth="1.2" style={draw(T.sofa, 2 * (210 + 64))} />
        <rect x={20} y={RH - 110} width={210} height={64} rx="6" fill="url(#fp-hatch)" stroke="none" style={fade({ start: T.sofa.start + T.sofa.duration - 200, duration: 500 })} />
        <g style={fade({ start: T.sofa.start + T.sofa.duration, duration: 400 })}>
          <line x1={90} y1={RH - 110} x2={90} y2={RH - 46} stroke="var(--ink)" strokeWidth="0.6" />
          <line x1={160} y1={RH - 110} x2={160} y2={RH - 46} stroke="var(--ink)" strokeWidth="0.6" />
          <text x={125} y={RH - 72} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize="12" fill="var(--ink)">Sofa · 9&apos;-0&quot;</text>
        </g>

        {/* Bookshelf */}
        <rect x={6} y={88} width={20} height={120} fill="none" stroke="var(--ink)" strokeWidth="1" style={draw(T.bookshelf, 2 * (20 + 120))} />
        <rect x={6} y={88} width={20} height={120} fill="url(#fp-hatch)" stroke="none" style={fade({ start: T.bookshelf.start + T.bookshelf.duration - 100, duration: 400 })} />

        {/* Coffee table */}
        <rect x={75} y={RH - 178} width={100} height={48} rx="4" fill="none" stroke="var(--ink)" strokeWidth="1" style={draw(T.coffee, 2 * (100 + 48))} />
        <rect x={75} y={RH - 178} width={100} height={48} rx="4" fill="var(--paper-2)" stroke="none" style={fade({ start: T.coffee.start + T.coffee.duration - 100, duration: 400 })} />
        <text x={125} y={RH - 149} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize="10" fill="var(--ink-2)" style={fade({ start: T.coffee.start + T.coffee.duration, duration: 400 })}>Coffee</text>

        {/* Desk */}
        <rect x={RW - 44} y={120} width={38} height={88} fill="none" stroke="var(--leaf)" strokeWidth="1" style={draw(T.desk, 2 * (38 + 88))} />
        <rect x={RW - 44} y={120} width={38} height={88} fill="url(#fp-leaf)" stroke="none" style={fade({ start: T.desk.start + T.desk.duration - 100, duration: 400 })} />
        <text x={RW - 25} y={168} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize="10" fill="var(--leaf)" style={fade({ start: T.desk.start + T.desk.duration, duration: 400 })}>Desk</text>

        {/* Mandir — terra accent */}
        <rect x={RW - 58} y={6} width={50} height={50} fill="none" stroke="var(--terra)" strokeWidth="1.4" style={draw(T.mandir, 2 * (50 + 50))} />
        <rect x={RW - 58} y={6} width={50} height={50} fill="url(#fp-terra)" stroke="none" style={fade({ start: T.mandir.start + T.mandir.duration - 200, duration: 500 })} />
        <text x={RW - 33} y={30} textAnchor="middle" fontFamily="var(--fd)" fontStyle="italic" fontSize="10" fill="var(--terra-dk)" style={fade({ start: T.mandir.start + T.mandir.duration, duration: 400 })}>Mandir</text>

        {/* Light pool */}
        <g style={fade(T.lightPool)}>
          <circle cx={20} cy={RH - 22} r="14" fill="none" stroke="var(--leaf)" strokeWidth="1.2" />
          <circle cx={20} cy={RH - 22} r="9" fill="none" stroke="var(--leaf)" strokeWidth="0.8" strokeDasharray="1 1.5" />
        </g>

        {/* North arrow — fades in early */}
        <g transform={`translate(${RW + 16}, -22)`} style={fade(T.dimensions)}>
          <circle cx="0" cy="0" r="13" fill="var(--paper)" stroke="var(--ink)" strokeWidth="0.8" />
          <polygon points="0,-8 3,3 0,0 -3,3" fill="var(--ink)" />
          <text x="0" y="-9.5" textAnchor="middle" fontFamily="var(--fm)" fontSize="7" fill="var(--ink)" fontWeight="600">N</text>
        </g>
      </g>

      {/* Title block */}
      <g transform={`translate(${VW - 148}, ${VH - 38})`} style={fade(T.titleBlock)}>
        <line x1="0" y1="0" x2="120" y2="0" stroke="var(--ink-3)" strokeWidth="0.5" />
        <text x="0" y="13" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-3)" letterSpacing="0.12em">PLAN · LIVING ROOM</text>
        <text x="0" y="25" fontFamily="var(--fm)" fontSize="8" fill="var(--ink-3)" letterSpacing="0.12em">SCALE 1:48 · No. 0042-A</text>
      </g>
    </svg>
  );
}
