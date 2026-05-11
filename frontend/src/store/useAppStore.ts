import { create } from "zustand";
import type { Intake, Vision } from "@/api/types";

export type Stage = "home" | "intake" | "generating" | "reveal" | "planner" | "export";

/**
 * Planner edit mode — resolves the OrbitControls ⇄ drag conflict on the R3F
 * canvas. In "browse" the room is fully orbit-able and items are LOCKED
 * (un-draggable; clicking just selects). Drag activates only in "move", which
 * disables OrbitControls so the cursor exclusively drives the selected item.
 * The planner's item-controls strip flips this with a "Move / Done" toggle.
 */
export type EditMode = "browse" | "move";

interface AppState {
  // ── Journey ──
  stage: Stage;
  intake: Intake | null;
  visions: Vision[];
  selectedVisionId: string | null;

  // ── Planner editing ──
  selectedItemId: string | null;
  editMode: EditMode;

  setStage: (s: Stage) => void;
  setIntake: (i: Intake) => void;
  setVisions: (v: Vision[]) => void;
  selectVision: (id: string) => void;

  setSelectedItem: (id: string | null) => void;
  setEditMode: (m: EditMode) => void;

  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  stage: "home",
  intake: null,
  visions: [],
  selectedVisionId: null,

  selectedItemId: null,
  editMode: "browse",

  setStage: (stage) => set({ stage }),
  setIntake: (intake) => set({ intake }),
  setVisions: (visions) => set({ visions, selectedVisionId: visions[0]?.id ?? null }),
  selectVision: (selectedVisionId) => set({ selectedVisionId }),

  setSelectedItem: (selectedItemId) =>
    // Deselecting always drops you back to browse mode (no orphaned move mode).
    set((s) => ({ selectedItemId, editMode: selectedItemId ? s.editMode : "browse" })),
  setEditMode: (editMode) => set({ editMode }),

  reset: () =>
    set({
      stage: "home",
      intake: null,
      visions: [],
      selectedVisionId: null,
      selectedItemId: null,
      editMode: "browse",
    }),
}));
