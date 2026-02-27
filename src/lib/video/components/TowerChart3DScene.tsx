// ============================================================================
// TOWER CHART 3D SCENE - 3D Ranking visualization with Three.js
// ============================================================================

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Box, Plane, ContactShadows, Billboard, Stars, useGLTF, Float, Cone, Cylinder, Sphere, Torus } from '@react-three/drei';
import * as THREE from 'three';
import type { TowerChart3DBlock, AnimationPhase } from '../schemas';
import type { MotionProfileType } from '../utils/animations';

// ============================================================================
// MODEL PRELOADER - Preload GLB files for better performance
// ============================================================================

const preloadedModels = new Set<string>();

function preloadModel(path: string) {
  if (!preloadedModels.has(path) && path) {
    useGLTF.preload(path);
    preloadedModels.add(path);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  const result = c1.clone().lerp(c2, t);
  return `#${result.getHexString()}`;
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

// ============================================================================
// 3D SCENE COMPONENTS
// ============================================================================

function StarField() {
  const starsRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.elapsedTime * 0.008;
    }
  });
  
  return (
    <Stars
      ref={starsRef}
      radius={150}
      depth={80}
      count={4000}
      factor={5}
      saturation={0.3}
      fade
      speed={0.3}
    />
  );
}

function FloatingParticles() {
  const count = 60;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = Math.random() * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    return pos;
  }, []);
  
  const pointsRef = useRef<THREE.Points>(null);
  
  useFrame(() => {
    if (pointsRef.current) {
      const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArray[i * 3 + 1] += 0.015;
        if (posArray[i * 3 + 1] > 60) posArray[i * 3 + 1] = 0;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.4} color="#ffffff" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// ============================================================================
// PRESET BACKGROUND COMPONENTS
// ============================================================================

/** Cyber Grid - Neon grid floor with glow lines */
function CyberGridBackground({ baseColor }: { baseColor: string }) {
  const gridRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 2) % 10;
    }
  });
  
  return (
    <group>
      {/* Main neon grid floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshBasicMaterial color="#0a0a2a" transparent opacity={0.95} />
      </mesh>
      
      {/* Animated grid lines */}
      <group ref={gridRef}>
        {Array.from({ length: 30 }).map((_, i) => (
          <mesh key={`line-x-${i}`} position={[-150 + i * 10, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <planeGeometry args={[300, 0.08]} />
            <meshBasicMaterial color="#3B82F6" transparent opacity={0.3} />
          </mesh>
        ))}
        {Array.from({ length: 30 }).map((_, i) => (
          <mesh key={`line-z-${i}`} position={[0, 0, -150 + i * 10]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[300, 0.08]} />
            <meshBasicMaterial color="#8B5CF6" transparent opacity={0.25} />
          </mesh>
        ))}
      </group>
      
      {/* Horizon glow */}
      <mesh position={[0, 20, -120]} rotation={[0, 0, 0]}>
        <planeGeometry args={[400, 80]} />
        <meshBasicMaterial color="#3B82F6" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

/** Mountain Range - Distant mountain silhouettes */
function MountainRangeBackground() {
  const mountains = useMemo(() => {
    const peaks = [];
    for (let i = 0; i < 12; i++) {
      peaks.push({
        x: -200 + i * 35,
        z: -100 - Math.random() * 50,
        height: 20 + Math.random() * 40,
        width: 30 + Math.random() * 30,
      });
    }
    return peaks;
  }, []);
  
  return (
    <group>
      {/* Base ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#1a1a2a" metalness={0.2} roughness={0.8} />
      </mesh>
      
      {/* Mountains */}
      {mountains.map((m, i) => (
        <Cone
          key={i}
          args={[m.width / 2, m.height, 4]}
          position={[m.x, m.height / 2 - 1, m.z]}
          rotation={[0, Math.PI / 4, 0]}
        >
          <meshStandardMaterial 
            color={`hsl(${220 + i * 5}, 30%, ${10 + i * 2}%)`}
            metalness={0.1}
            roughness={0.9}
          />
        </Cone>
      ))}
      
      {/* Fog effect using large planes */}
      <mesh position={[0, 15, -80]}>
        <planeGeometry args={[400, 100]} />
        <meshBasicMaterial color="#1a1a3a" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

/** Ocean Waves - Animated water plane */
function OceanWavesBackground() {
  const waterRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  
  useFrame((state) => {
    time.current = state.clock.elapsedTime;
    if (waterRef.current) {
      const geometry = waterRef.current.geometry;
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const wave = Math.sin(x * 0.1 + time.current) * 0.5 + Math.sin(y * 0.1 + time.current * 0.8) * 0.3;
        position.setZ(i, wave);
      }
      position.needsUpdate = true;
    }
  });
  
  return (
    <group>
      {/* Animated water surface */}
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[300, 300, 50, 50]} />
        <meshStandardMaterial 
          color="#0a4a6e" 
          metalness={0.8} 
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Water glow at horizon */}
      <mesh position={[0, 5, -140]}>
        <planeGeometry args={[400, 60]} />
        <meshBasicMaterial color="#0891b2" transparent opacity={0.2} />
      </mesh>
      
      {/* Distant islands */}
      <Cone args={[8, 15, 6]} position={[-80, 6, -100]}>
        <meshStandardMaterial color="#1a4a3a" metalness={0.1} roughness={0.9} />
      </Cone>
      <Cone args={[6, 12, 6]} position={[60, 5, -120]}>
        <meshStandardMaterial color="#1a3a3a" metalness={0.1} roughness={0.9} />
      </Cone>
    </group>
  );
}

/** Forest Trees - Stylized low-poly trees */
function ForestTreesBackground() {
  const trees = useMemo(() => {
    const result = [];
    for (let i = 0; i < 40; i++) {
      result.push({
        x: (Math.random() - 0.5) * 250,
        z: -30 - Math.random() * 100,
        height: 8 + Math.random() * 15,
        scale: 0.8 + Math.random() * 0.6,
      });
    }
    return result;
  }, []);
  
  return (
    <group>
      {/* Forest floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0a2a1a" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Trees */}
      {trees.map((tree, i) => (
        <group key={i} position={[tree.x, 0, tree.z]} scale={tree.scale}>
          {/* Trunk */}
          <Cylinder args={[0.3, 0.5, tree.height * 0.3, 6]} position={[0, tree.height * 0.15, 0]}>
            <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
          </Cylinder>
          {/* Foliage layers */}
          <Cone args={[tree.height * 0.3, tree.height * 0.5, 6]} position={[0, tree.height * 0.5, 0]}>
            <meshStandardMaterial color="#1a4a2a" roughness={0.8} />
          </Cone>
          <Cone args={[tree.height * 0.25, tree.height * 0.4, 6]} position={[0, tree.height * 0.7, 0]}>
            <meshStandardMaterial color="#2a5a3a" roughness={0.8} />
          </Cone>
          <Cone args={[tree.height * 0.18, tree.height * 0.3, 6]} position={[0, tree.height * 0.9, 0]}>
            <meshStandardMaterial color="#3a6a4a" roughness={0.8} />
          </Cone>
        </group>
      ))}
      
      {/* Fog layer */}
      <mesh position={[0, 8, -60]}>
        <planeGeometry args={[400, 80]} />
        <meshBasicMaterial color="#2a3a2a" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/** City Skyline - Distant city buildings */
function CitySkylineBackground() {
  const buildings = useMemo(() => {
    const result = [];
    for (let i = 0; i < 30; i++) {
      result.push({
        x: -150 + i * 10 + Math.random() * 5,
        z: -80 - Math.random() * 40,
        width: 4 + Math.random() * 8,
        height: 15 + Math.random() * 50,
        depth: 4 + Math.random() * 8,
      });
    }
    return result;
  }, []);
  
  return (
    <group>
      {/* City ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#1a1a2a" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Buildings */}
      {buildings.map((b, i) => (
        <Box key={i} args={[b.width, b.height, b.depth]} position={[b.x, b.height / 2, b.z]}>
          <meshStandardMaterial 
            color={`hsl(${220 + i * 3}, 20%, ${15 + (i % 5) * 3}%)`}
            metalness={0.6}
            roughness={0.4}
          />
        </Box>
      ))}
      
      {/* City lights glow */}
      <mesh position={[0, 30, -90]}>
        <planeGeometry args={[350, 100]} />
        <meshBasicMaterial color="#4a3a6a" transparent opacity={0.2} />
      </mesh>
      
      {/* Neon signs glow */}
      {buildings.slice(0, 10).map((b, i) => (
        <mesh key={`light-${i}`} position={[b.x, b.height * 0.7, b.z + 2]}>
          <planeGeometry args={[b.width * 0.5, 2]} />
          <meshBasicMaterial color={['#ff0066', '#00ffff', '#ff6600', '#6600ff'][i % 4]} transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** Abstract Waves - Wave/mesh terrain */
function AbstractWavesBackground() {
  const terrainRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (terrainRef.current) {
      const geometry = terrainRef.current.geometry;
      const position = geometry.attributes.position;
      const time = state.clock.elapsedTime;
      
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const wave = Math.sin(x * 0.05 + time * 0.5) * 3 + Math.sin(y * 0.05 + time * 0.3) * 2;
        position.setZ(i, wave);
      }
      position.needsUpdate = true;
    }
  });
  
  return (
    <group>
      {/* Animated terrain */}
      <mesh ref={terrainRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <planeGeometry args={[300, 300, 60, 60]} />
        <meshStandardMaterial 
          color="#2a1a4a" 
          metalness={0.5} 
          roughness={0.5}
          wireframe
        />
      </mesh>
      
      {/* Solid base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#0a0a1a" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Glow orbs */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Sphere
          key={i}
          args={[1.5, 16, 16]}
          position={[
            Math.sin(i * 0.8) * 40,
            10 + Math.sin(i * 1.2) * 5,
            -50 + Math.cos(i * 0.8) * 30
          ]}
        >
          <meshBasicMaterial color={['#3B82F6', '#8B5CF6', '#EC4899'][i % 3]} transparent opacity={0.3} />
        </Sphere>
      ))}
    </group>
  );
}

/** Space Station - Sci-fi interior feel */
function SpaceStationBackground() {
  const ringRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.1;
    }
  });
  
  return (
    <group>
      {/* Station floor with panels */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#1a1a2a" metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* Panel lines */}
      <gridHelper args={[400, 40, '#3a3a5a', '#2a2a4a']} position={[0, -0.4, 0]} />
      
      {/* Rotating ring structure */}
      <group ref={ringRef} position={[0, 40, -100]}>
        <torus args={[30, 1, 8, 32]}>
          <meshStandardMaterial color="#4a4a6a" metalness={0.8} roughness={0.2} emissive="#3B82F6" emissiveIntensity={0.2} />
        </torus>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[Math.cos(i * Math.PI / 4) * 30, Math.sin(i * Math.PI / 4) * 30, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#6a6a8a" metalness={0.9} roughness={0.1} emissive="#8B5CF6" emissiveIntensity={0.3} />
          </mesh>
        ))}
      </group>
      
      {/* Pillars */}
      {[-60, -30, 0, 30, 60].map((x, i) => (
        <Cylinder key={i} args={[1, 1.2, 80, 8]} position={[x, 40, -120]}>
          <meshStandardMaterial color="#2a2a4a" metalness={0.6} roughness={0.4} />
        </Cylinder>
      ))}
      
      {/* Light strips */}
      {[-50, 0, 50].map((x, i) => (
        <mesh key={`light-${i}`} position={[x, 60, -100]}>
          <boxGeometry args={[0.5, 0.5, 150]} />
          <meshBasicMaterial color="#3B82F6" />
        </mesh>
      ))}
    </group>
  );
}

/** Main Background Renderer - Picks the right background based on preset */
function BackgroundRenderer({ preset, baseColor }: { preset: string; baseColor: string }) {
  switch (preset) {
    case 'cyber-grid':
      return <CyberGridBackground baseColor={baseColor} />;
    case 'mountain-range':
      return <MountainRangeBackground />;
    case 'ocean-waves':
      return <OceanWavesBackground />;
    case 'forest-trees':
      return <ForestTreesBackground />;
    case 'city-skyline':
      return <CitySkylineBackground />;
    case 'abstract-waves':
      return <AbstractWavesBackground />;
    case 'space-station':
      return <SpaceStationBackground />;
    case 'none':
    default:
      return null;
  }
}

function Tower({ position, height, color, width = 3, depth = 3, opacity = 1, rank, name, value, subtitle, image, showLabel, isHighlighted, visible }: {
  position: [number, number, number];
  height: number;
  color: string;
  width?: number;
  depth?: number;
  opacity?: number;
  rank: number;
  name: string;
  value: string;
  subtitle?: string;
  image?: string;
  showLabel: boolean;
  isHighlighted: boolean;
  visible: boolean;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    if (image) {
      const loader = new THREE.TextureLoader();
      loader.load(image, (tex) => { 
        tex.colorSpace = THREE.SRGBColorSpace; 
        setTexture(tex); 
      }, undefined, () => setTexture(null));
    } else {
      setTexture(null);
    }
  }, [image]);
  
  if (!visible) return null;
  
  return (
    <group position={position}>
      {/* Base glow */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <planeGeometry args={[width + 1.5, depth + 1.5]} />
        <meshBasicMaterial color={color} transparent opacity={0.25 * opacity} />
      </mesh>
      
      {/* Main tower */}
      <Box args={[width, height, depth]} position={[0, height / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial 
          color={color} 
          metalness={0.5} 
          roughness={0.25}
          transparent={opacity < 1}
          opacity={opacity}
          emissive={color}
          emissiveIntensity={isHighlighted ? 0.35 : 0.12}
        />
      </Box>
      
      {/* Top cap */}
      <Box args={[width + 0.25, 0.35, depth + 0.25]} position={[0, height + 0.175, 0]}>
        <meshStandardMaterial 
          color="#ffffff"
          metalness={0.9} 
          roughness={0.1}
          emissive={color}
          emissiveIntensity={isHighlighted ? 0.7 : 0.4}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </Box>
      
      {/* Image on top */}
      {image && texture && (
        <Billboard position={[0, height + 3, 0]} follow={true}>
          <mesh>
            <planeGeometry args={[2.8, 2.8]} />
            <meshBasicMaterial map={texture} transparent opacity={opacity} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>
      )}
      
      {/* Labels */}
      {showLabel && (
        <Billboard position={[0, height + (image && texture ? 5 : 3), 0]} follow={true}>
          <Text position={[-width/2 - 1.2, 1.2, 0]} fontSize={0.9} color="#FFD700" anchorX="center" anchorY="middle" fontWeight="bold" outlineWidth={0.06} outlineColor="#000000">#{rank}</Text>
          <Text position={[0, 0.5, 0]} fontSize={0.75} color="#FFFFFF" anchorX="center" anchorY="middle" fontWeight="bold" outlineWidth={0.05} outlineColor="#000000" maxWidth={7}>{name}</Text>
          <Text position={[0, -0.5, 0]} fontSize={0.65} color="#4ADE80" anchorX="center" anchorY="middle" outlineWidth={0.04} outlineColor="#000000">{value}</Text>
          {subtitle && <Text position={[0, -1.2, 0]} fontSize={0.45} color="#9CA3AF" anchorX="center" anchorY="middle">{subtitle}</Text>}
        </Billboard>
      )}
    </group>
  );
}

function Ground({ color }: { color: string }) {
  return (
    <group>
      <Plane args={[400, 400]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
      </Plane>
      <gridHelper args={[400, 80, '#2a2a4a', '#1a1a3a']} position={[0, 0.01, 0]} />
    </group>
  );
}

function CameraController({ towers, currentIndex, progress, distance, angle }: {
  towers: { position: [number, number, number]; height: number }[];
  currentIndex: number;
  progress: number;
  distance: number;
  angle: number;
}) {
  const { camera } = useThree();
  const smoothPos = useRef(new THREE.Vector3());
  const smoothLook = useRef(new THREE.Vector3());
  const initRef = useRef(false);
  
  // Initialize once
  useEffect(() => {
    if (towers.length === 0) return;
    const angleRad = (angle * Math.PI) / 180;
    camera.position.set(
      Math.sin(angleRad) * distance,
      18,
      towers[0].position[2] + Math.cos(angleRad) * distance
    );
    smoothPos.current.copy(camera.position);
    smoothLook.current.set(0, 10, 0);
    initRef.current = true;
  }, []); // Empty deps - only init once
  
  useFrame(() => {
    if (!initRef.current || towers.length === 0) return;
    
    const currentTower = towers[Math.min(currentIndex, towers.length - 1)];
    const nextIndex = Math.min(currentIndex + 1, towers.length - 1);
    const nextTower = towers[nextIndex];
    
    const targetZ = THREE.MathUtils.lerp(currentTower.position[2], nextTower.position[2], progress);
    const avgHeight = (currentTower.height + nextTower.height) / 2;
    const angleRad = (angle * Math.PI) / 180;
    
    const targetPos = new THREE.Vector3(
      Math.sin(angleRad) * distance,
      avgHeight + 15,
      targetZ + Math.cos(angleRad) * distance
    );
    
    smoothPos.current.lerp(targetPos, 0.04);
    camera.position.copy(smoothPos.current);
    
    const lookTarget = new THREE.Vector3(0, avgHeight + 6, targetZ);
    smoothLook.current.lerp(lookTarget, 0.05);
    camera.lookAt(smoothLook.current);
  });
  
  return null;
}

function TowerChartScene({ data, frame, fps }: { data: TowerChart3DBlock; frame: number; fps: number }) {
  const {
    items = [],
    towerSpacing = 7,
    baseHeight = 4,
    maxHeight = 30,
    gradientStart = '#3B82F6',
    gradientEnd = '#8B5CF6',
    useGradientByRank = true,
    showLabels3D = true,
    cameraDistance = 35,
    cameraPauseDuration = 0.4,
    cameraMoveSpeed = 0.5,
    cameraAngle = 35,
    backgroundColor = '#050510',
    groundColor = '#0a0a1f',
    showGround = true,
    ambientIntensity = 0.5,
    itemRevealDelay = 0.06,
    customModelPath,
    customModelPosition,
    customModelScale = 2,
    customModelRotation = 0,
    animationDirection = 'top-to-bottom',
    backgroundPreset = 'cyber-grid',
  } = data;
  
  // Sort items based on animation direction
  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.rank - b.rank);
    // If bottom-to-top, reverse the order so we start from highest rank (last position)
    return animationDirection === 'bottom-to-top' ? sorted.reverse() : sorted;
  }, [items, animationDirection]);
  
  const { minValue, maxValue } = useMemo(() => {
    if (items.length === 0) return { minValue: 0, maxValue: 1 };
    const values = items.map(i => i.value);
    return { minValue: Math.min(...values), maxValue: Math.max(...values) };
  }, [items]);
  
  const towers = useMemo(() => {
    const heightRange = maxHeight - baseHeight;
    return sortedItems.map((item, index) => {
      const normalizedValue = (item.value - minValue) / (maxValue - minValue || 1);
      const height = baseHeight + normalizedValue * heightRange;
      const color = useGradientByRank
        ? lerpColor(gradientEnd, gradientStart, (items.length - item.rank) / Math.max(items.length - 1, 1))
        : (item.color || gradientStart);
      return {
        ...item,
        height,
        color,
        position: [0, 0, index * towerSpacing] as [number, number, number],
        valueFormatted: item.valueFormatted || formatValue(item.value),
      };
    });
  }, [sortedItems, minValue, maxValue, baseHeight, maxHeight, gradientStart, gradientEnd, useGradientByRank, towerSpacing, items.length]);
  
  // Model position with defaults
  const modelPos: [number, number, number] = customModelPosition 
    ? [customModelPosition.x, customModelPosition.y, customModelPosition.z] 
    : [0, 35, -60];
  
  const introDuration = 40;
  const totalItems = items.length;
  const pauseFrames = cameraPauseDuration * fps;
  const moveFrames = cameraMoveSpeed * fps;
  const totalAnimFrames = totalItems * (pauseFrames + moveFrames);
  
  const animFrame = Math.max(0, frame - introDuration);
  const animProgress = Math.min(animFrame / totalAnimFrames, 1);
  const currentIndex = Math.min(Math.floor(animProgress * totalItems), totalItems - 1);
  const itemProgress = (animProgress * totalItems) % 1;
  
  const introOpacity = Math.min(1, frame / introDuration);
  const revealProgress = Math.min(1, frame / (introDuration + totalItems * itemRevealDelay * fps * 0.5));
  
  const visibleStart = Math.max(0, currentIndex - 1);
  const visibleEnd = Math.min(towers.length - 1, currentIndex + 4);
  
  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <fog attach="fog" args={[backgroundColor, 50, 180]} />
      
      {/* Background preset - renders behind everything */}
      <BackgroundRenderer preset={backgroundPreset} baseColor={groundColor} />
      
      <StarField />
      <FloatingParticles />
      
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[50, 80, 50]} intensity={1.1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-far={250} shadow-camera-left={-100} shadow-camera-right={100} shadow-camera-top={100} shadow-camera-bottom={-100} />
      <directionalLight position={[-40, 50, -40]} intensity={0.4} color="#6666ff" />
      <pointLight position={[0, 80, 0]} intensity={0.6} />
      <hemisphereLight args={['#5555aa', '#222233', 0.4]} />
      
      {showGround && <Ground color={groundColor} />}
      <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={180} blur={2} far={80} />
      
      {customModelPath && (
        <Suspense fallback={null}>
          <Float speed={0.8} rotationIntensity={0.15} floatIntensity={0.4}>
            <CustomModel 
              modelPath={customModelPath} 
              position={modelPos} 
              scale={customModelScale} 
              rotation={customModelRotation}
            />
          </Float>
        </Suspense>
      )}
      
      {towers.length > 0 && (
        <CameraController
          towers={towers.map(t => ({ position: t.position, height: t.height }))}
          currentIndex={currentIndex}
          progress={itemProgress}
          distance={cameraDistance}
          angle={cameraAngle}
        />
      )}
      
      {towers.map((tower, index) => {
        const inVisibleRange = index >= visibleStart && index <= visibleEnd;
        const itemReveal = Math.max(0, Math.min(1, (revealProgress * totalItems * 1.2) - index * 0.12));
        const isHighlighted = index === currentIndex || index === currentIndex + 1;
        
        return (
          <Tower
            key={`tower-${tower.rank}`}
            position={tower.position}
            height={tower.height}
            color={tower.color}
            opacity={itemReveal * introOpacity}
            rank={tower.rank}
            name={tower.name}
            value={tower.valueFormatted}
            subtitle={tower.subtitle}
            image={tower.image}
            showLabel={showLabels3D && itemReveal > 0.25 && inVisibleRange}
            isHighlighted={isHighlighted}
            visible={inVisibleRange || itemReveal > 0}
          />
        );
      })}
    </>
  );
}

