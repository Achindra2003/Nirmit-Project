import { Fragment, useState } from "react";
import { api } from "@/api/client";
import type { Direction, Intake, RoomType, Vibe } from "@/api/types";
import { useAppStore } from "@/store/useAppStore";
import { TopNav } from "@/components/shell/TopNav";

/* ── Data ─────────────────────────────────────────────────────── */

// Vibe imagery — replace `/public/vibes/*.{jpg,png}` with real room photographs
// to swap the source images without touching code. The card layout below is
// designed to showcase room photography full-bleed with a quiet caption.
const VIBES: Array<{ id: Vibe; name: string; desc: string; img: string }> = [
  { id: "warm_traditional", name: "The Gathering", desc: "Warm, dense, lived-in.",        img: "/vibes/gathering.png" },
  { id: "light_airy",       name: "The Breath",    desc: "Open, light, restrained.",       img: "/vibes/breath.png" },
  { id: "earthy_crafted",   name: "The Keeper",    desc: "Storage-first. Heritage tones.", img: "/vibes/keeper.png" },
  { id: "modern_minimal",   name: "The Studio",    desc: "Quiet, considered, urban.",      img: "/vibes/studio.png" },
  { id: "maximalist",       name: "The Bazaar",    desc: "Loud, layered, alive.",          img: "/vibes/bazaar.png" },
  { id: "coastal",          name: "The Shore",     desc: "Breezy, open, sea-light.",       img: "/vibes/shore.png" },
];

const ROOMS: Array<[RoomType, string]> = [
  ["living",  "Living Room"],
  ["bedroom", "Bedroom"],
  ["dining",  "Dining"],
  ["study",   "Study"],
];

const SIZES: Array<{ id: string; en: string; dims: string; desc: string; w_mm: number; d_mm: number; rect: [number, number] }> = [
  { id: "compact",  en: "Compact",  dims: "≤10×10 ft", desc: "A snug city flat",            w_mm: 3000, d_mm: 3000, rect: [36, 36] },
  { id: "standard", en: "Standard", dims: "10×14 ft",  desc: "Most 2BHKs in metros",        w_mm: 3000, d_mm: 4300, rect: [38, 54] },
  { id: "large",    en: "Large",    dims: "16×18 ft",  desc: "Generous, well-proportioned",  w_mm: 4900, d_mm: 5500, rect: [54, 62] },
  { id: "open",     en: "Open",     dims: "18ft+",     desc: "Combined living-dining",       w_mm: 5500, d_mm: 6100, rect: [66, 66] },
];

const CITIES = ["Mumbai", "Pune", "Bangalore", "Delhi", "Hyderabad", "Chennai", "Kolkata", "Other"];
const ROMAN  = ["I", "II", "III", "IV"] as const;

const WHO_CHIPS = ["Young children", "Elderly parent", "Work from home", "Frequent guests", "Pets", "Just the two of us", "Vastu matters", "Joint family"];

