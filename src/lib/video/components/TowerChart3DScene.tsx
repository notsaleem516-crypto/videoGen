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

function BackgroundEnvironment({ preset, totalLength }: { preset: string; totalLength: number }) {
  // Ensure minimum length for environments
  const envLength = Math.max(totalLength, 100);
  
  switch (preset) {
    case 'none':
      return null;
      
    case 'cyber-grid':
      return <CyberGridEnvironment totalLength={envLength} />;
    case 'mountain-range':
      return <MountainRangeEnvironment totalLength={envLength} />;
    case 'ocean-waves':
      return <OceanWavesEnvironment totalLength={envLength} />;
    case 'forest-trees':
      return <ForestTreesEnvironment totalLength={envLength} />;
    case 'city-skyline':
      return <CitySkylineEnvironment totalLength={envLength} />;
    case 'abstract-waves':
      return <AbstractWavesEnvironment totalLength={envLength} />;
    case 'space-station':
      return <SpaceStationEnvironment totalLength={envLength} />;
    case 'aurora-borealis':
      return <AuroraBorealisEnvironment totalLength={envLength} />;
    case 'volcanic-inferno':
      return <VolcanicInfernoEnvironment totalLength={envLength} />;
    case 'crystal-caves':
      return <CrystalCavesEnvironment totalLength={envLength} />;
    case 'desert-dunes':
      return <DesertDunesEnvironment totalLength={envLength} />;
    case 'neon-tokyo':
      return <NeonTokyoEnvironment totalLength={envLength} />;
    case 'floating-islands':
      return <FloatingIslandsEnvironment totalLength={envLength} />;
    case 'deep-ocean':
      return <DeepOceanEnvironment totalLength={envLength} />;
    case 'galaxy-nebula':
      return <GalaxyNebulaEnvironment totalLength={envLength} />;
    case 'matrix-rain':
      return <MatrixRainEnvironment totalLength={envLength} />;
    case 'ice-glacier':
      return <IceGlacierEnvironment totalLength={envLength} />;
    case 'steampunk-gears':
      return <SteampunkGearsEnvironment totalLength={envLength} />;
    case 'alien-planet':
      return <AlienPlanetEnvironment totalLength={envLength} />;
    case 'tron-grid':
      return <TronGridEnvironment totalLength={envLength} />;
    // Immersive Environments
    case 'football-stadium':
      return <FootballStadiumEnvironment totalLength={envLength} />;
    case 'race-track':
      return <RaceTrackEnvironment totalLength={envLength} />;
    case 'concert-stage':
      return <ConcertStageEnvironment totalLength={envLength} />;
    case 'castle-grounds':
      return <CastleGroundsEnvironment totalLength={envLength} />;
    case 'airport-runway':
      return <AirportRunwayEnvironment totalLength={envLength} />;
    case 'theme-park':
      return <ThemeParkEnvironment totalLength={envLength} />;
    case 'ancient-ruins':
      return <AncientRuinsEnvironment totalLength={envLength} />;
    case 'zen-garden':
      return <ZenGardenEnvironment totalLength={envLength} />;
    case 'ski-resort':
      return <SkiResortEnvironment totalLength={envLength} />;
    // New Advanced Immersive Environments
    case 'underwater-kingdom':
      return <UnderwaterKingdomEnvironment totalLength={envLength} />;
    case 'cyberpunk-city':
      return <CyberpunkCityEnvironment totalLength={envLength} />;
    case 'medieval-arena':
      return <MedievalArenaEnvironment totalLength={envLength} />;
    case 'space-colony':
      return <SpaceColonyEnvironment totalLength={envLength} />;
    case 'tropical-beach':
      return <TropicalBeachEnvironment totalLength={envLength} />;
    default:
      return <CyberGridEnvironment totalLength={envLength} />;
  }
}

// ============================================================================
// BASIC ENVIRONMENT PRESETS
// ============================================================================

