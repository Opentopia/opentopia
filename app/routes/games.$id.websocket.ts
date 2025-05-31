import type { Route } from "./+types/games.$id.websocket";

export async function loader({ context, params }: Route.LoaderArgs) {
  const { cloudflare } = context;
  const { id: gameId } = params;

  const gameNamespace = cloudflare.env.GAME;
  const gameObject = gameNamespace.get(gameNamespace.idFromName(gameId));

  return gameObject.fetch("/websocket");
}
