import type { State, TileKey } from "workers/mechanics";
import { create } from "zustand";

export const useGlobalStore = create<{
  hoveredBlock: TileKey | null;
  hoverBlock: (block: TileKey | null) => void;
  gameState: State | null;
}>(set => ({
  hoveredBlock: null,
  hoverBlock: (block: TileKey | null) => set({ hoveredBlock: block }),
  gameState: null,
}));
