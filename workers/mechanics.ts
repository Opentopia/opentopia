/* -------------------------------------------------------------------------------------------------
 * Entities
 * -----------------------------------------------------------------------------------------------*/

type TileKey = `${number}:${number}`;

export type State = {
  status: "lobby" | "started" | "finished";
  map: Record<TileKey, Tile>;
  turn: {
    playerId: string;
    until: number;
  };
  players: Player[];
  units: Unit[];
};

export type Tile = {
  x: number;
  y: number;
  kind: "rock" | "grass";
  building?: Building;
};

export type Building = {
  type: "village";
  ownedBy: string;
  raidedBy?: string;
};

export type Unit = {
  id: string;
  tileKey: TileKey;
  type: "warrior" | "archer";
  attack: number;
  defense: number;
  range: number;
  movement: number;
  health: number;
  ownedBy: string;
};

export type Player = {
  id: string;
  view: TileKey[];
  stars: number;
};

/* -------------------------------------------------------------------------------------------------
 * Mutations
 * -----------------------------------------------------------------------------------------------*/

export type Mutation =
  | {
      type: "move";
      warriorId: string;
      to: TileKey;
    }
  | {
      type: "attack";
      warriorId: string;
      targetWarriorId: string;
    };

export function mutate({
  playerId,
  timestamp,
  currentState,
  mutation,
}: {
  playerId: string;
  timestamp: number;
  currentState: State;
  mutation: Mutation;
}): { nextState: State } {
  if (!isPlayerTurn({ playerId, timestamp, state: currentState })) {
    throw new Error("Not your turn");
  }

  const nextState = structuredClone(currentState);

  switch (mutation.type) {
    case "move":
      break;

    case "attack":
      break;

    default:
      break;
  }

  return { nextState };
}

/* -------------------------------------------------------------------------------------------------
 * Permissions
 * -----------------------------------------------------------------------------------------------*/

export function isPlayerTurn({
  playerId,
  timestamp,
  state,
}: {
  playerId: string;
  timestamp: number;
  state: State;
}) {
  return state.turn.playerId === playerId && state.turn.until >= timestamp;
}
