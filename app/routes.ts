import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("games/:id", "routes/games.$id.tsx"),
  route("games/:id/websocket", "routes/games.$id.websocket.ts"),
] satisfies RouteConfig;
