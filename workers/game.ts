import { DurableObject } from "cloudflare:workers";
import { mutate, type State } from "./mechanics";
import type { JoinResponse, WSMessage } from "./shared-types";

export class Game extends DurableObject {
  private state: State;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = this.createGameState();
  }

  private createGameState(): State {
    return {
      map: {},
      players: [],
      units: [],
      turn: { playerId: "", until: Date.now() + 30_000 },
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/ws": {
        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);

        // Calling `acceptWebSocket()` informs the runtime that this WebSocket is to begin terminating
        // request within the Durable Object. It has the effect of "accepting" the connection,
        // and allowing the WebSocket to send and receive messages.
        // Unlike `ws.accept()`, `state.acceptWebSocket(ws)` informs the Workers Runtime that the WebSocket
        // is "hibernatable", so the runtime does not need to pin this Durable Object to memory while
        // the connection is open. During periods of inactivity, the Durable Object can be evicted
        // from memory, but the WebSocket connection will remain open. If at some later point the
        // WebSocket receives a message, the runtime will recreate the Durable Object
        // (run the `constructor`) and deliver the message to the appropriate handler.
        this.ctx.acceptWebSocket(server);

        return new Response(null, {
          status: 101,
          webSocket: client,
        });
      }
      case "/join": {
        const existingPlayerId = url.searchParams.get("playerId");
        if (existingPlayerId) {
          const isInGame = this.state.players.some(
            (p) => p.id === existingPlayerId
          );
          if (isInGame) {
            return Response.json({
              playerId: existingPlayerId,
              state: this.state,
            } satisfies JoinResponse);
          } else if (this.state.status === "lobby") {
            this.state.players.push({
              id: existingPlayerId,
              view: [],
              stars: 0,
            });
            return Response.json({
              playerId: existingPlayerId,
              state: this.state,
            } satisfies JoinResponse);
          } else {
            // not found
            return Response.json(
              { error: "Player not found" },
              { status: 404 }
            );
          }
        }

        if (this.state.status === "lobby") {
        }

        return Response.json({
          playerId: "1",
          state: this.state,
        } satisfies JoinResponse);
      }
    }

    return new Response("Hello, world!");
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    const parsed = JSON.parse(message as string) as WSMessage;

    switch (parsed.type) {
      case "mutation": {
        const { nextState } = mutate({
          playerId: parsed.playerId,
          timestamp: Date.now(),
          currentState: this.state,
          mutation: parsed.mutation,
        });
        this.state = nextState;
        break;
      }
      default:
        throw new Error(`Unknown message type ${parsed.type}`);
    }

    this.broadcast(message as string, ws);
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ) {
    // If the client closes the connection, the runtime will invoke the webSocketClose() handler.
    ws.close(code, "Durable Object is closing WebSocket");
  }

  async broadcast(message: string, except?: WebSocket) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      ws.send(message);
    }
  }
}
