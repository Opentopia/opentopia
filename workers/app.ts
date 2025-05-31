import { api } from "./api";
export { DB } from "./db";
export { Game } from "./game";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Expose-Headers": "Upgrade",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors, status: 204 });
    }

    if (url.pathname.startsWith("/api")) {
      return api.fetch(request, env, ctx);
    }

    if (url.pathname === "/.well-known/appspecific/com.chrome.devtools.json") {
      return new Response(null, { status: 204, headers: cors });
    }

    return new Response(null, { status: 404, headers: cors });
  },
} satisfies ExportedHandler<Env>;
