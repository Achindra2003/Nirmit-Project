import { Fragment, useState } from "react";
import { api } from "@/api/client";
import type { Direction, Intake, RoomType, Vibe } from "@/api/types";
import { useAppStore } from "@/store/useAppStore";

/* ── Data ─────────────────────────────────────────────────────── */

const VIBES: Array<{ id: Vibe; name: string; hi: string; desc: string; depth: string }> = [
  { id: "warm_traditional", name: "The Gathering",  hi: "सभा",      desc: "Warm, dense, lived-in.",          depth: "For homes that fill up easily — children, parents, neighbours, plates." },
  { id: "light_airy",       name: "The Breath",     hi: "विश्राम",    desc: "Open, light, restrained.",        depth: "Less furniture, more air. The luxury of empty floor." },
  { id: "earthy_crafted",   name: "The Keeper",     hi: "संग्रह",     desc: "Storage-first. Heritage tones.",  depth: "Closed cabinetry. A place for everything you have collected." },
  { id: "modern_minimal",   name: "The Studio",     hi: "कक्ष",      desc: "Quiet, considered, urban.",       depth: "Clean lines, quality materials, nothing extra." },
];

const ROOMS: Array<[RoomType, string, string]> = [
  ["living",  "Living Room", "बैठक"],
  ["bedroom", "Bedroom",     "शयन कक्ष"],
  ["dining",  "Dining",      "भोजन कक्ष"],
  ["study",   "Study",       "अध्ययन कक्ष"],
];

const SIZES: Array<{ id: string; en: string; hi: string; desc: string; w_mm: number; d_mm: number; rect: [number, number] }> = [
  { id: "compact",  en: "Compact",  hi: "≤10×10", desc: "A snug city flat",            w_mm: 3000, d_mm: 3000, rect: [36, 36] },
  { id: "standard", en: "Standard", hi: "10×14",  desc: "Most 2BHKs in metros",        w_mm: 3000, d_mm: 4300, rect: [38, 54] },
  { id: "large",    en: "Large",    hi: "16×18",  desc: "Generous, well-proportioned",  w_mm: 4900, d_mm: 5500, rect: [54, 62] },
  { id: "open",     en: "Open",     hi: "18ft+",  desc: "Combined living-dining",       w_mm: 5500, d_mm: 6100, rect: [66, 66] },
];

const CITIES = ["Mumbai", "Pune", "Bangalore", "Delhi", "Hyderabad", "Chennai", "Kolkata"];

const WHO_CHIPS = ["Young children", "Elderly parent", "Work from home", "Frequent guests", "Pets", "Just the two of us", "Vastu matters", "Joint family"];

const PAGES = [
  { title: "What feeling?",        hi: "क्या भाव?",              sub: "Not the style. The feeling.", kind: "vibe" as const },
  { title: "Which room, how big?", hi: "कौन सा कमरा, कितना बड़ा?", sub: "A rough sense is enough — we will refine it later.", kind: "room" as const },
  { title: "Who lives here?",      hi: "यहाँ कौन रहता है?",       sub: "Tell us in your own words. The more you say, the more personal the drawing.", kind: "who" as const },
  { title: "Budget, and where?",   hi: "बजट, और कहाँ?",           sub: "For furniture and finishing. Installation is separate.", kind: "budget" as const },
];

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function formatBudget(v: number) {
  if (v >= 500000) return "₹5L+";
  if (v >= 100000) return `₹${(v / 100000).toFixed(1).replace(".0", "")}L`;
  return `₹${(v / 1000).toFixed(0)}K`;
}

/* ── Component ─────────────────────────────────────────────────── */