function CyberGridEnvironment({ totalLength }: { totalLength: number }) {
  const gridLength = Math.max(totalLength + 100, 200);
  const lineCount = Math.ceil(gridLength / 16);
  
  return (
    <group>
      {/* Neon grid floor */}
      <gridHelper args={[gridLength, Math.floor(gridLength / 4), '#00ffff', '#ff00ff']} position={[0, 0.1, totalLength / 2]} />
      {/* Glowing lines extending full length */}
      {[...Array(lineCount)].map((_, i) => (
        <mesh key={i} position={[0, 0.05, -40 + i * 16]}>
          <boxGeometry args={[gridLength, 0.1, 0.2]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function MountainRangeEnvironment({ totalLength }: { totalLength: number }) {
  const mountainCount = Math.max(Math.ceil(totalLength / 20), 12);
  const mountains = useMemo(() => {
    return [...Array(mountainCount)].map((_, i) => ({
      x: -150 + i * 25,
      height: 20 + (i * 7 % 40),
      width: 15 + (i * 11 % 20),
    }));
  }, [mountainCount]);
  
  return (
    <group position={[0, 0, -totalLength * 0.3]}>
      {mountains.map((m, i) => (
        <mesh key={i} position={[m.x, m.height / 2, i * (totalLength / mountainCount)]}>
          <coneGeometry args={[m.width, m.height, 4]} />
          <meshStandardMaterial color="#1a1a2e" flatShading />
        </mesh>
      ))}
      {/* Snow caps */}
      {mountains.filter(m => m.height > 35).map((m, i) => (
        <mesh key={`snow-${i}`} position={[m.x, m.height - 5, i * (totalLength / mountainCount)]}>
          <coneGeometry args={[m.width * 0.3, 10, 4]} />
          <meshStandardMaterial color="#ffffff" flatShading />
        </mesh>
      ))}
    </group>
  );
}

function OceanWavesEnvironment({ totalLength }: { totalLength: number }) {
  const waveCount = Math.max(Math.ceil(totalLength / 15), 20);
  
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, totalLength / 2]}>
        <planeGeometry args={[300, totalLength + 100, 50, 50]} />
        <meshStandardMaterial color="#006994" transparent opacity={0.8} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Wave particles along full length */}
      {[...Array(waveCount)].map((_, i) => (
        <mesh key={i} position={[-100 + (i % 10) * 10, 0, i * (totalLength / waveCount)]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#00bfff" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function ForestTreesEnvironment({ totalLength }: { totalLength: number }) {
  const treeCount = Math.max(Math.ceil(totalLength / 5), 30);
  const trees = useMemo(() => {
    return [...Array(treeCount)].map((_, i) => ({
      x: (i % 2 === 0 ? -1 : 1) * (30 + (i * 17 % 50)),
      z: i * (totalLength / treeCount),
      height: 8 + (i * 13 % 15),
    }));
  }, [treeCount, totalLength]);
  
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

function CitySkylineEnvironment({ totalLength }: { totalLength: number }) {
  const buildingCount = Math.max(Math.ceil(totalLength / 8), 25);
  const buildings = useMemo(() => {
    return [...Array(buildingCount)].map((_, i) => ({
      x: (i % 2 === 0 ? -1 : 1) * (40 + (i * 23 % 60)),
      z: i * (totalLength / buildingCount),
      height: 15 + (i * 17 % 50),
      width: 5 + (i * 7 % 10),
      depth: 5 + (i * 11 % 10),
    }));
  }, [buildingCount, totalLength]);
  
  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.height / 2, b.z]}>
          <boxGeometry args={[b.width, b.height, b.depth]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {/* Window lights */}
      {buildings.slice(0, Math.min(15, buildingCount)).map((b, i) => (
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

function AbstractWavesEnvironment({ totalLength }: { totalLength: number }) {
  const waveCount = Math.max(Math.ceil(totalLength / 25), 8);
  
  return (
    <group position={[0, -5, totalLength / 4]}>
      {[...Array(waveCount)].map((_, i) => (
        <mesh key={i} position={[0, i * 2, i * -(totalLength / waveCount)]} rotation={[0, 0, i * 0.1]}>
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

function SpaceStationEnvironment({ totalLength }: { totalLength: number }) {
  const stationCount = Math.max(Math.ceil(totalLength / 150), 1);
  
  return (
    <group position={[0, 20, totalLength / 2]}>
      {[...Array(stationCount)].map((_, s) => (
        <group key={s} position={[0, 0, s * 150 - totalLength / 2]}>
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
      ))}
    </group>
  );
}

// ============================================================================
// ADVANCED ENVIRONMENT PRESETS
// ============================================================================

function AuroraBorealisEnvironment({ totalLength }: { totalLength: number }) {
  const auroraCount = Math.max(Math.ceil(totalLength / 30), 5);
  
  return (
    <group position={[0, 30, totalLength / 2 - 50]}>
      {[...Array(auroraCount)].map((_, i) => (
        <mesh key={i} position={[-40 + (i % 5) * 20, Math.sin(i) * 10, -totalLength / 2 + i * 30]} rotation={[0.3, 0, 0.1 * i]}>
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

function VolcanicInfernoEnvironment({ totalLength }: { totalLength: number }) {
  const volcanoCount = Math.max(Math.ceil(totalLength / 150), 1);
  
  return (
    <group position={[0, 0, totalLength / 2]}>
      {[...Array(volcanoCount)].map((_, v) => (
        <group key={v} position={[0, 0, -totalLength / 2 + v * 150 + 75]}>
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
      ))}
    </group>
  );
}

function CrystalCavesEnvironment({ totalLength }: { totalLength: number }) {
  const crystalCount = Math.max(Math.ceil(totalLength / 8), 20);
  const crystals = useMemo(() => {
    return [...Array(crystalCount)].map((_, i) => ({
      x: (i % 2 === 0 ? -1 : 1) * (30 + (i * 17 % 40)),
      z: i * (totalLength / crystalCount),
      height: 5 + (i * 13 % 20),
      color: `hsl(${200 + (i * 7 % 60)}, 70%, 60%)`,
    }));
  }, [crystalCount, totalLength]);
  
  return (
    <group position={[0, 0, totalLength / 2]}>
      {crystals.map((c, i) => (
        <mesh key={i} position={[c.x, c.height / 2, c.z - totalLength / 2]} rotation={[0, i * 0.3, 0]}>
          <coneGeometry args={[1.5, c.height, 6]} />
          <meshStandardMaterial color={c.color} transparent opacity={0.7} metalness={0.3} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function DesertDunesEnvironment({ totalLength }: { totalLength: number }) {
  const duneCount = Math.max(Math.ceil(totalLength / 20), 8);
  const cactusCount = Math.max(Math.ceil(totalLength / 30), 5);
  
  return (
    <group position={[0, 0, totalLength / 2]}>
      {[...Array(duneCount)].map((_, i) => (
        <mesh key={i} position={[-80 + (i % 5) * 40, 0, -totalLength / 2 + i * 20]} rotation={[0, i * 0.3, 0]}>
          <sphereGeometry args={[20 + i * 2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#c2a060" roughness={0.9} />
        </mesh>
      ))}
      {/* Cacti */}
      {[...Array(cactusCount)].map((_, i) => (
        <group key={`cactus-${i}`} position={[-40 + (i % 3) * 40, 0, -totalLength / 2 + i * 30]}>
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

function NeonTokyoEnvironment({ totalLength }: { totalLength: number }) {
  const buildingCount = Math.max(Math.ceil(totalLength / 12), 15);
  
  return (
    <group position={[0, 0, totalLength / 2]}>
      {/* Neon buildings */}
      {[...Array(buildingCount)].map((_, i) => (
        <group key={i} position={[-70 + (i % 10) * 15, 0, -totalLength / 2 + i * 12]}>
          <mesh position={[0, 20 + (i % 5) * 5, 0]}>
            <boxGeometry args={[8, 40 + (i % 6) * 8, 8]} />
            <meshStandardMaterial color="#0a0a15" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Neon signs */}
          <mesh position={[4.1, 15 + (i % 3) * 5, 0]}>
            <planeGeometry args={[1, 8]} />
            <meshBasicMaterial color={`hsl(${300 + i * 20}, 100%, 50%)`} />
          </mesh>
        </group>
      ))}
      {/* Neon strips */}
      {[...Array(Math.ceil(totalLength / 40))].map((_, i) => (
        <mesh key={`strip-${i}`} position={[0, 0.1, -totalLength / 2 + 20 + i * 40]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[150, 2]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#ff00ff" : "#00ffff"} />
        </mesh>
      ))}
    </group>
  );
}

function FloatingIslandsEnvironment({ totalLength }: { totalLength: number }) {
  const islandCount = Math.max(Math.ceil(totalLength / 25), 6);
  const islands = useMemo(() => {
    return [...Array(islandCount)].map((_, i) => ({
      x: (i % 2 === 0 ? -1 : 1) * (30 + (i * 13 % 40)),
      y: 10 + (i * 17 % 30),
      z: i * (totalLength / islandCount),
      size: 8 + (i * 11 % 12),
    }));
  }, [islandCount, totalLength]);
  
  return (
    <group position={[0, 0, totalLength / 2]}>
      {islands.map((island, i) => (
        <group key={i} position={[island.x, island.y, island.z - totalLength / 2]}>
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

function DeepOceanEnvironment({ totalLength }: { totalLength: number }) {
  const coralCount = Math.max(Math.ceil(totalLength / 10), 15);
  const seaweedCount = Math.max(Math.ceil(totalLength / 15), 10);
  
  return (
    <group position={[0, 0, totalLength / 2]}>
      {/* Ocean floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]}>
        <planeGeometry args={[300, totalLength + 100]} />
        <meshStandardMaterial color="#001a33" roughness={0.9} />
      </mesh>
      {/* Coral */}
      {[...Array(coralCount)].map((_, i) => (
        <mesh key={i} position={[-60 + (i % 10) * 12, -5, -totalLength / 2 + i * 10]} rotation={[0, i * 0.5, 0]}>
          <cylinderGeometry args={[0.5, 2, 8, 6]} />
          <meshStandardMaterial color={`hsl(${340 + i * 10}, 70%, 50%)`} roughness={0.7} />
        </mesh>
      ))}
      {/* Seaweed */}
      {[...Array(seaweedCount)].map((_, i) => (
        <mesh key={`seaweed-${i}`} position={[-40 + (i % 6) * 15, 0, -totalLength / 2 + i * 15]} rotation={[0.1 * i, 0, 0.1]}>
          <boxGeometry args={[0.5, 15, 0.5]} />
          <meshStandardMaterial color="#1a4d1a" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function GalaxyNebulaEnvironment({ totalLength }: { totalLength: number }) {
  const nebulaCount = Math.max(Math.ceil(totalLength / 80), 2);
  
  return (
    <group position={[0, 30, totalLength / 2]}>
      {[...Array(nebulaCount)].map((_, n) => (
        <group key={n} position={[0, 0, -totalLength / 2 + n * 80 + 40]}>
          {/* Nebula clouds */}
          {[...Array(8)].map((_, i) => (
            <mesh key={i} position={[Math.cos(i * 0.8) * 30, Math.sin(i * 0.5) * 20, Math.sin(i * 0.3) * 20]}>
              <sphereGeometry args={[15 + i * 2, 16, 16]} />
              <meshBasicMaterial color={`hsl(${250 + i * 15}, 80%, 40%)`} transparent opacity={0.15} />
            </mesh>
          ))}
          {/* Stars cluster */}
          {[...Array(30)].map((_, i) => (
            <mesh key={`star-${i}`} position={[
              (i * 17 % 80) - 40,
              (i * 23 % 60) - 30,
              (i * 11 % 40) - 20,
            ]}>
              <sphereGeometry args={[0.3, 4, 4]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function MatrixRainEnvironment({ totalLength }: { totalLength: number }) {
  const rainCount = Math.max(Math.ceil(totalLength / 5), 40);
  
  return (
    <group position={[0, 30, totalLength / 2]}>
      {[...Array(rainCount)].map((_, i) => (
        <mesh key={i} position={[-60 + (i % 20) * 6, (i * 7 % 30) - 15, -totalLength / 2 + (i % Math.ceil(totalLength / 10)) * 10]}>
          <boxGeometry args={[0.5, 10 + (i * 3 % 20), 0.1]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.4 + (i * 7 % 10) / 25} />
        </mesh>
      ))}
    </group>
  );
}

function IceGlacierEnvironment({ totalLength }: { totalLength: number }) {
  const icebergCount = Math.max(Math.ceil(totalLength / 15), 8);
  
  return (
    <group position={[0, 0, totalLength / 2]}>
      {/* Icebergs */}
      {[...Array(icebergCount)].map((_, i) => (
        <mesh key={i} position={[-80 + (i % 6) * 30, 5, -totalLength / 2 + i * 15]} rotation={[0, i * 0.4, 0]}>
          <icosahedronGeometry args={[10 + (i * 3 % 5), 0]} />
          <meshStandardMaterial color="#a8d8ea" transparent opacity={0.8} metalness={0.1} roughness={0.2} />
        </mesh>
      ))}
      {/* Ice floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[200, totalLength + 100]} />
        <meshStandardMaterial color="#d4f1f9" transparent opacity={0.6} metalness={0.1} roughness={0.3} />
      </mesh>
    </group>
  );
}

function SteampunkGearsEnvironment({ totalLength }: { totalLength: number }) {
  const gearCount = Math.max(Math.ceil(totalLength / 25), 6);
  
  return (
    <group position={[0, 15, totalLength / 2]}>
      {[...Array(gearCount)].map((_, i) => (
        <mesh key={i} position={[-40 + (i % 4) * 25, Math.sin(i) * 10, -totalLength / 2 + i * 25]} rotation={[i * 0.5, i * 0.3, 0]}>
          <torusGeometry args={[8 + (i * 3 % 4), 1, 8, 12]} />
          <meshStandardMaterial color="#8b4513" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      {/* Pipes */}
      {[...Array(Math.ceil(totalLength / 40))].map((_, i) => (
        <mesh key={`pipe-${i}`} position={[0, -10 + (i % 3) * 8, -totalLength / 2 + i * 40]} rotation={[Math.PI / 2, 0, i * 0.2]}>
          <cylinderGeometry args={[1, 1, totalLength * 0.6, 8]} />
          <meshStandardMaterial color="#654321" metalness={0.7} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function AlienPlanetEnvironment({ totalLength }: { totalLength: number }) {
  const terrainCount = Math.max(Math.ceil(totalLength / 12), 10);
  const mushroomCount = Math.max(Math.ceil(totalLength / 15), 8);
  
  return (
    <group position={[0, 0, totalLength / 2]}>
      {/* Alien terrain */}
      {[...Array(terrainCount)].map((_, i) => (
        <mesh key={i} position={[-50 + (i % 8) * 15, 2, -totalLength / 2 + i * 12]} rotation={[0, i * 0.5, 0]}>
          <dodecahedronGeometry args={[5 + (i * 2 % 6), 0]} />
          <meshStandardMaterial color={`hsl(${280 + i * 15}, 60%, 30%)`} flatShading />
        </mesh>
      ))}
      {/* Glowing mushrooms */}
      {[...Array(mushroomCount)].map((_, i) => (
        <group key={`mushroom-${i}`} position={[-30 + (i % 4) * 20, 0, -totalLength / 2 + i * 15]}>
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

function TronGridEnvironment({ totalLength }: { totalLength: number }) {
  const gridLength = Math.max(totalLength + 100, 200);
  const verticalLineCount = Math.max(Math.ceil(totalLength / 20), 10);
  const beamCount = Math.max(Math.ceil(totalLength / 40), 5);
  
  return (
    <group position={[0, 0, totalLength / 2]}>
      {/* Grid floor */}
      <gridHelper args={[gridLength, Math.floor(gridLength / 5), '#00ffff', '#004444']} position={[0, 0.1, 0]} />
      {/* Vertical lines */}
      {[...Array(verticalLineCount)].map((_, i) => (
        <mesh key={i} position={[-90 + (i % 10) * 20, 25, -totalLength / 2 + i * 20]}>
          <boxGeometry args={[0.3, 50, 0.3]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
        </mesh>
      ))}
      {/* Horizontal beams */}
      {[...Array(beamCount)].map((_, i) => (
        <mesh key={`beam-${i}`} position={[0, 10 + (i % 3) * 15, -totalLength / 2 + i * 40]} rotation={[0, 0, 0]}>
          <boxGeometry args={[gridLength, 0.3, 0.3]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#ff00ff" : "#00ffff"} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// IMMERSIVE ENVIRONMENT PRESETS - Towers appear WITHIN these scenes
// ============================================================================

function FootballStadiumEnvironment({ totalLength }: { totalLength: number }) {
  const stadiumLength = Math.max(totalLength + 80, 150);
  const numSeats = Math.ceil(stadiumLength / 15);
  
  return (
    <group position={[0, 0, stadiumLength / 2 - 40]}>
      {/* Stadium walls on both sides - wrapping all towers */}
      {[-60, 60].map((x, side) => (
        <mesh key={`wall-${side}`} position={[x, 15, 0]}>
          <boxGeometry args={[20, 35, stadiumLength]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}
      {/* Seats sections along full length */}
      {[...Array(numSeats)].map((_, i) => (
        <group key={`seat-row-${i}`}>
          <mesh position={[-48, 8 + (i % 2) * 2, -stadiumLength / 2 + i * 15]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[12, 10, 12]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#cc0000' : '#ffffff'} />
          </mesh>
          <mesh position={[48, 8 + (i % 2) * 2, -stadiumLength / 2 + i * 15]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[12, 10, 12]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#0066cc' : '#ffffff'} />
          </mesh>
        </group>
      ))}
      {/* Field lines along full length */}
      {[...Array(Math.ceil(stadiumLength / 15))].map((_, i) => (
        <mesh key={`line-${i}`} position={[0, 0.1, -stadiumLength / 2 + i * 15]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[80, 0.5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* Stadium lights distributed along */}
      {[-55, 55].map((x, side) => (
        [...Array(Math.ceil(stadiumLength / 80))].map((_, i) => (
          <group key={`light-${side}-${i}`} position={[x, 40, 40 + i * 80]}>
            <mesh><boxGeometry args={[4, 25, 4]} /><meshStandardMaterial color="#444444" /></mesh>
            <pointLight position={[0, -10, 0]} intensity={2} color="#ffffcc" distance={100} />
          </group>
        ))
      ))}
    </group>
  );
}

function RaceTrackEnvironment({ totalLength }: { totalLength: number }) {
  const trackLength = Math.max(totalLength + 100, 200);
  
  return (
    <group position={[0, 0, trackLength / 2]}>
      {/* Track surface - full length */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <planeGeometry args={[80, trackLength]} />
        <meshStandardMaterial color="#333333" roughness={0.95} />
      </mesh>
      {/* Track edges */}
      {[-35, 35].map((x, side) => (
        <mesh key={`edge-${side}`} position={[x, 0.3, 0]}>
          <boxGeometry args={[2, 0.5, trackLength]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* Track markings along full length */}
      {[...Array(Math.ceil(trackLength / 20))].map((_, i) => (
        <mesh key={`mark-${i}`} position={[0, 0.15, -trackLength / 2 + i * 20]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[60, 1]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* Grandstands on both sides */}
      {[-55, 55].map((x, side) => (
        <mesh key={`stand-${side}`} position={[x, 12, 0]}>
          <boxGeometry args={[20, 24, trackLength * 0.9]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.3} />
        </mesh>
      ))}
      {/* Checkered start/finish */}
      {[...Array(8)].map((_, i) => (
        <mesh key={`check-${i}`} position={[-10 + i * 3, 0.16, trackLength / 2 - 30]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[i % 2 === 0 ? 2 : 2, 2]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#000000' : '#ffffff'} />
        </mesh>
      ))}
    </group>
  );
}

function ConcertStageEnvironment({ totalLength }: { totalLength: number }) {
  const stageLength = Math.max(totalLength + 60, 120);
  
  return (
    <group position={[0, 0, stageLength / 2]}>
      {/* Main stage platform - full length */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[100, 3, stageLength]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} />
      </mesh>
      {/* Stage rigging overhead - full length */}
      <mesh position={[0, 35, 0]}>
        <boxGeometry args={[110, 3, stageLength]} />
        <meshStandardMaterial color="#222222" metalness={0.8} />
      </mesh>
      {/* Stage lights along full length */}
      {[...Array(Math.ceil(stageLength / 20))].map((_, i) => (
        <group key={`light-row-${i}`} position={[0, 30, -stageLength / 2 + 10 + i * 20]}>
          {[-40, 0, 40].map((x, j) => (
            <group key={`light-${j}`} position={[x, 0, 0]}>
              <mesh><sphereGeometry args={[2, 8, 8]} /><meshStandardMaterial color="#111111" metalness={0.8} /></mesh>
              <pointLight intensity={3} color={`hsl(${(i * 30 + j * 40) % 360}, 100%, 50%)`} distance={50} />
            </group>
          ))}
        </group>
      ))}
      {/* Speakers on sides */}
      {[-55, 55].map((x, side) => (
        [...Array(Math.ceil(stageLength / 60))].map((_, i) => (
          <group key={`speaker-${side}-${i}`} position={[x, 12, -stageLength / 2 + 30 + i * 60]}>
            <mesh><boxGeometry args={[12, 24, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
            <mesh position={[0, 5, 4.1]}><circleGeometry args={[4, 16]} /><meshStandardMaterial color="#333333" /></mesh>
            <mesh position={[0, -5, 4.1]}><circleGeometry args={[3, 16]} /><meshStandardMaterial color="#333333" /></mesh>
          </group>
        ))
      ))}
    </group>
  );
}

function CastleGroundsEnvironment({ totalLength }: { totalLength: number }) {
  const groundsLength = Math.max(totalLength + 80, 160);
  
  return (
    <group position={[0, 0, groundsLength / 2]}>
      {/* Castle walls on both sides */}
      {[-65, 65].map((x, side) => (
        <mesh key={`wall-${side}`} position={[x, 15, 0]}>
          <boxGeometry args={[15, 35, groundsLength]} />
          <meshStandardMaterial color="#4a4a5a" roughness={0.9} />
        </mesh>
      ))}
      {/* Towers along walls */}
      {[-65, 65].map((x, side) => (
        [...Array(Math.ceil(groundsLength / 60))].map((_, i) => (
          <group key={`tower-${side}-${i}`} position={[x, 30, -groundsLength / 2 + 30 + i * 60]}>
            <mesh><cylinderGeometry args={[8, 10, 45, 8]} /><meshStandardMaterial color="#3a3a4a" roughness={0.9} /></mesh>
            <mesh position={[0, 28, 0]}><coneGeometry args={[10, 15, 8]} /><meshStandardMaterial color="#2a2a3a" /></mesh>
          </group>
        ))
      ))}
      {/* Stone floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[110, groundsLength]} />
        <meshStandardMaterial color="#605040" roughness={0.95} />
      </mesh>
      {/* Torches along path */}
      {[...Array(Math.ceil(groundsLength / 30))].map((_, i) => (
        <group key={`torch-${i}`}>
          <mesh position={[-45, 8, -groundsLength / 2 + i * 30]}><cylinderGeometry args={[0.4, 0.4, 10, 6]} /><meshStandardMaterial color="#4a3020" /></mesh>
          <pointLight position={[-45, 14, -groundsLength / 2 + i * 30]} intensity={1.5} color="#ff6600" distance={30} />
          <mesh position={[45, 8, -groundsLength / 2 + i * 30 + 15]}><cylinderGeometry args={[0.4, 0.4, 10, 6]} /><meshStandardMaterial color="#4a3020" /></mesh>
          <pointLight position={[45, 14, -groundsLength / 2 + i * 30 + 15]} intensity={1.5} color="#ff6600" distance={30} />
        </group>
      ))}
    </group>
  );
}

function AirportRunwayEnvironment({ totalLength }: { totalLength: number }) {
  const runwayLength = Math.max(totalLength + 120, 240);
  
  return (
    <group position={[0, 0, runwayLength / 2]}>
      {/* Runway surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <planeGeometry args={[40, runwayLength]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
      </mesh>
      {/* Center line markings */}
      {[...Array(Math.ceil(runwayLength / 18))].map((_, i) => (
        <mesh key={`center-${i}`} position={[0, 0.15, -runwayLength / 2 + i * 18]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, 10]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* Edge lights along full length */}
      {[-18, 18].map((x, side) => (
        [...Array(Math.ceil(runwayLength / 15))].map((_, i) => (
          <mesh key={`light-${side}-${i}`} position={[x, 0.5, -runwayLength / 2 + i * 15]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshBasicMaterial color={side === -18 ? '#00ff00' : '#ff0000'} />
          </mesh>
        ))
      ))}
      {/* Terminal buildings on sides */}
      {[-80, 80].map((x, side) => (
        <mesh key={`terminal-${side}`} position={[x, 15, 0]}>
          <boxGeometry args={[50, 30, runwayLength * 0.7]} />
          <meshStandardMaterial color="#3a3a4a" metalness={0.3} />
        </mesh>
      ))}
      {/* Control towers */}
      {[...Array(Math.ceil(runwayLength / 150))].map((_, i) => (
        <group key={`tower-${i}`} position={[70, 0, -runwayLength / 2 + 75 + i * 150]}>
          <mesh position={[0, 18, 0]}><cylinderGeometry args={[5, 6, 36, 8]} /><meshStandardMaterial color="#444444" /></mesh>
          <mesh position={[0, 38, 0]}><cylinderGeometry args={[8, 5, 8, 8]} /><meshStandardMaterial color="#333333" metalness={0.5} /></mesh>
        </group>
      ))}
    </group>
  );
}

function ThemeParkEnvironment({ totalLength }: { totalLength: number }) {
  const parkLength = Math.max(totalLength + 60, 140);
  
  return (
    <group position={[0, 0, parkLength / 2]}>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[150, parkLength]} />
        <meshStandardMaterial color="#2a5a2a" roughness={0.95} />
      </mesh>
      {/* Ferris wheels on both sides */}
      {[-60, 60].map((x, side) => (
        [...Array(Math.ceil(parkLength / 100))].map((_, i) => (
          <group key={`ferris-${side}-${i}`} position={[x, 30, -parkLength / 2 + 50 + i * 100]}>
            <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[22, 1.5, 8, 32]} /><meshStandardMaterial color="#ff4444" metalness={0.5} /></mesh>
            {[...Array(6)].map((_, j) => (
              <mesh key={j} position={[Math.cos(j * 1.047) * 22, Math.sin(j * 1.047) * 22, 0]}>
                <boxGeometry args={[5, 6, 4]} />
                <meshStandardMaterial color={`hsl(${j * 60}, 70%, 50%)`} />
              </mesh>
            ))}
          </group>
        ))
      ))}
      {/* Carousels along center */}
      {[...Array(Math.ceil(parkLength / 70))].map((_, i) => (
        <group key={`carousel-${i}`} position={[0, 5, -parkLength / 2 + 35 + i * 70]}>
          <mesh><cylinderGeometry args={[10, 10, 1, 16]} /><meshStandardMaterial color="#ffcc00" /></mesh>
          {[...Array(6)].map((_, j) => (
            <mesh key={j} position={[Math.cos(j * 1.047) * 7, 4, Math.sin(j * 1.047) * 7]}>
              <boxGeometry args={[1.5, 7, 1.5]} />
              <meshStandardMaterial color={`hsl(${j * 60}, 60%, 50%)`} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function AncientRuinsEnvironment({ totalLength }: { totalLength: number }) {
  const ruinsLength = Math.max(totalLength + 50, 120);
  
  return (
    <group position={[0, 0, ruinsLength / 2]}>
      {/* Stone floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, ruinsLength]} />
        <meshStandardMaterial color="#706050" roughness={0.98} />
      </mesh>
      {/* Columns on both sides */}
      {[-40, 40].map((x, side) => (
        [...Array(Math.ceil(ruinsLength / 20))].map((_, i) => (
          <group key={`col-${side}-${i}`} position={[x, 0, -ruinsLength / 2 + i * 20]}>
            <mesh position={[0, i % 3 === 0 ? 5 : 12, 0]}><cylinderGeometry args={[2, 2.5, i % 3 === 0 ? 10 : 24, 12]} /><meshStandardMaterial color="#a09080" roughness={0.9} /></mesh>
            {i % 3 !== 0 && <mesh position={[0, 25, 0]}><boxGeometry args={[5, 3, 5]} /><meshStandardMaterial color="#908070" roughness={0.9} /></mesh>}
          </group>
        ))
      ))}
      {/* Debris scattered */}
      {[...Array(Math.ceil(ruinsLength / 15))].map((_, i) => (
        <mesh key={`debris-${i}`} position={[(i % 2 === 0 ? -1 : 1) * (20 + i % 4 * 8), 1, -ruinsLength / 2 + i * 15]} rotation={[i * 0.3, i * 0.5, 0]}>
          <boxGeometry args={[3 + i % 2, 2, 3 + i % 3]} />
          <meshStandardMaterial color="#908070" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function ZenGardenEnvironment({ totalLength }: { totalLength: number }) {
  const gardenLength = Math.max(totalLength + 40, 100);
  
  return (
    <group position={[0, 0, gardenLength / 2]}>
      {/* Sand garden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, gardenLength]} />
        <meshStandardMaterial color="#e8e0d0" roughness={1} />
      </mesh>
      {/* Raked lines */}
      {[...Array(Math.ceil(gardenLength / 8))].map((_, i) => (
        <mesh key={i} position={[0, 0.05, -gardenLength / 2 + i * 8]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 0.5]} />
          <meshBasicMaterial color="#d0c8b8" />
        </mesh>
      ))}
      {/* Rock formations */}
      {[...Array(Math.ceil(gardenLength / 35))].map((_, i) => (
        <mesh key={`rock-${i}`} position={[(i % 2 === 0 ? -1 : 1) * 30, 4, -gardenLength / 2 + 17 + i * 35]} rotation={[i * 0.2, i * 0.3, i * 0.15]}>
          <dodecahedronGeometry args={[5, 0]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.85} />
        </mesh>
      ))}
      {/* Bamboo fences on sides */}
      {[-50, 50].map((x, side) => (
        [...Array(Math.ceil(gardenLength / 5))].map((_, i) => (
          <mesh key={`bamboo-${side}-${i}`} position={[x, 5, -gardenLength / 2 + i * 5]}>
            <cylinderGeometry args={[0.3, 0.3, 10, 6]} />
            <meshStandardMaterial color="#5a8a4a" roughness={0.7} />
          </mesh>
        ))
      ))}
    </group>
  );
}

function SkiResortEnvironment({ totalLength }: { totalLength: number }) {
  const resortLength = Math.max(totalLength + 80, 180);
  
  return (
    <group position={[0, 0, resortLength / 2]}>
      {/* Snow ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[150, resortLength]} />
        <meshStandardMaterial color="#f0f5ff" roughness={0.9} />
      </mesh>
      {/* Mountain slopes on sides */}
      {[-85, 85].map((x, side) => (
        <mesh key={`slope-${side}`} position={[x, 35, 0]} rotation={[0, 0, side * 0.4]}>
          <coneGeometry args={[70, 90, 4]} />
          <meshStandardMaterial color="#ffffff" roughness={0.92} />
        </mesh>
      ))}
      {/* Ski lift towers along path */}
      {[-40, 40].map((x, side) => (
        [...Array(Math.ceil(resortLength / 50))].map((_, i) => (
          <mesh key={`lift-${side}-${i}`} position={[x, 18, -resortLength / 2 + 25 + i * 50]}>
            <boxGeometry args={[2.5, 36, 2.5]} />
            <meshStandardMaterial color="#444444" metalness={0.5} />
          </mesh>
        ))
      ))}
      {/* Lodge buildings */}
      {[...Array(Math.ceil(resortLength / 120))].map((_, i) => (
        <group key={`lodge-${i}`} position={[60, 10, -resortLength / 2 + 60 + i * 120]}>
          <mesh><boxGeometry args={[35, 20, 45]} /><meshStandardMaterial color="#8b4513" roughness={0.9} /></mesh>
          <mesh position={[0, 12, 0]}><boxGeometry args={[38, 10, 48]} /><meshStandardMaterial color="#5a3a13" /></mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// NEW ADVANCED IMMERSIVE ENVIRONMENTS
// ============================================================================

function UnderwaterKingdomEnvironment({ totalLength }: { totalLength: number }) {
  const kingdomLength = Math.max(totalLength + 60, 140);
  
  return (
    <group position={[0, 0, kingdomLength / 2]}>
      {/* Ocean floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]}>
        <planeGeometry args={[150, kingdomLength]} />
        <meshStandardMaterial color="#001a33" roughness={0.95} />
      </mesh>
      {/* Coral castle structures on sides */}
      {[-60, 60].map((x, side) => (
        [...Array(Math.ceil(kingdomLength / 60))].map((_, i) => (
          <group key={`castle-${side}-${i}`} position={[x, 20, -kingdomLength / 2 + 30 + i * 60]}>
            <mesh><cylinderGeometry args={[10, 14, 45, 6]} /><meshStandardMaterial color={`hsl(${200 + i * 20}, 60%, 40%)`} roughness={0.7} /></mesh>
            <mesh position={[0, 28, 0]}><coneGeometry args={[12, 20, 6]} /><meshStandardMaterial color={`hsl(${180 + i * 20}, 70%, 50%)`} /></mesh>
          </group>
        ))
      ))}
      {/* Seaweed forest */}
      {[...Array(Math.ceil(kingdomLength / 12))].map((_, i) => (
        <mesh key={`seaweed-${i}`} position={[(i % 2 === 0 ? -1 : 1) * 35, 0, -kingdomLength / 2 + i * 12]} rotation={[0.1 * (i % 3), 0, 0.05]}>
          <boxGeometry args={[0.8, 22, 0.8]} />
          <meshStandardMaterial color="#1a5a3a" transparent opacity={0.7} />
        </mesh>
      ))}
      {/* Bioluminescent particles */}
      {[...Array(50)].map((_, i) => (
        <mesh key={`glow-${i}`} position={[(Math.random() - 0.5) * 120, Math.random() * 35, (Math.random() - 0.5) * kingdomLength]}>
          <sphereGeometry args={[0.6, 8, 8]} />
          <meshBasicMaterial color={`hsl(${180 + Math.random() * 60}, 100%, 70%)`} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function CyberpunkCityEnvironment({ totalLength }: { totalLength: number }) {
  const cityLength = Math.max(totalLength + 40, 120);
  
  return (
    <group position={[0, 0, cityLength / 2]}>
      {/* Neon ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <planeGeometry args={[120, cityLength]} />
        <meshStandardMaterial color="#0a0a0f" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Mega buildings on sides */}
      {[-70, 70].map((x, side) => (
        [...Array(Math.ceil(cityLength / 30))].map((_, i) => (
          <group key={`mega-${side}-${i}`} position={[x, 40 + (i % 4) * 15, -cityLength / 2 + i * 30]}>
            <mesh><boxGeometry args={[28, 80 + (i % 5) * 25, 22]} /><meshStandardMaterial color="#0a0a15" metalness={0.6} roughness={0.4} /></mesh>
            {/* Holographic signs */}
            <mesh position={[side * -14, 20, 0]} rotation={[0, side === -70 ? 0 : Math.PI, 0]}>
              <planeGeometry args={[4, 18]} />
              <meshBasicMaterial color={`hsl(${280 + i * 25}, 100%, 50%)`} transparent opacity={0.8} />
            </mesh>
          </group>
        ))
      ))}
      {/* Neon strips */}
      {[-30, 30].map((x, i) => (
        <mesh key={`neon-${i}`} position={[x, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, cityLength]} />
          <meshBasicMaterial color={i === 0 ? '#ff00ff' : '#00ffff'} />
        </mesh>
      ))}
    </group>
  );
}

function MedievalArenaEnvironment({ totalLength }: { totalLength: number }) {
  const arenaLength = Math.max(totalLength + 60, 150);
  
  return (
    <group position={[0, 0, arenaLength / 2]}>
      {/* Sand floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, arenaLength]} />
        <meshStandardMaterial color="#c2a060" roughness={0.98} />
      </mesh>
      {/* Arena walls on sides */}
      {[-60, 60].map((x, side) => (
        <mesh key={`wall-${side}`} position={[x, 15, 0]}>
          <boxGeometry args={[15, 35, arenaLength]} />
          <meshStandardMaterial color="#6a5a4a" roughness={0.9} />
        </mesh>
      ))}
      {/* Spectator stands */}
      {[-45, 45].map((x, side) => (
        [...Array(Math.ceil(arenaLength / 25))].map((_, i) => (
          <mesh key={`stand-${side}-${i}`} position={[x, 8 + (i % 2) * 4, -arenaLength / 2 + i * 25]} rotation={[0, 0, side * -0.2]}>
            <boxGeometry args={[12, 15, 18]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
        ))
      ))}
      {/* Torch posts */}
      {[...Array(Math.ceil(arenaLength / 35))].map((_, i) => (
        <group key={`torch-${i}`}>
          <mesh position={[-40, 7, -arenaLength / 2 + i * 35]}><cylinderGeometry args={[0.5, 0.5, 12, 6]} /><meshStandardMaterial color="#4a3020" /></mesh>
          <pointLight position={[-40, 15, -arenaLength / 2 + i * 35]} intensity={2} color="#ff6600" distance={35} />
          <mesh position={[40, 7, -arenaLength / 2 + i * 35 + 17]}><cylinderGeometry args={[0.5, 0.5, 12, 6]} /><meshStandardMaterial color="#4a3020" /></mesh>
          <pointLight position={[40, 15, -arenaLength / 2 + i * 35 + 17]} intensity={2} color="#ff6600" distance={35} />
        </group>
      ))}
    </group>
  );
}

function SpaceColonyEnvironment({ totalLength }: { totalLength: number }) {
  const colonyLength = Math.max(totalLength + 50, 130);
  
  return (
    <group position={[0, 0, colonyLength / 2]}>
      {/* Metal floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, colonyLength]} />
        <meshStandardMaterial color="#2a2a3a" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Colony modules on sides */}
      {[-60, 60].map((x, side) => (
        [...Array(Math.ceil(colonyLength / 50))].map((_, i) => (
          <group key={`module-${side}-${i}`} position={[x, 15, -colonyLength / 2 + 25 + i * 50]}>
            <mesh><cylinderGeometry args={[12, 12, 30, 12]} /><meshStandardMaterial color="#3a3a4a" metalness={0.6} roughness={0.3} /></mesh>
            <mesh position={[0, 0, side === -60 ? 12 : -12]}><sphereGeometry args={[10, 12, 12]} /><meshStandardMaterial color="#4a4a5a" metalness={0.5} transparent opacity={0.8} /></mesh>
          </group>
        ))
      ))}
      {/* Glass dome sections */}
      {[...Array(Math.ceil(colonyLength / 70))].map((_, i) => (
        <mesh key={`dome-${i}`} position={[0, 25, -colonyLength / 2 + 35 + i * 70]}>
          <sphereGeometry args={[30, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#88ccff" transparent opacity={0.3} metalness={0.1} roughness={0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Power conduits */}
      {[-30, 30].map((x, i) => (
        <mesh key={`conduit-${i}`} position={[x, 6, 0]}>
          <boxGeometry args={[1.5, 10, colonyLength]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function TropicalBeachEnvironment({ totalLength }: { totalLength: number }) {
  const beachLength = Math.max(totalLength + 50, 130);
  
  return (
    <group position={[0, 0, beachLength / 2]}>
      {/* Sandy beach */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[120, beachLength]} />
        <meshStandardMaterial color="#f4d03f" roughness={0.95} />
      </mesh>
      {/* Ocean on one side */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-75, -0.5, 0]}>
        <planeGeometry args={[70, beachLength + 60]} />
        <meshStandardMaterial color="#006994" transparent opacity={0.85} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Palm trees on both sides */}
      {[-50, 50].map((x, side) => (
        [...Array(Math.ceil(beachLength / 25))].map((_, i) => (
          <group key={`palm-${side}-${i}`} position={[x + (i % 3) * 10, 0, -beachLength / 2 + i * 25]}>
            <mesh position={[0, 7, 0]}><cylinderGeometry args={[0.7, 1.2, 14, 8]} /><meshStandardMaterial color="#8b4513" roughness={0.8} /></mesh>
            <mesh position={[0, 16, 0]}><sphereGeometry args={[6, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#228b22" roughness={0.7} /></mesh>
          </group>
        ))
      ))}
      {/* Beach huts */}
      {[...Array(Math.ceil(beachLength / 60))].map((_, i) => (
        <group key={`hut-${i}`} position={[45, 4, -beachLength / 2 + 30 + i * 60]}>
          <mesh><boxGeometry args={[12, 8, 10]} /><meshStandardMaterial color="#deb887" roughness={0.9} /></mesh>
          <mesh position={[0, 6, 0]} rotation={[0.1, 0, 0]}><boxGeometry args={[14, 5, 12]} /><meshStandardMaterial color="#cd853f" roughness={0.85} /></mesh>
        </group>
      ))}
      {/* Beach umbrellas */}
      {[...Array(Math.ceil(beachLength / 35))].map((_, i) => (
        <group key={`umbrella-${i}`} position={[-20 + (i % 2) * 40, 0, -beachLength / 2 + i * 35]}>
          <mesh position={[0, 5, 0]}><cylinderGeometry args={[0.25, 0.25, 10, 8]} /><meshStandardMaterial color="#8b4513" /></mesh>
          <mesh position={[0, 10, 0]}><coneGeometry args={[5, 3, 8]} /><meshStandardMaterial color={`hsl(${(i * 60) % 360}, 70%, 50%)`} /></mesh>
        </group>
      ))}
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
  towerSpacing,
  labelVisibleEnd,
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
  towerSpacing: number;
  labelVisibleEnd: number;
}) {
  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <fog attach="fog" args={[backgroundColor, 50, 180]} />
      
      <StarField />
      <FloatingParticles />
      
      {/* Background Environment Preset */}
      <BackgroundEnvironment preset={backgroundPreset} totalLength={towers.length * towerSpacing} />
      
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
        // Labels persist for all revealed towers (from start up to current progress)
        const labelVisible = index <= labelVisibleEnd && itemReveal > 0.25;
        
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
            showLabel={showLabels3D && labelVisible}
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
  
  // Labels should persist for all revealed towers, not just visible range
  const labelVisibleEnd = items.length - 1; // All towers that have been revealed
  
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
          towerSpacing={towerSpacing}
          labelVisibleEnd={labelVisibleEnd}
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
