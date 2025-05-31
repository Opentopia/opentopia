import type { TileKey } from 'workers/mechanics';
import { create } from 'zustand'

export const useGlobalStore = create<{
  hoveredBlock: TileKey | null;
  hoverBlock: (block: TileKey | null) => void;
}>((set) => ({
  hoveredBlock: null,
  hoverBlock: (block: TileKey | null) => set({ hoveredBlock: block }),
}))