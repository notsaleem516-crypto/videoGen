// ============================================================================
// TOWER CHART 3D SCENE - 3D Ranking visualization with Three.js
// ============================================================================

import React, { useRef, useMemo, useEffect, useState, Suspense, Component } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Box, Plane, Billboard, Stars, Float, Cone, Cylinder, Sphere, Torus, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { TowerChart3DBlock, AnimationPhase } from '../schemas';
import type { MotionProfileType } from '../utils/animations';

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
  // Static stars - no animation for faster rendering
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
  // Static particles - no per-frame updates for faster rendering
  const count = 30;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = Math.random() * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
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

// ============================================================================
// PRESET BACKGROUND COMPONENTS
// ============================================================================

/** Cyber Grid - Neon grid floor with glow lines - Static for faster rendering */
function CyberGridBackground({ baseColor }: { baseColor: string }) {
  return (
    <group>
      {/* Main neon grid floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshBasicMaterial color="#0a0a2a" transparent opacity={0.95} />
      </mesh>
      
      {/* Static grid lines */}
      <group>
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

/** Ocean Waves - Static water plane for deterministic rendering */
function OceanWavesBackground() {
  // Static water - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Static water surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[300, 300]} />
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

/** Abstract Waves - Static wave/mesh terrain for deterministic rendering */
function AbstractWavesBackground() {
  // Static terrain - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Static terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
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

/** Space Station - Static sci-fi interior for deterministic rendering */
function SpaceStationBackground() {
  // Static ring - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Station floor with panels */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#1a1a2a" metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* Panel lines */}
      <gridHelper args={[400, 40, '#3a3a5a', '#2a2a4a']} position={[0, -0.4, 0]} />
      
      {/* Static ring structure */}
      <group position={[0, 40, -100]}>
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

// ============================================================================
// ADVANCED PRESET BACKGROUND COMPONENTS
// ============================================================================

/** Aurora Borealis - Static northern lights for deterministic rendering */
function AuroraBorealisBackground() {
  // Static aurora - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Dark ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0a0a1a" metalness={0.2} roughness={0.8} />
      </mesh>
      
      {/* Static aurora curtains */}
      <group position={[0, 40, -80]}>
        {[...Array(5)].map((_, i) => (
          <mesh
            key={i}
            position={[i * 25 - 50, 0, -i * 10]}
            rotation={[0, 0, Math.PI / 12 * (i - 2)]}
          >
            <planeGeometry args={[40, 60]} />
            <meshBasicMaterial
              color={['#00ff88', '#00ffaa', '#00ffcc', '#88ff00', '#aaff00'][i]}
              transparent
              opacity={0.15 + i * 0.03}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
      
      {/* Aurora glow on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, -60]}>
        <planeGeometry args={[200, 100]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.1} />
      </mesh>
      
      {/* Snow-capped mountains silhouette */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Cone
          key={i}
          args={[20 + Math.random() * 20, 30 + Math.random() * 20, 4]}
          position={[-150 + i * 40, 15, -120]}
          rotation={[0, Math.PI / 4, 0]}
        >
          <meshStandardMaterial color="#1a1a2a" metalness={0.1} roughness={0.9} />
        </Cone>
      ))}
    </group>
  );
}

/** Volcanic Inferno - Static lava pools for deterministic rendering */
function VolcanicInfernoBackground() {
  // Static lava - no time-based animation for GPU rendering consistency
  const rocks = useMemo(() => {
    const result = [];
    for (let i = 0; i < 25; i++) {
      result.push({
        x: (Math.random() - 0.5) * 200,
        z: -30 - Math.random() * 120,
        scale: 2 + Math.random() * 8,
        height: 3 + Math.random() * 12,
      });
    }
    return result;
  }, []);
  
  return (
    <group>
      {/* Static lava ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial 
          color="#ff3300" 
          emissive="#ff2200" 
          emissiveIntensity={0.8}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
      
      {/* Dark cooled lava patches */}
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[(Math.random() - 0.5) * 150, 0.1, (Math.random() - 0.5) * 150]}
        >
          <circleGeometry args={[5 + Math.random() * 10, 8]} />
          <meshStandardMaterial color="#1a0a0a" metalness={0.2} roughness={0.9} />
        </mesh>
      ))}
      
      {/* Volcanic rocks */}
      {rocks.map((rock, i) => (
        <Cone
          key={i}
          args={[rock.scale, rock.height, 5 + Math.floor(Math.random() * 3)]}
          position={[rock.x, rock.height / 2, rock.z]}
          rotation={[Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.2]}
        >
          <meshStandardMaterial 
            color="#2a1a1a" 
            metalness={0.3} 
            roughness={0.8}
          />
        </Cone>
      ))}
      
      {/* Distant volcano */}
      <Cone args={[40, 60, 6]} position={[0, 30, -150]}>
        <meshStandardMaterial color="#1a0a0a" metalness={0.2} roughness={0.9} />
      </Cone>
      <Cone args={[8, 15, 6]} position={[0, 68, -150]}>
        <meshStandardMaterial 
          color="#ff4400" 
          emissive="#ff2200" 
          emissiveIntensity={1}
        />
      </Cone>
      
      {/* Fire light */}
      <pointLight position={[0, 50, -100]} intensity={2} color="#ff4400" distance={200} />
      
      {/* Smoke/ash layer */}
      <mesh position={[0, 35, -80]}>
        <planeGeometry args={[400, 120]} />
        <meshBasicMaterial color="#2a1a1a" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

/** Crystal Caves - Static crystalline formations for deterministic rendering */
function CrystalCavesBackground() {
  const crystals = useMemo(() => {
    const result = [];
    for (let i = 0; i < 50; i++) {
      result.push({
        x: (Math.random() - 0.5) * 250,
        z: -20 - Math.random() * 120,
        height: 5 + Math.random() * 25,
        radius: 0.5 + Math.random() * 2,
        rotation: Math.random() * Math.PI,
        color: ['#4a90d9', '#9b59b6', '#3498db', '#1abc9c', '#e74c3c'][Math.floor(Math.random() * 5)],
      });
    }
    return result;
  }, []);
  
  // Static crystals - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Cave floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0a0a1a" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Static crystal formations */}
      {crystals.map((crystal, i) => (
        <group key={i} position={[crystal.x, 0, crystal.z]}>
          <Cone
            args={[crystal.radius, crystal.height, 6]}
            position={[0, crystal.height / 2, 0]}
            rotation={[Math.random() * 0.3 - 0.15, crystal.rotation, Math.random() * 0.3 - 0.15]}
          >
            <meshPhysicalMaterial
              color={crystal.color}
              metalness={0.1}
              roughness={0.1}
              transmission={0.6}
              thickness={2}
              emissive={crystal.color}
              emissiveIntensity={0.3}
            />
          </Cone>
        </group>
      ))}
      
      {/* Large crystal clusters */}
      <group position={[-60, 0, -80]}>
        {[0, 1, 2].map((i) => (
          <Cone
            key={i}
            args={[3, 20 + i * 5, 6]}
            position={[i * 8 - 8, 10 + i * 2, i * 3]}
            rotation={[0.1 * i, i * 0.5, 0.05 * i]}
          >
            <meshPhysicalMaterial
              color="#8b5cf6"
              metalness={0.1}
              roughness={0.1}
              transmission={0.7}
              thickness={3}
              emissive="#8b5cf6"
              emissiveIntensity={0.4}
            />
          </Cone>
        ))}
      </group>
      
      {/* Static glowing orbs */}
      {Array.from({ length: 12 }).map((_, i) => (
        <group key={i}>
          <Sphere
            args={[0.8, 16, 16]}
            position={[
              Math.sin(i * 1.2) * 50,
              8 + Math.cos(i * 0.8) * 5,
              -40 + Math.cos(i * 1.5) * 40
            ]}
          >
            <meshBasicMaterial color={['#8b5cf6', '#3b82f6', '#ec4899'][i % 3]} transparent opacity={0.6} />
          </Sphere>
        </group>
      ))}
    </group>
  );
}

/** Desert Dunes - Static sand dunes for deterministic rendering */
function DesertDunesBackground() {
  // Static dunes - no time-based animation for GPU rendering consistency
  const dunes = useMemo(() => {
    const result = [];
    for (let i = 0; i < 15; i++) {
      result.push({
        x: -180 + i * 25 + Math.random() * 10,
        z: -50 - Math.random() * 100,
        width: 30 + Math.random() * 40,
        height: 8 + Math.random() * 15,
      });
    }
    return result;
  }, []);
  
  return (
    <group>
      {/* Static sand terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 300]} />
        <meshStandardMaterial color="#c4a35a" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Large dunes */}
      {dunes.map((dune, i) => (
        <Cone
          key={i}
          args={[dune.width, dune.height, 6]}
          position={[dune.x, dune.height / 2, dune.z]}
          rotation={[0, Math.PI / 6 * i, 0]}
        >
          <meshStandardMaterial 
            color={`hsl(40, ${50 + i * 2}%, ${55 + i}%)`}
            metalness={0.05}
            roughness={0.95}
          />
        </Cone>
      ))}
      
      {/* Heat shimmer plane */}
      <mesh position={[0, 3, -50]}>
        <planeGeometry args={[350, 100]} />
        <meshBasicMaterial color="#f4d03f" transparent opacity={0.08} />
      </mesh>
      
      {/* Sun glow */}
      <mesh position={[80, 50, -180]}>
        <circleGeometry args={[30, 32]} />
        <meshBasicMaterial color="#f5b041" transparent opacity={0.4} />
      </mesh>
      <mesh position={[80, 50, -180]}>
        <circleGeometry args={[20, 32]} />
        <meshBasicMaterial color="#f7dc6f" transparent opacity={0.6} />
      </mesh>
      
      {/* Distant pyramids */}
      <Cone args={[15, 25, 4]} rotation={[0, Math.PI / 4, 0]} position={[-100, 12, -130]}>
        <meshStandardMaterial color="#b8956b" metalness={0.1} roughness={0.9} />
      </Cone>
      <Cone args={[12, 20, 4]} rotation={[0, Math.PI / 4, 0]} position={[-80, 10, -140]}>
        <meshStandardMaterial color="#c4a070" metalness={0.1} roughness={0.9} />
      </Cone>
    </group>
  );
}

/** Neon Tokyo - Static cyberpunk Japanese city for deterministic rendering */
function NeonTokyoBackground() {
  const buildings = useMemo(() => {
    const result = [];
    for (let i = 0; i < 40; i++) {
      result.push({
        x: -150 + (i % 10) * 30 + Math.random() * 10,
        z: -40 - Math.floor(i / 10) * 25 - Math.random() * 15,
        width: 6 + Math.random() * 10,
        height: 20 + Math.random() * 60,
        depth: 6 + Math.random() * 10,
        neonColor: ['#ff0066', '#00ffff', '#ff6600', '#6600ff', '#00ff66'][Math.floor(Math.random() * 5)],
      });
    }
    return result;
  }, []);
  
  // Static neon - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Wet street */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0a0a15" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Street reflection lines */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={`line-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-95 + i * 10, 0.01, 0]}>
          <planeGeometry args={[0.3, 150]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
      ))}
      
      {/* Buildings */}
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <Box args={[b.width, b.height, b.depth]} position={[0, b.height / 2, 0]}>
            <meshStandardMaterial color="#0a0a15" metalness={0.5} roughness={0.5} />
          </Box>
          
          {/* Static neon strips */}
          <mesh
            position={[b.width / 2 + 0.1, b.height * 0.6, 0]}
          >
            <planeGeometry args={[0.1, b.height * 0.4]} />
            <meshBasicMaterial color={b.neonColor} transparent opacity={0.8} />
          </mesh>
          
          {/* Window lights */}
          {Array.from({ length: Math.floor(b.height / 8) }).map((_, w) => (
            <mesh key={`win-${w}`} position={[b.width / 2 + 0.2, 5 + w * 8, 0]}>
              <planeGeometry args={[b.width * 0.8, 2]} />
              <meshBasicMaterial color="#f4d03f" transparent opacity={0.3 + Math.random() * 0.3} />
            </mesh>
          ))}
        </group>
      ))}
      
      {/* Japanese gate (Torii) */}
      <group position={[0, 0, -30]}>
        <Box args={[2, 20, 2]} position={[-12, 10, 0]}>
          <meshStandardMaterial color="#cc0000" metalness={0.3} roughness={0.7} />
        </Box>
        <Box args={[2, 20, 2]} position={[12, 10, 0]}>
          <meshStandardMaterial color="#cc0000" metalness={0.3} roughness={0.7} />
        </Box>
        <Box args={[30, 3, 3]} position={[0, 19, 0]}>
          <meshStandardMaterial color="#cc0000" metalness={0.3} roughness={0.7} />
        </Box>
        <Box args={[35, 2, 2]} position={[0, 22, 0]}>
          <meshStandardMaterial color="#cc0000" metalness={0.3} roughness={0.7} />
        </Box>
      </group>
      
      {/* Rain effect particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={200}
            array={new Float32Array(200 * 3).map((_, i) => 
              i % 3 === 0 ? (Math.random() - 0.5) * 200 :
              i % 3 === 1 ? Math.random() * 60 :
              (Math.random() - 0.5) * 150
            )}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.15} color="#4fc3f7" transparent opacity={0.4} />
      </points>
      
      {/* City glow */}
      <mesh position={[0, 25, -100]}>
        <planeGeometry args={[350, 100]} />
        <meshBasicMaterial color="#ff0066" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

