// ============================================================================
// TOWER CHART 3D SCENE - 3D Ranking visualization with Three.js
// ============================================================================

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Box, Plane, ContactShadows, Billboard, Stars, useGLTF, Float, Cone, Cylinder, Sphere, Torus, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';
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

// ============================================================================
// ADVANCED PRESET BACKGROUND COMPONENTS
// ============================================================================

/** Aurora Borealis - Northern lights effect */
function AuroraBorealisBackground() {
  const auroraRef = useRef<THREE.Group>(null);
  const curtainsRef = useRef<THREE.Mesh[]>([]);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    curtainsRef.current.forEach((mesh, i) => {
      if (mesh) {
        const geometry = mesh.geometry;
        const position = geometry.attributes.position;
        for (let j = 0; j < position.count; j++) {
          const x = position.getX(j);
          const y = position.getY(j);
          const wave = Math.sin(x * 0.1 + time * (0.3 + i * 0.1)) * 3 + 
                       Math.sin(y * 0.2 + time * 0.5) * 2;
          position.setZ(j, wave);
        }
        position.needsUpdate = true;
      }
    });
  });
  
  return (
    <group>
      {/* Dark ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0a0a1a" metalness={0.2} roughness={0.8} />
      </mesh>
      
      {/* Aurora curtains */}
      <group ref={auroraRef} position={[0, 40, -80]}>
        {[...Array(5)].map((_, i) => (
          <mesh
            key={i}
            ref={(el) => { if (el) curtainsRef.current[i] = el; }}
            position={[i * 25 - 50, 0, -i * 10]}
            rotation={[0, 0, Math.PI / 12 * (i - 2)]}
          >
            <planeGeometry args={[40, 60, 30, 30]} />
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

/** Volcanic Inferno - Lava pools and volcanic environment */
function VolcanicInfernoBackground() {
  const lavaRef = useRef<THREE.Mesh>(null);
  const fireRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (lavaRef.current) {
      const geometry = lavaRef.current.geometry;
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const wave = Math.sin(x * 0.15 + time * 2) * 0.8 + 
                     Math.sin(y * 0.1 + time * 1.5) * 0.6;
        position.setZ(i, wave);
      }
      position.needsUpdate = true;
    }
    if (fireRef.current) {
      fireRef.current.intensity = 2 + Math.sin(time * 5) * 0.5;
    }
  });
  
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
      {/* Lava ground */}
      <mesh ref={lavaRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[300, 300, 40, 40]} />
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
      <pointLight ref={fireRef} position={[0, 50, -100]} intensity={2} color="#ff4400" distance={200} />
      
      {/* Smoke/ash layer */}
      <mesh position={[0, 35, -80]}>
        <planeGeometry args={[400, 120]} />
        <meshBasicMaterial color="#2a1a1a" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

/** Crystal Caves - Crystalline formations with reflections */
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
  
  const crystalRefs = useRef<THREE.Mesh[]>([]);
  
  useFrame((state) => {
    crystalRefs.current.forEach((crystal, i) => {
      if (crystal) {
        crystal.rotation.y = state.clock.elapsedTime * 0.1 + i * 0.5;
      }
    });
  });
  
  return (
    <group>
      {/* Cave floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0a0a1a" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Crystal formations */}
      {crystals.map((crystal, i) => (
        <group key={i} position={[crystal.x, 0, crystal.z]}>
          <Cone
            ref={(el) => { if (el) crystalRefs.current[i] = el; }}
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
      
      {/* Glowing orbs */}
      {Array.from({ length: 12 }).map((_, i) => (
        <Float key={i} speed={1 + i * 0.2} rotationIntensity={0.2} floatIntensity={0.5}>
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
        </Float>
      ))}
    </group>
  );
}

/** Desert Dunes - Sand dunes with heat shimmer effect */
function DesertDunesBackground() {
  const dunesRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (dunesRef.current) {
      const geometry = dunesRef.current.geometry;
      const position = geometry.attributes.position;
      const time = state.clock.elapsedTime;
      
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const wave = Math.sin(x * 0.02 + time * 0.3) * 2 + 
                     Math.sin(y * 0.03) * 3;
        position.setZ(i, wave);
      }
      position.needsUpdate = true;
    }
  });
  
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
      {/* Main sand terrain */}
      <mesh ref={dunesRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 300, 60, 60]} />
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

/** Neon Tokyo - Cyberpunk Japanese city aesthetic */
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
  
  const neonRefs = useRef<THREE.Mesh[]>([]);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    neonRefs.current.forEach((neon, i) => {
      if (neon) {
        const material = neon.material as THREE.MeshBasicMaterial;
        material.opacity = 0.6 + Math.sin(time * 3 + i) * 0.3;
      }
    });
  });
  
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
          
          {/* Neon strips */}
          <mesh
            ref={(el) => { if (el) neonRefs.current[i] = el; }}
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

