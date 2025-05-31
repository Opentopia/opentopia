export const SITE_URL = "https://opentopia.game";

export const APP_NAME = "Opentopia";

export const ROUTES = {
  HOME: "/",
  GAME: (id: string) => `/games/${id}`,
} as const;

export const API_ORIGIN = "http://localhost:8787";
