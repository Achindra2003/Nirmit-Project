import { useState } from "react";
import { api } from "@/api/client";
import type { Intake, RoomType, Vibe } from "@/api/types";
import { useAppStore } from "@/store/useAppStore";
import { TopNav } from "@/components/shell/TopNav";

/* ── Data ─────────────────────────────────────────────────────── */

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

// Character options are CONTEXTUAL to the room — you can't ask the "feeling" of
// a space before you know what space it is ("The Gathering" means nothing for a
// study). Each option maps to a backend Vibe (so the API contract is unchanged)
// and reuses that vibe's mood photograph. Room is chosen first, so this page
// always knows which set to show.
interface CharacterOption { vibe: Vibe; name: string; desc: string; img: string }
// Six characters per room, each on its own mood image (the six vibe photos),
// relabelled to that room's language. NOTE: these are mood references, not
// per-room photography — true per-(room,character) imagery is an asset/
// procurement task; this is the honest best with the six photos we have.
const CHARACTER_BY_ROOM: Record<string, CharacterOption[]> = {
  living: [
    { vibe: "warm_traditional", name: "Warm & gathered",  desc: "Dense, lived-in, made for company.",   img: "/vibes/gathering.png" },
    { vibe: "light_airy",       name: "Open & calm",       desc: "Light, restrained, room to breathe.",  img: "/vibes/breath.png" },
    { vibe: "earthy_crafted",   name: "Rich & layered",    desc: "Heritage tones, texture, character.",  img: "/vibes/keeper.png" },
    { vibe: "modern_minimal",   name: "Clean & modern",    desc: "Quiet, considered, urban.",            img: "/vibes/studio.png" },
    { vibe: "maximalist",       name: "Bold & maximal",    desc: "Loud, layered, alive.",                img: "/vibes/bazaar.png" },
    { vibe: "coastal",          name: "Breezy & light",    desc: "Open, airy, sea-light.",               img: "/vibes/shore.png" },
  ],
  bedroom: [
    { vibe: "light_airy",       name: "Restful & calm",     desc: "Soft, quiet, easy to wind down.",     img: "/vibes/breath.png" },
    { vibe: "warm_traditional", name: "Cocooning & warm",   desc: "Deep tones, enveloping, intimate.",   img: "/vibes/gathering.png" },
    { vibe: "modern_minimal",   name: "Light & uncluttered",desc: "Clean lines, nothing spare.",         img: "/vibes/studio.png" },
    { vibe: "earthy_crafted",   name: "Earthy & textured",  desc: "Natural tones, grounded, tactile.",   img: "/vibes/keeper.png" },
    { vibe: "coastal",          name: "Airy & coastal",     desc: "Breezy, pale, restful.",              img: "/vibes/shore.png" },
    { vibe: "maximalist",       name: "Rich & dramatic",    desc: "Deep colour, layered, bold.",         img: "/vibes/bazaar.png" },
  ],
  dining: [
    { vibe: "warm_traditional", name: "Intimate & warm",   desc: "Close and warm, for long meals.",      img: "/vibes/gathering.png" },
    { vibe: "light_airy",       name: "Bright & social",   desc: "Open and easy, everyday gathering.",   img: "/vibes/breath.png" },
    { vibe: "modern_minimal",   name: "Composed & modern", desc: "Quiet, considered, urban.",            img: "/vibes/studio.png" },
    { vibe: "earthy_crafted",   name: "Rustic & crafted",  desc: "Solid wood, heritage, handmade.",      img: "/vibes/keeper.png" },
    { vibe: "maximalist",       name: "Festive & layered", desc: "Colour and pattern, made to host.",    img: "/vibes/bazaar.png" },
    { vibe: "coastal",          name: "Light & breezy",    desc: "Pale, open, easy.",                    img: "/vibes/shore.png" },
  ],
  study: [
    { vibe: "modern_minimal",   name: "Focused & plain", desc: "Calm, distraction-free, work-first.",    img: "/vibes/studio.png" },
    { vibe: "earthy_crafted",   name: "Warm library",    desc: "Book-lined, woody, unhurried.",          img: "/vibes/keeper.png" },
    { vibe: "light_airy",       name: "Bright & airy",   desc: "Light and fresh, easy on the eyes.",     img: "/vibes/breath.png" },
    { vibe: "warm_traditional", name: "Classic & woody", desc: "Warm timber, traditional, settled.",     img: "/vibes/gathering.png" },
    { vibe: "coastal",          name: "Calm & coastal",  desc: "Pale, breezy, low-distraction.",         img: "/vibes/shore.png" },
    { vibe: "maximalist",       name: "Rich & layered",  desc: "Colour, art, personality.",              img: "/vibes/bazaar.png" },
  ],
};
function charactersFor(room: RoomType | null): CharacterOption[] {
  return CHARACTER_BY_ROOM[room ?? "living"] ?? CHARACTER_BY_ROOM.living;
}

