import React, { useCallback, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import {
  OrbitControls,
  OrthographicCamera,
  useGLTF,
  useTexture,
  Billboard,
} from "@react-three/drei";
import * as THREE from "three";
import type { Tile, State, Unit, TileKey } from "workers/mechanics";
import { useGlobalStore } from "../store/global";

const SPACING = 0.05;

const fogMaterial = new THREE.MeshStandardMaterial({ color: "white" });

const useMapBounds = (map: Record<string, Tile>) => {
  return useMemo(() => {
    const tiles = Object.values(map);
    if (tiles.length === 0) return null;

    const minX = Math.min(...tiles.map(tile => tile.x));
    const maxX = Math.max(...tiles.map(tile => tile.x));
    const minY = Math.min(...tiles.map(tile => tile.y));
    const maxY = Math.max(...tiles.map(tile => tile.y));

    const centerX = (minX + maxX) / 2;
    const centerZ = (minY + maxY) / 2;

    return { minX, maxX, minY, maxY, centerX, centerZ };
  }, [map]);
};

interface BlockProps extends Tile {
  tileKey: TileKey;
  position: [number, number, number];
  spacing: number;
  x: number;
  y: number;
  onHover: (x: number, y: number) => void;
  onLeave: () => void;
  onClick: (tileKey: TileKey) => void;
}

const texMiddleware = (texture: any) => {
  texture.forEach((t: any) => {
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
    t.generateMipmaps = false;
    t.anisotropy = 1;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
  });
};

const Block: React.FC<BlockProps> = ({
  position,
  spacing,
  kind,
  tileKey,
  x,
  y,
  onHover,
  onLeave,
  onClick,
}) => {
  const blockSize = 1 - spacing;

  // Load cube texture for grass blocks
  const grassTexture = useTexture(
    [
      "/textures/grass/grass-side.png", // positive X
      "/textures/grass/grass-top.png", // negative X
    ],
    texMiddleware,
  ) as unknown as THREE.Texture[];

  const rockTexture = useTexture(
    [
      "/textures/stone/stone-side.png", // positive X
      "/textures/stone/stone-top.png", // negative X
    ],
    texMiddleware,
  ) as unknown as THREE.Texture[];

  const materials = useMemo(() => {
    if (kind === "fog") {
      return [
        fogMaterial,
        fogMaterial,
        fogMaterial,
        fogMaterial,
        fogMaterial,
        fogMaterial,
      ];
    }

    const top = new THREE.MeshStandardMaterial({
      map: kind === "rock" ? rockTexture[1] : grassTexture[1],
    });

    const side = new THREE.MeshStandardMaterial({
      map: kind === "rock" ? rockTexture[0] : grassTexture[0],
    });

    return [side, side, top, top, side, side];
  }, [grassTexture, rockTexture, kind]);

  const handlePointerEnter = (e: any) => {
    e.stopPropagation();
    console.log("hover block", x, y, e);
    onHover(x, y);
  };

  const handlePointerLeave = (e: any) => {
    e.stopPropagation();
    onLeave();
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick(tileKey);
  };

  return (
    <mesh
      position={position}
      /* @ts-ignore - Three.js type version conflict */
      material={materials}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onPointerDown={e => e.stopPropagation()}
      onPointerUp={e => e.stopPropagation()}
    >
      <boxGeometry args={[blockSize, blockSize, blockSize]} />
    </mesh>
  );
};

interface GridProps {
  spacing: number;
  map: State["map"];
}

const Grid: React.FC<GridProps> = ({ spacing = 0.1, map }) => {
  const gridSize = Math.sqrt(Object.keys(map).length);
  const { hoveredBlock, hoverBlock, gameState, selectUnit } = useGlobalStore();
  const blockSize = 1 - spacing;

  const handleHover = useCallback(
    (x: number, y: number) => {
      hoverBlock(`${x},${y}`);
    },
    [hoverBlock],
  );

  const handleLeave = useCallback(() => {
    hoverBlock(null);
  }, [hoverBlock]);

  const handleClick = useCallback(
    (key: string) => {
      console.log("clicked block", key);
      console.log({ gameState });
      if (key && gameState) {
        const unit = gameState.units.find(u => u.tileKey === key);
        if (unit) {
          selectUnit(unit.id);
        } else {
          selectUnit(null);
        }
      } else {
        selectUnit(null);
      }
    },
    [gameState, selectUnit],
  );

  // Calculate map bounds and center offsets - shared logic
  const mapBounds = useMapBounds(map);

  const blocks = useMemo(() => {
    const blockArray: React.ReactElement[] = [];

    if (!mapBounds) return [];

    const { centerX, centerZ } = mapBounds;

    // Iterate over the map entries instead of creating a generic grid
    Object.entries(map).forEach(([key, tile]) => {
      const tileKey = key as TileKey;
      const posX = tile.x - centerX;
      const posZ = tile.y - centerZ;

      blockArray.push(
        <Block
          key={`block-${tile.x}-${tile.y}`}
          tileKey={tileKey}
          position={[posX, 0, posZ]}
          spacing={spacing}
          x={tile.x}
          y={tile.y}
          kind={tile.kind}
          building={tile.building}
          onHover={handleHover}
          onLeave={handleLeave}
          onClick={handleClick}
        />,
      );
    });

    return blockArray;
  }, [gridSize, spacing, map, mapBounds]);

  // Calculate hover indicator position
  const hoverIndicatorPosition = useMemo(() => {
    if (!hoveredBlock || !mapBounds) return null;

    const [x, y] = hoveredBlock.split(",").map(Number);
    const { centerX, centerZ } = mapBounds;

    const posX = x - centerX;
    const posZ = y - centerZ;

    return [posX, blockSize / 2 + 0.01, posZ] as [number, number, number];
  }, [hoveredBlock, mapBounds, blockSize]);

  return (
    <>
      {blocks}

      {/* Single hover indicator */}
      {hoveredBlock && hoverIndicatorPosition && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={hoverIndicatorPosition}>
          <planeGeometry args={[blockSize, blockSize]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </>
  );
};

interface FloatingStarsProps {
  count?: number;
  cubeSize?: number;
  color?: string;
  speed?: number;
  showDebugCube?: boolean;
  position?: [number, number, number];
}

const FloatingStars: React.FC<FloatingStarsProps> = ({
  count = 200,
  cubeSize = 30,
  color = "#ffffff",
  speed = 0.001,
  showDebugCube = false,
  position = [0, 0, 0],
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array | undefined>(undefined);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const halfSize = cubeSize / 2;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Random position within cube, offset by position prop
      positions[i3] = (Math.random() - 0.5) * cubeSize + position[0];
      positions[i3 + 1] = (Math.random() - 0.5) * cubeSize + position[1];
      positions[i3 + 2] = (Math.random() - 0.5) * cubeSize + position[2];

      // Random velocity
      velocities[i3] = (Math.random() - 0.5) * speed;
      velocities[i3 + 1] = (Math.random() - 0.5) * speed;
      velocities[i3 + 2] = (Math.random() - 0.5) * speed;
    }

    velocitiesRef.current = velocities;
    return { positions, velocities };
  }, [count, cubeSize, speed, position]);

  useFrame(() => {
    if (!pointsRef.current || !velocitiesRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position
      .array as Float32Array;
    const velocities = velocitiesRef.current;
    const halfSize = cubeSize / 2;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Update positions
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];

      // Wrap around cube bounds relative to position offset
      if (
        positions[i3] > position[0] + halfSize ||
        positions[i3] < position[0] - halfSize
      ) {
        velocities[i3] *= -1;
      }
      if (
        positions[i3 + 1] > position[1] + halfSize ||
        positions[i3 + 1] < position[1] - halfSize
      ) {
        velocities[i3 + 1] *= -1;
      }
      if (
        positions[i3 + 2] > position[2] + halfSize ||
        positions[i3 + 2] < position[2] - halfSize
      ) {
        velocities[i3 + 2] *= -1;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <points frustumCulled={false} ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={2}
          sizeAttenuation={false}
          transparent={false}
          opacity={1}
        />
      </points>

      {/* Debug Cube */}
      {showDebugCube && (
        <mesh frustumCulled={false} position={position}>
          <boxGeometry args={[cubeSize, cubeSize, cubeSize]} />
          <meshBasicMaterial
            color="red"
            wireframe={true}
            transparent={true}
            opacity={0.3}
          />
        </mesh>
      )}
    </>
  );
};

const Units = ({ units, map }: { units: Unit[]; map: State["map"] }) => {
  const swordTexture = useTexture("/textures/sword.png");
  const selectedUnit = useGlobalStore(s => s.selectedUnit);
  const myId = useGlobalStore(s => s.playerId);
  const mapBounds = useMapBounds(map);
  const unitSize = 0.4;
  const blockSize = 1 - SPACING;
  const spriteSize = 0.5;

  const renderUnits = useMemo(() => {
    if (!mapBounds) return [];

    return units
      .filter(unit => {
        const tile = map[unit.tileKey];
        return tile && tile.kind !== "fog";
      })
      .map(unit => {
        const posX = map[unit.tileKey].x - mapBounds.centerX;
        const posZ = map[unit.tileKey].y - mapBounds.centerZ;
        const baseY = blockSize / 2 + unitSize / 2;
        const posY = unit.id === selectedUnit ? baseY + 0.25 : baseY;

        return {
          id: unit.id,
          isOwnedByMe: unit.ownedBy === myId,
          position: [posX, posY, posZ] as const,
          spritePosition: [
            posX - 0.15,
            posY + unitSize / 2 + spriteSize / 2 + 0.1,
            posZ,
          ] as const,
        };
      });
  }, [units, map, mapBounds, selectedUnit]);

  return (
    <>
      {renderUnits.map(({ id, position, spritePosition, isOwnedByMe }) => (
        <group key={id}>
          {/* Unit cube */}
          <mesh position={position}>
            <boxGeometry args={[unitSize, unitSize, unitSize]} />
            <meshStandardMaterial
              color={isOwnedByMe ? "green" : "red"}
              roughness={0}
              metalness={0.1}
            />
          </mesh>

          {/* Billboard sprite above unit */}
          <Billboard position={spritePosition}>
            <mesh>
              <planeGeometry args={[spriteSize, spriteSize]} />
              <meshBasicMaterial map={swordTexture} transparent />
            </mesh>
          </Billboard>
        </group>
      ))}
    </>
  );
};

const Buildings = ({ map }: { map: State["map"] }) => {
  const buildingModel = useGLTF("/models/village.glb");
  const mapBounds = useMapBounds(map);
  const blockSize = 1 - SPACING;

  const buildings = useMemo(() => {
    if (!mapBounds) return [];

    const buildingTiles = Object.values(map).filter(tile => tile.building);
    const { centerX, centerZ } = mapBounds;

    return buildingTiles.map((tile, index) => {
      const posX = tile.x - centerX;
      const posZ = tile.y - centerZ;
      const posY = blockSize / 2; // Elevate by block height

      return (
        <primitive
          key={`building-${tile.x}-${tile.y}`}
          scale={0.08}
          position={[posX, posY, posZ]}
          object={buildingModel.scene.clone()}
        />
      );
    });
  }, [mapBounds, buildingModel.scene, blockSize]);

  return <>{buildings}</>;
};

interface MapProps {
  spacing?: number;
}

export const Game = ({ spacing = SPACING }: MapProps) => {
  const gameState = useGlobalStore(s => s.gameState);
  const map = useGlobalStore(s => s.mapView);
  const myId = useGlobalStore(s => s.playerId);

  if (!gameState || !map) return null;

  return (
    <Canvas style={{ width: "100%", height: "100vh" }} gl={{ antialias: true }}>
      <color attach="background" args={["#000000"]} />

      {/* Isometric Camera Setup */}
      <OrthographicCamera
        makeDefault
        position={[20, 20, 20]}
        zoom={60}
        near={0.1}
        far={1000}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} />

      {/* Coordinate Axes */}
      <axesHelper args={[5]} />

      {/* Floating Stars */}
      <FloatingStars
        count={3000}
        cubeSize={120}
        color="#87CEEB"
        speed={0.002}
        showDebugCube={true}
        position={[0, -60, 0]}
      />

      {/* Grid of Blocks */}
      <Grid spacing={spacing} map={map} />

      <Buildings map={map} />

      <Units units={gameState.units} map={map} />

      {/* Controls - Fixed mouse button configuration */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        enableDamping={true}
        dampingFactor={0.05}
        target={[0, 0, 0]}
        minDistance={15}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
        panSpeed={1}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE, // Changed from PAN to ROTATE
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN, // Changed from ROTATE to PAN
        }}
        makeDefault={false}
      />
    </Canvas>
  );
};

interface GLProps {
  spacing?: number;
}

export const GL = ({ spacing = SPACING }: GLProps) => {
  return <Game spacing={spacing} />;
};
