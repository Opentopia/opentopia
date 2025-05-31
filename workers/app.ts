import { createRequestHandler } from "react-router";
import { api } from "./api";
export { Game } from "./game";

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

export default {
  async fetch(request, env, ctx) {
    console.log("fetch", request.url);
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      return api.fetch(request, env, ctx);
    }

    // if (url.pathname === "/.well-known/appspecific/com.chrome.devtools.json") {
    //   return;
    // }

    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