/** Floating Islands - Sky islands with waterfalls */
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
  
  const waterfallRefs = useRef<THREE.Points[]>([]);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    waterfallRefs.current.forEach((wf) => {
      if (wf) {
        const positions = wf.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] -= 0.3;
          if (positions[i + 1] < 0) {
            positions[i + 1] = 30 + Math.random() * 10;
          }
        }
        wf.geometry.attributes.position.needsUpdate = true;
      }
    });
  });
  
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
      
      {/* Floating islands */}
      {islands.map((island, i) => (
        <Float key={i} speed={0.5 + i * 0.1} rotationIntensity={0.1} floatIntensity={0.3}>
          <group position={[island.x, island.y, island.z]}>
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
            
            {/* Waterfall */}
            {island.radius > 12 && (
              <points
                ref={(el) => { if (el) waterfallRefs.current.push(el); }}
                position={[island.radius * 0.5, 0, 0]}
              >
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
        </Float>
      ))}
      
      {/* Sun rays */}
      <mesh position={[50, 60, -150]} rotation={[0, 0, Math.PI / 6]}>
        <planeGeometry args={[100, 2]} />
        <meshBasicMaterial color="#f7dc6f" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

/** Deep Ocean - Underwater environment with bubbles */
function DeepOceanBackground() {
  const bubblesRef = useRef<THREE.Points>(null);
  const causticsRef = useRef<THREE.Mesh>(null);
  
  const bubblePositions = useMemo(() => {
    const pos = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = Math.random() * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    return pos;
  }, []);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Bubbles rising
    if (bubblesRef.current) {
      const positions = bubblesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 150; i++) {
        positions[i * 3 + 1] += 0.05 + Math.random() * 0.02;
        positions[i * 3] += Math.sin(time + i) * 0.01;
        if (positions[i * 3 + 1] > 80) {
          positions[i * 3 + 1] = 0;
        }
      }
      bubblesRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // Caustics animation
    if (causticsRef.current) {
      const geometry = causticsRef.current.geometry;
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const wave = Math.sin(x * 0.1 + time) * 0.5 + Math.sin(y * 0.1 + time * 0.8) * 0.3;
        position.setZ(i, wave);
      }
      position.needsUpdate = true;
    }
  });
  
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
      {/* Ocean floor */}
      <mesh ref={causticsRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[300, 300, 40, 40]} />
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
      
      {/* Bubbles */}
      <points ref={bubblesRef}>
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
  const nebulaRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (nebulaRef.current) {
      nebulaRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      nebulaRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });
  
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
  const rainRefs = useRef<THREE.Points[]>([]);
  
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
  
  useFrame(() => {
    rainRefs.current.forEach((rain, i) => {
      if (rain && rain.geometry.attributes.position) {
        const positions = rain.geometry.attributes.position.array as Float32Array;
        const speed = columns[i]?.speed || 0.5;
        for (let j = 0; j < positions.length; j += 3) {
          positions[j + 1] -= speed;
          if (positions[j + 1] < 0) {
            positions[j + 1] = 80 + Math.random() * 20;
          }
        }
        rain.geometry.attributes.position.needsUpdate = true;
      }
    });
  });
  
  return (
    <group>
      {/* Dark ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#000000" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* Ground grid reflection */}
      <gridHelper args={[400, 40, '#003300', '#001a00']} position={[0, 0.01, 0]} />
      
      {/* Matrix rain columns */}
      {columns.map((col, i) => (
        <points
          key={i}
          ref={(el) => { if (el) rainRefs.current[i] = el; }}
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
  const iceRefs = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (iceRefs.current) {
      const geometry = iceRefs.current.geometry;
      const position = geometry.attributes.position;
      const time = state.clock.elapsedTime;
      
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const wave = Math.sin(x * 0.05 + time * 0.3) * 0.3;
        position.setZ(i, wave);
      }
      position.needsUpdate = true;
    }
  });
  
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
      {/* Frozen ocean/ice sheet */}
      <mesh ref={iceRefs} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[300, 300, 50, 50]} />
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
  const gearRefs = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (gearRefs.current) {
      gearRefs.current.children.forEach((child, i) => {
        child.rotation.z = time * (0.2 + i * 0.1) * (i % 2 === 0 ? 1 : -1);
      });
    }
  });
  
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
      
      {/* Rotating gears */}
      <group ref={gearRefs} position={[0, 25, -80]}>
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
  const tentaclesRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (tentaclesRef.current) {
      tentaclesRef.current.children.forEach((child, i) => {
        child.rotation.x = Math.sin(time * 0.5 + i) * 0.1;
        child.rotation.z = Math.cos(time * 0.3 + i) * 0.1;
      });
    }
  });
  
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
      
      {/* Alien tentacles/flora */}
      <group ref={tentaclesRef}>
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
      
      {/* Floating rocks */}
      {Array.from({ length: 10 }).map((_, i) => (
        <Float key={i} speed={0.5 + i * 0.1} rotationIntensity={0.2} floatIntensity={0.5}>
          <mesh position={[
            (Math.random() - 0.5) * 200,
            15 + Math.random() * 30,
            -50 - Math.random() * 80
          ]}>
            <icosahedronGeometry args={[3 + Math.random() * 5, 0]} />
            <meshStandardMaterial color="#4a3a5a" metalness={0.4} roughness={0.6} />
          </mesh>
        </Float>
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
  const gridRef = useRef<THREE.Group>(null);
  const lightRefs = useRef<THREE.Mesh[]>([]);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (gridRef.current) {
      gridRef.current.position.z = (time * 5) % 20;
    }
    lightRefs.current.forEach((light, i) => {
      if (light) {
        const material = light.material as THREE.MeshBasicMaterial;
        material.opacity = 0.5 + Math.sin(time * 3 + i * 0.5) * 0.3;
      }
    });
  });
  
  return (
    <group>
      {/* Main grid floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Light grid lines */}
      <group ref={gridRef}>
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
          {/* Glowing edges */}
          <mesh ref={(el) => { if (el) lightRefs.current[i] = el; }} position={[2.1, 20, 0]}>
            <planeGeometry args={[0.2, 40]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
          </mesh>
          <mesh ref={(el) => { if (el) lightRefs.current[i + 5] = el; }} position={[-2.1, 20, 0]}>
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
