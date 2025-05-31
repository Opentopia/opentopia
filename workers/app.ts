import { createRequestHandler } from "react-router";
export { Game } from "./game";
import { Hono } from "hono";
import { env } from "cloudflare:workers";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

const api = new Hono();

api.get("/api/games/:id", async (c) => {
  const stub = env.GAME.get(env.GAME.idFromName(c.req.param("id")));

  const url = new URL(c.req.raw.url);
  url.pathname = "/ws";

  return await stub.fetch(url, c.req.raw);
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      return api.fetch(request, env, ctx);
    }

    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
