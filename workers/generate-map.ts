import type { Player, Tile, TileKey, Unit } from "./mechanics";

export function generateMap(players: Player[]): {
  map: Record<string, Tile>;
  units: Unit[];
} {
  // Calculate map size based on number of players
  // 2 players: 12x12, 3 players: 14x14, 4 players: 16x16
  const mapSize = Math.max(12, Math.min(16, 10 + players.length * 2));

  // Calculate number of neutral villages (in addition to starting villages)
  const neutralVillages = Math.max(
    players.length * 2,
    Math.floor(mapSize * mapSize * 0.06),
  );

  const map: Record<string, Tile> = {};

  // First pass: Generate basic terrain (grass/rock)
  for (let x = 0; x < mapSize; x++) {
    for (let y = 0; y < mapSize; y++) {
      const key = `${x},${y}` satisfies TileKey;

      // Create clusters of rocks for more interesting terrain
      const rockProbability = calculateRockProbability(x, y, mapSize);
      let kind: "rock" | "grass" = "grass";
      if (Math.random() < rockProbability) {
        // Only place a rock if it doesn't violate adjacency rules
        if (canPlaceRock(x, y, map, mapSize)) {
          kind = "rock";
        }
      }

      map[key] = { x, y, kind };
    }
  }

  // Second pass: Place starting villages for each player (well separated)
  const startingVillages = placeStartingVillages(map, mapSize, players);

  // Add starting villages to the map
  startingVillages.forEach(({ x, y, playerId }) => {
    const key = `${x},${y}` satisfies TileKey;
    if (map[key] && map[key].kind === "grass") {
      map[key].building = {
        type: "village",
        ownedBy: playerId,
        raidedBy: null,
      };
    }
  });

  // Third pass: Place neutral villages with minimum distance from all existing villages
  const existingVillages = startingVillages.map(v => ({ x: v.x, y: v.y }));
  const neutralVillagePositions = placeVillages(
    map,
    mapSize,
    neutralVillages,
    existingVillages,
  );

  // Add neutral villages to the map
  neutralVillagePositions.forEach(({ x, y }) => {
    const key = `${x},${y}` satisfies TileKey;
    if (map[key] && map[key].kind === "grass") {
      map[key].building = { type: "village", ownedBy: null, raidedBy: null };
    }
  });

  // Fourth pass: Create starting warrior units for each player
  const units: Unit[] = [];
  startingVillages.forEach(({ x, y, playerId }) => {
    units.push({
      id: crypto.randomUUID(),
      tileKey: `${x},${y}` as TileKey,
      type: "warrior",
      attack: 2,
      defense: 2,
      range: 1,
      movement: 1,
      health: 10,
      ownedBy: playerId,
    });
  });

  return { map, units };
}

function calculateRockProbability(
  x: number,
  y: number,
  mapSize: number,
): number {
  // Base rock probability
  let probability = 0.15;

  // Add some clustering using noise-like patterns
  const centerX = mapSize / 2;
  const centerY = mapSize / 2;

  // Create some rock clusters using simple noise
  const clusterNoise1 = Math.sin(x * 0.3) * Math.cos(y * 0.3);
  const clusterNoise2 = Math.sin(x * 0.7 + 10) * Math.cos(y * 0.7 + 10);

  if (clusterNoise1 > 0.3 || clusterNoise2 > 0.4) {
    probability += 0.25;
  }

  // Slightly more rocks near edges for natural borders
  const edgeDistance = Math.min(x, y, mapSize - 1 - x, mapSize - 1 - y);
  if (edgeDistance < 2) {
    probability += 0.1;
  }

  return Math.min(0.4, probability); // Cap at 40% rock probability
}

