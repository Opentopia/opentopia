import { parseTileKey } from "./utils";
import { generateMap } from "./generate-map";

type UnitType = "warrior" | "archer";

const UNIT_COST: Record<UnitType, number> = {
  warrior: 2,
  archer: 3,
};

const UNIT_BASE_MOVEMENT: Record<UnitType, number> = {
  warrior: 1,
  archer: 1,
};

const TURN_DURATION = 60_000; // 1 minute

const PLAYER_COLORS = [
  ["oklch(57.7% 0.245 27.325)", "oklch(44.4% 0.177 26.899)"], // red
  ["oklch(79.5% 0.184 86.047)", "oklch(47.6% 0.114 61.907)"], // yellow
  ["oklch(72.3% 0.219 149.579)", "oklch(44.8% 0.119 151.328)"], // green
  ["oklch(62.3% 0.214 259.815)", "oklch(42.4% 0.199 265.638)"], // blue
] as const;

/* -------------------------------------------------------------------------------------------------
 * Entities
 * -----------------------------------------------------------------------------------------------*/

export type TileKey = `${number},${number}`;

export type State = {
  id: string;
  status: "lobby" | "started" | "finished";
  map: Record<TileKey, Tile>;
  units: Unit[];
  turn: null | {
    playerId: string;
    until: number;
  };
  players: Player[];
};

export type Tile = {
  x: number;
  y: number;
  kind: "rock" | "grass" | "fog";
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
  isHost?: boolean;
  name: string;
  view: TileKey[];
  stars: number;
  colors: readonly [string, string];
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
      type: "start-game";
      map: Record<TileKey, Tile>;
      units: Unit[];
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

      // 3. Reset movement for all units owned by nextPlayer
      for (const unit of nextState.units) {
        if (unit.ownedBy === nextPlayer.id) {
          unit.movement = UNIT_BASE_MOVEMENT[unit.type];
        }
      }

      nextState.turn = {
        playerId: nextPlayer.id,
        until: Date.now() + TURN_DURATION,
      };
      break;
    }
    case "join-game": {
      nextState.players.push({
        ...mutation.player,
        isHost: nextState.players.length === 0,
        colors: PLAYER_COLORS[nextState.players.length % PLAYER_COLORS.length],
      });

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
      nextState.players = nextState.players.filter(p => p.id !== playerId);

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
      nextState.units = nextState.units.filter(u => u.ownedBy !== playerId);

      // If only one player left, finish the game
      if (nextState.players.length <= 1) {
        nextState.status = "finished";
        nextState.turn = null;
      }
      break;
    }
    case "start-game": {
      // ensure player is host
      const player = nextState.players.find(p => p.id === playerId);
      if (!player) {
        throw new Error("Player not found");
      }
      if (!player.isHost) {
        throw new Error("You are not the host");
      }
      nextState.status = "started";
      nextState.map = mutation.map;
      nextState.units = mutation.units;

      nextState.turn = {
        playerId: player.id,
        until: Date.now() + TURN_DURATION,
      };
      break;
    }
    default:
      break;
  }

  // Update all players' views
  for (const player of nextState.players) {
    player.view = getView(player.id, nextState);
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
  if (destTile.kind === "rock")
    return { success: false, reason: "Cannot move onto rock tile" };
  const occupied = state.units.some(u => u.tileKey === mutation.to);
  if (occupied) {
    return { success: false, reason: "Destination tile is occupied" };
  }
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

// Returns the set of visible tile keys for a player, based on their units and villages (with special rules for single-village range=2)
export function getView(playerId: string, state: State): TileKey[] {
  const seen = new Set<TileKey>();
  const map = state.map;
  // 1. Units: each unit sees its tile and all adjacent (8) tiles
  const units = state.units.filter(u => u.ownedBy === playerId);
  for (const unit of units) {
    const [ux, uy] = parseTileKey(unit.tileKey);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = ux + dx;
        const y = uy + dy;
        const key = `${x},${y}` as TileKey;
        if (map[key]) seen.add(key);
      }
    }
  }
  // 2. Villages: each village sees adjacent (8) tiles, unless only one, then range=2
  const villages = Object.values(map).filter(
    t =>
      t.building &&
      t.building.type === "village" &&
      t.building.ownedBy === playerId,
  );
  if (villages.length === 1) {
    // Single village: range=2 in all directions
    const v = villages[0];
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const x = v.x + dx;
        const y = v.y + dy;
        const key = `${x},${y}` as TileKey;
        if (map[key]) seen.add(key);
      }
    }
  } else {
    // Each village: range=1 (adjacent)
    for (const v of villages) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const x = v.x + dx;
          const y = v.y + dy;
          const key = `${x},${y}` as TileKey;
          if (map[key]) seen.add(key);
        }
      }
    }
  }
  // 3. Merge with previous view
  const player = state.players.find(p => p.id === playerId);
  if (player) {
    for (const k of player.view) seen.add(k);
  }
  return Array.from(seen);
}
