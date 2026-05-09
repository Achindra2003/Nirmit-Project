/**
 * The 10-second narrative loading state (VISION.md: "this is not a loading
 * screen ... a moment of anticipation"). Phase 1 ships a simple version;
 * Phase 2 polishes the type animation and timing.
 */
export function GeneratingRoute() {
  return (
    <div style={shell}>
      <div style={card}>
        <p style={line}>Understanding your space…</p>
        <p style={line}>Placing your family…</p>
        <p style={line}>Finding your vibe…</p>
      </div>
    </div>
  );
}

const shell = {
  minHeight: "100%",
  display: "grid",
  placeItems: "center",
} as const;
const card = {
  textAlign: "center" as const,
  fontSize: 20,
  color: "#6b614f",
  letterSpacing: 0.3,
};
const line = { margin: "12px 0" } as const;