/** Floating Islands - Static sky islands for deterministic rendering */
function FloatingIslandsBackground() {
  const islands = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      result.push({
        x: (Math.random() - 0.5) * 250,
        y: 15 + Math.random() * 35,
        z: -40 - Math.random() * 100,
        radius: 8 + Math.random() * 15,
        thickness: 3 + Math.random() * 5,
      });
    }
    return result;
  }, []);
  
  // Static islands - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Cloud layer below */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshBasicMaterial color="#e8e8f0" transparent opacity={0.6} />
      </mesh>
      
      {/* Cloud wisps */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Sphere
          key={i}
          args={[10 + Math.random() * 20, 8, 8]}
          position={[
            (Math.random() - 0.5) * 300,
            -15 + Math.random() * 10,
            (Math.random() - 0.5) * 200
          ]}
        >
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </Sphere>
      ))}
      
      {/* Static floating islands */}
      {islands.map((island, i) => (
        <group key={i} position={[island.x, island.y, island.z]}>
          {/* Island base */}
          <Cylinder args={[island.radius, island.radius * 0.7, island.thickness, 8]}>
            <meshStandardMaterial color="#5a4a3a" metalness={0.1} roughness={0.9} />
          </Cylinder>
          
          {/* Grass top */}
          <Cylinder args={[island.radius * 0.9, island.radius, 1, 8]} position={[0, island.thickness / 2 + 0.5, 0]}>
            <meshStandardMaterial color="#3a7a3a" metalness={0.1} roughness={0.8} />
          </Cylinder>
          
          {/* Trees on island */}
          {island.radius > 10 && Array.from({ length: 3 }).map((_, t) => (
            <group key={t} position={[(Math.random() - 0.5) * island.radius, island.thickness / 2 + 1, (Math.random() - 0.5) * island.radius]}>
              <Cylinder args={[0.3, 0.4, 3, 6]} position={[0, 1.5, 0]}>
                <meshStandardMaterial color="#4a3a2a" />
              </Cylinder>
              <Cone args={[1.5, 4, 6]} position={[0, 4.5, 0]}>
                <meshStandardMaterial color="#2a6a3a" />
              </Cone>
            </group>
          ))}
          
          {/* Static waterfall particles */}
          {island.radius > 12 && (
            <points position={[island.radius * 0.5, 0, 0]}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={50}
                  array={new Float32Array(50 * 3).map((_, idx) =>
                    idx % 3 === 0 ? Math.random() * 2 :
                    idx % 3 === 1 ? Math.random() * 30 :
                    Math.random() * 2
                  )}
                  itemSize={3}
                />
              </bufferGeometry>
              <pointsMaterial size={0.3} color="#4fc3f7" transparent opacity={0.6} />
            </points>
          )}
        </group>
      ))}
      
      {/* Sun rays */}
      <mesh position={[50, 60, -150]} rotation={[0, 0, Math.PI / 6]}>
        <planeGeometry args={[100, 2]} />
        <meshBasicMaterial color="#f7dc6f" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

/** Deep Ocean - Static underwater environment for deterministic rendering */
function DeepOceanBackground() {
  const bubblePositions = useMemo(() => {
    const pos = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = Math.random() * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    return pos;
  }, []);
  
  // Static ocean - no time-based animation for GPU rendering consistency
  const coral = useMemo(() => {
    const result = [];
    for (let i = 0; i < 30; i++) {
      result.push({
        x: (Math.random() - 0.5) * 200,
        z: -30 - Math.random() * 100,
        height: 2 + Math.random() * 8,
        branches: 2 + Math.floor(Math.random() * 4),
        color: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'][Math.floor(Math.random() * 4)],
      });
    }
    return result;
  }, []);
  
  return (
    <group>
      {/* Static ocean floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#1a3a4a" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Deep water fog layers */}
      <mesh position={[0, 20, -100]}>
        <planeGeometry args={[400, 150]} />
        <meshBasicMaterial color="#0a2a3a" transparent opacity={0.3} />
      </mesh>
      
      {/* Coral formations */}
      {coral.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          {Array.from({ length: c.branches }).map((_, b) => (
            <Cylinder
              key={b}
              args={[0.2, 0.5, c.height, 6]}
              position={[
                Math.cos(b * Math.PI / 2) * 0.5,
                c.height / 2,
                Math.sin(b * Math.PI / 2) * 0.5
              ]}
              rotation={[Math.random() * 0.3 - 0.15, 0, Math.random() * 0.3 - 0.15]}
            >
              <meshStandardMaterial color={c.color} metalness={0.1} roughness={0.8} />
            </Cylinder>
          ))}
        </group>
      ))}
      
      {/* Seaweed */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Cylinder
          key={`seaweed-${i}`}
          args={[0.1, 0.2, 5 + Math.random() * 5, 4]}
          position={[(Math.random() - 0.5) * 150, 2.5, -20 - Math.random() * 80]}
        >
          <meshStandardMaterial color="#2a5a3a" metalness={0.1} roughness={0.9} />
        </Cylinder>
      ))}
      
      {/* Static bubbles */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={150} array={bubblePositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.5} color="#ffffff" transparent opacity={0.4} sizeAttenuation />
      </points>
      
      {/* Light rays from above */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={`ray-${i}`}
          position={[-80 + i * 40, 50, -50]}
          rotation={[0, 0, Math.PI / 8 * (i - 2)]}
        >
          <planeGeometry args={[3, 80]} />
          <meshBasicMaterial color="#4fc3f7" transparent opacity={0.05} side={THREE.DoubleSide} />
        </mesh>
      ))}
      
      {/* Distant fish school (simplified) */}
      <points position={[0, 15, -80]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={30}
            array={new Float32Array(30 * 3).map(() => (Math.random() - 0.5) * 40)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.8} color="#f4d03f" transparent opacity={0.5} />
      </points>
    </group>
  );
}

