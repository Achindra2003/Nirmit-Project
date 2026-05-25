import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { HomeRoute } from "@/routes/HomeRoute";
import { IntakeRoute } from "@/routes/IntakeRoute";
import { GeneratingRoute } from "@/routes/GeneratingRoute";
import { RevealRoute } from "@/routes/RevealRoute";
import { PlannerRoute } from "@/routes/PlannerRoute";
import { StyleRoute } from "@/routes/StyleRoute";
import { ExportRoute } from "@/routes/ExportRoute";
import { ThreeDFrontRoute } from "@/routes/ThreeDFrontRoute";

const ROUTE_MAP = {
  home:       <HomeRoute />,
  intake:     <IntakeRoute />,
  generating: <GeneratingRoute />,
  reveal:     <RevealRoute />,
  planner:    <PlannerRoute />,
  style:      <StyleRoute />,
  export:     <ExportRoute />,
};

export function App() {
  const stage = useAppStore((s) => s.stage);

  // Dev escape hatch: ?dev=3dfront renders the raw 3D-FRONT viewer outside the
  // normal stage flow. Not part of the user experience.
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dev") === "3dfront") {
    return <ThreeDFrontRoute />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 0.7, 0, 1] }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          {ROUTE_MAP[stage]}
        </motion.div>
      </AnimatePresence>
      {/* Phone fallback. CSS-driven (see .small-screen-gate in styles.css)
       *  so the underlying route stays mounted — resizing back to tablet
       *  / desktop simply hides this gate, no state is lost. Nirmit is a
       *  working surface (planner, 3D, BOQ); it isn't designed for
       *  phone-sized viewports. */}
      <SmallScreenGate />
    </>
  );
}

function SmallScreenGate() {
  return (
    <div className="small-screen-gate" role="status" aria-live="polite">
      <div style={{ maxWidth: 360 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 28 }}>
          <div style={{ width: 28, height: 1, background: "var(--terra)", opacity: 0.7 }} />
          <span className="eyebrow">Nirmit · निर्मित</span>
          <div style={{ width: 28, height: 1, background: "var(--terra)", opacity: 0.7 }} />
        </div>
        <h2
          style={{
            fontFamily: "var(--fd)",
            fontSize: "clamp(28px, 7vw, 38px)",
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            marginBottom: 18,
          }}
        >
          Please open this on a <em style={{ color: "var(--terra)" }}>larger screen</em>.
        </h2>
        <p
          style={{
            fontFamily: "var(--fb)",
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--ink-2)",
            marginBottom: 22,
          }}
        >
          We design rooms with a 3D canvas, a paper-and-ink plan, and a full bill of quantities. None of it fits on a phone yet — and we'd rather you saw the work properly than squint at it.
        </p>
        <p
          style={{
            fontFamily: "var(--fd)",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--ink-3)",
          }}
        >
          Tablet (iPad-size) or laptop works fine.
        </p>
      </div>
    </div>
  );
}
