import type { Mutation, State, TileKey } from "workers/mechanics";
import { create } from "zustand";

export const useGlobalStore = create<{
  hoveredBlock: TileKey | null;
  hoverBlock: (block: TileKey | null) => void;
  gameState: State | null;
  mapView: State["map"] | null;
  onMutate: (mutation: Mutation) => void;
  playerId: string | null;
  selectedUnit: string | null;
  selectUnit: (unitId: string | null) => void;
  isLoading: boolean;
}>(set => ({
  hoveredBlock: null,
  hoverBlock: (block: TileKey | null) => set({ hoveredBlock: block }),
  gameState: null,
  mapView: null,
  onMutate: () => { },
  playerId: null,
  selectedUnit: null,
  selectUnit: (unitId: string | null) => set({ selectedUnit: unitId }),
  isLoading: true,
}));