/** Galaxy Nebula - Colorful space clouds */
function GalaxyNebulaBackground() {
  // Static nebula - no time-based animation for GPU rendering consistency
  const nebulaClouds = useMemo(() => {
    const result = [];
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8'];
    for (let i = 0; i < 25; i++) {
      result.push({
        position: [
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 100,
          -50 - Math.random() * 150,
        ] as [number, number, number],
        scale: 10 + Math.random() * 30,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.1 + Math.random() * 0.15,
      });
    }
    return result;
  }, []);
  
  return (
    <group>
      {/* Deep space background */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial color="#050510" />
      </mesh>
      
      {/* Nebula clouds */}
      <group ref={nebulaRef}>
        {nebulaClouds.map((cloud, i) => (
          <Sphere
            key={i}
            args={[cloud.scale, 16, 16]}
            position={cloud.position}
          >
            <meshBasicMaterial
              color={cloud.color}
              transparent
              opacity={cloud.opacity}
            />
          </Sphere>
        ))}
      </group>
      
      {/* Bright stars */}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh
          key={`star-${i}`}
          position={[
            (Math.random() - 0.5) * 300,
            Math.random() * 100,
            -50 - Math.random() * 200,
          ]}
        >
          <sphereGeometry args={[0.3 + Math.random() * 0.5, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      
      {/* Distant galaxies */}
      {Array.from({ length: 5 }).map((_, i) => (
        <group key={`galaxy-${i}`} position={[(Math.random() - 0.5) * 200, 30 + Math.random() * 30, -150]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[3, 8, 32]} />
            <meshBasicMaterial color={['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffeaa7', '#fd79a8'][i]} transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          <Sphere args={[2, 16, 16]}>
            <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
          </Sphere>
        </group>
      ))}
      
      {/* Cosmic dust */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={500}
            array={new Float32Array(500 * 3).map(() => (Math.random() - 0.5) * 400)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.15} color="#ffffff" transparent opacity={0.3} />
      </points>
    </group>
  );
}

/** Matrix Rain - Digital rain effect */
function MatrixRainBackground() {
  // Static matrix rain - no time-based animation for GPU rendering consistency
  const columns = useMemo(() => {
    const result = [];
    for (let i = 0; i < 40; i++) {
      result.push({
        x: -200 + i * 10,
        speed: 0.5 + Math.random() * 0.5,
        length: 10 + Math.random() * 20,
      });
    }
    return result;
  }, []);
  
  return (
    <group>
      {/* Dark ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#000000" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* Ground grid reflection */}
      <gridHelper args={[400, 40, '#003300', '#001a00']} position={[0, 0.01, 0]} />
      
      {/* Static matrix rain columns */}
      {columns.map((col, i) => (
        <points
          key={i}
          position={[col.x, 0, 0]}
        >
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={Math.floor(col.length)}
              array={new Float32Array(Math.floor(col.length) * 3).map((_, idx) =>
                idx % 3 === 0 ? 0 :
                idx % 3 === 1 ? 40 + Math.random() * 60 :
                Math.random() * 100 - 50
              )}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial size={0.3} color="#00ff00" transparent opacity={0.8} />
        </points>
      ))}
      
      {/* Central glow */}
      <mesh position={[0, 30, -80]}>
        <planeGeometry args={[200, 100]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={0.05} />
      </mesh>
      
      {/* Binary wall backdrop */}
      <mesh position={[0, 25, -120]}>
        <planeGeometry args={[300, 80]} />
        <meshBasicMaterial color="#003300" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/** Ice Glacier - Frozen environment with ice formations */
function IceGlacierBackground() {
  // Static ice - no time-based animation for GPU rendering consistency
  const icebergs = useMemo(() => {
    const result = [];
    for (let i = 0; i < 15; i++) {
      result.push({
        x: (Math.random() - 0.5) * 200,
        z: -30 - Math.random() * 120,
        width: 10 + Math.random() * 30,
        height: 8 + Math.random() * 20,
      });
    }
    return result;
  }, []);
  
  return (
    <group>
      {/* Static frozen ocean/ice sheet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshPhysicalMaterial 
          color="#a8d8ea" 
          metalness={0.1}
          roughness={0.2}
          transmission={0.3}
          thickness={2}
        />
      </mesh>
      
      {/* Ice cracks */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}
          position={[(Math.random() - 0.5) * 200, 0.02, (Math.random() - 0.5) * 200]}
        >
          <planeGeometry args={[0.1, 20 + Math.random() * 40]} />
          <meshBasicMaterial color="#4a6a8a" transparent opacity={0.5} />
        </mesh>
      ))}
      
      {/* Icebergs */}
      {icebergs.map((iceberg, i) => (
        <group key={i} position={[iceberg.x, 0, iceberg.z]}>
          {/* Underwater part */}
          <Cone
            args={[iceberg.width * 0.8, iceberg.height * 0.3, 5]}
            position={[0, -iceberg.height * 0.15, 0]}
            rotation={[Math.PI, 0, 0]}
          >
            <meshPhysicalMaterial color="#4a8ab0" metalness={0.1} roughness={0.3} transmission={0.4} />
          </Cone>
          
          {/* Above water part */}
          <mesh>
            <icosahedronGeometry args={[iceberg.width / 2, 0]} />
            <meshPhysicalMaterial
              color="#e8f4f8"
              metalness={0.1}
              roughness={0.2}
              transmission={0.5}
              thickness={2}
            />
          </mesh>
        </group>
      ))}
      
      {/* Snow particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={200}
            array={new Float32Array(200 * 3).map((_, i) =>
              i % 3 === 0 ? (Math.random() - 0.5) * 300 :
              i % 3 === 1 ? Math.random() * 80 :
              (Math.random() - 0.5) * 200
            )}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.2} color="#ffffff" transparent opacity={0.6} />
      </points>
      
      {/* Aurora-like glow */}
      <mesh position={[0, 40, -80]} rotation={[0.2, 0, 0]}>
        <planeGeometry args={[200, 60]} />
        <meshBasicMaterial color="#4fc3f7" transparent opacity={0.1} />
      </mesh>
      
      {/* Northern lights effect */}
      <mesh position={[-50, 50, -100]} rotation={[0.3, 0, 0.2]}>
        <planeGeometry args={[80, 40]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

/** Steampunk Gears - Industrial Victorian machinery */
function SteampunkGearsBackground() {
  // Static gears - no time-based animation for GPU rendering consistency
  const pipes = useMemo(() => {
    const result = [];
    for (let i = 0; i < 15; i++) {
      result.push({
        start: [(Math.random() - 0.5) * 150, Math.random() * 40, -50 - Math.random() * 80] as [number, number, number],
        length: 30 + Math.random() * 50,
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
      });
    }
    return result;
  }, []);
  
  return (
    <group>
      {/* Brass floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#3a2a1a" metalness={0.8} roughness={0.4} />
      </mesh>
      
      {/* Floor rivets pattern */}
      <gridHelper args={[400, 20, '#5a4a3a', '#4a3a2a']} position={[0, 0.01, 0]} />
      
      {/* Static gears */}
      <group position={[0, 25, -80]}>
        {[...Array(8)].map((_, i) => (
          <group key={i} position={[(i - 4) * 20, (i % 2) * 15, -i * 5]}>
            {/* Gear body */}
            <Torus args={[8 + i * 2, 1, 8, 32]}>
              <meshStandardMaterial color="#b8860b" metalness={0.9} roughness={0.3} />
            </Torus>
            {/* Gear teeth */}
            {[...Array(12)].map((_, t) => (
              <Box
                key={t}
                args={[1.5, 3, 2]}
                position={[
                  Math.cos(t * Math.PI / 6) * (10 + i * 2),
                  Math.sin(t * Math.PI / 6) * (10 + i * 2),
                  0
                ]}
              >
                <meshStandardMaterial color="#8b7500" metalness={0.9} roughness={0.3} />
              </Box>
            ))}
          </group>
        ))}
      </group>
      
      {/* Pipes */}
      {pipes.map((pipe, i) => (
        <Cylinder
          key={i}
          args={[1, 1, pipe.length, 8]}
          position={pipe.start}
          rotation={pipe.rotation}
        >
          <meshStandardMaterial color="#8b4513" metalness={0.7} roughness={0.4} />
        </Cylinder>
      ))}
      
      {/* Steam vents */}
      {Array.from({ length: 5 }).map((_, i) => (
        <group key={`steam-${i}`} position={[-80 + i * 40, 0, -30]}>
          <Cylinder args={[2, 2, 5, 8]} position={[0, 2.5, 0]}>
            <meshStandardMaterial color="#654321" metalness={0.8} roughness={0.4} />
          </Cylinder>
          {/* Steam particles */}
          <points position={[0, 8, 0]}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={20}
                array={new Float32Array(20 * 3).map(() => (Math.random() - 0.5) * 5)}
                itemSize={3}
              />
            </bufferGeometry>
            <pointsMaterial size={0.5} color="#d4d4d4" transparent opacity={0.4} />
          </points>
        </group>
      ))}
      
      {/* Victorian lamp posts */}
      {[-40, 40].map((x, i) => (
        <group key={`lamp-${i}`} position={[x, 0, -20]}>
          <Cylinder args={[0.5, 0.7, 15, 8]} position={[0, 7.5, 0]}>
            <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.3} />
          </Cylinder>
          <Sphere args={[2, 8, 8]} position={[0, 16, 0]}>
            <meshBasicMaterial color="#f4d03f" transparent opacity={0.8} />
          </Sphere>
          <pointLight position={[0, 16, 0]} intensity={1} color="#f4d03f" distance={30} />
        </group>
      ))}
      
      {/* Industrial haze */}
      <mesh position={[0, 20, -100]}>
        <planeGeometry args={[350, 100]} />
        <meshBasicMaterial color="#8b7355" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

/** Alien Planet - Extraterrestrial landscape */
function AlienPlanetBackground() {
  // Static alien planet - no time-based animation for GPU rendering consistency
  const alienFlora = useMemo(() => {
    const result = [];
    for (let i = 0; i < 25; i++) {
      result.push({
        x: (Math.random() - 0.5) * 200,
        z: -20 - Math.random() * 100,
        height: 5 + Math.random() * 15,
        segments: 3 + Math.floor(Math.random() * 4),
        color: ['#ff00ff', '#00ffff', '#ff6600', '#66ff00', '#ff0066'][Math.floor(Math.random() * 5)],
      });
    }
    return result;
  }, []);
  
  return (
    <group>
      {/* Alien ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#1a0a2a" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Bioluminescent ground patches */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[(Math.random() - 0.5) * 200, 0.02, (Math.random() - 0.5) * 150]}
        >
          <circleGeometry args={[3 + Math.random() * 5, 8]} />
          <meshBasicMaterial color={['#ff00ff', '#00ffff', '#66ff00'][i % 3]} transparent opacity={0.3} />
        </mesh>
      ))}
      
      {/* Static alien tentacles/flora */}
      <group>
        {alienFlora.map((flora, i) => (
          <group key={i} position={[flora.x, 0, flora.z]}>
            <Cylinder
              args={[0.5, 1.5, flora.height, flora.segments]}
              position={[0, flora.height / 2, 0]}
            >
              <meshStandardMaterial
                color={flora.color}
                emissive={flora.color}
                emissiveIntensity={0.5}
                metalness={0.3}
                roughness={0.7}
              />
            </Cylinder>
            {/* Glowing bulb on top */}
            <Sphere args={[1.5, 8, 8]} position={[0, flora.height + 1, 0]}>
              <meshBasicMaterial color={flora.color} transparent opacity={0.7} />
            </Sphere>
          </group>
        ))}
      </group>
      
      {/* Static floating rocks */}
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={i}>
          <mesh position={[
            (Math.random() - 0.5) * 200,
            15 + Math.random() * 30,
            -50 - Math.random() * 80
          ]}>
            <icosahedronGeometry args={[3 + Math.random() * 5, 0]} />
            <meshStandardMaterial color="#4a3a5a" metalness={0.4} roughness={0.6} />
          </mesh>
        </group>
      ))}
      
      {/* Alien sky with multiple moons */}
      <Sphere args={[15, 16, 16]} position={[60, 50, -150]}>
        <meshBasicMaterial color="#ff6600" transparent opacity={0.8} />
      </Sphere>
      <Sphere args={[8, 16, 16]} position={[-40, 40, -130]}>
        <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
      </Sphere>
      <Sphere args={[5, 16, 16]} position={[20, 60, -140]}>
        <meshBasicMaterial color="#ff00ff" transparent opacity={0.5} />
      </Sphere>
      
      {/* Spore particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={100}
            array={new Float32Array(100 * 3).map(() => (Math.random() - 0.5) * 250)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.4} color="#ff00ff" transparent opacity={0.5} />
      </points>
    </group>
  );
}

/** Tron Grid - Iconic Tron-style light grid */
function TronGridBackground() {
  // Static tron grid - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Main grid floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Static light grid lines */}
      <group>
        {Array.from({ length: 40 }).map((_, i) => (
          <mesh key={`x-${i}`} position={[-200 + i * 10, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <planeGeometry args={[400, 0.15]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
          </mesh>
        ))}
        {Array.from({ length: 40 }).map((_, i) => (
          <mesh key={`z-${i}`} position={[0, 0, -200 + i * 10]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[400, 0.15]} />
            <meshBasicMaterial color="#ff6600" transparent opacity={0.4} />
          </mesh>
        ))}
      </group>
      
      {/* Tower-like structures */}
      {[-80, -40, 0, 40, 80].map((x, i) => (
        <group key={i} position={[x, 0, -80]}>
          <Box args={[4, 40, 4]} position={[0, 20, 0]}>
            <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.1} />
          </Box>
          {/* Static glowing edges */}
          <mesh position={[2.1, 20, 0]}>
            <planeGeometry args={[0.2, 40]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
          </mesh>
          <mesh position={[-2.1, 20, 0]}>
            <planeGeometry args={[0.2, 40]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
      
      {/* Light trails */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={`trail-${i}`}
          position={[(Math.random() - 0.5) * 150, 0.02, (Math.random() - 0.5) * 150]}
          rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}
        >
          <planeGeometry args={[0.3, 50 + Math.random() * 50]} />
          <meshBasicMaterial color={['#00ffff', '#ff6600'][i % 2]} transparent opacity={0.6} />
        </mesh>
      ))}
      
      {/* Horizon glow */}
      <mesh position={[0, 15, -180]}>
        <planeGeometry args={[400, 80]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.15} />
      </mesh>
      
      {/* Recognizer shadow silhouette */}
      <group position={[0, 30, -120]}>
        <Box args={[30, 2, 10]} position={[0, 0, 0]}>
          <meshBasicMaterial color="#00ffff" transparent opacity={0.2} />
        </Box>
        <Box args={[5, 25, 5]} position={[-12, -12, 0]}>
          <meshBasicMaterial color="#00ffff" transparent opacity={0.2} />
        </Box>
        <Box args={[5, 25, 5]} position={[12, -12, 0]}>
          <meshBasicMaterial color="#00ffff" transparent opacity={0.2} />
        </Box>
      </group>
    </group>
  );
}

// ============================================================================
// IMMERSIVE ENVIRONMENT PRESETS - Environment appears FIRST, towers rise WITHIN
// ============================================================================

/** Football Stadium - Full stadium with field, towers rise on the field */
function FootballStadiumBackground() {
  const crowdRefs = useRef<THREE.InstancedMesh>(null);
  
  return (
    <group>
      {/* Main field - green grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[80, 150]} />
        <meshStandardMaterial color="#2d5a27" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Field lines */}
      {/* Center circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[9, 9.3, 64]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[80, 0.3]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Penalty areas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -60]}>
        <planeGeometry args={[40, 0.3]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -60]}>
        <planeGeometry args={[0.3, 30]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 60]}>
        <planeGeometry args={[40, 0.3]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 60]}>
        <planeGeometry args={[0.3, 30]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Stadium stands */}
      {/* Left stand */}
      <Box args={[10, 20, 150]} position={[-50, 10, 0]}>
        <meshStandardMaterial color="#4a4a5a" metalness={0.3} roughness={0.7} />
      </Box>
      {/* Right stand */}
      <Box args={[10, 20, 150]} position={[50, 10, 0]}>
        <meshStandardMaterial color="#4a4a5a" metalness={0.3} roughness={0.7} />
      </Box>
      {/* End stands */}
      <Box args={[80, 15, 8]} position={[0, 7.5, -80]}>
        <meshStandardMaterial color="#3a3a4a" metalness={0.3} roughness={0.7} />
      </Box>
      <Box args={[80, 15, 8]} position={[0, 7.5, 80]}>
        <meshStandardMaterial color="#3a3a4a" metalness={0.3} roughness={0.7} />
      </Box>
      
      {/* Stadium lights */}
      {[-45, -15, 15, 45].map((x, i) => (
        <group key={i} position={[x, 0, -85]}>
          <Cylinder args={[0.5, 0.5, 35, 8]} position={[0, 17.5, 0]}>
            <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
          </Cylinder>
          <Box args={[4, 2, 2]} position={[0, 36, 0]}>
            <meshStandardMaterial color="#666666" metalness={0.5} roughness={0.5} />
          </Box>
          <pointLight position={[0, 35, 0]} intensity={0.5} color="#ffffcc" distance={80} />
        </group>
      ))}
      {[-45, -15, 15, 45].map((x, i) => (
        <group key={`light-${i}`} position={[x, 0, 85]}>
          <Cylinder args={[0.5, 0.5, 35, 8]} position={[0, 17.5, 0]}>
            <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
          </Cylinder>
          <Box args={[4, 2, 2]} position={[0, 36, 0]}>
            <meshStandardMaterial color="#666666" metalness={0.5} roughness={0.5} />
          </Box>
          <pointLight position={[0, 35, 0]} intensity={0.5} color="#ffffcc" distance={80} />
        </group>
      ))}
      
      {/* Goal posts */}
      <group position={[0, 0, -70]}>
        <Cylinder args={[0.2, 0.2, 5, 8]} position={[-4, 2.5, 0]}>
          <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.3} />
        </Cylinder>
        <Cylinder args={[0.2, 0.2, 5, 8]} position={[4, 2.5, 0]}>
          <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.3} />
        </Cylinder>
        <Cylinder args={[0.2, 0.2, 8.5, 8]} position={[0, 5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.3} />
        </Cylinder>
      </group>
      <group position={[0, 0, 70]}>
        <Cylinder args={[0.2, 0.2, 5, 8]} position={[-4, 2.5, 0]}>
          <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.3} />
        </Cylinder>
        <Cylinder args={[0.2, 0.2, 5, 8]} position={[4, 2.5, 0]}>
          <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.3} />
        </Cylinder>
        <Cylinder args={[0.2, 0.2, 8.5, 8]} position={[0, 5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.3} />
        </Cylinder>
      </group>
      
      {/* Night sky */}
      <mesh position={[0, 50, -100]}>
        <planeGeometry args={[300, 100]} />
        <meshBasicMaterial color="#0a0a1a" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/** Race Track - F1 style circuit with grandstands */
function RaceTrackBackground() {
  return (
    <group>
      {/* Main track surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[120, 200]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.2} roughness={0.8} />
      </mesh>
      
      {/* Track markings - straight sections */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[40, 180]} />
        <meshStandardMaterial color="#333333" metalness={0.1} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-30, 0.01, 0]}>
        <planeGeometry args={[0.3, 180]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, 0.01, 0]}>
        <planeGeometry args={[0.3, 180]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Center line - dashed */}
      {Array.from({ length: 18 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -85 + i * 10]}>
          <planeGeometry args={[0.2, 5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      
      {/* Start/finish line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -80]}>
        <planeGeometry args={[60, 3]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Pit lane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-55, 0, 0]}>
        <planeGeometry args={[15, 150]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.9} />
      </mesh>
      
      {/* Pit garages */}
      {Array.from({ length: 10 }).map((_, i) => (
        <Box key={i} args={[10, 8, 6]} position={[-55, 4, -70 + i * 15]}>
          <meshStandardMaterial color="#3a3a4a" metalness={0.3} roughness={0.7} />
        </Box>
      ))}
      
      {/* Grandstands */}
      <Box args={[15, 25, 100]} position={[70, 12.5, 0]}>
        <meshStandardMaterial color="#5a5a6a" metalness={0.2} roughness={0.8} />
      </Box>
      
      {/* Sponsor boards */}
      {[-60, -30, 0, 30, 60].map((x, i) => (
        <group key={i} position={[x, 0, 95]}>
          <Box args={[20, 5, 1]} position={[0, 2.5, 0]}>
            <meshStandardMaterial color="#1a1a2a" metalness={0.3} roughness={0.7} />
          </Box>
          <mesh position={[0, 2.5, 0.6]}>
            <planeGeometry args={[18, 4]} />
            <meshBasicMaterial color={['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'][i]} transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
      
      {/* Track lights */}
      {[-50, 0, 50].map((x, i) => (
        <group key={i} position={[x, 0, -100]}>
          <Cylinder args={[0.3, 0.3, 25, 8]} position={[0, 12.5, 0]}>
            <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.3} />
          </Cylinder>
          <pointLight position={[0, 25, 0]} intensity={0.3} color="#ffffff" distance={60} />
        </group>
      ))}
      
      {/* Barriers */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Box key={`barrier-${i}`} args={[2, 1, 8]} position={[62, 0.5, -90 + i * 10]}>
          <meshStandardMaterial color={i % 2 === 0 ? '#ff0000' : '#ffffff'} metalness={0.3} roughness={0.7} />
        </Box>
      ))}
    </group>
  );
}

/** Concert Stage - Music festival with stage and crowd */
function ConcertStageBackground() {
  // Static concert stage - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Main stage floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Stage platform - raised */}
      <Box args={[50, 1, 25]} position={[0, 0.5, -10]}>
        <meshStandardMaterial color="#2a2a2a" metalness={0.2} roughness={0.8} />
      </Box>
      
      {/* Back wall with LED screen look */}
      <Box args={[50, 20, 1]} position={[0, 10, -23]}>
        <meshStandardMaterial color="#0a0a1a" metalness={0.5} roughness={0.5} emissive="#1a1a3a" emissiveIntensity={0.3} />
      </Box>
      
      {/* Stage lighting rig */}
      <Box args={[55, 1, 3]} position={[0, 25, -15]}>
        <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.4} />
      </Box>
      
      {/* Static spotlights */}
      {[-20, -10, 0, 10, 20].map((x, i) => (
        <group key={i} position={[x, 25, -15]}>
          <Cylinder args={[0.3, 0.5, 2, 8]} position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
            <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.3} />
          </Cylinder>
          <spotLight
            position={[0, 0, 0]}
            angle={0.4}
            penumbra={0.5}
            intensity={2}
            distance={40}
            color={['#ff0066', '#00ffff', '#ff6600', '#6600ff', '#00ff66'][i % 5]}
          />
        </group>
      ))}
      
      {/* Speaker stacks */}
      <group position={[-30, 0, 5]}>
        <Box args={[4, 8, 3]} position={[0, 4, 0]}>
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
        </Box>
        <Box args={[3, 5, 2]} position={[0, 10.5, 0]}>
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
        </Box>
      </group>
      <group position={[30, 0, 5]}>
        <Box args={[4, 8, 3]} position={[0, 4, 0]}>
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
        </Box>
        <Box args={[3, 5, 2]} position={[0, 10.5, 0]}>
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
        </Box>
      </group>
      
      {/* Crowd area - dark floor extending out */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 50]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Crowd barrier */}
      <Box args={[60, 1.2, 1]} position={[0, 0.6, 15]}>
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.5} />
      </Box>
      
      {/* Fog/haze effect */}
      <mesh position={[0, 5, 0]}>
        <planeGeometry args={[100, 50]} />
        <meshBasicMaterial color="#2a2a4a" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

/** Castle Grounds - Medieval castle with courtyard */
function CastleGroundsBackground() {
  return (
    <group>
      {/* Courtyard floor - cobblestone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, 150]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Castle walls */}
      <Box args={[100, 25, 5]} position={[0, 12.5, -75]}>
        <meshStandardMaterial color="#6a6a6a" metalness={0.1} roughness={0.9} />
      </Box>
      {/* Side walls */}
      <Box args={[5, 25, 150]} position={[-50, 12.5, 0]}>
        <meshStandardMaterial color="#5a5a5a" metalness={0.1} roughness={0.9} />
      </Box>
      <Box args={[5, 25, 150]} position={[50, 12.5, 0]}>
        <meshStandardMaterial color="#5a5a5a" metalness={0.1} roughness={0.9} />
      </Box>
      
      {/* Towers at corners */}
      {[-50, 50].map((x, i) => (
        <group key={i}>
          <Cylinder args={[6, 7, 35, 8]} position={[x, 17.5, -70]}>
            <meshStandardMaterial color="#5a5a5a" metalness={0.1} roughness={0.9} />
          </Cylinder>
          {/* Cone roof */}
          <Cone args={[8, 10, 8]} position={[x, 40, -70]}>
            <meshStandardMaterial color="#8B4513" metalness={0.1} roughness={0.8} />
          </Cone>
        </group>
      ))}
      {[-50, 50].map((x, i) => (
        <group key={`back-${i}`}>
          <Cylinder args={[6, 7, 35, 8]} position={[x, 17.5, 70]}>
            <meshStandardMaterial color="#5a5a5a" metalness={0.1} roughness={0.9} />
          </Cylinder>
          <Cone args={[8, 10, 8]} position={[x, 40, 70]}>
            <meshStandardMaterial color="#8B4513" metalness={0.1} roughness={0.8} />
          </Cone>
        </group>
      ))}
      
      {/* Gate house */}
      <Box args={[20, 20, 8]} position={[0, 10, 75]}>
        <meshStandardMaterial color="#5a5a5a" metalness={0.1} roughness={0.9} />
      </Box>
      {/* Gate opening */}
      <Box args={[8, 12, 10]} position={[0, 6, 76]}>
        <meshStandardMaterial color="#1a1a1a" metalness={0.0} roughness={1} />
      </Box>
      
      {/* Battlements on main wall */}
      {Array.from({ length: 10 }).map((_, i) => (
        <Box key={i} args={[6, 4, 3]} position={[-45 + i * 10, 27, -72]}>
          <meshStandardMaterial color="#6a6a6a" metalness={0.1} roughness={0.9} />
        </Box>
      ))}
      
      {/* Keep in center */}
      <Box args={[25, 40, 25]} position={[0, 20, -50]}>
        <meshStandardMaterial color="#6a6a6a" metalness={0.1} roughness={0.9} />
      </Box>
      <Cone args={[15, 12, 4]} position={[0, 46, -50]}>
        <meshStandardMaterial color="#8B4513" metalness={0.1} roughness={0.8} />
      </Cone>
      
      {/* Flags */}
      {[-50, 50].map((x, i) => (
        <group key={`flag-${i}`}>
          <Cylinder args={[0.2, 0.2, 8, 8]} position={[x, 49, -70]}>
            <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.5} />
          </Cylinder>
          <Box args={[3, 2, 0.1]} position={[x + 1.5, 52, -70]}>
            <meshBasicMaterial color="#cc0000" />
          </Box>
        </group>
      ))}
      
      {/* Torches with fire light */}
      {[-30, 0, 30].map((x, i) => (
        <group key={`torch-${i}`}>
          <Cylinder args={[0.3, 0.3, 3, 8]} position={[x, 1.5, 0]}>
            <meshStandardMaterial color="#4a3a2a" metalness={0.3} roughness={0.7} />
          </Cylinder>
          <Sphere args={[0.4, 8, 8]} position={[x, 3.5, 0]}>
            <meshBasicMaterial color="#ff6600" transparent opacity={0.8} />
          </Sphere>
          <pointLight position={[x, 4, 0]} intensity={0.5} color="#ff9933" distance={15} />
        </group>
      ))}
      
      {/* Moat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 90]}>
        <ringGeometry args={[55, 65, 4]} />
        <meshStandardMaterial color="#2a4a6a" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Airport Runway - Planes and terminal */
function AirportRunwayBackground() {
  // Static airport - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Main runway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[40, 300]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Runway markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[2, 250]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Threshold markings */}
      {[-12, -8, -4, 4, 8, 12].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -140]}>
          <planeGeometry args={[2, 30]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {[-12, -8, -4, 4, 8, 12].map((x, i) => (
        <mesh key={`end-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 140]}>
          <planeGeometry args={[2, 30]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      
      {/* Taxiway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[50, 0, 0]}>
        <planeGeometry args={[20, 200]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Terminal building */}
      <Box args={[80, 20, 40]} position={[100, 10, 0]}>
        <meshStandardMaterial color="#4a5a6a" metalness={0.3} roughness={0.7} />
      </Box>
      {/* Terminal windows */}
      <mesh position={[141, 10, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[35, 15]} />
        <meshStandardMaterial color="#2a3a4a" metalness={0.8} roughness={0.2} transparent opacity={0.6} />
      </mesh>
      
      {/* Control tower */}
      <Cylinder args={[5, 6, 30, 8]} position={[70, 15, -30]}>
        <meshStandardMaterial color="#5a6a7a" metalness={0.2} roughness={0.8} />
      </Cylinder>
      {/* Tower cab */}
      <Cylinder args={[8, 6, 6, 8]} position={[70, 33, -30]}>
        <meshStandardMaterial color="#3a4a5a" metalness={0.3} roughness={0.7} />
      </Cylinder>
      <mesh position={[70, 36, -30]}>
        <cylinderGeometry args={[7, 7, 4, 8]} />
        <meshStandardMaterial color="#2a3a4a" metalness={0.5} roughness={0.5} transparent opacity={0.5} />
      </mesh>
      
      {/* Hangar */}
      <Box args={[50, 15, 30]} position={[-70, 7.5, 0]}>
        <meshStandardMaterial color="#5a5a5a" metalness={0.3} roughness={0.7} />
      </Box>
      
      {/* Static airplane (simplified) */}
      <group position={[0, 5, -100]}>
        {/* Fuselage */}
        <Cylinder args={[3, 3, 40, 12]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#f0f0f0" metalness={0.5} roughness={0.3} />
        </Cylinder>
        {/* Wings */}
        <Box args={[35, 0.5, 8]} position={[0, 0, 5]}>
          <meshStandardMaterial color="#e0e0e0" metalness={0.5} roughness={0.3} />
        </Box>
        {/* Tail */}
        <Box args={[10, 6, 0.5]} position={[0, 3, -20]}>
          <meshStandardMaterial color="#e0e0e0" metalness={0.5} roughness={0.3} />
        </Box>
        <Box args={[0.5, 5, 4]} position={[0, 5, -18]}>
          <meshStandardMaterial color="#e0e0e0" metalness={0.5} roughness={0.3} />
        </Box>
      </group>
      
      {/* Runway lights */}
      {Array.from({ length: 30 }).map((_, i) => (
        <Sphere key={i} args={[0.2, 8, 8]} position={[-18, 0.2, -140 + i * 10]}>
          <meshBasicMaterial color="#00ff00" />
        </Sphere>
      ))}
      {Array.from({ length: 30 }).map((_, i) => (
        <Sphere key={`r-${i}`} args={[0.2, 8, 8]} position={[18, 0.2, -140 + i * 10]}>
          <meshBasicMaterial color="#00ff00" />
        </Sphere>
      ))}
      
      {/* Approach lights */}
      {Array.from({ length: 10 }).map((_, i) => (
        <Sphere key={`approach-${i}`} args={[0.3, 8, 8]} position={[0, 0.5, -160 - i * 10]}>
          <meshBasicMaterial color="#ff0000" />
        </Sphere>
      ))}
    </group>
  );
}

/** Theme Park - Amusement park with rides */
function ThemeParkBackground() {
  // Static theme park - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Park ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#3a7a3a" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Paths */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[10, 150]} />
        <meshStandardMaterial color="#8a7a6a" metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Ferris wheel */}
      <group position={[-40, 0, -40]}>
        {/* Support structure */}
        <Box args={[2, 40, 2]} position={[-8, 20, 0]}>
          <meshStandardMaterial color="#cc0000" metalness={0.5} roughness={0.5} />
        </Box>
        <Box args={[2, 40, 2]} position={[8, 20, 0]}>
          <meshStandardMaterial color="#cc0000" metalness={0.5} roughness={0.5} />
        </Box>
        {/* Static wheel */}
        <group position={[0, 35, 0]}>
          <Torus args={[15, 0.5, 8, 32]}>
            <meshStandardMaterial color="#ff6600" metalness={0.6} roughness={0.4} />
          </Torus>
          {/* Spokes */}
          {Array.from({ length: 8 }).map((_, i) => (
            <Box key={i} args={[0.3, 30, 0.3]} position={[
              Math.cos(i * Math.PI / 4) * 7.5,
              Math.sin(i * Math.PI / 4) * 7.5,
              0
            ]} rotation={[0, 0, i * Math.PI / 4]}>
              <meshStandardMaterial color="#ffcc00" metalness={0.5} roughness={0.5} />
            </Box>
          ))}
          {/* Cabins */}
          {Array.from({ length: 8 }).map((_, i) => (
            <Box key={`cabin-${i}`} args={[3, 4, 3]} position={[
              Math.cos(i * Math.PI / 4) * 15,
              Math.sin(i * Math.PI / 4) * 15,
              0
            ]}>
              <meshStandardMaterial color={['#ff0000', '#00ff00', '#0000ff', '#ffff00'][i % 4]} metalness={0.3} roughness={0.7} />
            </Box>
          ))}
        </group>
      </group>
      
      {/* Roller coaster track (simplified) */}
      <group position={[40, 0, -30]}>
        {/* Support pillars */}
        {Array.from({ length: 10 }).map((_, i) => (
          <Cylinder key={i} args={[0.5, 0.5, 15 + i * 2, 8]} position={[-30 + i * 7, (15 + i * 2) / 2, 0]}>
            <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.4} />
          </Cylinder>
        ))}
        {/* Track rails */}
        <mesh position={[0, 20, 0]}>
          <tubeGeometry args={[
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(-35, 5, 0),
              new THREE.Vector3(-20, 15, 0),
              new THREE.Vector3(-5, 25, 0),
              new THREE.Vector3(10, 30, 0),
              new THREE.Vector3(25, 20, 0),
              new THREE.Vector3(35, 15, 0),
            ]),
            64, 0.3, 8, false
          ]} />
          <meshStandardMaterial color="#ff0000" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
      
      {/* Carousel */}
      <group position={[0, 0, 40]}>
        <Cylinder args={[8, 8, 1, 16]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#ffcc00" metalness={0.3} roughness={0.7} />
        </Cylinder>
        {/* Poles */}
        {Array.from({ length: 8 }).map((_, i) => (
          <Cylinder key={i} args={[0.2, 0.2, 6, 8]} position={[Math.cos(i * Math.PI / 4) * 5, 3.5, Math.sin(i * Math.PI / 4) * 5]}>
            <meshStandardMaterial color="#ffcc00" metalness={0.5} roughness={0.5} />
          </Cylinder>
        ))}
        {/* Roof */}
        <Cone args={[10, 4, 16]} position={[0, 8, 0]}>
          <meshStandardMaterial color="#ff6600" metalness={0.2} roughness={0.8} />
        </Cone>
      </group>
      
      {/* Entrance gate */}
      <Box args={[30, 15, 3]} position={[0, 7.5, 90]}>
        <meshStandardMaterial color="#ff00ff" metalness={0.3} roughness={0.7} />
      </Box>
      <Box args={[8, 15, 3]} position={[-15, 7.5, 90]}>
        <meshStandardMaterial color="#00ffff" metalness={0.3} roughness={0.7} />
      </Box>
      <Box args={[8, 15, 3]} position={[15, 7.5, 90]}>
        <meshStandardMaterial color="#00ffff" metalness={0.3} roughness={0.7} />
      </Box>
      
      {/* Static balloons */}
      {Array.from({ length: 20 }).map((_, i) => (
        <group key={i}>
          <Sphere args={[0.8, 8, 8]} position={[
            (Math.random() - 0.5) * 100,
            10 + Math.random() * 20,
            (Math.random() - 0.5) * 100
          ]}>
            <meshStandardMaterial color={['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'][i % 5]} metalness={0.2} roughness={0.8} />
          </Sphere>
        </group>
      ))}
      
      {/* Night sky with stars */}
      <mesh position={[0, 60, -100]}>
        <planeGeometry args={[300, 150]} />
        <meshBasicMaterial color="#0a0a2a" />
      </mesh>
    </group>
  );
}

/** Ancient Ruins - Temple/pillars environment */
function AncientRuinsBackground() {
  return (
    <group>
      {/* Ancient stone floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#8a7a6a" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Stone tiles pattern */}
      {Array.from({ length: 100 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[
            (i % 10) * 14 - 63 + Math.random() * 2,
            0.02,
            Math.floor(i / 10) * 14 - 63 + Math.random() * 2
          ]}
        >
          <planeGeometry args={[12 + Math.random() * 2, 12 + Math.random() * 2]} />
          <meshStandardMaterial 
            color={`hsl(30, ${20 + Math.random() * 10}%, ${45 + Math.random() * 15}%)`}
            metalness={0.1}
            roughness={0.9}
          />
        </mesh>
      ))}
      
      {/* Standing pillars */}
      {[-40, -20, 20, 40].map((x, i) => (
        <group key={i}>
          <Cylinder args={[2.5, 2.8, 25, 12]} position={[x, 12.5, -50]}>
            <meshStandardMaterial color="#7a6a5a" metalness={0.1} roughness={0.9} />
          </Cylinder>
          {/* Capital */}
          <Box args={[6, 2, 6]} position={[x, 26, -50]}>
            <meshStandardMaterial color="#6a5a4a" metalness={0.1} roughness={0.9} />
          </Box>
        </group>
      ))}
      
      {/* Broken pillars */}
      <Cylinder args={[2.5, 2.8, 8, 12]} position={[-30, 4, -30]} rotation={[0.3, 0, 0.2]}>
        <meshStandardMaterial color="#6a5a4a" metalness={0.1} roughness={0.9} />
      </Cylinder>
      <Cylinder args={[2.5, 2.8, 5, 12]} position={[30, 2.5, -20]} rotation={[0.5, 0, -0.3]}>
        <meshStandardMaterial color="#5a4a3a" metalness={0.1} roughness={0.9} />
      </Cylinder>
      
      {/* Fallen pillar sections */}
      <Cylinder args={[2.5, 2.5, 10, 12]} position={[-20, 2.5, 20]} rotation={[Math.PI / 2, 0.2, 0]}>
        <meshStandardMaterial color="#5a4a3a" metalness={0.1} roughness={0.9} />
      </Cylinder>
      
      {/* Temple entrance */}
      <Box args={[40, 30, 5]} position={[0, 15, -70]}>
        <meshStandardMaterial color="#6a5a4a" metalness={0.1} roughness={0.9} />
      </Box>
      {/* Doorway */}
      <Box args={[15, 22, 6]} position={[0, 11, -68]}>
        <meshStandardMaterial color="#1a1a1a" />
      </Box>
      
      {/* Steps */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Box key={i} args={[50, 1, 3]} position={[0, i * 0.5, -72 + i * 3]}>
          <meshStandardMaterial color="#7a6a5a" metalness={0.1} roughness={0.9} />
        </Box>
      ))}
      
      {/* Overgrown vegetation */}
      {Array.from({ length: 30 }).map((_, i) => (
        <Cylinder
          key={i}
          args={[0.1, 0.15, 2 + Math.random() * 3, 4]}
          position={[
            (Math.random() - 0.5) * 120,
            1 + Math.random(),
            (Math.random() - 0.5) * 100
          ]}
        >
          <meshStandardMaterial color="#3a6a3a" metalness={0.1} roughness={0.9} />
        </Cylinder>
      ))}
      
      {/* Ancient altar in center */}
      <Box args={[6, 2, 6]} position={[0, 1, 0]}>
        <meshStandardMaterial color="#5a4a3a" metalness={0.1} roughness={0.9} />
      </Box>
      
      {/* Mystical glow */}
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#ffcc66" distance={20} />
      
      {/* Dust particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={100}
            array={new Float32Array(100 * 3).map(() => (Math.random() - 0.5) * 100)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.3} color="#aa9988" transparent opacity={0.3} />
      </points>
      
      {/* Sky with sunset */}
      <mesh position={[0, 40, -100]}>
        <planeGeometry args={[300, 100]} />
        <meshBasicMaterial color="#cc8844" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/** Zen Garden - Japanese peaceful garden */
function ZenGardenBackground() {
  // Static zen garden - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Static zen sand garden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#d4c4a8" metalness={0.0} roughness={1} />
      </mesh>
      
      {/* Sand rake patterns (circles) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[5 + i * 5, 5.1 + i * 5, 64]} />
          <meshBasicMaterial color="#c4b498" />
        </mesh>
      ))}
      
      {/* Large rocks */}
      <mesh position={[-20, 2, -10]}>
        <icosahedronGeometry args={[4, 0]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.1} roughness={0.9} />
      </mesh>
      <mesh position={[15, 1.5, 20]}>
        <icosahedronGeometry args={[3, 0]} />
        <meshStandardMaterial color="#5a5a5a" metalness={0.1} roughness={0.9} />
      </mesh>
      <mesh position={[-5, 1, -25]}>
        <icosahedronGeometry args={[2, 0]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Japanese maple tree */}
      <group position={[30, 0, -20]}>
        <Cylinder args={[0.5, 0.8, 5, 8]} position={[0, 2.5, 0]}>
          <meshStandardMaterial color="#4a3a2a" metalness={0.1} roughness={0.9} />
        </Cylinder>
        <Sphere args={[4, 8, 8]} position={[0, 7, 0]}>
          <meshStandardMaterial color="#cc3333" metalness={0.1} roughness={0.8} />
        </Sphere>
      </group>
      
      {/* Bamboo fence */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Cylinder key={i} args={[0.1, 0.1, 3, 8]} position={[-48, 1.5, -45 + i * 5]}>
          <meshStandardMaterial color="#6a8a4a" metalness={0.1} roughness={0.8} />
        </Cylinder>
      ))}
      {Array.from({ length: 20 }).map((_, i) => (
        <Cylinder key={`r-${i}`} args={[0.1, 0.1, 3, 8]} position={[48, 1.5, -45 + i * 5]}>
          <meshStandardMaterial color="#6a8a4a" metalness={0.1} roughness={0.8} />
        </Cylinder>
      ))}
      
      {/* Stone lantern */}
      <group position={[-30, 0, 30]}>
        <Cylinder args={[0.8, 1, 0.5, 6]} position={[0, 0.25, 0]}>
          <meshStandardMaterial color="#6a6a6a" metalness={0.1} roughness={0.9} />
        </Cylinder>
        <Cylinder args={[0.3, 0.3, 2, 6]} position={[0, 1.5, 0]}>
          <meshStandardMaterial color="#5a5a5a" metalness={0.1} roughness={0.9} />
        </Cylinder>
        <Box args={[1.2, 1, 1.2]} position={[0, 3, 0]}>
          <meshStandardMaterial color="#4a4a4a" metalness={0.1} roughness={0.9} />
        </Box>
        <Cone args={[0.8, 1, 4]} position={[0, 4, 0]}>
          <meshStandardMaterial color="#3a3a3a" metalness={0.1} roughness={0.9} />
        </Cone>
        <pointLight position={[0, 2.5, 0]} intensity={0.3} color="#ffcc66" distance={10} />
      </group>
      
      {/* Koi pond */}
      <Cylinder args={[8, 8, 0.5, 32]} position={[25, -0.2, 10]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#2a4a6a" metalness={0.5} roughness={0.3} />
      </Cylinder>
      {/* Pond edge stones */}
      {Array.from({ length: 12 }).map((_, i) => (
        <Sphere key={i} args={[0.5, 6, 6]} position={[
          25 + Math.cos(i * Math.PI / 6) * 8.5,
          0.3,
          10 + Math.sin(i * Math.PI / 6) * 8.5
        ]}>
          <meshStandardMaterial color="#5a5a5a" metalness={0.1} roughness={0.9} />
        </Sphere>
      ))}
      
      {/* Wooden bridge */}
      <Box args={[6, 0.3, 12]} position={[25, 0.5, -5]} rotation={[0, Math.PI / 4, 0]}>
        <meshStandardMaterial color="#8a6a4a" metalness={0.1} roughness={0.8} />
      </Box>
      
      {/* Cherry blossom petals falling */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={50}
            array={new Float32Array(50 * 3).map((_, i) =>
              i % 3 === 0 ? (Math.random() - 0.5) * 80 :
              i % 3 === 1 ? Math.random() * 30 :
              (Math.random() - 0.5) * 80
            )}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.4} color="#ffaaaa" transparent opacity={0.6} />
      </points>
    </group>
  );
}

/** Ski Resort - Snowy mountain slopes */
function SkiResortBackground() {
  // Static ski resort - no time-based animation for GPU rendering consistency
  return (
    <group>
      {/* Snowy mountain slope */}
      <mesh rotation={[-Math.PI / 4, 0, 0]} position={[0, 20, -50]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#f0f0f5" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Flat area at base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 30]}>
        <planeGeometry args={[150, 80]} />
        <meshStandardMaterial color="#e8e8f0" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Ski runs (groomed trails) */}
      <mesh rotation={[-Math.PI / 4, 0, 0]} position={[0, 20.1, -50]}>
        <planeGeometry args={[20, 150]} />
        <meshStandardMaterial color="#ffffff" metalness={0.0} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 4, 0.3, 0]} position={[-30, 20.1, -50]}>
        <planeGeometry args={[15, 120]} />
        <meshStandardMaterial color="#ffffff" metalness={0.0} roughness={1} />
      </mesh>
      
      {/* Pine trees with snow */}
      {Array.from({ length: 25 }).map((_, i) => (
        <group key={i} position={[(Math.random() - 0.5) * 120, 0, (Math.random() - 0.5) * 80]}>
          <Cylinder args={[0.3, 0.4, 2, 6]} position={[0, 1, 0]}>
            <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
          </Cylinder>
          <Cone args={[2, 6, 6]} position={[0, 5, 0]}>
            <meshStandardMaterial color="#2a5a3a" roughness={0.8} />
          </Cone>
          <Cone args={[1.5, 4, 6]} position={[0, 8, 0]}>
            <meshStandardMaterial color="#3a6a4a" roughness={0.8} />
          </Cone>
          {/* Snow on tree */}
          <Cone args={[2.2, 1, 6]} position={[0, 9, 0]}>
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </Cone>
        </group>
      ))}
      
      {/* Ski lift cables */}
      <Cylinder args={[0.05, 0.05, 150, 8]} position={[0, 35, 0]} rotation={[Math.PI / 2 - 0.5, 0, 0]}>
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
      </Cylinder>
      
      {/* Ski lift towers */}
      {[-40, 0, 40].map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          <Box args={[0.5, 40, 0.5]} position={[0, 20, 0]}>
            <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.4} />
          </Box>
          <Box args={[3, 0.5, 0.5]} position={[0, 35, 0]}>
            <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.4} />
          </Box>
        </group>
      ))}
      
      {/* Ski lift chairs */}
      {[-30, -10, 10, 30].map((z, i) => (
        <group key={`chair-${i}`} position={[0, 32, z]}>
          <Box args={[0.1, 3, 0.1]} position={[0, 1.5, 0]}>
            <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.5} />
          </Box>
          <Box args={[2, 0.1, 2]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#ff6600" metalness={0.3} roughness={0.7} />
          </Box>
        </group>
      ))}
      
      {/* Chalet/lodge */}
      <group position={[50, 0, 40]}>
        <Box args={[20, 10, 15]} position={[0, 5, 0]}>
          <meshStandardMaterial color="#6a4a3a" metalness={0.1} roughness={0.9} />
        </Box>
        {/* Roof */}
        <Box args={[22, 1, 17]} position={[0, 11, 0]} rotation={[0.3, 0, 0]}>
          <meshStandardMaterial color="#4a3a2a" metalness={0.1} roughness={0.9} />
        </Box>
        {/* Snow on roof */}
        <Box args={[24, 0.5, 18]} position={[0, 11.5, 0]} rotation={[0.3, 0, 0]}>
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </Box>
        {/* Windows with warm glow */}
        <mesh position={[-11, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[4, 5]} />
          <meshBasicMaterial color="#ffcc66" transparent opacity={0.7} />
        </mesh>
        <mesh position={[11, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[4, 5]} />
          <meshBasicMaterial color="#ffcc66" transparent opacity={0.7} />
        </mesh>
        <pointLight position={[0, 5, 8]} intensity={0.5} color="#ffcc66" distance={20} />
      </group>
      
      {/* Static snow particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={200}
            array={new Float32Array(200 * 3).map(() => (Math.random() - 0.5) * 150)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.3} color="#ffffff" transparent opacity={0.8} />
      </points>
      
      {/* Mountain peaks in distance */}
      {[-60, 0, 60].map((x, i) => (
        <Cone key={i} args={[30 + i * 10, 50, 4]} position={[x, 25, -120]}>
          <meshStandardMaterial color="#d0d0d8" metalness={0.1} roughness={0.9} />
        </Cone>
      ))}
    </group>
  );
}

/** Vineyard - Rolling hills with grape vines */
function VineyardBackground() {
  return (
    <group>
      {/* Rolling hills */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#4a7a3a" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* Vine rows */}
      {Array.from({ length: 15 }).map((row) => (
        <group key={row} position={[-70 + row * 10, 0, 0]}>
          {/* Row support posts */}
          {Array.from({ length: 20 }).map((post) => (
            <Cylinder
              key={post}
              args={[0.1, 0.1, 2.5, 6]}
              position={[0, 1.25, -90 + post * 10]}
            >
              <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
            </Cylinder>
          ))}
          {/* Support wires */}
          <Cylinder args={[0.02, 0.02, 200, 4]} position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} />
          </Cylinder>
          <Cylinder args={[0.02, 0.02, 200, 4]} position={[0, 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} />
          </Cylinder>
          {/* Grape vines (simplified as green boxes) */}
          {Array.from({ length: 15 }).map((vine) => (
            <Box key={vine} args={[0.5, 1.5, 3]} position={[0, 1, -80 + vine * 12]}>
              <meshStandardMaterial color="#3a6a2a" roughness={0.9} />
            </Box>
          ))}
        </group>
      ))}
      
      {/* Tuscan-style winery building */}
      <group position={[70, 0, -60]}>
        <Box args={[30, 15, 20]} position={[0, 7.5, 0]}>
          <meshStandardMaterial color="#c4a882" metalness={0.1} roughness={0.9} />
        </Box>
        {/* Terracotta roof */}
        <Box args={[34, 1, 24]} position={[0, 15.5, 0]} rotation={[0.1, 0, 0]}>
          <meshStandardMaterial color="#aa5533" metalness={0.1} roughness={0.8} />
        </Box>
        {/* Windows */}
        {[-8, 8].map((x, i) => (
          <mesh key={i} position={[x, 6, 10.1]}>
            <planeGeometry args={[3, 4]} />
            <meshBasicMaterial color="#3a4a5a" />
          </mesh>
        ))}
        {/* Door */}
        <mesh position={[0, 4, 10.1]}>
          <planeGeometry args={[4, 6]} />
          <meshStandardMaterial color="#5a3a2a" roughness={0.9} />
        </mesh>
      </group>
      
      {/* Wine barrels */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Cylinder key={i} args={[1, 1, 2, 12]} position={[60, 1, -30 + i * 3]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#6a4a2a" metalness={0.1} roughness={0.8} />
        </Cylinder>
      ))}
      
      {/* Olive trees */}
      {[-50, -80, 100, 120].map((x, i) => (
        <group key={i} position={[x, 0, -40 + (i % 2) * 80]}>
          <Cylinder args={[0.5, 0.7, 4, 8]} position={[0, 2, 0]}>
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </Cylinder>
          <Sphere args={[4, 8, 8]} position={[0, 6, 0]}>
            <meshStandardMaterial color="#5a7a3a" roughness={0.9} />
          </Sphere>
        </group>
      ))}
      
      {/* Dirt path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[40, 0.02, 0]}>
        <planeGeometry args={[5, 150]} />
        <meshStandardMaterial color="#8a7a6a" roughness={1} />
      </mesh>
      
      {/* Sun and sky */}
      <mesh position={[60, 50, -150]}>
        <circleGeometry args={[20, 32]} />
        <meshBasicMaterial color="#ffdd66" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 40, -100]}>
        <planeGeometry args={[300, 100]} />
        <meshBasicMaterial color="#87ceeb" transparent opacity={0.3} />
      </mesh>
      
      {/* Distant hills */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Cone key={i} args={[40 + i * 10, 20 + i * 5, 4]} position={[-150 + i * 75, 10, -150]}>
          <meshStandardMaterial color="#3a6a2a" metalness={0.1} roughness={0.9} />
        </Cone>
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
    // Advanced presets
    case 'aurora-borealis':
      return <AuroraBorealisBackground />;
    case 'volcanic-inferno':
      return <VolcanicInfernoBackground />;
    case 'crystal-caves':
      return <CrystalCavesBackground />;
    case 'desert-dunes':
      return <DesertDunesBackground />;
    case 'neon-tokyo':
      return <NeonTokyoBackground />;
    case 'floating-islands':
      return <FloatingIslandsBackground />;
    case 'deep-ocean':
      return <DeepOceanBackground />;
    case 'galaxy-nebula':
      return <GalaxyNebulaBackground />;
    case 'matrix-rain':
      return <MatrixRainBackground />;
    case 'ice-glacier':
      return <IceGlacierBackground />;
    case 'steampunk-gears':
      return <SteampunkGearsBackground />;
    case 'alien-planet':
      return <AlienPlanetBackground />;
    case 'tron-grid':
      return <TronGridBackground />;
    // Immersive Environment Presets - Towers appear WITHIN these environments
    case 'football-stadium':
      return <FootballStadiumBackground />;
    case 'race-track':
      return <RaceTrackBackground />;
    case 'concert-stage':
      return <ConcertStageBackground />;
    case 'castle-grounds':
      return <CastleGroundsBackground />;
    case 'airport-runway':
      return <AirportRunwayBackground />;
    case 'theme-park':
      return <ThemeParkBackground />;
    case 'ancient-ruins':
      return <AncientRuinsBackground />;
    case 'zen-garden':
      return <ZenGardenBackground />;
    case 'ski-resort':
      return <SkiResortBackground />;
    case 'vineyard':
      return <VineyardBackground />;
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
      <mesh position={[0, 0.05, 0]}>
        <planeGeometry args={[width + 1.5, depth + 1.5]} />
        <meshBasicMaterial color={color} transparent opacity={0.25 * opacity} />
      </mesh>
      
      {/* Main tower */}
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
      <Plane args={[400, 400]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
      </Plane>
      <gridHelper args={[400, 80, '#2a2a4a', '#1a1a3a']} position={[0, 0.01, 0]} />
    </group>
  );
}

function LookAtController({ lookAt }: { lookAt: [number, number, number] }) {
  const { camera } = useThree();
  
  // Set lookAt synchronously during render - no useEffect, no async
  camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
  
  return null;
}

function TowerChartScene({ data, frame, fps, cameraLookAt }: { 
  data: TowerChart3DBlock; 
  frame: number; 
  fps: number;
  cameraLookAt: [number, number, number];
}) {
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
  
  // Keep ALL towers visible once revealed (start from 0)
  const visibleStart = 0;
  const visibleEnd = Math.min(towers.length - 1, currentIndex + 4);
  
  // ============================================================================
  // CALCULATE CAMERA POSITION DIRECTLY FROM FRAME - FULLY DETERMINISTIC
  // ============================================================================
  const cameraPosition = useMemo(() => {
    if (towers.length === 0) {
      return { x: 35, y: 18, z: -25, lookAt: { x: 0, y: 10, z: 0 } };
    }
    
    const currentTower = towers[Math.min(currentIndex, towers.length - 1)];
    const nextIndex = Math.min(currentIndex + 1, towers.length - 1);
    const nextTower = towers[nextIndex];
    
    // Smooth easing function for progress (ease-in-out)
    const easedProgress = itemProgress < 0.5 
      ? 2 * itemProgress * itemProgress 
      : 1 - Math.pow(-2 * itemProgress + 2, 2) / 2;
    
    // Interpolate camera position
    const targetZ = THREE.MathUtils.lerp(currentTower.position[2], nextTower.position[2], easedProgress);
    const currentHeight = currentTower.height;
    const nextHeight = nextTower.height;
    const avgHeight = THREE.MathUtils.lerp(currentHeight, nextHeight, easedProgress);
    
    const angleRad = (cameraAngle * Math.PI) / 180;
    
    return {
      x: Math.sin(angleRad) * cameraDistance,
      y: avgHeight + 15,
      z: targetZ + Math.cos(angleRad) * cameraDistance,
      lookAt: {
        x: 0,
        y: avgHeight + 6,
        z: targetZ
      }
    };
  }, [towers, currentIndex, itemProgress, cameraDistance, cameraAngle]);
  
  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <fog attach="fog" args={[backgroundColor, 50, 180]} />
      
      {/* Background preset - renders behind everything */}
      <BackgroundRenderer preset={backgroundPreset} baseColor={groundColor} />
      
      <StarField />
      <FloatingParticles />
      
      <ambientLight intensity={ambientIntensity + 0.3} />
      <directionalLight position={[50, 80, 50]} intensity={1.2} />
      <directionalLight position={[-40, 50, -40]} intensity={0.4} color="#6666ff" />
      <pointLight position={[0, 80, 0]} intensity={0.6} />
      <hemisphereLight args={['#5555aa', '#222233', 0.5]} />
      
      {showGround && <Ground color={groundColor} />}
      
      {customModelPath && (
        <ModelErrorBoundary>
          <CustomModel 
            modelPath={customModelPath} 
            position={modelPos} 
            scale={customModelScale} 
            rotation={customModelRotation}
          />
        </ModelErrorBoundary>
      )}
      
      {/* Look at target - camera position is set in Canvas props */}
      <LookAtController lookAt={cameraLookAt} />
      
      {towers.map((tower, index) => {
        // Tower is visible if it's been revealed (index <= visibleEnd)
        const isRevealed = index <= visibleEnd;
        const itemReveal = Math.max(0, Math.min(1, (revealProgress * totalItems * 1.2) - index * 0.12));
        const isHighlighted = index === currentIndex || index === currentIndex + 1;
        // Show label for all revealed towers (not just current window)
        const shouldShowLabel = showLabels3D && itemReveal > 0.25 && isRevealed;
        
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
            showLabel={shouldShowLabel}
            isHighlighted={isHighlighted}
            visible={isRevealed || itemReveal > 0}
          />
        );
      })}
    </>
  );
}

// Error boundary for custom model loading
class ModelErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('Custom model failed to load:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function CustomModel({ modelPath, position, scale, rotation }: { 
  modelPath: string; 
  position: [number, number, number]; 
  scale: number;
  rotation: number;
}) {
  // Custom model loading is disabled to avoid Turbopack/GLTFLoader compatibility issues
  // The 3D backgrounds provide rich visual content without custom models
  // To re-enable: Use the useGLTF hook from @react-three/drei with preload
  return null;
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

// Calculate camera position from frame - pure function, no React hooks
function calculateCameraPosition(
  towers: { position: [number, number, number]; height: number }[],
  currentIndex: number,
  itemProgress: number,
  cameraDistance: number,
  cameraAngle: number
): { position: [number, number, number]; lookAt: [number, number, number] } {
  if (towers.length === 0) {
    return { position: [35, 18, -25], lookAt: [0, 10, 0] };
  }
  
  const currentTower = towers[Math.min(currentIndex, towers.length - 1)];
  const nextIndex = Math.min(currentIndex + 1, towers.length - 1);
  const nextTower = towers[nextIndex];
  
  // Smooth easing function for progress (ease-in-out)
  const easedProgress = itemProgress < 0.5 
    ? 2 * itemProgress * itemProgress 
    : 1 - Math.pow(-2 * itemProgress + 2, 2) / 2;
  
  // Interpolate camera position
  const targetZ = THREE.MathUtils.lerp(currentTower.position[2], nextTower.position[2], easedProgress);
  const currentHeight = currentTower.height;
  const nextHeight = nextTower.height;
  const avgHeight = THREE.MathUtils.lerp(currentHeight, nextHeight, easedProgress);
  
  const angleRad = (cameraAngle * Math.PI) / 180;
  
  const camX = Math.sin(angleRad) * cameraDistance;
  const camY = avgHeight + 15;
  const camZ = targetZ + Math.cos(angleRad) * cameraDistance;
  
  const lookY = avgHeight + 6;
  
  return {
    position: [camX, camY, camZ],
    lookAt: [0, lookY, targetZ]
  };
}

export function TowerChart3DScene({ data }: TowerChart3DSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  const { 
    title = 'Rankings', 
    subtitle, 
    backgroundColor = '#050510', 
    items = [], 
    gradientStart = '#3B82F6',
    gradientEnd = '#8B5CF6',
    cameraDistance = 35,
    cameraAngle = 35,
    cameraPauseDuration = 0.4,
    cameraMoveSpeed = 0.5,
    towerSpacing = 7,
    baseHeight = 4,
    maxHeight = 30,
    useGradientByRank = true,
  } = data;
  
  // Calculate all animation values BEFORE Canvas
  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.rank - b.rank);
    return sorted;
  }, [items]);
  
  const towers = useMemo(() => {
    if (items.length === 0) return [];
    const values = items.map(i => i.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const heightRange = maxHeight - baseHeight;
    
    return sortedItems.map((item, index) => {
      const normalizedValue = (item.value - minVal) / (maxVal - minVal || 1);
      const height = baseHeight + normalizedValue * heightRange;
      return {
        position: [0, 0, index * towerSpacing] as [number, number, number],
        height,
      };
    });
  }, [sortedItems, items, baseHeight, maxHeight, towerSpacing]);
  
  // Animation timing
  const introDuration = 40;
  const totalItems = items.length;
  const pauseFrames = cameraPauseDuration * fps;
  const moveFrames = cameraMoveSpeed * fps;
  const totalAnimFrames = totalItems * (pauseFrames + moveFrames);
  
  const animFrame = Math.max(0, frame - introDuration);
  const animProgress = Math.min(animFrame / totalAnimFrames, 1);
  const currentIndex = Math.min(Math.floor(animProgress * totalItems), totalItems - 1);
  const itemProgress = (animProgress * totalItems) % 1;
  
  // Calculate camera position BEFORE Canvas - fully deterministic
  const cameraState = useMemo(() => {
    return calculateCameraPosition(towers, currentIndex, itemProgress, cameraDistance, cameraAngle);
  }, [towers, currentIndex, itemProgress, cameraDistance, cameraAngle]);
  
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
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
        dpr={1}
        frameloop="demand"
      >
        <TowerChartScene data={data} frame={frame} fps={fps} cameraLookAt={cameraState.lookAt} />
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
