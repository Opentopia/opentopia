import { Hono } from "hono";
import { env } from "cloudflare:workers";

export const api = new Hono();

// join game
api.get("/api/games/:id", async (c) => {
  const stub = env.GAME.get(env.GAME.idFromName(c.req.param("id")));

  const url = new URL(c.req.raw.url);
  url.pathname = "/join";

  return await stub.fetch(url, c.req.raw);
});

// game ws
api.get("/api/games/:id/ws", async (c) => {
  const stub = env.GAME.get(env.GAME.idFromName(c.req.param("id")));

  const url = new URL(c.req.raw.url);
  url.pathname = "/ws";

  return await stub.fetch(url, c.req.raw);
});