export function IntakeRoute() {
  const setIntake  = useAppStore((s) => s.setIntake);
  const setStage   = useAppStore((s) => s.setStage);
  const setVisions = useAppStore((s) => s.setVisions);

  const [page, setPage] = useState(0);
  const [vibe, setVibe]       = useState<Vibe | null>(null);
  const [room, setRoom]       = useState<RoomType | null>(null);
  const [size, setSize]       = useState<string | null>(null);
  const [entrance, setEntrance] = useState<Direction>("S");
  const [who, setWho]         = useState("");
  const [chips, setChips]     = useState<string[]>([]);
  const [budget, setBudget]   = useState(300_000);
  const [city, setCity]       = useState("");
  const [error, setError]     = useState<string | null>(null);

  const P = PAGES[page];

  const ok = [
    !!vibe,
    !!(room && size),
    !!(who.trim().length > 4 || chips.length > 0),
    !!city,
  ];

  function toggleChip(c: string) {
    setChips((arr) => arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c]);
  }

  async function submit() {
    setError(null);
    const sizeObj = SIZES.find((s) => s.id === size);
    const intake: Intake = {
      room_type: room ?? "living",
      room_dimensions: { width_mm: sizeObj?.w_mm ?? 4200, depth_mm: sizeObj?.d_mm ?? 3600, height_mm: 3000 },
      entrance_direction: entrance,
      who_lives_here: [who, ...chips, city ? `in ${city}` : ""].filter(Boolean).join(". "),
      vibe: vibe!,
      budget_inr: budget,
      keep_existing: null,
      vastu_matters: chips.includes("Vastu matters"),
    };
    setIntake(intake);
    setStage("generating");
    try {
      const res = await api.generate({ intake });
      setVisions(res.visions);
      setStage("reveal");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("intake");
    }
  }

  function next() {
    if (page < 3) setPage(page + 1);
    else void submit();
  }
  function prev() {
    if (page > 0) setPage(page - 1);
    else setStage("home");
  }

  // "So far" trail — assembled as breadcrumb tokens
  const vibeLabel = vibe ? VIBES.find((v) => v.id === vibe)?.name : null;
  const roomLabel = room && size ? `${ROOMS.find((r) => r[0] === room)?.[1] ?? ""} · ${SIZES.find((s) => s.id === size)?.en ?? ""}` : null;
  const whoLabel  = who.trim().length > 4 ? truncate(who, 40) : (chips.length > 0 ? chips.slice(0, 2).join(", ") + (chips.length > 2 ? "…" : "") : null);
  const bgtLabel  = city ? `${formatBudget(budget)} · ${city}` : null;
  const trail     = [vibeLabel, roomLabel, whoLabel, bgtLabel];
  const trailStr  = trail.filter(Boolean).join(" · ");

  return (
    <div className="paper" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{ height: 60, padding: "0 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 500, color: "var(--ink)" }}>Nirmit</span>
          <span style={{ fontFamily: "var(--fh)", fontSize: 15, color: "var(--ink-3)" }}>निर्मित</span>
        </div>
        {trailStr && (
          <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, padding: "0 24px" }}>
            {trailStr}
          </span>
        )}
        <span className="eyebrow">Consultation · II.</span>
      </div>

      {/* Full-width progress bar */}
      <div style={{ height: 2, background: "var(--line)", flexShrink: 0, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${((page + (ok[page] ? 1 : 0)) / 4) * 100}%`, background: "var(--terra)", transition: "width .5s ease" }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1.4fr", minHeight: 0 }}>

        {/* Left — question */}
        <div style={{ padding: "72px 48px 48px 64px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid var(--line)" }}>
          <div>
            <div className="appear" style={{ marginBottom: 28 }}>
              <span className="eyebrow">Page {String(page + 1).padStart(2, "0")} of 04 · {P.hi}</span>
            </div>

            <h2 key={`q${page}`} className="slide-up" style={{ fontFamily: "var(--fd)", fontSize: "clamp(36px, 4vw, 60px)", fontWeight: 500, lineHeight: 1.0, letterSpacing: "-0.018em", marginBottom: 14, color: "var(--ink)" }}>
              {P.title.split(",").map((part, i, arr) => (
                <Fragment key={i}>
                  {i > 0 && ", "}
                  <span style={i === arr.length - 1 ? { fontStyle: "italic", fontWeight: 400, color: "var(--terra)" } : undefined}>{part}</span>
                </Fragment>
              ))}
            </h2>

            <div key={`sub${page}`} className="slide-up" style={{ animationDelay: ".08s", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 17, color: "var(--ink-2)", maxWidth: "32ch", lineHeight: 1.5 }}>
              {P.sub}
            </div>
          </div>

          {/* Trail */}
          <div className="appear-3" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="eyebrow">So far</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10 }}>
              {trail.map((val, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 12, opacity: val ? 1 : 0.28 }}>
                  <span className="eyebrow" style={{ minWidth: 76, fontSize: 9.5 }}>{["Feeling", "Room", "Lives here", "Budget"][i]}</span>
                  <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: i === page ? "var(--terra-dk)" : "var(--ink)" }}>
                    {val || (i === page ? "…" : "—")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — answer */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div key={`a${page}`} className="slide-up" style={{ animationDelay: ".12s", flex: 1, overflowY: "auto", padding: "60px 72px 24px" }}>
            {P.kind === "vibe"   && <VibeAnswer   vibe={vibe}     setVibe={setVibe} />}
            {P.kind === "room"   && <RoomAnswer   room={room}     setRoom={setRoom} size={size} setSize={setSize} entrance={entrance} setEntrance={setEntrance} />}
            {P.kind === "who"    && <WhoAnswer    who={who}       setWho={setWho} chips={chips} toggleChip={toggleChip} />}
            {P.kind === "budget" && <BudgetAnswer budget={budget} setBudget={setBudget} city={city} setCity={setCity} />}
          </div>

          {error && <p style={{ padding: "0 72px", color: "var(--terra-dk)", fontFamily: "var(--fd)", fontStyle: "italic" }}>{error}</p>}

          {/* Nav footer */}
          <div className="appear-4" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", padding: "24px 72px 28px" }}>
            <button
              className="lnk"
              onClick={prev}
              style={{ fontSize: 15, borderColor: "transparent", color: "var(--ink-3)" }}
            >
              <span style={{ display: "inline-block", transform: "scaleX(-1)" }}>→</span>
              {page === 0 ? "Back to cover" : "Previous"}
            </button>

            <button
              className="lnk"
              onClick={ok[page] ? next : undefined}
              style={{ fontSize: 18, opacity: ok[page] ? 1 : 0.28, cursor: ok[page] ? "pointer" : "default", pointerEvents: ok[page] ? "auto" : "none" }}
            >
              {page < 3 ? "Continue" : "Begin drafting"}
              <span className="lnk-arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Answer panels ─────────────────────────────────────────────── */

function VibeAnswer({ vibe, setVibe }: { vibe: Vibe | null; setVibe: (v: Vibe) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {VIBES.map((v, i) => {
        const sel = vibe === v.id;
        return (
          <div
            key={v.id}
            onClick={() => setVibe(v.id)}
            style={{
              padding: "18px 0 18px 0",
              borderTop: i === 0 ? "1px solid var(--line)" : "none",
              borderBottom: "1px solid var(--line)",
              cursor: "pointer",
              display: "grid",
              gridTemplateColumns: "4px 28px 1fr 1.3fr 22px",
              gap: 16,
              alignItems: "baseline",
              background: sel ? "var(--paper-3)" : "transparent",
              transition: "background .2s ease",
              position: "relative" as const,
            }}
            onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "rgba(248,243,232,0.6)"; }}
            onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = "transparent"; }}
          >
            {/* Left accent bar */}
            <div style={{ width: 4, height: "100%", alignSelf: "stretch", background: sel ? "var(--terra)" : "transparent", transition: "background .2s ease", marginLeft: -16 }} />
            <span style={{ fontFamily: "var(--fm)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.1em" }}>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <div style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: sel ? 500 : 400, fontStyle: "italic", color: sel ? "var(--terra)" : "var(--ink)", display: "flex", alignItems: "baseline", gap: 8 }}>
                {v.name}
                <span style={{ fontFamily: "var(--fh)", fontSize: 15, color: sel ? "rgba(194,80,46,.6)" : "var(--ink-3)" }}>{v.hi}</span>
              </div>
              <div style={{ fontFamily: "var(--fb)", fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>{v.desc}</div>
            </div>
            <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>{v.depth}</div>
            <div style={{ alignSelf: "center", justifySelf: "end" }}>
              {sel
                ? <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="var(--terra)" /><path d="M6 10l3 3 5-6" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                : <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="none" stroke="var(--line-2)" strokeWidth="1" /></svg>
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoomAnswer({ room, setRoom, size, setSize, entrance, setEntrance }: {
  room: RoomType | null; setRoom: (r: RoomType) => void;
  size: string | null; setSize: (s: string) => void;
  entrance: Direction; setEntrance: (d: Direction) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      {/* Room type */}
      <div>
        <span className="eyebrow">Room</span>
        <div style={{ display: "flex", gap: 0, marginTop: 14, borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          {ROOMS.map(([id, en, hi], i) => {
            const sel = room === id;
            return (
              <div key={id} onClick={() => setRoom(id)} style={{ flex: 1, padding: "16px 10px", cursor: "pointer", textAlign: "center", borderLeft: i > 0 ? "1px solid var(--line)" : "none", background: sel ? "var(--ink)" : "transparent", color: sel ? "var(--paper)" : "var(--ink)", transition: "all .25s ease" }}>
                <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 17, fontWeight: 500 }}>{en}</div>
                <div style={{ fontFamily: "var(--fh)", fontSize: 11, marginTop: 4, opacity: 0.6 }}>{hi}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Size */}
      <div>
        <span className="eyebrow">Size</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 14 }}>
          {SIZES.map((rs) => {
            const sel = size === rs.id;
            return (
              <div key={rs.id} onClick={() => setSize(rs.id)} style={{ padding: "20px 10px 14px", cursor: "pointer", textAlign: "center", border: `1px solid ${sel ? "var(--terra)" : "var(--line)"}`, background: sel ? "var(--paper-3)" : "transparent", transition: "all .22s ease" }}>
                <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <div style={{ width: rs.rect[0], height: rs.rect[1], border: `1.5px solid ${sel ? "var(--terra)" : "var(--ink-2)"}`, position: "relative" }}>
                    <div style={{ position: "absolute", bottom: -1, left: 6, width: 8, height: 2, background: sel ? "var(--terra)" : "var(--ink-2)" }} />
                  </div>
                </div>
                <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 17, fontWeight: 500, color: sel ? "var(--terra)" : "var(--ink)" }}>{rs.en}</div>
                <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", marginTop: 3, letterSpacing: "0.08em" }}>{rs.hi} ft</div>
                <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 11, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.4 }}>{rs.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Entrance direction */}
      <div>
        <span className="eyebrow">Entrance faces</span>
        <div style={{ display: "flex", gap: 0, marginTop: 14, borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          {(["N", "E", "S", "W"] as const).map((d, i) => {
            const sel = entrance === d;
            return (
              <div key={d} onClick={() => setEntrance(d)} style={{ flex: 1, padding: "14px 10px", cursor: "pointer", textAlign: "center", borderLeft: i > 0 ? "1px solid var(--line)" : "none", background: sel ? "var(--ink)" : "transparent", color: sel ? "var(--paper)" : "var(--ink)", transition: "all .25s ease" }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 14, fontWeight: 500, letterSpacing: "0.1em" }}>{d}</div>
                <div style={{ fontSize: 11, marginTop: 3, opacity: 0.55 }}>{{ N: "North", E: "East", S: "South", W: "West" }[d]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WhoAnswer({ who, setWho, chips, toggleChip }: { who: string; setWho: (s: string) => void; chips: string[]; toggleChip: (c: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ position: "relative" }}>
        <textarea
          value={who}
          onChange={(e) => setWho(e.target.value)}
          placeholder="A family of four — my son is four years old. My mother-in-law visits often. We watch movies together. I work some evenings. We accumulate a lot of toys."
          style={{ width: "100%", height: 190, border: "none", borderBottom: "1px solid var(--line)", background: "transparent", resize: "none", outline: "none", fontFamily: "var(--fd)", fontSize: 22, lineHeight: 1.5, color: "var(--ink)", padding: "6px 0" }}
          onFocus={(e) => { e.currentTarget.style.borderBottomColor = "var(--terra)"; }}
          onBlur={(e) => { e.currentTarget.style.borderBottomColor = "var(--line)"; }}
        />
        <div style={{ position: "absolute", right: 0, bottom: 8, fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)" }}>
          {who.length} CH.
        </div>
      </div>

      <div>
        <span className="eyebrow">Or pick what fits — optional</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {WHO_CHIPS.map((c) => {
            const on = chips.includes(c);
            return (
              <div key={c} onClick={() => toggleChip(c)} style={{ padding: "9px 18px", cursor: "pointer", border: `1px solid ${on ? "var(--terra)" : "var(--line)"}`, background: on ? "var(--terra)" : "transparent", color: on ? "var(--paper)" : "var(--ink-2)", fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14, fontWeight: 500, transition: "all .2s ease" }}>
                {c}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BudgetAnswer({ budget, setBudget, city, setCity }: { budget: number; setBudget: (v: number) => void; city: string; setCity: (c: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 52 }}>
      <div>
        <span className="eyebrow">Budget — furniture and finishing</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 18, marginBottom: 28 }}>
          <span style={{ fontFamily: "var(--fd)", fontSize: "clamp(64px, 7vw, 96px)", fontWeight: 500, lineHeight: 1, color: "var(--terra)", letterSpacing: "-0.025em" }}>
            {formatBudget(budget)}
          </span>
          <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 16, color: "var(--ink-3)" }}>furniture + finishing</span>
        </div>
        <input type="range" min={75000} max={500000} step={25000} value={budget} onChange={(e) => setBudget(+e.target.value)} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em" }}>
          <span>75K · ESSENTIALS</span>
          <span>1.5L · FAMILY</span>
          <span>3L · COMPLETE</span>
          <span>5L+ · PREMIUM</span>
        </div>
      </div>

      <div>
        <span className="eyebrow">City</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 0, marginTop: 14, borderTop: "1px solid var(--line)" }}>
          {CITIES.map((c, i) => {
            const sel = city === c;
            return (
              <div key={c} onClick={() => setCity(c)} style={{ flex: "1 1 0", minWidth: 100, padding: "16px 10px", cursor: "pointer", textAlign: "center", borderRight: i < CITIES.length - 1 ? "1px solid var(--line)" : "none", borderBottom: "1px solid var(--line)", background: sel ? "var(--ink)" : "transparent", color: sel ? "var(--paper)" : "var(--ink)", transition: "all .2s ease" }}>
                <div style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 16, fontWeight: 500 }}>{c}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
