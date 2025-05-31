import { DurableObject } from "cloudflare:workers";
import { mutate } from "./mechanics";

export class Game extends DurableObject {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.ctx.storage.setAlarm(Date.now() + 5_000);
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
    }

    return new Response("Hello, world!");
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    // Upon receiving a message from the client, the server replies with the same message,
    // and the total number of connections with the "[Durable Object]: " prefix
    ws.send(
      `[Durable Object] message: ${message}, connections: ${this.ctx.getWebSockets().length}`
    );
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

  alarm(alarmInfo?: AlarmInvocationInfo): void | Promise<void> {
    this.ctx.storage.setAlarm(Date.now() + 5_000);
    console.log("alarm!");
    this.broadcast("hello world");
  }

  async broadcast(message: string) {
    for (const ws of this.ctx.getWebSockets()) {
      ws.send(message);
    }
  }
}
