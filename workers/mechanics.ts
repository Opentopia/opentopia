/* -------------------------------------------------------------------------------------------------
 * Entities
 * -----------------------------------------------------------------------------------------------*/

type TileKey = `${number}:${number}`;

export type State = {
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
      tp: [number, number];
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
      // Find the unit to move
      const unit = nextState.units.find(
        (u) => u.id === mutation.warriorId && u.ownedBy === playerId
      );

      if (!unit) {
        throw new Error("Unit not found or not owned by player");
      }

      // Check if destination is valid
      const [toX, toY] = mutation.tp;
      const toTileKey: TileKey = `${toX}:${toY}`;
      const toTile = nextState.map[toTileKey];

      if (!toTile) {
        throw new Error("Invalid destination");
      }

      if (toTile.kind === "rock") {
        throw new Error("Cannot move to rock tile");
      }

      // Check if destination tile is occupied by another unit
      const occupyingUnit = nextState.units.find(
        (u) => u.tileKey === toTileKey
      );
      if (occupyingUnit) {
        throw new Error("Destination tile occupied");
      }

      // Check movement range
      const [fromX, fromY] = unit.tileKey.split(":").map(Number);
      const distance = Math.abs(fromX - toX) + Math.abs(fromY - toY);
      if (distance > unit.movement) {
        throw new Error("Move distance exceeds unit movement range");
      }

      // Move the unit
      unit.tileKey = toTileKey;

      // Advance turn after successful move
      advanceTurn(nextState);
      break;

    case "attack":
      // Find the attacking unit
      const attacker = nextState.units.find(
        (u) => u.id === mutation.warriorId && u.ownedBy === playerId
      );

      if (!attacker) {
        throw new Error("Attacking unit not found or not owned by player");
      }

      // Find the target unit
      const target = nextState.units.find(
        (u) => u.id === mutation.targetWarriorId
      );

      if (!target) {
        throw new Error("Target unit not found");
      }

      // Check if target is in range
      const [attackerX, attackerY] = attacker.tileKey.split(":").map(Number);
      const [targetX, targetY] = target.tileKey.split(":").map(Number);
      const attackDistance =
        Math.abs(attackerX - targetX) + Math.abs(attackerY - targetY);

      if (attackDistance > attacker.range) {
        throw new Error("Target out of range");
      }

      // Calculate damage
      const damage = Math.max(1, attacker.attack - target.defense);
      target.health -= damage;

      // Remove unit if health <= 0
      if (target.health <= 0) {
        const targetIndex = nextState.units.findIndex(
          (u) => u.id === target.id
        );
        if (targetIndex !== -1) {
          nextState.units.splice(targetIndex, 1);
        }
      }

      // Advance turn after successful attack
      advanceTurn(nextState);
      break;

    default:
      break;
  }

  return { nextState };
}

function advanceTurn(state: State) {
  const currentPlayerIndex = state.players.findIndex(
    (p) => p.id === state.turn.playerId
  );
  const nextPlayerIndex = (currentPlayerIndex + 1) % state.players.length;

  if (nextPlayerIndex < state.players.length) {
    state.turn.playerId = state.players[nextPlayerIndex].id;
    state.turn.until = Date.now() + 30000; // 30 seconds per turn
  }
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
