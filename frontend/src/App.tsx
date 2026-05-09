import { useAppStore } from "@/store/useAppStore";
import { IntakeRoute } from "@/routes/IntakeRoute";
import { GeneratingRoute } from "@/routes/GeneratingRoute";
import { RevealRoute } from "@/routes/RevealRoute";
import { PlannerRoute } from "@/routes/PlannerRoute";
import { ExportRoute } from "@/routes/ExportRoute";

export function App() {
  const stage = useAppStore((s) => s.stage);

  switch (stage) {
    case "intake":
      return <IntakeRoute />;
    case "generating":
      return <GeneratingRoute />;
    case "reveal":
      return <RevealRoute />;
    case "planner":
      return <PlannerRoute />;
    case "export":
      return <ExportRoute />;
  }
}
