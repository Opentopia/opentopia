import { parseTileKey } from "./utils";

type UnitType = "warrior" | "archer";

const UNIT_COST: Record<UnitType, number> = {
  warrior: 2,
  archer: 3,
};

/* -------------------------------------------------------------------------------------------------
 * Entities
 * -----------------------------------------------------------------------------------------------*/

export type TileKey = `${number},${number}`;

export type State = {
  status: "lobby" | "started" | "finished";
  map: Record<TileKey, Tile>;
  turn: null | {
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
  type: UnitType;
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
      unitId: string;
      to: TileKey;
    }
  | {
      type: "attack";
      unitId: string;
      targetUnitId: string;
    }
  | {
      type: "spawn";
      unitType: "warrior" | "archer";
      tileKey: TileKey;
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
    case "move": {
      // Find the unit to move
      const unit = nextState.units.find((u) => u.id === mutation.unitId);
      if (!unit) throw new Error("Unit not found");
      if (unit.ownedBy !== playerId)
        throw new Error("You do not own this unit");

      // Parse coordinates
      const [fromX, fromY] = parseTileKey(unit.tileKey);
      const [toX, toY] = mutation.to.split(",").map(Number);

      // Check movement range (Chebyshev distance)
      const dx = Math.abs(toX - fromX);
      const dy = Math.abs(toY - fromY);
      if (Math.max(dx, dy) > unit.movement)
        throw new Error("Destination out of range");

      // Ensure destination tile exists
      const destTile = nextState.map[mutation.to];
      if (!destTile) throw new Error("Destination tile does not exist");

      // Ensure destination is empty (no unit occupies it)
      const occupied = nextState.units.some((u) => u.tileKey === mutation.to);
      if (occupied) throw new Error("Destination tile is occupied");

      // If destination has a village (neutral or enemy), mark as raided
      if (
        destTile.building &&
        destTile.building.type === "village" &&
        destTile.building.ownedBy !== playerId
      ) {
        destTile.building.raidedBy = playerId;
      }

      // Move the unit
      unit.tileKey = mutation.to;
      break;
    }
    case "attack":
      break;
    case "spawn": {
      // Ensure the tile exists
      const tile = nextState.map[mutation.tileKey];
      if (!tile) throw new Error("Tile does not exist");

      // Ensure the tile has a village owned by the player
      if (
        !tile.building ||
        tile.building.type !== "village" ||
        tile.building.ownedBy !== playerId
      ) {
        throw new Error("Can only spawn in your own village");
      }

      // Ensure the tile is empty (no unit occupies it)
      const occupied = nextState.units.some(
        (u) => u.tileKey === mutation.tileKey
      );
      if (occupied) throw new Error("Tile is occupied");

      // Get the player
      const player = nextState.players.find((p) => p.id === playerId);
      if (!player) throw new Error("Player not found");

      // Check if player can pay for the unit
      const cost = UNIT_COST[mutation.unitType];
      if (player.stars < cost) throw new Error("Not enough stars");

      // Deduct the cost
      player.stars -= cost;

      // Add the new unit
      nextState.units.push({
        id: crypto.randomUUID(),
        tileKey: mutation.tileKey,
        type: mutation.unitType,
        attack: mutation.unitType === "warrior" ? 2 : 1,
        defense: 2,
        range: mutation.unitType === "warrior" ? 1 : 2,
        movement: 1,
        health: 10,
        ownedBy: playerId,
      });
      break;
    }
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