function placeStartingVillages(
  map: Record<string, Tile>,
  mapSize: number,
  players: Player[],
): Array<{ x: number; y: number; playerId: string }> {
  const startingVillages: Array<{ x: number; y: number; playerId: string }> =
    [];
  const margin = Math.floor(mapSize * 0.15); // Keep starting villages away from edges

  // Define starting positions based on number of players
  const startingPositions = getStartingPositions(
    mapSize,
    players.length,
    margin,
  );

  for (let i = 0; i < players.length; i++) {
    const playerId = players[i].id;
    const targetPosition = startingPositions[i];

    // Find the nearest grass tile to the target position
    let bestPosition = findNearestGrassTile(
      map,
      targetPosition.x,
      targetPosition.y,
      mapSize,
    );

    // Ensure this position isn't too close to other starting villages
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const tooClose = startingVillages.some(village => {
        const distance = Math.max(
          Math.abs(village.x - bestPosition.x),
          Math.abs(village.y - bestPosition.y),
        );
        return distance < Math.floor(mapSize / 4); // Minimum distance between starting villages
      });

      if (!tooClose) {
        break;
      }

      // Try a nearby position
      const offsetX = (Math.random() - 0.5) * Math.floor(mapSize / 3);
      const offsetY = (Math.random() - 0.5) * Math.floor(mapSize / 3);
      const newX = Math.max(
        margin,
        Math.min(mapSize - 1 - margin, Math.floor(targetPosition.x + offsetX)),
      );
      const newY = Math.max(
        margin,
        Math.min(mapSize - 1 - margin, Math.floor(targetPosition.y + offsetY)),
      );

      bestPosition = findNearestGrassTile(map, newX, newY, mapSize);
      attempts++;
    }

    startingVillages.push({ x: bestPosition.x, y: bestPosition.y, playerId });
  }

  return startingVillages;
}

function getStartingPositions(
  mapSize: number,
  numberOfPlayers: number,
  margin: number,
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];

  if (numberOfPlayers === 1) {
    // Single player in center
    positions.push({ x: Math.floor(mapSize / 2), y: Math.floor(mapSize / 2) });
  } else if (numberOfPlayers === 2) {
    // Opposite corners
    positions.push({ x: margin, y: margin });
    positions.push({ x: mapSize - 1 - margin, y: mapSize - 1 - margin });
  } else if (numberOfPlayers === 3) {
    // Triangle formation
    positions.push({ x: margin, y: margin });
    positions.push({ x: mapSize - 1 - margin, y: margin });
    positions.push({ x: Math.floor(mapSize / 2), y: mapSize - 1 - margin });
  } else if (numberOfPlayers === 4) {
    // Four corners
    positions.push({ x: margin, y: margin });
    positions.push({ x: mapSize - 1 - margin, y: margin });
    positions.push({ x: margin, y: mapSize - 1 - margin });
    positions.push({ x: mapSize - 1 - margin, y: mapSize - 1 - margin });
  } else {
    // For more than 4 players, distribute them around the perimeter
    for (let i = 0; i < numberOfPlayers; i++) {
      const angle = (i / numberOfPlayers) * 2 * Math.PI;
      const radius = (mapSize - 2 * margin) / 2;
      const centerX = mapSize / 2;
      const centerY = mapSize / 2;

      const x = Math.floor(centerX + radius * Math.cos(angle));
      const y = Math.floor(centerY + radius * Math.sin(angle));

      // Ensure positions are within bounds
      const clampedX = Math.max(margin, Math.min(mapSize - 1 - margin, x));
      const clampedY = Math.max(margin, Math.min(mapSize - 1 - margin, y));

      positions.push({ x: clampedX, y: clampedY });
    }
  }

  return positions;
}

function findNearestGrassTile(
  map: Record<string, Tile>,
  targetX: number,
  targetY: number,
  mapSize: number,
): { x: number; y: number } {
  // Start from target position and spiral outward
  for (let radius = 0; radius < mapSize; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
          const x = targetX + dx;
          const y = targetY + dy;

          if (x >= 0 && x < mapSize && y >= 0 && y < mapSize) {
            const key = `${x},${y}` satisfies TileKey;
            if (map[key] && map[key].kind === "grass") {
              return { x, y };
            }
          }
        }
      }
    }
  }

  // Fallback: return target position (shouldn't happen with reasonable rock density)
  return { x: targetX, y: targetY };
}

