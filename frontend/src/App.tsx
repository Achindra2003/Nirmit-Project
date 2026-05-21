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
    <AnimatePresence mode="wait">
      <motion.div
        key={stage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: "easeInOut" }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {ROUTE_MAP[stage]}
      </motion.div>
    </AnimatePresence>
  );
}
