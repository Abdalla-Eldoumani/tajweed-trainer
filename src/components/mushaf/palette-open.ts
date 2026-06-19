"use client";

import { create } from "zustand";

// Coordinates the one-trapped-surface rule between the quick-jump palette and
// the playback bottom sheet. Both are sibling client components that can be open
// at once on a touch width; if both ran their Tab focus traps, focus would
// fight. The palette sets this boolean while it is open so the sheet's trapTab
// yields, leaving exactly one trapped surface. A shared store (not localStorage)
// because this is transient in-session UI state, never persisted.
interface PaletteOpenState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const usePaletteOpen = create<PaletteOpenState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
