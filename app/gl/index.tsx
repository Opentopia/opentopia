import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface BlockProps {
  position: [number, number, number];
  spacing: number;
}

const Block: React.FC<BlockProps> = ({ position, spacing }) => {
  const blockSize = 1 - spacing;
  
  return (
    <mesh position={position}>
      <boxGeometry args={[blockSize, blockSize, blockSize]} />
      <meshStandardMaterial 
        color="red" 
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
};

interface GridProps {
  gridSize: number;
  spacing: number;
}

const Grid: React.FC<GridProps> = ({ gridSize = 32, spacing = 0.1 }) => {
  const blocks = useMemo(() => {
    const blockArray: React.ReactElement[] = [];
    const offset = (gridSize - 1) / 2;
    
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const posX = x - offset;
        const posZ = z - offset;
        
        blockArray.push(
          <Block
            key={`block-${x}-${z}`}
            position={[posX, 0, posZ]}
            spacing={spacing}
          />
        );
      }
    }
    
    return blockArray;
  }, [gridSize, spacing]);

  return <>{blocks}</>;
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
  color = '#ffffff',
  speed = 0.001,
  showDebugCube = false,
  position = [0, 0, 0]
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

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const velocities = velocitiesRef.current;
    const halfSize = cubeSize / 2;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Update positions
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];
      
      // Wrap around cube bounds relative to position offset
      if (positions[i3] > position[0] + halfSize || positions[i3] < position[0] - halfSize) {
        velocities[i3] *= -1;
      }
      if (positions[i3 + 1] > position[1] + halfSize || positions[i3 + 1] < position[1] - halfSize) {
        velocities[i3 + 1] *= -1;
      }
      if (positions[i3 + 2] > position[2] + halfSize || positions[i3 + 2] < position[2] - halfSize) {
        velocities[i3 + 2] *= -1;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <points ref={pointsRef}>
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
          size={0.1}
          sizeAttenuation={true}
          transparent={true}
          opacity={0.8}
        />
      </points>
      
      {/* Debug Cube */}
      {showDebugCube && (
        <mesh position={position}>
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

interface MapProps {
  spacing?: number;
}

export const Map = ({ spacing = 0.1 }: MapProps) => {
  return (
    <Canvas
      style={{ width: '100%', height: '100vh' }}
      shadows
      gl={{ antialias: true }}
    >
      {/* Isometric Camera Setup */}
      <OrthographicCamera
        makeDefault
        position={[20, 20, 20]}
        zoom={60}
        near={0.1}
        far={1000}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
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
      <Grid gridSize={32} spacing={spacing} />
      
      {/* Ground Plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          color="#333333" 
          transparent 
          opacity={0.3}
        />
      </mesh>
      
      {/* Controls */}
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
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE
        }}
      />
    </Canvas>
  );
};

interface GLProps {
  spacing?: number;
}

export const GL = ({ spacing = 0.1 }: GLProps) => {
  return (
    <>
      <Map spacing={spacing} />
    </>
  );
};