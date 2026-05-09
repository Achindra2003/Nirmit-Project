import { create } from "zustand";
import type { Intake, Vision } from "@/api/types";

export type Stage = "intake" | "generating" | "reveal" | "planner" | "export";

interface AppState {
  stage: Stage;
  intake: Intake | null;
  visions: Vision[];
  selectedVisionId: string | null;
  setStage: (s: Stage) => void;
  setIntake: (i: Intake) => void;
  setVisions: (v: Vision[]) => void;
  selectVision: (id: string) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  stage: "intake",
  intake: null,
  visions: [],
  selectedVisionId: null,
  setStage: (stage) => set({ stage }),
  setIntake: (intake) => set({ intake }),
  setVisions: (visions) =>
    set({ visions, selectedVisionId: visions[0]?.id ?? null }),
  selectVision: (selectedVisionId) => set({ selectedVisionId }),
  reset: () =>
    set({ stage: "intake", intake: null, visions: [], selectedVisionId: null }),
}));
