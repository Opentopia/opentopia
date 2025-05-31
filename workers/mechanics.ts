import { parseTileKey } from "./utils";

type UnitType = "warrior" | "archer";

const UNIT_COST: Record<UnitType, number> = {
  warrior: 2,
  archer: 3,
};

const UNIT_BASE_MOVEMENT: Record<UnitType, number> = {
  warrior: 1,
  archer: 1,
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
  ownedBy: string | null;
  raidedBy: string | null;
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
  name: string;
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
    }
  | {
      type: "conquer";
      tileKey: TileKey;
    }
  | {
      type: "end-turn";
    }
  | {
      type: "join-game";
      player: Player;
    }
  | {
      type: "resign";
    };

export type MutateProps = {
  playerId: string;
  timestamp: number;
  currentState: State;
  mutation: Mutation;
};

export function mutate({
  playerId,
  timestamp,
  currentState,
  mutation,
}: MutateProps): { nextState: State } {
  let nextState = structuredClone(currentState);

  switch (mutation.type) {
    case "move": {
      if (!isPlayerTurn({ playerId, timestamp, state: currentState })) {
        throw new Error("Not your turn");
      }

      const result = validateMove({ playerId, mutation, state: nextState });
      if (!result.success) {
        throw new Error(result.reason);
      }
      const unit = nextState.units.find(u => u.id === mutation.unitId)!;
      const destTile = nextState.map[mutation.to];
      if (
        destTile.building &&
        destTile.building.type === "village" &&
        destTile.building.ownedBy !== playerId
      ) {
        destTile.building.raidedBy = playerId;
      }
      unit.tileKey = mutation.to;
      unit.movement = 0;
      break;
    }
    case "attack": {
      if (!isPlayerTurn({ playerId, timestamp, state: currentState })) {
        throw new Error("Not your turn");
      }

      const result = validateAttack({ playerId, mutation, state: nextState });
      if (!result.success) {
        throw new Error(result.reason);
      }
      const attacker = nextState.units.find(u => u.id === mutation.unitId)!;
      const defender = nextState.units.find(
        u => u.id === mutation.targetUnitId,
      )!;
      const attackerMaxHp = 10;
      const defenderMaxHp = 10;
      const attackForce = attacker.attack * (attacker.health / attackerMaxHp);
      const defenseForce = defender.defense * (defender.health / defenderMaxHp);
      const totalDamage = attackForce + defenseForce;
      const attackResult = Math.round(
        (attackForce / totalDamage) * attacker.attack * 4.5,
      );
      const damageToDefender = Math.max(1, attackResult);
      defender.health -= damageToDefender;
      if (defender.health > 0) {
        const newDefenseForce =
          defender.defense * (defender.health / defenderMaxHp);
        const newTotalDamage = attackForce + newDefenseForce;
        const defenseResult = Math.round(
          (newDefenseForce / newTotalDamage) * defender.defense * 4.5,
        );
        const damageToAttacker = Math.max(1, defenseResult);
        attacker.health -= damageToAttacker;
      }
      nextState.units = nextState.units.filter(u => u.health > 0);
      if (defender.health <= 0 && attacker.range === 1) {
        attacker.tileKey = defender.tileKey;
      }
      break;
    }
    case "spawn": {
      if (!isPlayerTurn({ playerId, timestamp, state: currentState })) {
        throw new Error("Not your turn");
      }

      const result = validateSpawn({ playerId, mutation, state: nextState });
      if (!result.success) {
        throw new Error(result.reason);
      }
      const player = nextState.players.find(p => p.id === playerId)!;
      const cost = UNIT_COST[mutation.unitType];
      player.stars -= cost;
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
    case "conquer": {
      if (!isPlayerTurn({ playerId, timestamp, state: currentState })) {
        throw new Error("Not your turn");
      }

      const result = validateConquer({ playerId, mutation, state: nextState });
      if (!result.success) {
        throw new Error(result.reason);
      }
      const unit = nextState.units.find(
        u => u.tileKey === mutation.tileKey && u.ownedBy === playerId,
      )!;
      const tile = nextState.map[mutation.tileKey];
      tile.building!.ownedBy = playerId;
      unit.movement = 0;
      break;
    }
    case "end-turn": {
      if (!isPlayerTurn({ playerId, timestamp, state: currentState })) {
        throw new Error("Not your turn");
      }

      const currentPlayerIdx = nextState.players.findIndex(
        p => p.id === playerId,
      );
      const nextPlayerIdx = (currentPlayerIdx + 1) % nextState.players.length;
      const nextPlayer = nextState.players[nextPlayerIdx];

      // 1. Add 2 stars per village owned by nextPlayer
      let starsToAdd = 0;
      for (const tile of Object.values(nextState.map)) {
        if (
          tile.building &&
          tile.building.type === "village" &&
          tile.building.ownedBy === nextPlayer.id
        ) {
          starsToAdd += 2;
        }
      }
      nextPlayer.stars += starsToAdd;

      // 2. Assign non-owned villages occupied by nextPlayer's units
      for (const tile of Object.values(nextState.map)) {
        if (
          tile.building &&
          tile.building.type === "village" &&
          tile.building.ownedBy !== nextPlayer.id
        ) {
          const unitOnTile = nextState.units.find(
            u =>
              u.tileKey === `${tile.x},${tile.y}` &&
              u.ownedBy === nextPlayer.id,
          );
          if (unitOnTile) {
            tile.building.ownedBy = nextPlayer.id;
          }
        }
      }

      nextState.turn = {
        playerId: nextPlayer.id,
        until: Date.now() + 30_000,
      };
      break;
    }
    case "join-game": {
      nextState.players.push(mutation.player);
      if (nextState.players.length === 1) {
        // is first player. give it the first turn
        nextState.turn = {
          playerId: mutation.player.id,
          until: Date.now() + 30_000,
        };
      }

      break;
    }
    case "resign": {
      if (!isPlayerTurn({ playerId, timestamp, state: currentState })) {
        throw new Error("Not your turn");
      }
      nextState = mutate({
        playerId,
        timestamp,
        currentState: nextState,
        mutation: { type: "end-turn" },
      }).nextState;

      // Remove player from players array
      nextState.players = nextState.players.filter((p) => p.id !== playerId);

      // Set all their villages to neutral
      for (const tile of Object.values(nextState.map)) {
        if (
          tile.building &&
          tile.building.type === "village" &&
          tile.building.ownedBy === playerId
        ) {
          tile.building.ownedBy = null;
        }
      }

      // Remove all their units
      nextState.units = nextState.units.filter((u) => u.ownedBy !== playerId);

      // If only one player left, finish the game
      if (nextState.players.length <= 1) {
        nextState.status = "finished";
        nextState.turn = null;
      }

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
  return state.turn?.playerId === playerId && state.turn.until >= timestamp;
}

function validateMove({
  playerId,
  mutation,
  state,
}: {
  playerId: string;
  mutation: Extract<Mutation, { type: "move" }>;
  state: State;
}): { success: true } | { success: false; reason: string } {
  const unit = state.units.find(u => u.id === mutation.unitId);
  if (!unit) return { success: false, reason: "Unit not found" };
  if (unit.ownedBy !== playerId)
    return { success: false, reason: "You do not own this unit" };
  const [fromX, fromY] = parseTileKey(unit.tileKey);
  const [toX, toY] = mutation.to.split(",").map(Number);
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  if (Math.max(dx, dy) > unit.movement)
    return { success: false, reason: "Destination out of range" };
  const destTile = state.map[mutation.to];
  if (!destTile)
    return { success: false, reason: "Destination tile does not exist" };
  const occupied = state.units.some(u => u.tileKey === mutation.to);
  if (occupied)
    return { success: false, reason: "Destination tile is occupied" };
  return { success: true };
}

function validateAttack({
  playerId,
  mutation,
  state,
}: {
  playerId: string;
  mutation: Extract<Mutation, { type: "attack" }>;
  state: State;
}): { success: true } | { success: false; reason: string } {
  const attacker = state.units.find(u => u.id === mutation.unitId);
  const defender = state.units.find(u => u.id === mutation.targetUnitId);
  if (!attacker) return { success: false, reason: "Attacker unit not found" };
  if (!defender) return { success: false, reason: "Defender unit not found" };
  if (attacker.ownedBy !== playerId)
    return { success: false, reason: "You do not own the attacking unit" };
  if (defender.ownedBy === playerId)
    return { success: false, reason: "Cannot attack your own unit" };
  const [ax, ay] = parseTileKey(attacker.tileKey);
  const [dx, dy] = parseTileKey(defender.tileKey);
  const chebyshev = Math.max(Math.abs(ax - dx), Math.abs(ay - dy));
  if (chebyshev > attacker.range || chebyshev === 0)
    return { success: false, reason: "Target out of range" };
  return { success: true };
}

function validateSpawn({
  playerId,
  mutation,
  state,
}: {
  playerId: string;
  mutation: Extract<Mutation, { type: "spawn" }>;
  state: State;
}): { success: true } | { success: false; reason: string } {
  const tile = state.map[mutation.tileKey];
  if (!tile) return { success: false, reason: "Tile does not exist" };
  if (
    !tile.building ||
    tile.building.type !== "village" ||
    tile.building.ownedBy !== playerId
  )
    return { success: false, reason: "Can only spawn in your own village" };
  const occupied = state.units.some(u => u.tileKey === mutation.tileKey);
  if (occupied) return { success: false, reason: "Tile is occupied" };
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { success: false, reason: "Player not found" };
  const cost = UNIT_COST[mutation.unitType];
  if (player.stars < cost)
    return { success: false, reason: "Not enough stars" };
  return { success: true };
}

function validateConquer({
  playerId,
  mutation,
  state,
}: {
  playerId: string;
  mutation: Extract<Mutation, { type: "conquer" }>;
  state: State;
}): { success: true } | { success: false; reason: string } {
  const tile = state.map[mutation.tileKey];
  if (!tile || !tile.building || tile.building.type !== "village") {
    return { success: false, reason: "No village on this tile" };
  }
  if (tile.building.ownedBy === playerId) {
    return { success: false, reason: "Village already owned by you" };
  }
  const unit = state.units.find(
    u =>
      u.tileKey === mutation.tileKey &&
      u.ownedBy === playerId &&
      u.movement > 0,
  );
  if (!unit) {
    return {
      success: false,
      reason: "No friendly unit with movement on this tile",
    };
  }
  return { success: true };
}