function CustomModel({ modelPath, position, scale, rotation }: { 
  modelPath: string; 
  position: [number, number, number]; 
  scale: number;
  rotation: number;
}) {
  const gltf = useGLTF(modelPath);
  const scene = gltf?.scene;
  const modelRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (scene) {
      // Reset model transforms
      scene.position.set(0, 0, 0);
      scene.rotation.set(0, 0, 0);
      scene.scale.set(1, 1, 1);
      
      // Calculate bounding box for proper scaling
      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      // Enable shadows on all meshes
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [scene]);
  
  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.4) * 0.5;
      modelRef.current.rotation.y = (rotation * Math.PI / 180) + state.clock.elapsedTime * 0.15;
    }
  });
  
  if (!scene) return null;
  
  return <primitive ref={modelRef} object={scene.clone()} position={position} scale={scale} />;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface TowerChart3DSceneProps {
  data: TowerChart3DBlock;
  theme?: string;
  motionProfile?: MotionProfileType;
  animation?: AnimationPhase;
}

export function TowerChart3DScene({ data }: TowerChart3DSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  const { title = 'Rankings', subtitle, backgroundColor = '#050510', items = [], gradientStart = '#3B82F6', customModelPath } = data;
  
  // Preload model if provided
  useEffect(() => {
    if (customModelPath) {
      preloadModel(customModelPath);
    }
  }, [customModelPath]);
  
  const titleOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 25], [-35, 0], { extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Canvas
        shadows
        camera={{ position: [35, 18, -25], fov: 50, near: 0.1, far: 600 }}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        dpr={1}
      >
        <TowerChartScene data={data} frame={frame} fps={fps} />
      </Canvas>
      
      {/* Title Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 35,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <h1
          style={{
            fontSize: Math.min(48, width * 0.065),
            fontWeight: 900,
            color: '#FFFFFF',
            textShadow: '0 4px 25px rgba(0,0,0,0.7), 0 0 30px rgba(100,100,255,0.25)',
            margin: 0,
            letterSpacing: '-0.5px',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: Math.min(20, width * 0.03),
              color: '#94A3B8',
              marginTop: 6,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Progress dots */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 6,
          opacity: titleOpacity * 0.7,
          zIndex: 10,
        }}
      >
        {items.slice(0, Math.min(10, items.length)).map((_, i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: frame > 40 + i * 18 ? gradientStart : '#333',
              boxShadow: frame > 40 + i * 18 ? `0 0 8px ${gradientStart}` : 'none',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

export default TowerChart3DScene;