const PAGES = [
  { title: "What feeling?",        sub: "Not the style. The feeling.",                                                 kind: "vibe" as const },
  { title: "Which room, how big?", sub: "A rough sense is enough — we'll refine later.",                               kind: "room" as const },
  { title: "Who lives here?",      sub: "Tell us in your own words. The more you say, the more personal the drawing.", kind: "who" as const },
  { title: "Budget, and where?",   sub: "For furniture and finishing. Installation is separate.",                       kind: "budget" as const },
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
  const [nudge, setNudge]     = useState(false);
  const [vibe, setVibe]       = useState<Vibe | null>(null);
  const [room, setRoom]       = useState<RoomType | null>(null);
  const [size, setSize]       = useState<string | null>(null);
  const [entrance, setEntrance] = useState<Direction>("S");
  const [who, setWho]         = useState("");
  const [chips, setChips]     = useState<string[]>([]);
  const [budget, setBudget]   = useState(300_000);
  const [city, setCity]       = useState("");
  const [otherCity, setOtherCity] = useState("");
  const [error, setError]     = useState<string | null>(null);

  const P = PAGES[page];

  const ok = [
    !!vibe,
    !!(room && size),
    !!(who.trim().length > 4 || chips.length > 0),
    !!(city && (city !== "Other" || otherCity.trim().length > 1)),
  ];

  function toggleChip(c: string) {
    if (chips.includes(c)) {
      setChips(chips.filter((x) => x !== c));
    } else {
      setChips([...chips, c]);
      // Append the chip to the textarea so users see what's being recorded
      const base = who.trim();
      const suffix = base
        ? (base.endsWith(".") || base.endsWith(",") ? " " + c + "." : ". " + c + ".")
        : c + ".";
      setWho(base + suffix);
    }
  }

  async function submit() {
    setError(null);
    const sizeObj = SIZES.find((s) => s.id === size);
    const effectiveCity = city === "Other" ? otherCity.trim() : city;
    const intake: Intake = {
      room_type: room ?? "living",
      room_dimensions: { width_mm: sizeObj?.w_mm ?? 4200, depth_mm: sizeObj?.d_mm ?? 3600, height_mm: 3000 },
      entrance_direction: entrance,
      who_lives_here: who.trim() || chips.join(". "),
      vibe: vibe!,
      budget_inr: budget,
      keep_existing: null,
      vastu_matters: chips.includes("Vastu matters"),
      city: effectiveCity || "Mumbai",
    };
    setIntake(intake);
    setStage("generating");
    try {
      const res = await api.generate({ intake });
      setVisions(res.visions);
      // GeneratingRoute handles the transition to "reveal" once both
      // the animation completes and visionsLoaded is true.
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

  const vibeLabel = vibe ? VIBES.find((v) => v.id === vibe)?.name : null;
  const roomLabel = room && size ? `${ROOMS.find((r) => r[0] === room)?.[1] ?? ""} · ${SIZES.find((s) => s.id === size)?.en ?? ""}` : null;
  const whoLabel  = who.trim().length > 4 ? truncate(who, 40) : (chips.length > 0 ? chips.slice(0, 2).join(", ") + (chips.length > 2 ? "…" : "") : null);
  const bgtLabel  = city ? `${formatBudget(budget)} · ${city}` : null;
  const trail     = [vibeLabel, roomLabel, whoLabel, bgtLabel];

  return (
    <div className="paper" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <TopNav stage="intake" hideTrail />

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--line)", flexShrink: 0, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${((page + (ok[page] ? 1 : 0)) / 4) * 100}%`, background: "var(--terra)", transition: "width .5s ease", borderRadius: "0 2px 2px 0" }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1.4fr", minHeight: 0 }}>

        {/* Left — question */}
        <div style={{ padding: "64px 48px 48px 56px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid var(--line)" }}>
          <div>
            <div className="appear" style={{ marginBottom: 24 }}>
              <div className="step-pill">
                <span className="step-pill-num">{ROMAN[page]}</span>
                <span>of IV · Discover</span>
              </div>
            </div>

            <h2 key={`q${page}`} className="slide-up" style={{ fontFamily: "var(--fd)", fontSize: "clamp(32px, 3.5vw, 52px)", fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.015em", marginBottom: 16, color: "var(--ink)" }}>
              {P.title.split(",").map((part, i, arr) => (
                <Fragment key={i}>
                  {i > 0 && ", "}
                  <span style={i === arr.length - 1 ? { fontStyle: "italic", fontWeight: 400, color: "var(--terra)" } : undefined}>{part}</span>
                </Fragment>
              ))}
            </h2>

            <div key={`sub${page}`} className="slide-up" style={{ animationDelay: ".08s", fontFamily: "var(--fb)", fontSize: 16, color: "var(--ink-2)", maxWidth: "34ch", lineHeight: 1.6 }}>
              {P.sub}
            </div>
          </div>

          {/* Trail — classical ledger */}
          <div className="appear-3" style={{ display: "flex", flexDirection: "column" }}>
            <div className="rule-ornamental" style={{ marginBottom: 16 }}>
              <span className="rule-ornamental-glyph">◆</span>
            </div>
            <span className="eyebrow" style={{ marginBottom: 12 }}>So far</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {trail.map((val, i) => (
                <div key={i} className="ledger-row" style={{ opacity: val ? 1 : 0.3 }}>
                  <span className="eyebrow" style={{ minWidth: 78, fontSize: 10 }}>{["Feeling", "Room", "Lives here", "Budget"][i]}</span>
                  <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14.5, color: i === page ? "var(--terra)" : "var(--ink)" }}>
                    {val || (i === page ? "—" : "—")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — answer */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div key={`a${page}`} className="slide-up" style={{ animationDelay: ".12s", flex: 1, overflowY: "auto", padding: "48px 64px 24px" }}>
            {P.kind === "vibe"   && <VibeAnswer   vibe={vibe}     setVibe={setVibe} />}
            {P.kind === "room"   && <RoomAnswer   room={room}     setRoom={setRoom} size={size} setSize={setSize} entrance={entrance} setEntrance={setEntrance} />}
            {P.kind === "who"    && <WhoAnswer    who={who}       setWho={setWho} chips={chips} toggleChip={toggleChip} />}
            {P.kind === "budget" && <BudgetAnswer budget={budget} setBudget={setBudget} city={city} setCity={setCity} otherCity={otherCity} setOtherCity={setOtherCity} />}
          </div>

          {error && <p style={{ padding: "0 64px", color: "var(--terra-dk)", fontFamily: "var(--fb)", fontSize: 14 }}>{error}</p>}

          {/* Nav footer */}
          <div className="appear-4" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", padding: "20px 64px 24px" }}>
            <button
              className="btn-ghost"
              onClick={() => { if (page > 0) prev(); }}
              disabled={page === 0}
              style={{
                opacity: page === 0 ? 0.32 : 1,
                cursor: page === 0 ? "default" : "pointer",
                pointerEvents: page === 0 ? "none" : "auto",
              }}
              title={page === 0 ? "Use the Back button in the header to leave this step" : "Go to previous step"}
            >
              ← Previous
            </button>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <button
                className="btn-primary"
                onClick={() => { if (ok[page]) { next(); } else { setNudge(true); setTimeout(() => setNudge(false), 600); } }}
                disabled={!ok[page]}
                style={{ animation: nudge && !ok[page] ? "appear .3s ease" : "none" }}
              >
                {page < 3 ? "Continue" : "Begin designing"}
                <span style={{ fontSize: 16, fontWeight: 400 }}>→</span>
              </button>
              {nudge && !ok[page] && (
                <span style={{ fontFamily: "var(--fb)", fontSize: 12, color: "var(--terra)", transition: "opacity .2s" }}>
                  {{ vibe: "Select a feeling to continue", room: "Choose a room and size", who: "Tell us who lives here", budget: "Select a city" }[PAGES[page].kind]}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Answer panels ─────────────────────────────────────────────── */

function VibeAnswer({ vibe, setVibe }: { vibe: Vibe | null; setVibe: (v: Vibe) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
      {VIBES.map((v) => {
        const sel = vibe === v.id;
        return (
          <div
            key={v.id}
            onClick={() => setVibe(v.id)}
            style={{
              position: "relative" as const,
              cursor: "pointer",
              aspectRatio: "4 / 5",
              overflow: "hidden",
              border: sel ? "2.5px solid var(--terra)" : "1px solid var(--line)",
              outline: sel ? "2px solid rgba(184,67,42,.22)" : "none",
              outlineOffset: 2,
              transition: "all .25s ease",
              boxShadow: sel ? "0 10px 28px rgba(0,0,0,.14)" : "0 2px 6px rgba(0,0,0,.05)",
              background: "var(--paper-2)",
            }}
            onMouseEnter={(e) => { if (!sel) { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 22px rgba(0,0,0,.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; } }}
            onMouseLeave={(e) => { if (!sel) { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 6px rgba(0,0,0,.05)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; } }}
          >
            {/* Room photograph — full-bleed */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: `url(${v.img}) center / cover no-repeat`,
              transition: "transform .5s ease",
              transform: sel ? "scale(1.04)" : "scale(1)",
            }} />
            {/* Bottom caption strip — solid paper, never obstructs the photo */}
            <div style={{
              position: "absolute",
              bottom: 0, left: 0, right: 0,
              background: sel ? "var(--terra)" : "var(--paper)",
              padding: "10px 14px 11px",
              borderTop: sel ? "none" : "1px solid var(--line)",
              transition: "background .25s ease",
            }}>
              <div style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 600, color: sel ? "var(--paper)" : "var(--ink)", lineHeight: 1.15, letterSpacing: "-0.005em" }}>{v.name}</div>
              <div style={{ fontFamily: "var(--fb)", fontStyle: "italic", fontSize: 11.5, color: sel ? "rgba(242,235,221,.85)" : "var(--ink-3)", lineHeight: 1.35, marginTop: 2 }}>{v.desc}</div>
            </div>
            {/* Selected check */}
            {sel && (
              <div style={{ position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: "50%", background: "var(--terra)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.25)" }}>
                <svg width="13" height="13" viewBox="0 0 14 14"><path d="M2.5 7l3.5 3.5 5.5-7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            )}
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
          {ROOMS.map(([id, en], i) => {
            const sel = room === id;
            return (
              <div key={id} onClick={() => setRoom(id)} style={{ flex: 1, padding: "16px 10px", cursor: "pointer", textAlign: "center", borderLeft: i > 0 ? "1px solid var(--line)" : "none", background: sel ? "var(--ink)" : "transparent", color: sel ? "var(--paper)" : "var(--ink)", transition: "all .25s ease" }}>
                <div style={{ fontFamily: "var(--fb)", fontSize: 15, fontWeight: 500 }}>{en}</div>
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
              <div key={rs.id} onClick={() => setSize(rs.id)} style={{ padding: "20px 10px 14px", cursor: "pointer", textAlign: "center", border: `1.5px solid ${sel ? "var(--terra)" : "var(--line)"}`, background: sel ? "var(--terra-light)" : "transparent", transition: "all .22s ease" }}>
                <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <div style={{ width: rs.rect[0], height: rs.rect[1], border: `1.5px solid ${sel ? "var(--terra)" : "var(--ink-3)"}`, position: "relative" }}>
                    <div style={{ position: "absolute", bottom: -1, left: 6, width: 8, height: 2, background: sel ? "var(--terra)" : "var(--ink-3)" }} />
                  </div>
                </div>
                <div style={{ fontFamily: "var(--fb)", fontSize: 15, fontWeight: 600, color: sel ? "var(--terra)" : "var(--ink)" }}>{rs.en}</div>
                <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", marginTop: 3, letterSpacing: "0.08em" }}>{rs.dims}</div>
                <div style={{ fontFamily: "var(--fb)", fontSize: 12, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.4 }}>{rs.desc}</div>
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
                <div style={{ fontSize: 12, marginTop: 3, opacity: 0.6 }}>{{ N: "North", E: "East", S: "South", W: "West" }[d]}</div>
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
        <p style={{ fontFamily: "var(--fb)", fontSize: 12, color: "var(--ink-3)", marginBottom: 10, fontStyle: "italic" }}>
          eg. A family of four — my mother-in-law visits often. We accumulate a lot of toys.
        </p>
        <textarea
          value={who}
          onChange={(e) => setWho(e.target.value)}
          placeholder="Describe your household in your own words…"
          style={{ width: "100%", height: 160, border: "none", borderBottom: "2px solid var(--line)", background: "transparent", resize: "none", outline: "none", fontFamily: "var(--fb)", fontSize: 17, lineHeight: 1.6, color: "var(--ink)", padding: "6px 0" }}
          onFocus={(e) => { e.currentTarget.style.borderBottomColor = "var(--terra)"; }}
          onBlur={(e) => { e.currentTarget.style.borderBottomColor = "var(--line)"; }}
        />
        <div style={{ position: "absolute", right: 0, bottom: 8, fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)" }}>
          {who.length > 0 ? `${who.length} ch` : ""}
        </div>
      </div>

      <div>
        <span className="eyebrow">Or pick what fits — each adds to your description</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {WHO_CHIPS.map((c) => {
            const on = chips.includes(c);
            return (
              <div key={c} onClick={() => toggleChip(c)} style={{ padding: "10px 20px", cursor: "pointer", border: `1.5px solid ${on ? "var(--terra)" : "var(--line)"}`, background: on ? "var(--terra)" : "transparent", color: on ? "var(--paper)" : "var(--ink-2)", fontFamily: "var(--fb)", fontSize: 14, fontWeight: 500, transition: "all .2s ease" }}>
                {c}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BudgetAnswer({ budget, setBudget, city, setCity, otherCity, setOtherCity }: {
  budget: number; setBudget: (v: number) => void;
  city: string; setCity: (c: string) => void;
  otherCity: string; setOtherCity: (c: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
      <div>
        <span className="eyebrow">Budget — furniture and finishing</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 18, marginBottom: 28 }}>
          <span style={{ fontFamily: "var(--fd)", fontSize: "clamp(56px, 6vw, 88px)", fontWeight: 600, lineHeight: 1, color: "var(--terra)", letterSpacing: "-0.025em" }}>
            {formatBudget(budget)}
          </span>
          <span style={{ fontFamily: "var(--fb)", fontSize: 15, color: "var(--ink-3)" }}>furniture + finishing</span>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, marginTop: 14, borderTop: "1px solid var(--line)", borderLeft: "1px solid var(--line)" }}>
          {CITIES.map((c) => {
            const sel = city === c;
            return (
              <div
                key={c}
                onClick={() => setCity(c)}
                style={{
                  padding: "16px 10px", cursor: "pointer", textAlign: "center",
                  borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)",
                  background: sel ? "var(--ink)" : "transparent",
                  color: sel ? "var(--paper)" : "var(--ink)",
                  transition: "all .2s ease",
                }}
              >
                <div style={{ fontFamily: "var(--fb)", fontSize: 14, fontWeight: 500 }}>{c}</div>
              </div>
            );
          })}
        </div>
        {city === "Other" && (
          <input
            type="text"
            value={otherCity}
            onChange={(e) => setOtherCity(e.target.value)}
            placeholder="Enter your city"
            autoFocus
            style={{
              marginTop: 16, width: "100%", border: "none",
              borderBottom: "2px solid var(--terra)", background: "transparent",
              fontFamily: "var(--fb)", fontSize: 16, color: "var(--ink)",
              padding: "6px 0", outline: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}