function placeVillages(
  map: Record<string, Tile>,
  mapSize: number,
  targetVillages: number,
  existingVillages: Array<{ x: number; y: number }> = [],
): Array<{ x: number; y: number }> {
  const villages: Array<{ x: number; y: number }> = [];
  const minDistance = Math.max(2, Math.floor(mapSize / 6)); // Minimum distance between villages
  const maxAttempts = targetVillages * 20; // Prevent infinite loops

  let attempts = 0;

  while (villages.length < targetVillages && attempts < maxAttempts) {
    attempts++;

    // Pick a random position
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const key = `${x},${y}` satisfies TileKey;

    // Must be on grass
    if (!map[key] || map[key].kind !== "grass") {
      continue;
    }

    // Check distance from existing villages (both neutral and starting)
    const allExistingVillages = [...existingVillages, ...villages];
    const tooClose = allExistingVillages.some(village => {
      const distance = Math.max(
        Math.abs(village.x - x),
        Math.abs(village.y - y),
      );
      return distance < minDistance;
    });

    if (!tooClose) {
      villages.push({ x, y });
    }
  }

  // If we couldn't place enough villages with the strict distance requirement,
  // try again with a more relaxed distance for the remaining spots
  if (villages.length < targetVillages) {
    const relaxedDistance = Math.max(1, Math.floor(minDistance * 0.7));

    while (villages.length < targetVillages && attempts < maxAttempts * 2) {
      attempts++;

      const x = Math.floor(Math.random() * mapSize);
      const y = Math.floor(Math.random() * mapSize);
      const key = `${x},${y}` satisfies TileKey;

      if (!map[key] || map[key].kind !== "grass") {
        continue;
      }

      const allExistingVillages = [...existingVillages, ...villages];
      const tooClose = allExistingVillages.some(village => {
        const distance = Math.max(
          Math.abs(village.x - x),
          Math.abs(village.y - y),
        );
        return distance < relaxedDistance;
      });

      if (!tooClose) {
        villages.push({ x, y });
      }
    }
  }

  return villages;
}

// Helper to check if placing a rock at (x, y) would create a group of 4 or more rocks in a row or L
function canPlaceRock(
  x: number,
  y: number,
  map: Record<string, Tile>,
  mapSize: number,
): boolean {
  // Check for 4 in a row (horizontal, vertical, diagonal)
  const directions = [
    [1, 0], // horizontal
    [0, 1], // vertical
    [1, 1], // diagonal down-right
    [1, -1], // diagonal up-right
  ];
  for (const [dx, dy] of directions) {
    let count = 1;
    // Check backward
    for (let i = 1; i <= 2; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
        const key = `${nx},${ny}` as TileKey;
        if (map[key]?.kind === "rock") {
          count++;
        } else {
          break;
        }
      }
    }
    // Check forward
    for (let i = 1; i <= 2; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
        const key = `${nx},${ny}` as TileKey;
        if (map[key]?.kind === "rock") {
          count++;
        } else {
          break;
        }
      }
    }
    if (count >= 4) return false;
  }
  // Check for L shape (2x2 block of rocks)
  const lOffsets = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [0, 0],
    [-1, 0],
    [0, 1],
    [-1, 1],
    [0, 0],
    [1, 0],
    [0, -1],
    [1, -1],
    [0, 0],
    [-1, 0],
    [0, -1],
    [-1, -1],
  ];
  for (let i = 0; i < lOffsets.length; i += 4) {
    let lCount = 0;
    for (let j = 0; j < 4; j++) {
      const nx = x + lOffsets[i + j][0];
      const ny = y + lOffsets[i + j][1];
      if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
        const key = `${nx},${ny}` as TileKey;
        if ((nx === x && ny === y) || map[key]?.kind === "rock") {
          lCount++;
        }
      }
    }
    if (lCount === 4) return false;
  }
  // Otherwise, it's safe to place a rock
  return true;
}
