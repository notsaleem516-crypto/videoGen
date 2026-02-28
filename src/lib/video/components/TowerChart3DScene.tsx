// ============================================================================
// TOWER CHART 3D SCENE - 3D Ranking visualization with Three.js
// FIX: Use delayRender/continueRender pattern from Remotion docs
// https://www.remotion.dev/docs/flickering
// ============================================================================

import React, { useMemo, useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, delayRender, continueRender, cancelRender } from 'remotion';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Text, Box, Plane, Billboard, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { TowerChart3DBlock, AnimationPhase } from '../schemas';
import type { MotionProfileType } from '../utils/animations';

// ============================================================================
// MODEL PRELOADER
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
// CAMERA CALCULATION - Pure function, deterministic
// ============================================================================

function calculateCameraState(
  towers: { position: [number, number, number]; height: number }[],
  currentIndex: number,
  progress: number,
  distance: number,
  angle: number
): { position: [number, number, number]; lookAt: [number, number, number] } {
  if (towers.length === 0) {
    return { position: [35, 18, -25], lookAt: [0, 10, 0] };
  }

  const currentTower = towers[Math.min(currentIndex, towers.length - 1)];
  const nextIndex = Math.min(currentIndex + 1, towers.length - 1);
  const nextTower = towers[nextIndex];
  
  const easedProgress = progress < 0.5 
    ? 2 * progress * progress 
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  
  const targetZ = THREE.MathUtils.lerp(currentTower.position[2], nextTower.position[2], easedProgress);
  const avgHeight = THREE.MathUtils.lerp(currentTower.height, nextTower.height, easedProgress);
  const angleRad = (angle * Math.PI) / 180;
  
  return {
    position: [
      Math.sin(angleRad) * distance,
      avgHeight + 15,
      targetZ + Math.cos(angleRad) * distance
    ],
    lookAt: [0, avgHeight + 6, targetZ]
  };
}

// ============================================================================
// 3D SCENE COMPONENTS
// ============================================================================

function StarField() {
  return (
    <Stars
      radius={150}
      depth={80}
      count={2000}
      factor={5}
      saturation={0.3}
      fade
      speed={0}
    />
  );
}

function FloatingParticles() {
  const count = 30;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    let seed = 12345;
    const seededRandom = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (seededRandom() - 0.5) * 120;
      pos[i * 3 + 1] = seededRandom() * 60;
      pos[i * 3 + 2] = (seededRandom() - 0.5) * 200;
    }
    return pos;
  }, []);
  
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.4} color="#ffffff" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
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
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  
  useEffect(() => {
    // Skip delayRender if no image - texture loading is instant
    if (!image) {
      setTexture(null);
      setLoaded(true);
      return;
    }
    
    // Only use delayRender for actual async loading
    const handle = delayRender('Loading tower texture: ' + image);
    let cancelled = false;
    
    const loader = new THREE.TextureLoader();
    loader.load(image, (tex) => {
      if (cancelled) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
      setLoaded(true);
      loadedRef.current = true;
      continueRender(handle);
    }, undefined, () => {
      if (cancelled) return;
      setTexture(null);
      setLoaded(true);
      loadedRef.current = true;
      continueRender(handle);
    });
    
    return () => {
      cancelled = true;
      // Only cancel if not yet loaded
      if (!loadedRef.current) {
        cancelRender(handle);
      }
    };
  }, [image]);
  
  // Wait for texture to load
  if (!loaded) return null;
  if (!visible) return null;
  
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <planeGeometry args={[width + 1.5, depth + 1.5]} />
        <meshBasicMaterial color={color} transparent opacity={0.25 * opacity} />
      </mesh>
      
      <Box args={[width, height, depth]} position={[0, height / 2, 0]}>
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
      
      {image && texture && (
        <Billboard position={[0, height + 3, 0]} follow={true}>
          <mesh>
            <planeGeometry args={[2.8, 2.8]} />
            <meshBasicMaterial map={texture} transparent opacity={opacity} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>
      )}
      
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

// ============================================================================
// BACKGROUND ENVIRONMENT PRESETS - Immersive 3D environments
// ============================================================================

function BackgroundEnvironment({ preset }: { preset: string }) {
  switch (preset) {
    case 'none':
      return null;
      
    case 'cyber-grid':
      return <CyberGridEnvironment />;
    case 'mountain-range':
      return <MountainRangeEnvironment />;
    case 'ocean-waves':
      return <OceanWavesEnvironment />;
    case 'forest-trees':
      return <ForestTreesEnvironment />;
    case 'city-skyline':
      return <CitySkylineEnvironment />;
    case 'abstract-waves':
      return <AbstractWavesEnvironment />;
    case 'space-station':
      return <SpaceStationEnvironment />;
    case 'aurora-borealis':
      return <AuroraBorealisEnvironment />;
    case 'volcanic-inferno':
      return <VolcanicInfernoEnvironment />;
    case 'crystal-caves':
      return <CrystalCavesEnvironment />;
    case 'desert-dunes':
      return <DesertDunesEnvironment />;
    case 'neon-tokyo':
      return <NeonTokyoEnvironment />;
    case 'floating-islands':
      return <FloatingIslandsEnvironment />;
    case 'deep-ocean':
      return <DeepOceanEnvironment />;
    case 'galaxy-nebula':
      return <GalaxyNebulaEnvironment />;
    case 'matrix-rain':
      return <MatrixRainEnvironment />;
    case 'ice-glacier':
      return <IceGlacierEnvironment />;
    case 'steampunk-gears':
      return <SteampunkGearsEnvironment />;
    case 'alien-planet':
      return <AlienPlanetEnvironment />;
    case 'tron-grid':
      return <TronGridEnvironment />;
    // Immersive Environments
    case 'football-stadium':
      return <FootballStadiumEnvironment />;
    case 'race-track':
      return <RaceTrackEnvironment />;
    case 'concert-stage':
      return <ConcertStageEnvironment />;
    case 'castle-grounds':
      return <CastleGroundsEnvironment />;
    case 'airport-runway':
      return <AirportRunwayEnvironment />;
    case 'theme-park':
      return <ThemeParkEnvironment />;
    case 'ancient-ruins':
      return <AncientRuinsEnvironment />;
    case 'zen-garden':
      return <ZenGardenEnvironment />;
    case 'ski-resort':
      return <SkiResortEnvironment />;
    default:
      return <CyberGridEnvironment />;
  }
}

