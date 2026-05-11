import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { HomeRoute } from "@/routes/HomeRoute";
import { IntakeRoute } from "@/routes/IntakeRoute";
import { GeneratingRoute } from "@/routes/GeneratingRoute";
import { RevealRoute } from "@/routes/RevealRoute";
import { PlannerRoute } from "@/routes/PlannerRoute";
import { ExportRoute } from "@/routes/ExportRoute";

const ROUTE_MAP = {
  home:       <HomeRoute />,
  intake:     <IntakeRoute />,
  generating: <GeneratingRoute />,
  reveal:     <RevealRoute />,
  planner:    <PlannerRoute />,
  export:     <ExportRoute />,
};

export function App() {
  const stage = useAppStore((s) => s.stage);

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
