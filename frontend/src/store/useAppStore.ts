import { create } from "zustand";
import type { CostBreakdown, Intake, RoomState, Vision } from "@/api/types";

/**
 * Stage covers the full journey.
 *
 * Auth is OPTIONAL and LATE (see memory/project_auth_strategy.md): every
 * stage works signed-out, including the design flow. `login` and `signup`
 * are reachable from the TopNav "Sign in" link on the home page; success
 * routes the user back to "home" where the saved-rooms section is now
 * visible. There is no protected stage.
 */
export type Stage =
  | "home"
  | "login" | "signup"
  | "intake" | "generating" | "reveal" | "planner" | "style" | "export";

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
  visionsLoaded: boolean;

  // ── Auth-return memory ──
  // Where to send the user after a successful sign-in or sign-up, when
  // they were promoted to auth mid-flow. Today only the export page's
  // "Sign in to save" button sets this to "export"; LoginRoute and
  // SignupRoute consume it on success and clear it. */
  pendingReturn: Stage | null;

  // ── Planner editing ──
  selectedItemId: string | null;
  editMode: EditMode;
  layoutEditMode: boolean;

  setStage: (s: Stage) => void;
  setIntake: (i: Intake) => void;
  setVisions: (v: Vision[]) => void;
  selectVision: (id: string) => void;
  setPendingReturn: (s: Stage | null) => void;

  setSelectedItem: (id: string | null) => void;
  setEditMode: (m: EditMode) => void;
  setLayoutEditMode: (on: boolean) => void;

  /**
   * Single write-path for any change to the currently-selected vision —
   * dragging an item, intent application, AI proposal, dimension change,
   * material swap. Updates `visions[]` in place so StyleRoute and ExportRoute
   * always read the latest room_state + cost without their own sync logic.
   */
  patchActiveVision: (patch: { room_state?: RoomState; cost?: CostBreakdown }) => void;

  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  stage: "home",
  intake: null,
  visions: [],
  selectedVisionId: null,
  visionsLoaded: false,
  pendingReturn: null,

  selectedItemId: null,
  editMode: "browse",
  layoutEditMode: false,

  setStage: (stage) => set({ stage }),
  setIntake: (intake) => set({ intake }),
  setVisions: (visions) => set({ visions, selectedVisionId: visions[0]?.id ?? null, visionsLoaded: true }),
  selectVision: (selectedVisionId) => set({ selectedVisionId }),
  setPendingReturn: (pendingReturn) => set({ pendingReturn }),

  setSelectedItem: (selectedItemId) =>
    // Deselecting always drops you back to browse mode (no orphaned move mode).
    set((s) => ({ selectedItemId, editMode: selectedItemId ? s.editMode : "browse" })),
  setEditMode: (editMode) => set({ editMode }),
  setLayoutEditMode: (on) =>
    set((s) => ({
      layoutEditMode: on,
      // Exiting layout edit also clears any selection and resets move mode.
      selectedItemId: on ? s.selectedItemId : null,
      editMode: on ? s.editMode : "browse",
    })),

  patchActiveVision: (patch) =>
    set((s) => {
      if (!s.selectedVisionId) return {};
      const next = s.visions.map((v) =>
        v.id === s.selectedVisionId
          ? {
              ...v,
              room_state: patch.room_state ?? v.room_state,
              cost: patch.cost ?? v.cost,
            }
          : v,
      );
      return { visions: next };
    }),

  reset: () =>
    set({
      stage: "home",
      intake: null,
      visions: [],
      selectedVisionId: null,
      visionsLoaded: false,
      pendingReturn: null,
      selectedItemId: null,
      editMode: "browse",
      layoutEditMode: false,
    }),
}));