// "Use" picks are room-contextual too, and each carries the DESIGN CONSEQUENCE
// it triggers — shown back to the user live, so intake feels like it's listening
// and the household signal arrives structured instead of as mushy free text.
interface UseChip { label: string; consequence: string }
const USE_BY_ROOM: Record<string, UseChip[]> = {
  living: [
    { label: "Just the two of us",    consequence: "an intimate seating cluster, nothing oversized" },
    { label: "Young children",        consequence: "rounded edges, closed storage, no glass" },
    { label: "Elderly parent visits", consequence: "a firm armchair with arms, near the door" },
    { label: "Joint family",          consequence: "generous, flexible seating" },
    { label: "Frequent guests",       consequence: "an extra seat that pulls in" },
    { label: "Vastu matters",         consequence: "mandir & heavy storage placed by direction" },
  ],
  bedroom: [
    { label: "Couple",         consequence: "a balanced room, both sides reachable" },
    { label: "Single",         consequence: "one side freed for a desk or chair" },
    { label: "A child's room", consequence: "rounded edges, closed storage, room to play" },
    { label: "Lots to store",  consequence: "a deeper wardrobe, drawers under the bed" },
    { label: "I read in bed",  consequence: "a bedside lamp and a small shelf" },
    { label: "Vastu matters",  consequence: "bed & storage placed by direction" },
  ],
  dining: [
    { label: "Seats 2–4",      consequence: "a compact table, easy to move around" },
    { label: "Seats 6+",       consequence: "a long table with room to host" },
    { label: "We host often",  consequence: "a sideboard for serving and storage" },
    { label: "Young children", consequence: "wipeable surfaces, rounded edges" },
    { label: "Vastu matters",  consequence: "the table placed by direction" },
  ],
  study: [
    { label: "Deep focus work",  consequence: "one generous desk, clean sightlines" },
    { label: "Study & homework", consequence: "a sturdy desk and good task light" },
    { label: "Video calls",      consequence: "a tidy wall behind the desk" },
    { label: "Reading & books",  consequence: "generous shelving, open and closed" },
    { label: "Shared by two",    consequence: "a desk for two, or a matched pair" },
    { label: "Vastu matters",    consequence: "the desk faces an auspicious way" },
  ],
};
function usesFor(room: RoomType | null): UseChip[] {
  return USE_BY_ROOM[room ?? "living"] ?? USE_BY_ROOM.living;
}

