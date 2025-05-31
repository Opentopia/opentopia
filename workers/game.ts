import { DurableObject } from "cloudflare:workers";
import { sealData, unsealData } from "iron-session";
import { mutate, type Player, type State, type MutateProps } from "./mechanics";
import type {
  JoinResponse,
  WSMessageSend,
  WSMessageReceive,
} from "./shared-types";

const sessionOptions: { password: string; ttl?: number } = {
  password:
    "dudeaois oiajoidfjaoidjf oaisjd foadsjfo iasjdfo asjdoifjaosdifjaosijdofjoidjoaijfois",
};

export class Game extends DurableObject {
  private state: State;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = this.createGameState();
  }

  private createGameState(): State {
    return {
      status: "lobby",
      map: {},
      players: [],
      units: [],
      turn: null,
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
        const auth = request.headers.get("authorization");
        const existingSession = auth?.split(" ")[1];
        const { playerId: existingPlayerId } =
          await this.authenticate(existingSession);

        // if an existing player is reconnecting
        if (existingPlayerId && existingSession) {
          const isInGame = this.state.players.find(
            (p) => p.id === existingPlayerId
          );
          if (isInGame) {
            return Response.json({
              success: true,
              session: existingSession,
              state: this.state,
              playerId: existingPlayerId,
            } satisfies JoinResponse);
          } else if (this.state.status === "lobby") {
            const { session, player } = await this.createPlayer();
            return Response.json({
              success: true,
              session,
              state: this.state,
              playerId: player.id,
            } satisfies JoinResponse);
          } else {
            return Response.json({
              success: false,
              error:
                this.state.status === "finished"
                  ? "game ended"
                  : "game started",
            } satisfies JoinResponse);
          }
        }

        // else it's a new player

        if (this.state.status !== "lobby") {
          return Response.json({
            success: false,
            error:
              this.state.status === "finished" ? "game ended" : "game started",
          } satisfies JoinResponse);
        }

        const { session, player } = await this.createPlayer();

        return Response.json({
          session,
          success: true,
          state: this.state,
          playerId: player.id,
        } satisfies JoinResponse);
      }
    }

    return new Response("Hello, world!");
  }

  private async createPlayer(): Promise<{ player: Player; session: string }> {
    const player: Player = {
      id: crypto.randomUUID(),
      view: [],
      stars: 0,
    };

    const session = await sealData({ playerId: player.id }, sessionOptions);

    const opts: MutateProps = {
      playerId: player.id,
      timestamp: Date.now(),
      currentState: this.state,
      mutation: { type: "join-game", player },
    };
    const { nextState } = mutate(opts);
    this.state = nextState;
    this.broadcast({ type: "mutation", data: opts });

    return { player, session };
  }

  private async authenticate(
    session: string | undefined | null
  ): Promise<{ playerId: string | null }> {
    if (!session) return { playerId: null };
    try {
      const { playerId } = await unsealData<{ playerId: string }>(
        session,
        sessionOptions
      );
      return { playerId };
    } catch (err) {
      return { playerId: null };
    }
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    const parsed = JSON.parse(message as string) as WSMessageSend;

    const { playerId } = await this.authenticate(parsed.session);

    if (!playerId) {
      ws.close(1008, "Invalid session");
      return;
    }

    switch (parsed.type) {
      case "mutation": {
        const opts: MutateProps = {
          playerId,
          timestamp: Date.now(),
          currentState: this.state,
          mutation: parsed.mutation,
        };
        const { nextState } = mutate(opts);
        this.state = nextState;
        this.broadcast({ type: "mutation", data: opts }, ws);
        break;
      }
      default:
        throw new Error(`Unknown message type ${parsed.type}`);
    }
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

  async broadcast(message: WSMessageReceive, except?: WebSocket) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      ws.send(JSON.stringify(message));
    }
  }
}
