import type { Tile } from "./mechanics";

export function generateMap(numberOfPlayers: number): Record<string, Tile> {
  // Calculate map size based on number of players
  // 2 players: 12x12, 3 players: 14x14, 4 players: 16x16
  const mapSize = Math.max(12, Math.min(16, 10 + numberOfPlayers * 2));

  // Calculate number of villages based on map size and players
  // Aim for roughly 3-4 villages per player, but spread evenly
  const totalVillages = Math.max(
    numberOfPlayers * 3,
    Math.floor(mapSize * mapSize * 0.08),
  );

  const map: Record<string, Tile> = {};

  // First pass: Generate basic terrain (grass/rock)
  for (let x = 0; x < mapSize; x++) {
    for (let y = 0; y < mapSize; y++) {
      const key = `${x}:${y}`;

      // Create clusters of rocks for more interesting terrain
      const rockProbability = calculateRockProbability(x, y, mapSize);
      const kind = Math.random() < rockProbability ? "rock" : "grass";

      map[key] = { x, y, kind };
    }
  }

  // Second pass: Place villages on grass tiles with minimum distance
  const villages = placeVillages(map, mapSize, totalVillages);

  // Add villages to the map
  villages.forEach(({ x, y }) => {
    const key = `${x}:${y}`;
    if (map[key] && map[key].kind === "grass") {
      map[key].building = { type: "village", ownedBy: null, raidedBy: null }; // No ownedBy - starts neutral
    }
  });

  return map;
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

function placeVillages(
  map: Record<string, Tile>,
  mapSize: number,
  targetVillages: number,
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
    const key = `${x}:${y}`;

    // Must be on grass
    if (!map[key] || map[key].kind !== "grass") {
      continue;
    }

    // Check distance from existing villages
    const tooClose = villages.some(village => {
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
      const key = `${x}:${y}`;

      if (!map[key] || map[key].kind !== "grass") {
        continue;
      }

      const tooClose = villages.some(village => {
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