// ============================================================================
// BASIC ENVIRONMENT PRESETS
// ============================================================================

function CyberGridEnvironment() {
  return (
    <group>
      {/* Neon grid floor */}
      <gridHelper args={[200, 50, '#00ffff', '#ff00ff']} position={[0, 0.1, 0]} />
      {/* Glowing lines */}
      {[...Array(10)].map((_, i) => (
        <mesh key={i} position={[0, 0.05, -80 + i * 16]}>
          <boxGeometry args={[200, 0.1, 0.2]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function MountainRangeEnvironment() {
  const mountains = useMemo(() => {
    return [...Array(12)].map((_, i) => ({
      x: -150 + i * 25,
      height: 20 + Math.random() * 40,
      width: 15 + Math.random() * 20,
    }));
  }, []);
  
  return (
    <group position={[0, 0, -120]}>
      {mountains.map((m, i) => (
        <mesh key={i} position={[m.x, m.height / 2, 0]}>
          <coneGeometry args={[m.width, m.height, 4]} />
          <meshStandardMaterial color="#1a1a2e" flatShading />
        </mesh>
      ))}
      {/* Snow caps */}
      {mountains.filter(m => m.height > 35).map((m, i) => (
        <mesh key={`snow-${i}`} position={[m.x, m.height - 5, 0]}>
          <coneGeometry args={[m.width * 0.3, 10, 4]} />
          <meshStandardMaterial color="#ffffff" flatShading />
        </mesh>
      ))}
    </group>
  );
}

function OceanWavesEnvironment() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[300, 300, 50, 50]} />
        <meshStandardMaterial color="#006994" transparent opacity={0.8} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Wave particles */}
      {[...Array(20)].map((_, i) => (
        <mesh key={i} position={[-100 + i * 10, 0, -50 + Math.sin(i) * 30]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#00bfff" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function ForestTreesEnvironment() {
  const trees = useMemo(() => {
    return [...Array(30)].map(() => ({
      x: (Math.random() - 0.5) * 150,
      z: -50 - Math.random() * 100,
      height: 8 + Math.random() * 15,
    }));
  }, []);
  
  return (
    <group>
      {trees.map((tree, i) => (
        <group key={i} position={[tree.x, 0, tree.z]}>
          {/* Trunk */}
          <mesh position={[0, tree.height * 0.3, 0]}>
            <cylinderGeometry args={[0.5, 0.8, tree.height * 0.6, 6]} />
            <meshStandardMaterial color="#4a3728" />
          </mesh>
          {/* Foliage */}
          <mesh position={[0, tree.height * 0.7, 0]}>
            <coneGeometry args={[3, tree.height * 0.6, 6]} />
            <meshStandardMaterial color="#1a4d1a" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CitySkylineEnvironment() {
  const buildings = useMemo(() => {
    return [...Array(25)].map(() => ({
      x: (Math.random() - 0.5) * 200,
      z: -60 - Math.random() * 80,
      height: 15 + Math.random() * 50,
      width: 5 + Math.random() * 10,
      depth: 5 + Math.random() * 10,
    }));
  }, []);
  
  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.height / 2, b.z]}>
          <boxGeometry args={[b.width, b.height, b.depth]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {/* Window lights */}
      {buildings.slice(0, 15).map((b, i) => (
        [...Array(Math.floor(b.height / 5))].map((_, j) => (
          <mesh key={`light-${i}-${j}`} position={[b.x, 5 + j * 5, b.z + b.depth / 2 + 0.1]}>
            <planeGeometry args={[b.width * 0.8, 2]} />
            <meshBasicMaterial color="#ffff99" transparent opacity={0.7} />
          </mesh>
        ))
      ))}
    </group>
  );
}

function AbstractWavesEnvironment() {
  return (
    <group position={[0, -5, -50]}>
      {[...Array(8)].map((_, i) => (
        <mesh key={i} position={[0, i * 2, i * -10]} rotation={[0, 0, i * 0.1]}>
          <torusGeometry args={[40 - i * 3, 0.5, 8, 64, Math.PI * 2]} />
          <meshStandardMaterial 
            color={`hsl(${200 + i * 20}, 70%, 50%)`} 
            metalness={0.5} 
            transparent 
            opacity={0.6 - i * 0.05} 
          />
        </mesh>
      ))}
    </group>
  );
}

function SpaceStationEnvironment() {
  return (
    <group position={[0, 20, -80]}>
      {/* Station ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[30, 3, 8, 32]} />
        <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Central hub */}
      <mesh>
        <sphereGeometry args={[8, 16, 16]} />
        <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Solar panels */}
      <mesh position={[-40, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[20, 0.5, 8]} />
        <meshStandardMaterial color="#1a237e" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[40, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[20, 0.5, 8]} />
        <meshStandardMaterial color="#1a237e" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}

// ============================================================================
// ADVANCED ENVIRONMENT PRESETS
// ============================================================================

function AuroraBorealisEnvironment() {
  return (
    <group position={[0, 30, -100]}>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[-40 + i * 20, Math.sin(i) * 10, 0]} rotation={[0.3, 0, 0.1 * i]}>
          <planeGeometry args={[15, 50]} />
          <meshBasicMaterial 
            color={`hsl(${120 + i * 30}, 80%, 50%)`} 
            transparent 
            opacity={0.3} 
            side={THREE.DoubleSide} 
          />
        </mesh>
      ))}
    </group>
  );
}

function VolcanicInfernoEnvironment() {
  return (
    <group>
      {/* Volcano */}
      <mesh position={[0, 15, -80]}>
        <coneGeometry args={[40, 60, 8]} />
        <meshStandardMaterial color="#1a0a0a" roughness={0.9} />
      </mesh>
      {/* Lava glow */}
      <mesh position={[0, 48, -80]}>
        <sphereGeometry args={[8, 16, 16]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.8} />
      </mesh>
      {/* Lava streams */}
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[-15 + i * 6, 30 - i * 5, -75 + i * 2]} rotation={[0.3, 0, 0.2]}>
          <boxGeometry args={[2, 20, 1]} />
          <meshBasicMaterial color="#ff6600" transparent opacity={0.7} />
        </mesh>
      ))}
      <pointLight position={[0, 50, -80]} intensity={2} color="#ff4400" distance={100} />
    </group>
  );
}

function CrystalCavesEnvironment() {
  const crystals = useMemo(() => {
    return [...Array(20)].map(() => ({
      x: (Math.random() - 0.5) * 100,
      z: -30 - Math.random() * 80,
      height: 5 + Math.random() * 20,
      color: `hsl(${200 + Math.random() * 60}, 70%, 60%)`,
    }));
  }, []);
  
  return (
    <group>
      {crystals.map((c, i) => (
        <mesh key={i} position={[c.x, c.height / 2, c.z]} rotation={[0, Math.random() * Math.PI, 0]}>
          <coneGeometry args={[1.5, c.height, 6]} />
          <meshStandardMaterial color={c.color} transparent opacity={0.7} metalness={0.3} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function DesertDunesEnvironment() {
  return (
    <group position={[0, 0, -60]}>
      {[...Array(8)].map((_, i) => (
        <mesh key={i} position={[-80 + i * 20, 0, -i * 10]} rotation={[0, i * 0.3, 0]}>
          <sphereGeometry args={[20 + i * 2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#c2a060" roughness={0.9} />
        </mesh>
      ))}
      {/* Cacti */}
      {[...Array(5)].map((_, i) => (
        <group key={`cactus-${i}`} position={[-40 + i * 20, 0, -30 - i * 10]}>
          <mesh position={[0, 5, 0]}>
            <cylinderGeometry args={[0.8, 1, 10, 8]} />
            <meshStandardMaterial color="#2d5a27" roughness={0.8} />
          </mesh>
          <mesh position={[1.5, 6, 0]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.5, 0.6, 5, 8]} />
            <meshStandardMaterial color="#2d5a27" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function NeonTokyoEnvironment() {
  return (
    <group>
      {/* Neon buildings */}
      {[...Array(15)].map((_, i) => (
        <group key={i} position={[-70 + i * 10, 0, -50 - i * 3]}>
          <mesh position={[0, 20 + i * 2, 0]}>
            <boxGeometry args={[8, 40 + i * 4, 8]} />
            <meshStandardMaterial color="#0a0a15" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Neon signs */}
          <mesh position={[4.1, 15 + i * 2, 0]}>
            <planeGeometry args={[1, 8]} />
            <meshBasicMaterial color={`hsl(${300 + i * 20}, 100%, 50%)`} />
          </mesh>
        </group>
      ))}
      {/* Neon strips */}
      <mesh position={[0, 0.1, -30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[150, 2]} />
        <meshBasicMaterial color="#ff00ff" />
      </mesh>
      <mesh position={[0, 0.1, -60]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[150, 2]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
    </group>
  );
}

function FloatingIslandsEnvironment() {
  const islands = useMemo(() => {
    return [...Array(6)].map((_, i) => ({
      x: -60 + i * 25,
      y: 10 + Math.random() * 30,
      z: -40 - Math.random() * 60,
      size: 8 + Math.random() * 12,
    }));
  }, []);
  
  return (
    <group>
      {islands.map((island, i) => (
        <group key={i} position={[island.x, island.y, island.z]}>
          {/* Island base */}
          <mesh>
            <sphereGeometry args={[island.size, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#3d2817" roughness={0.9} />
          </mesh>
          {/* Grass top */}
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[island.size * 0.9, island.size, 2, 16]} />
            <meshStandardMaterial color="#2d5a27" roughness={0.8} />
          </mesh>
          {/* Tree */}
          <mesh position={[0, 5, 0]}>
            <coneGeometry args={[3, 8, 6]} />
            <meshStandardMaterial color="#1a4d1a" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DeepOceanEnvironment() {
  return (
    <group>
      {/* Ocean floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#001a33" roughness={0.9} />
      </mesh>
      {/* Coral */}
      {[...Array(15)].map((_, i) => (
        <mesh key={i} position={[-60 + i * 8, -5, -30 - i * 5]} rotation={[0, i * 0.5, 0]}>
          <cylinderGeometry args={[0.5, 2, 8, 6]} />
          <meshStandardMaterial color={`hsl(${340 + i * 10}, 70%, 50%)`} roughness={0.7} />
        </mesh>
      ))}
      {/* Seaweed */}
      {[...Array(10)].map((_, i) => (
        <mesh key={`seaweed-${i}`} position={[-40 + i * 10, 0, -50]} rotation={[0.1 * i, 0, 0.1]}>
          <boxGeometry args={[0.5, 15, 0.5]} />
          <meshStandardMaterial color="#1a4d1a" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function GalaxyNebulaEnvironment() {
  return (
    <group position={[0, 30, -100]}>
      {/* Nebula clouds */}
      {[...Array(8)].map((_, i) => (
        <mesh key={i} position={[Math.cos(i * 0.8) * 30, Math.sin(i * 0.5) * 20, Math.sin(i * 0.3) * 20]}>
          <sphereGeometry args={[15 + i * 2, 16, 16]} />
          <meshBasicMaterial color={`hsl(${250 + i * 15}, 80%, 40%)`} transparent opacity={0.15} />
        </mesh>
      ))}
      {/* Stars cluster */}
      {[...Array(50)].map((_, i) => (
        <mesh key={`star-${i}`} position={[
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 40,
        ]}>
          <sphereGeometry args={[0.3, 4, 4]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

function MatrixRainEnvironment() {
  return (
    <group position={[0, 30, -50]}>
      {[...Array(40)].map((_, i) => (
        <mesh key={i} position={[-60 + (i % 20) * 6, Math.floor(i / 20) * 30 - 15, -i % 10]}>
          <boxGeometry args={[0.5, 10 + Math.random() * 20, 0.1]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.4 + Math.random() * 0.4} />
        </mesh>
      ))}
    </group>
  );
}

function IceGlacierEnvironment() {
  return (
    <group position={[0, 0, -60]}>
      {/* Icebergs */}
      {[...Array(8)].map((_, i) => (
        <mesh key={i} position={[-80 + i * 20, 5, -i * 10]} rotation={[0, i * 0.4, 0]}>
          <icosahedronGeometry args={[10 + i * 2, 0]} />
          <meshStandardMaterial color="#a8d8ea" transparent opacity={0.8} metalness={0.1} roughness={0.2} />
        </mesh>
      ))}
      {/* Ice floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#d4f1f9" transparent opacity={0.6} metalness={0.1} roughness={0.3} />
      </mesh>
    </group>
  );
}

function SteampunkGearsEnvironment() {
  return (
    <group position={[0, 15, -60]}>
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[-40 + i * 15, Math.sin(i) * 10, -i * 5]} rotation={[i * 0.5, i * 0.3, 0]}>
          <torusGeometry args={[8 + i * 2, 1, 8, 12]} />
          <meshStandardMaterial color="#8b4513" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      {/* Pipes */}
      {[...Array(4)].map((_, i) => (
        <mesh key={`pipe-${i}`} position={[0, -10 + i * 8, 0]} rotation={[Math.PI / 2, 0, i * 0.2]}>
          <cylinderGeometry args={[1, 1, 80, 8]} />
          <meshStandardMaterial color="#654321" metalness={0.7} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function AlienPlanetEnvironment() {
  return (
    <group position={[0, 0, -60]}>
      {/* Alien terrain */}
      {[...Array(10)].map((_, i) => (
        <mesh key={i} position={[-50 + i * 10, 2, -i * 8]} rotation={[0, i * 0.5, 0]}>
          <dodecahedronGeometry args={[5 + i, 0]} />
          <meshStandardMaterial color={`hsl(${280 + i * 15}, 60%, 30%)`} flatShading />
        </mesh>
      ))}
      {/* Glowing mushrooms */}
      {[...Array(8)].map((_, i) => (
        <group key={`mushroom-${i}`} position={[-30 + i * 8, 0, -20 - i * 5]}>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.5, 1, 6, 6]} />
            <meshStandardMaterial color="#2a0a3a" />
          </mesh>
          <mesh position={[0, 7, 0]}>
            <sphereGeometry args={[2, 8, 8]} />
            <meshBasicMaterial color="#ff00ff" transparent opacity={0.8} />
          </mesh>
          <pointLight position={[0, 7, 0]} intensity={0.5} color="#ff00ff" distance={15} />
        </group>
      ))}
    </group>
  );
}

function TronGridEnvironment() {
  return (
    <group>
      {/* Grid floor */}
      <gridHelper args={[200, 40, '#00ffff', '#004444']} position={[0, 0.1, 0]} />
      {/* Vertical lines */}
      {[...Array(10)].map((_, i) => (
        <mesh key={i} position={[-90 + i * 20, 25, -80]}>
          <boxGeometry args={[0.3, 50, 0.3]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
        </mesh>
      ))}
      {/* Horizontal beams */}
      {[...Array(5)].map((_, i) => (
        <mesh key={`beam-${i}`} position={[0, 10 + i * 15, -60]} rotation={[0, 0, 0]}>
          <boxGeometry args={[200, 0.3, 0.3]} />
          <meshBasicMaterial color="#ff00ff" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// IMMERSIVE ENVIRONMENT PRESETS - Towers appear WITHIN these scenes
// ============================================================================

function FootballStadiumEnvironment() {
  return (
    <group position={[0, 0, -40]}>
      {/* Stadium bowl */}
      <mesh rotation={[0, 0, Math.PI]} position={[0, 15, 0]}>
        <torusGeometry args={[60, 20, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Seats sections */}
      {[...Array(10)].map((_, i) => (
        <mesh key={i} position={[Math.cos(i * 0.314) * 55, 10 + i * 0.5, Math.sin(i * 0.314) * 55]} rotation={[0, -i * 0.314, 0.3]}>
          <boxGeometry args={[15, 8, 5]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#cc0000' : '#0066cc'} />
        </mesh>
      ))}
      {/* Field lines */}
      {[...Array(10)].map((_, i) => (
        <mesh key={`line-${i}`} position={[0, 0.1, -40 + i * 8]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[80, 0.5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* Goal posts */}
      <group position={[0, 8, 40]}>
        <mesh position={[-5, 0, 0]}><boxGeometry args={[1, 10, 1]} /><meshStandardMaterial color="#ffffff" /></mesh>
        <mesh position={[5, 0, 0]}><boxGeometry args={[1, 10, 1]} /><meshStandardMaterial color="#ffffff" /></mesh>
        <mesh position={[0, 5, 0]}><boxGeometry args={[11, 1, 1]} /><meshStandardMaterial color="#ffffff" /></mesh>
      </group>
      {/* Stadium lights */}
      {[[-50, 30, 50], [50, 30, 50], [-50, 30, -50], [50, 30, -50]].map((pos, i) => (
        <group key={`light-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, 0, 0]}><boxGeometry args={[3, 15, 3]} /><meshStandardMaterial color="#444444" /></mesh>
          <pointLight position={[0, -5, 0]} intensity={1.5} color="#ffffcc" distance={80} />
        </group>
      ))}
    </group>
  );
}

function RaceTrackEnvironment() {
  return (
    <group position={[0, 0, -50]}>
      {/* Track oval */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[40, 60, 32]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>
      {/* Track markings */}
      {[...Array(20)].map((_, i) => (
        <mesh key={i} position={[Math.cos(i * 0.314) * 50, 0.2, Math.sin(i * 0.314) * 50]} rotation={[-Math.PI / 2, 0, i * 0.314]}>
          <planeGeometry args={[5, 1]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* Grandstand */}
      <mesh position={[0, 10, 70]}>
        <boxGeometry args={[100, 20, 15]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} />
      </mesh>
      {/* Start/finish line */}
      <mesh position={[0, 0.15, 50]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[25, 2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Checkered pattern */}
      {[...Array(6)].map((_, i) => (
        <mesh key={`check-${i}`} position={[-5 + i * 2, 0.16, 50]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[i % 2 === 0 ? 1.5 : 1, 1]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#000000' : '#ffffff'} />
        </mesh>
      ))}
    </group>
  );
}

function ConcertStageEnvironment() {
  return (
    <group position={[0, 0, -40]}>
      {/* Main stage */}
      <mesh position={[0, 1, 20]}>
        <boxGeometry args={[80, 2, 30]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} />
      </mesh>
      {/* Stage lights rig */}
      <mesh position={[0, 25, 20]}>
        <boxGeometry args={[90, 2, 5]} />
        <meshStandardMaterial color="#333333" metalness={0.7} />
      </mesh>
      {/* Stage lights */}
      {[...Array(8)].map((_, i) => (
        <group key={i} position={[-35 + i * 10, 22, 20]}>
          <mesh><sphereGeometry args={[1.5, 8, 8]} /><meshStandardMaterial color="#111111" metalness={0.8} /></mesh>
          <pointLight intensity={2} color={`hsl(${i * 45}, 100%, 50%)`} distance={40} />
        </group>
      ))}
      {/* Speakers */}
      {[-40, 40].map((x, i) => (
        <group key={`speaker-${i}`} position={[x, 8, 15]}>
          <mesh><boxGeometry args={[8, 16, 6]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[0, 3, 3.1]}><circleGeometry args={[2.5, 16]} /><meshStandardMaterial color="#333333" /></mesh>
          <mesh position={[0, -3, 3.1]}><circleGeometry args={[2, 16]} /><meshStandardMaterial color="#333333" /></mesh>
        </group>
      ))}
      {/* Crowd area floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -30]}>
        <planeGeometry args={[100, 80]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
    </group>
  );
}

function CastleGroundsEnvironment() {
  return (
    <group position={[0, 0, -80]}>
      {/* Castle main structure */}
      <mesh position={[0, 25, 0]}>
        <boxGeometry args={[50, 50, 30]} />
        <meshStandardMaterial color="#4a4a5a" roughness={0.9} />
      </mesh>
      {/* Towers */}
      {[-30, 30].map((x, i) => (
        <group key={i} position={[x, 30, 0]}>
          <mesh><cylinderGeometry args={[8, 10, 60, 8]} /><meshStandardMaterial color="#3a3a4a" roughness={0.9} /></mesh>
          <mesh position={[0, 35, 0]}><coneGeometry args={[10, 15, 8]} /><meshStandardMaterial color="#2a2a3a" /></mesh>
          {/* Flags */}
          <mesh position={[0, 50, 0]} rotation={[0, 0, 0.5]}><boxGeometry args={[8, 0.2, 4]} /><meshBasicMaterial color="#cc0000" /></mesh>
        </group>
      ))}
      {/* Walls */}
      {[-40, 40].map((z, i) => (
        <mesh key={`wall-${i}`} position={[0, 10, z]}>
          <boxGeometry args={[100, 20, 3]} />
          <meshStandardMaterial color="#3a3a4a" roughness={0.9} />
        </mesh>
      ))}
      {/* Gate */}
      <mesh position={[0, 8, 40]}>
        <boxGeometry args={[15, 16, 5]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Moat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <ringGeometry args={[55, 70, 32]} />
        <meshStandardMaterial color="#1a3a5a" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function AirportRunwayEnvironment() {
  return (
    <group position={[0, 0, -40]}>
      {/* Runway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <planeGeometry args={[30, 200]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Runway markings */}
      {[...Array(15)].map((_, i) => (
        <mesh key={i} position={[0, 0.15, -90 + i * 12]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* Edge lights */}
      {[-16, 16].map((x, side) => (
        [...Array(20)].map((_, i) => (
          <mesh key={`light-${side}-${i}`} position={[x, 0.5, -100 + i * 10]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshBasicMaterial color={side === 0 ? "#00ff00" : "#ff0000"} />
          </mesh>
        ))
      ))}
      {/* Control tower */}
      <group position={[50, 0, -50]}>
        <mesh position={[0, 10, 0]}><cylinderGeometry args={[3, 4, 20, 8]} /><meshStandardMaterial color="#444444" /></mesh>
        <mesh position={[0, 22, 0]}><cylinderGeometry args={[5, 3, 4, 8]} /><meshStandardMaterial color="#333333" metalness={0.5} /></mesh>
        <mesh position={[0, 25, 0]}><cylinderGeometry args={[4, 4, 2, 8]} /><meshStandardMaterial color="#88ccff" transparent opacity={0.6} /></mesh>
      </group>
      {/* Terminal building */}
      <mesh position={[-60, 7, 20]}>
        <boxGeometry args={[40, 14, 60]} />
        <meshStandardMaterial color="#3a3a4a" metalness={0.3} />
      </mesh>
    </group>
  );
}

function ThemeParkEnvironment() {
  return (
    <group position={[0, 0, -60]}>
      {/* Ferris wheel */}
      <group position={[-50, 30, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[25, 1, 8, 32]} /><meshStandardMaterial color="#ff4444" metalness={0.5} /></mesh>
        {[...Array(8)].map((_, i) => (
          <mesh key={i} position={[Math.cos(i * 0.785) * 25, Math.sin(i * 0.785) * 25, 0]}>
            <boxGeometry args={[4, 6, 3]} />
            <meshStandardMaterial color={`hsl(${i * 45}, 70%, 50%)`} />
          </mesh>
        ))}
      </group>
      {/* Roller coaster track */}
      <mesh position={[40, 15, -20]}>
        <torusGeometry args={[20, 0.5, 8, 32, Math.PI * 1.5]} />
        <meshStandardMaterial color="#ff6600" metalness={0.7} />
      </mesh>
      {/* Carousel */}
      <group position={[0, 5, 30]}>
        <mesh><cylinderGeometry args={[10, 10, 1, 16]} /><meshStandardMaterial color="#ffcc00" /></mesh>
        {[...Array(6)].map((_, i) => (
          <mesh key={i} position={[Math.cos(i * 1.047) * 7, 3, Math.sin(i * 1.047) * 7]}>
            <boxGeometry args={[1, 5, 1]} />
            <meshStandardMaterial color={`hsl(${i * 60}, 60%, 50%)`} />
          </mesh>
        ))}
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.5, 0.5, 6, 8]} /><meshStandardMaterial color="#ffcc00" /></mesh>
      </group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#2a5a2a" roughness={0.9} />
      </mesh>
    </group>
  );
}

function AncientRuinsEnvironment() {
  return (
    <group position={[0, 0, -60]}>
      {/* Columns */}
      {[...Array(8)].map((_, i) => (
        <group key={i} position={[-35 + i * 10, 0, -20]}>
          <mesh position={[0, 8, 0]}><cylinderGeometry args={[1.5, 1.8, 16, 12]} /><meshStandardMaterial color="#a09080" roughness={0.9} /></mesh>
          <mesh position={[0, 17, 0]}><boxGeometry args={[3, 1, 3]} /><meshStandardMaterial color="#908070" roughness={0.9} /></mesh>
        </group>
      ))}
      {/* Broken columns */}
      {[...Array(4)].map((_, i) => (
        <mesh key={`broken-${i}`} position={[-20 + i * 15, 4, -40]}>
          <cylinderGeometry args={[1.5, 1.8, 8, 12]} />
          <meshStandardMaterial color="#a09080" roughness={0.9} />
        </mesh>
      ))}
      {/* Stone floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#807060" roughness={0.95} />
      </mesh>
      {/* Debris */}
      {[...Array(15)].map((_, i) => (
        <mesh key={`debris-${i}`} position={[-30 + Math.random() * 60, 0.5, -20 + Math.random() * 40]}>
          <boxGeometry args={[1 + Math.random() * 2, 1, 1 + Math.random() * 2]} />
          <meshStandardMaterial color="#908070" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function ZenGardenEnvironment() {
  return (
    <group position={[0, 0, -40]}>
      {/* Sand garden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#e8e0d0" roughness={1} />
      </mesh>
      {/* Raked lines */}
      {[...Array(12)].map((_, i) => (
        <mesh key={i} position={[0, 0.05, -40 + i * 7]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 0.5]} />
          <meshBasicMaterial color="#d0c8b8" />
        </mesh>
      ))}
      {/* Rocks */}
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[-30 + i * 15, 2, -10 + i * 5]} rotation={[i * 0.3, i * 0.5, i * 0.2]}>
          <dodecahedronGeometry args={[3 + i * 0.5, 0]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
        </mesh>
      ))}
      {/* Bamboo fence */}
      {[...Array(20)].map((_, i) => (
        <mesh key={`bamboo-${i}`} position={[-50 + i * 5, 3, -50]}>
          <cylinderGeometry args={[0.2, 0.2, 6, 6]} />
          <meshStandardMaterial color="#5a8a4a" roughness={0.7} />
        </mesh>
      ))}
      {/* Small bridge */}
      <group position={[30, 1, 0]}>
        <mesh rotation={[0, 0, 0]}><boxGeometry args={[8, 0.3, 3]} /><meshStandardMaterial color="#8b4513" /></mesh>
        <mesh position={[-3, 1.5, 0]} rotation={[0, 0, 0.3]}><boxGeometry args={[0.3, 3, 3]} /><meshStandardMaterial color="#8b4513" /></mesh>
        <mesh position={[3, 1.5, 0]} rotation={[0, 0, -0.3]}><boxGeometry args={[0.3, 3, 3]} /><meshStandardMaterial color="#8b4513" /></mesh>
      </group>
    </group>
  );
}

function SkiResortEnvironment() {
  return (
    <group position={[0, 0, -80]}>
      {/* Mountain slopes */}
      <mesh position={[0, 30, -40]} rotation={[0.2, 0, 0]}>
        <coneGeometry args={[80, 100, 4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      {/* Ski runs (groomed lines) */}
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[-30 + i * 15, 20 - i * 3, 0]} rotation={[0.5, 0, 0.1 * i]}>
          <planeGeometry args={[8, 60]} />
          <meshStandardMaterial color="#e8e8f0" roughness={0.8} />
        </mesh>
      ))}
      {/* Ski lift */}
      <group position={[-40, 0, 20]}>
        {/* Towers */}
        {[0, 30, 60].map((z, i) => (
          <mesh key={i} position={[0, 12, z]}><boxGeometry args={[2, 24, 2]} /><meshStandardMaterial color="#444444" metalness={0.5} /></mesh>
        ))}
        {/* Cable */}
        <mesh position={[0, 25, 30]}><boxGeometry args={[0.1, 0.1, 65]} /><meshStandardMaterial color="#222222" /></mesh>
        {/* Chairs */}
        {[10, 30, 50].map((z, i) => (
          <mesh key={`chair-${i}`} position={[0, 22, z]}><boxGeometry args={[2, 3, 1]} /><meshStandardMaterial color="#ff4444" /></mesh>
        ))}
      </group>
      {/* Lodge */}
      <mesh position={[50, 6, 40]}>
        <boxGeometry args={[25, 12, 15]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      <mesh position={[50, 15, 40]} rotation={[0, 0, 0]}>
        <boxGeometry args={[27, 5, 17]} />
        <meshStandardMaterial color="#5a3a13" />
      </mesh>
    </group>
  );
}

// ============================================================================
// SYNCHRONIZED CAMERA - Uses delayRender/continueRender pattern
// ============================================================================

function SynchronizedCamera({ 
  cameraPosition, 
  lookAt 
}: { 
  cameraPosition: [number, number, number]; 
  lookAt: [number, number, number];
}) {
  const { camera, gl } = useThree();
  
  // Set camera IMMEDIATELY on every render
  camera.position.set(...cameraPosition);
  camera.lookAt(...lookAt);
  camera.updateProjectionMatrix();
  
  // Force WebGL to finish before Remotion captures
  const ctx = gl.getContext();
  if (ctx) {
    ctx.finish();
  }
  
  return null;
}

// ============================================================================
// SCENE COMPONENT
// ============================================================================

function TowerChartScene({ 
  towers,
  cameraPosition,
  lookAt,
  visibleStart,
  visibleEnd,
  currentIndex,
  introOpacity,
  revealProgress,
  totalItems,
  showLabels3D,
  showGround,
  groundColor,
  backgroundColor,
  ambientIntensity,
  backgroundPreset,
  customModelPath,
  customModelPosition,
  customModelScale,
  customModelRotation,
}: { 
  towers: ReturnType<typeof calculateTowers>;
  cameraPosition: [number, number, number];
  lookAt: [number, number, number];
  visibleStart: number;
  visibleEnd: number;
  currentIndex: number;
  introOpacity: number;
  revealProgress: number;
  totalItems: number;
  showLabels3D: boolean;
  showGround: boolean;
  groundColor: string;
  backgroundColor: string;
  ambientIntensity: number;
  backgroundPreset: string;
  customModelPath?: string;
  customModelPosition: [number, number, number];
  customModelScale: number;
  customModelRotation: number;
}) {
  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <fog attach="fog" args={[backgroundColor, 50, 180]} />
      
      <StarField />
      <FloatingParticles />
      
      {/* Background Environment Preset */}
      <BackgroundEnvironment preset={backgroundPreset} />
      
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[50, 80, 50]} intensity={1.1} />
      <directionalLight position={[-40, 50, -40]} intensity={0.4} color="#6666ff" />
      <pointLight position={[0, 80, 0]} intensity={0.6} />
      <hemisphereLight args={['#5555aa', '#222233', 0.4]} />
      
      {showGround && <Ground color={groundColor} />}
      
      {customModelPath && (
        <Suspense fallback={null}>
          <CustomModel 
            modelPath={customModelPath} 
            position={customModelPosition} 
            scale={customModelScale} 
            rotation={customModelRotation}
          />
        </Suspense>
      )}
      
      {/* Synchronized camera - no useFrame, sets immediately */}
      <SynchronizedCamera cameraPosition={cameraPosition} lookAt={lookAt} />
      
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
  
  useEffect(() => {
    if (scene) {
      scene.position.set(0, 0, 0);
      scene.rotation.set(0, 0, 0);
      scene.scale.set(1, 1, 1);
    }
  }, [scene]);
  
  if (!scene) return null;
  
  return <primitive object={scene.clone()} position={position} scale={scale} rotation={[0, rotation * Math.PI / 180, 0]} />;
}

// ============================================================================
// CALCULATE TOWERS
// ============================================================================

function calculateTowers(
  items: TowerChart3DBlock['items'],
  towerSpacing: number,
  baseHeight: number,
  maxHeight: number,
  gradientStart: string,
  gradientEnd: string,
  useGradientByRank: boolean,
  animationDirection: string
) {
  if (!items || items.length === 0) return [];
  
  const sorted = [...items].sort((a, b) => a.rank - b.rank);
  const sortedItems = animationDirection === 'bottom-to-top' ? sorted.reverse() : sorted;
  
  const values = items.map(i => i.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
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
  
  // Use delayRender/continueRender pattern from Remotion docs
  const [handle] = useState(() => delayRender('Initializing 3D scene'));
  const [glReady, setGlReady] = useState(false);
  
  const {
    title = 'Rankings',
    subtitle,
    backgroundColor = '#050510',
    items = [],
    gradientStart = '#3B82F6',
    gradientEnd = '#8B5CF6',
    useGradientByRank = true,
    showLabels3D = true,
    cameraDistance = 35,
    cameraPauseDuration = 0.4,
    cameraMoveSpeed = 0.5,
    cameraAngle = 35,
    groundColor = '#0a0a1f',
    showGround = true,
    ambientIntensity = 0.5,
    itemRevealDelay = 0.06,
    towerSpacing = 7,
    baseHeight = 4,
    maxHeight = 30,
    backgroundPreset = 'cyber-grid',
    customModelPath,
    customModelPosition,
    customModelScale = 2,
    customModelRotation = 0,
    animationDirection = 'top-to-bottom',
  } = data;
  
  // Preload model
  useEffect(() => {
    if (customModelPath) {
      preloadModel(customModelPath);
    }
  }, [customModelPath]);
  
  // ========== CALCULATIONS ==========
  
  const introDuration = 40;
  const totalItems = items.length;
  const pauseFrames = cameraPauseDuration * fps;
  const moveFrames = cameraMoveSpeed * fps;
  const totalAnimFrames = totalItems * (pauseFrames + moveFrames);
  
  const animFrame = Math.max(0, frame - introDuration);
  const animProgress = totalAnimFrames > 0 ? Math.min(animFrame / totalAnimFrames, 1) : 0;
  const currentIndex = Math.min(Math.floor(animProgress * totalItems), totalItems - 1);
  const itemProgress = (animProgress * totalItems) % 1;
  
  const introOpacity = Math.min(1, frame / introDuration);
  const revealProgress = Math.min(1, frame / (introDuration + totalItems * itemRevealDelay * fps * 0.5));
  
  const visibleStart = Math.max(0, currentIndex - 1);
  const visibleEnd = Math.min(items.length - 1, currentIndex + 4);
  
  const towers = useMemo(() => 
    calculateTowers(items, towerSpacing, baseHeight, maxHeight, gradientStart, gradientEnd, useGradientByRank, animationDirection),
    [items, towerSpacing, baseHeight, maxHeight, gradientStart, gradientEnd, useGradientByRank, animationDirection]
  );
  
  // Camera state - calculated from frame, deterministic
  const cameraState = useMemo(() => 
    calculateCameraState(
      towers.map(t => ({ position: t.position, height: t.height })),
      currentIndex,
      itemProgress,
      cameraDistance,
      cameraAngle
    ),
    [towers, currentIndex, itemProgress, cameraDistance, cameraAngle]
  );
  
  const modelPos: [number, number, number] = customModelPosition 
    ? [customModelPosition.x, customModelPosition.y, customModelPosition.z] 
    : [0, 35, -60];
  
  // Continue render when ready
  useEffect(() => {
    if (glReady) {
      continueRender(handle);
    }
  }, [glReady, handle]);
  
  // Canvas ready callback
  const onCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    const ctx = gl.getContext();
    if (ctx) {
      ctx.finish();
    }
    setGlReady(true);
  }, []);
  
  const titleOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 25], [-35, 0], { extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Canvas
        camera={{ 
          position: cameraState.position, 
          fov: 50, 
          near: 0.1, 
          far: 600 
        }}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        gl={{ 
          antialias: false, 
          alpha: false, 
          preserveDrawingBuffer: true, 
          powerPreference: 'high-performance',
        }}
        dpr={1}
        frameloop="demand"
        onCreated={onCreated}
      >
        <TowerChartScene 
          towers={towers}
          cameraPosition={cameraState.position}
          lookAt={cameraState.lookAt}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          currentIndex={currentIndex}
          introOpacity={introOpacity}
          revealProgress={revealProgress}
          totalItems={totalItems}
          showLabels3D={showLabels3D}
          showGround={showGround}
          groundColor={groundColor}
          backgroundColor={backgroundColor}
          ambientIntensity={ambientIntensity}
          backgroundPreset={backgroundPreset}
          customModelPath={customModelPath}
          customModelPosition={modelPos}
          customModelScale={customModelScale}
          customModelRotation={customModelRotation}
        />
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
