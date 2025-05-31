import type { TileKey } from "./mechanics";

export const parseTileKey = (tk: TileKey) => {
  return tk.split(",").map(Number);
};
