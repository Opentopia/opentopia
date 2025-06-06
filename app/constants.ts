export const SITE_URL = "https://opentopia.org";
export const APP_NAME = "Opentopia";

export let IS_DEV = false;
try {
  // @ts-ignore
  if (process.env.NODE_ENV === "development") {
    IS_DEV = true;
  }
} catch (e) {
  // process not accessible, we're probably in cloudflare
  IS_DEV = false;
}

export const ROUTES = {
  HOME: "/",
  GAME: (id: string) => `/games/${id}`,
} as const;

export const API_ORIGIN = IS_DEV
  ? "http://localhost:8787"
  : "https://opentopia.org";
