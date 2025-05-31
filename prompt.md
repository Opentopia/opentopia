# opentopia

Create a game called opentopia, closely based on Polytopia, although much simpler and web base.

Stack:

- React
- React Router
- React Three Fiber
- Cloudflare DO

## Client/Server Interaction

Clients will connect to a "Game" Durable Object, which will have the authorative state. The game is turn based. Any client can send a `mutation` at any point to the server, and the server will process it. The same `mutate()` function will be used both for the client and the server. It gets the playerId, the currentState, and the mutation, and computes the new state. Clients run mutations optimistically and send them to the server for it to be ran and broadcasted to other clients. Other clients receive mutations, replay them, in order to get the new state. The server also sends a hash of the next state so clients can verify the integrity of the state they have. If they get out of sync, clients destroy their local state and request a fresh copy.

## Mechanics

In `mechanics.ts`, we'll define types that will be core to the game:

```ts
export type TileKey = `${number}:${number}`;

export interface Unit {
  id: string;
  type: "warrior" | "archer";
  atk: number;
  def: number;
  rng: number;
  mov: number;
  hp: number;
  ownerId: string;
}

export interface Building {
  type: "village";
  ownerId?: string;
  raidedBy?: string;
}

export interface Tile {
  x: number;
  y: number;
  kind: "rock" | "grass" | "village";
  building?: Building;
  unit?: Unit;
}

export interface Player {
  id: string;
  view: TileKey[];
  stars: number;
}

export interface State {
  map: Record<TileKey, Tile>;
  players: Player[];
  turn: { playerId: string; until: number };
  rev: number;
}

export type Mutation = { type: "move"; unitId: string; to: TileKey };

export interface ClientMutation {
  playerId: string;
  baseRev: number;
  mutation: Mutation;
}
```
