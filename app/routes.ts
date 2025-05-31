import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("games/:id", "routes/games.$id.tsx"),
] satisfies RouteConfig;