const PAGES = [
  {
    titleMain: "Which room",
    titleAccent: "and how big",
    sub: "Start here. Everything that follows is shaped around this room — its size, its purpose, the way it should feel.",
    kind: "room" as const,
  },
  {
    titleMain: "The character",
    titleAccent: "of the room",
    sub: "Now that we know the room — how should it feel to be in it?",
    kind: "vibe" as const,
  },
  {
    titleMain: "Who uses it",
    titleAccent: "and how",
    sub: "Tap what fits. Each one quietly changes the design — you'll see how.",
    kind: "who" as const,
  },
  {
    titleMain: "Your budget",
    titleAccent: "and city",
    sub: "Furniture and finishing only — installation and civil work stay separate.",
    kind: "budget" as const,
  },
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
  // Custom room dimensions (feet) — used when size === "custom".
  const [customWFt, setCustomWFt] = useState(12);
  const [customDFt, setCustomDFt] = useState(14);
  const [who, setWho]         = useState("");
  const [chips, setChips]     = useState<string[]>([]);
  const [budget, setBudget]   = useState(300_000);
  const [city, setCity]       = useState("");
  const [otherCity, setOtherCity] = useState("");
  const [error, setError]     = useState<string | null>(null);

  const P = PAGES[page];

  // Order now matches the room-first flow: room+size → character → use → budget.
  const ok = [
    !!(room && size && (size !== "custom" || (customWFt >= 6 && customDFt >= 6 && customWFt <= 60 && customDFt <= 60))),
    !!vibe,
    !!(who.trim().length > 4 || chips.length > 0),
    !!(city && (city !== "Other" || otherCity.trim().length > 1)),
  ];

  // Changing the room invalidates the room-specific picks downstream (character
  // and use sets differ per room), so clear them — keeps the intake honest
  // rather than carrying a study's "Warm library" into a bedroom.
  function chooseRoom(r: RoomType) {
    if (r !== room) { setVibe(null); setChips([]); }
    setRoom(r);
  }

  function toggleChip(c: string) {
    setChips(chips.includes(c) ? chips.filter((x) => x !== c) : [...chips, c]);
  }

  async function submit() {
    setError(null);
    const sizeObj = SIZES.find((s) => s.id === size);
    // Custom size wins when chosen; feet → mm (1 ft = 304.8 mm).
    const dims = size === "custom"
      ? { width_mm: Math.round(customWFt * 304.8), depth_mm: Math.round(customDFt * 304.8), height_mm: 3000 }
      : { width_mm: sizeObj?.w_mm ?? 4200, depth_mm: sizeObj?.d_mm ?? 3600, height_mm: 3000 };
    const effectiveCity = city === "Other" ? otherCity.trim() : city;
    // entrance_direction defaults to "S" — the picker was removed from the
    // intake wizard (2026-05-26) because most users don't know it off the top
    // of their head and the cost/visuals don't materially change with it. The
    // backend still requires the field, so we send the safe default.
    const intake: Intake = {
      room_type: room ?? "living",
      room_dimensions: dims,
      entrance_direction: "S",
      // Structured picks lead; the optional free-text rides along. Both reach
      // the backend's profile inference.
      who_lives_here: [chips.join(". "), who.trim()].filter(Boolean).join(". ") || "a household",
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

  const sizeLabel = size === "custom" ? `${customWFt}×${customDFt} ft` : (SIZES.find((s) => s.id === size)?.en ?? "");
  const roomLabel = room && size ? `${ROOMS.find((r) => r[0] === room)?.[1] ?? ""} · ${sizeLabel}` : null;
  const vibeLabel = vibe ? charactersFor(room).find((c) => c.vibe === vibe)?.name ?? null : null;
  const whoLabel  = chips.length > 0 ? chips.slice(0, 2).join(", ") + (chips.length > 2 ? "…" : "") : (who.trim().length > 4 ? truncate(who, 40) : null);
  const bgtLabel  = city ? `${formatBudget(budget)} · ${city}` : null;
  const trail     = [roomLabel, vibeLabel, whoLabel, bgtLabel];

  return (
    <div className="paper" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <TopNav stage="intake" hideTrail />

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--line)", flexShrink: 0, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${((page + (ok[page] ? 1 : 0)) / 4) * 100}%`, background: "var(--terra)", transition: "width .5s ease", borderRadius: "0 2px 2px 0" }} />
      </div>

      {/* Body — `.intake-body` is the responsive hook. Below 1100 px the
       *  question column stacks above the answer column so each gets the
       *  full viewport width. */}
      <div className="intake-body" style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1.4fr", minHeight: 0 }}>

        {/* Left — question */}
        <div style={{ padding: "var(--s-8) var(--s-6) var(--s-6) var(--s-7)", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid var(--line)" }}>
          <div>
            <div className="appear" style={{ marginBottom: 24 }}>
              <div className="step-pill">
                <span className="step-pill-num">{ROMAN[page]}</span>
                <span>of IV · Discover</span>
              </div>
            </div>

            <h2 key={`q${page}`} className="intake-display slide-up">
              <span className="intake-display-line">{P.titleMain}</span>
              <span className="intake-display-line intake-display-line--accent">{P.titleAccent}</span>
            </h2>

            <p key={`sub${page}`} className="slide-up body-text" style={{ animationDelay: ".08s", maxWidth: "36ch", fontSize: 16 }}>
              {P.sub}
            </p>
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
                  <span className="eyebrow" style={{ minWidth: 78, fontSize: 10 }}>{["Room", "Character", "Uses it", "Budget"][i]}</span>
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
          <div key={`a${page}`} className="slide-up" style={{ animationDelay: ".12s", flex: 1, overflowY: "auto", padding: "var(--s-7) var(--s-8) var(--s-5)" }}>
            {P.kind === "vibe"   && <VibeAnswer   room={room}     vibe={vibe} setVibe={setVibe} />}
            {P.kind === "room"   && <RoomAnswer   room={room}     setRoom={chooseRoom} size={size} setSize={setSize} customWFt={customWFt} setCustomWFt={setCustomWFt} customDFt={customDFt} setCustomDFt={setCustomDFt} />}
            {P.kind === "who"    && <WhoAnswer    room={room}     vibe={vibe} who={who} setWho={setWho} chips={chips} toggleChip={toggleChip} />}
            {P.kind === "budget" && <BudgetAnswer budget={budget} setBudget={setBudget} city={city} setCity={setCity} otherCity={otherCity} setOtherCity={setOtherCity} />}
          </div>

          {error && <p style={{ padding: "0 64px", color: "var(--terra-dk)", fontFamily: "var(--fb)", fontSize: 14 }}>{error}</p>}

          {/* Nav footer */}
          <div className="appear-4" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", padding: "var(--s-5) var(--s-8) var(--s-5)" }}>
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
                {page < 3 ? "Continue" : "Draw my room"}
                <span style={{ fontSize: 16, fontWeight: 400 }}>→</span>
              </button>
              {nudge && !ok[page] && (
                <span style={{ fontFamily: "var(--fb)", fontSize: 12, color: "var(--terra)", transition: "opacity .2s" }}>
                  {{ room: "Choose a room and size", vibe: "Pick a character to continue", who: "Tap at least one — who uses it?", budget: "Select a city" }[PAGES[page].kind]}
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

function VibeAnswer({ room, vibe, setVibe }: { room: RoomType | null; vibe: Vibe | null; setVibe: (v: Vibe) => void }) {
  const options = charactersFor(room);
  return (
    <div className="vibe-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
      {options.map((v) => {
        const sel = vibe === v.vibe;
        return (
          <div
            key={v.vibe}
            onClick={() => setVibe(v.vibe)}
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

function RoomAnswer({ room, setRoom, size, setSize, customWFt, setCustomWFt, customDFt, setCustomDFt }: {
  room: RoomType | null; setRoom: (r: RoomType) => void;
  size: string | null; setSize: (s: string) => void;
  customWFt: number; setCustomWFt: (n: number) => void;
  customDFt: number; setCustomDFt: (n: number) => void;
}) {
  const customSel = size === "custom";
  const customArea = Math.round(customWFt * customDFt);
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

      {/* Size — four presets plus a Custom option for users who know their
          actual dimensions. */}
      <div>
        <span className="eyebrow">Size</span>
        <div className="size-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 14 }}>
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
          {/* Custom card */}
          <div onClick={() => setSize("custom")} style={{ padding: "20px 10px 14px", cursor: "pointer", textAlign: "center", border: `1.5px solid ${customSel ? "var(--terra)" : "var(--line)"}`, background: customSel ? "var(--terra-light)" : "transparent", transition: "all .22s ease" }}>
            <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--fd)", fontSize: 30, fontWeight: 400, color: customSel ? "var(--terra)" : "var(--ink-3)" }}>⌗</span>
            </div>
            <div style={{ fontFamily: "var(--fb)", fontSize: 15, fontWeight: 600, color: customSel ? "var(--terra)" : "var(--ink)" }}>Custom</div>
            <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", marginTop: 3, letterSpacing: "0.08em" }}>EXACT FT</div>
            <div style={{ fontFamily: "var(--fb)", fontSize: 12, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.4 }}>I know my size</div>
          </div>
        </div>

        {/* Custom dimension inputs — appear only when Custom is chosen */}
        {customSel && (
          <div className="appear" style={{ display: "flex", alignItems: "flex-end", gap: 24, marginTop: 18, padding: "16px 18px", border: "1px solid var(--line)", background: "var(--paper-2)" }}>
            {([["Width", customWFt, setCustomWFt], ["Depth", customDFt, setCustomDFt]] as const).map(([label, val, setter]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="eyebrow" style={{ fontSize: 10 }}>{label}</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <input
                    type="number" min={6} max={60} value={val}
                    onChange={(e) => setter(Math.max(0, Math.min(60, parseInt(e.target.value || "0", 10))))}
                    style={{ width: 70, border: "none", borderBottom: "2px solid var(--terra)", background: "transparent", fontFamily: "var(--fd)", fontSize: 28, fontWeight: 500, color: "var(--ink)", outline: "none", textAlign: "center" }}
                  />
                  <span style={{ fontFamily: "var(--fm)", fontSize: 12, color: "var(--ink-3)" }}>ft</span>
                </div>
              </div>
            ))}
            <div style={{ marginLeft: "auto", textAlign: "right" as const }}>
              <div style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>FLOOR AREA</div>
              <div style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{customArea} sq ft</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WhoAnswer({ room, vibe, who, setWho, chips, toggleChip }: { room: RoomType | null; vibe: Vibe | null; who: string; setWho: (s: string) => void; chips: string[]; toggleChip: (c: string) => void }) {
  const uses = usesFor(room);
  const chosen = uses.filter((u) => chips.includes(u.label));
  // Compose the read-back profile so the step feels like the system is forming
  // a picture of WHO this is for — not just collecting tags.
  const roomWord = (ROOMS.find((r) => r[0] === room)?.[1] ?? "room").toLowerCase();
  const characterName = vibe ? charactersFor(room).find((c) => c.vibe === vibe)?.name ?? null : null;
  const identity = characterName ? `A ${characterName.toLowerCase()} ${roomWord}` : `Your ${roomWord}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {/* Structured, room-specific picks — the primary input now */}
      <div>
        <span className="eyebrow">Tap what fits — each one shapes the room</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {uses.map((u) => {
            const on = chips.includes(u.label);
            return (
              <div key={u.label} onClick={() => toggleChip(u.label)} style={{ padding: "10px 20px", cursor: "pointer", border: `1.5px solid ${on ? "var(--terra)" : "var(--line)"}`, background: on ? "var(--terra)" : "transparent", color: on ? "var(--paper)" : "var(--ink-2)", fontFamily: "var(--fb)", fontSize: 14, fontWeight: 500, transition: "all .2s ease" }}>
                {u.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* The profile read-back — the system forming a picture of who this is
          for, then what that means for the design. This is the "profiling"
          the free-text box never delivered: it names the person AND the
          consequence, live. */}
      {chosen.length > 0 && (
        <div className="appear" style={{ borderLeft: "3px solid var(--terra)", background: "var(--paper-3)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--terra-dk)" }}>Here's who I'm designing for</span>
            <div style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 500, color: "var(--ink)", marginTop: 6, lineHeight: 1.3 }}>
              {identity}
              <span style={{ fontStyle: "italic", fontWeight: 400, color: "var(--ink-2)" }}>{" — for "}{chosen.map((u) => u.label.toLowerCase()).join(", ")}.</span>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--line)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <span className="eyebrow">So I'll plan for</span>
            {chosen.map((u) => (
              <div key={u.label} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                <span style={{ color: "var(--terra)", marginTop: 2, flexShrink: 0, fontSize: 11 }}>·</span>
                <span style={{ fontFamily: "var(--fd)", fontStyle: "italic", fontSize: 14.5, color: "var(--ink)", lineHeight: 1.45 }}>{u.consequence}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional free text — for the one detail the chips can't capture. */}
      <div style={{ position: "relative" }}>
        <span className="eyebrow">Anything else? <span style={{ textTransform: "none", letterSpacing: 0, fontStyle: "italic", color: "var(--ink-3)" }}>— optional</span></span>
        <textarea
          value={who}
          onChange={(e) => setWho(e.target.value)}
          placeholder="e.g. we keep a family mandir; my father uses a walker…"
          style={{ marginTop: 10, width: "100%", height: 76, border: "none", borderBottom: "2px solid var(--line)", background: "transparent", resize: "none", outline: "none", fontFamily: "var(--fb)", fontSize: 16, lineHeight: 1.6, color: "var(--ink)", padding: "6px 0" }}
          onFocus={(e) => { e.currentTarget.style.borderBottomColor = "var(--terra)"; }}
          onBlur={(e) => { e.currentTarget.style.borderBottomColor = "var(--line)"; }}
        />
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
        <div className="city-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, marginTop: 14, borderTop: "1px solid var(--line)", borderLeft: "1px solid var(--line)" }}>
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
