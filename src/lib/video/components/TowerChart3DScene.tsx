// ============================================================================
// TOWER CHART 3D SCENE - 3D Ranking visualization with Three.js
// FIX: Replace @react-three/drei <Text> with canvas-texture labels.
//      drei's <Text> (troika-three-text) calls delayRender() at module load
//      to fetch fonts from the internet, which times out in network-restricted
//      render environments. Canvas 2D text requires zero network access.
// ============================================================================

import React, { useMemo, useEffect, useState, Suspense } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Canvas, useThree } from '@react-three/fiber';
import { Box, Plane, Billboard, Stars, useGLTF } from '@react-three/drei';
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
// CANVAS-TEXTURE LABEL
// Replaces drei <Text> which fetches fonts from a CDN via delayRender().
// This uses the browser's built-in Canvas 2D API — zero network requests.
// ============================================================================

type LabelLine = {
  text: string;
  color: string;
  fontSize: number;
  bold?: boolean;
};

function makeTextTexture(lines: LabelLine[], canvasWidth = 512): THREE.CanvasTexture {
  const lineHeight = 40;
  const padding = 12;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = lines.length * lineHeight + padding * 2;

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  lines.forEach((line, i) => {
    ctx.font = `${line.bold ? 'bold ' : ''}${line.fontSize}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // shadow for readability
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, canvasWidth / 2, padding + i * lineHeight + lineHeight / 2);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function TowerLabel({
  rank,
  name,
  value,
  subtitle,
  height,
  opacity,
  hasImage,
}: {
  rank: number;
  name: string;
  value: string;
  subtitle?: string;
  height: number;
  opacity: number;
  hasImage: boolean;
}) {
  const { texture, planeW, planeH } = useMemo(() => {
    const lines: LabelLine[] = [
      { text: `#${rank}  ${name}`, color: '#FFFFFF', fontSize: 26, bold: true },
      { text: value, color: '#4ADE80', fontSize: 22 },
    ];
    if (subtitle) lines.push({ text: subtitle, color: '#9CA3AF', fontSize: 17 });

    const lineHeight = 40;
    const padding = 12;
    const tex = makeTextTexture(lines);
    const texH = lines.length * lineHeight + padding * 2;
    const pw = 8;
    const ph = pw * (texH / 512);
    return { texture: tex, planeW: pw, planeH: ph };
  }, [rank, name, value, subtitle]);

  const yOffset = height + (hasImage ? 5.5 : 3.5) + planeH / 2;

  return (
    <Billboard position={[0, yOffset, 0]} follow={true}>
      <mesh>
        <planeGeometry args={[planeW, planeH]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </Billboard>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return `#${c1.clone().lerp(c2, t).getHexString()}`;
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

// ============================================================================
// CAMERA CALCULATION
// ============================================================================

function calculateCameraState(
  towers: { position: [number, number, number]; height: number }[],
  currentIndex: number,
  progress: number,
  distance: number,
  angle: number
): { position: [number, number, number]; lookAt: [number, number, number] } {
  if (towers.length === 0) return { position: [35, 18, -25], lookAt: [0, 10, 0] };

  const cur = towers[Math.min(currentIndex, towers.length - 1)];
  const nxt = towers[Math.min(currentIndex + 1, towers.length - 1)];
  const ep = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  const targetZ = THREE.MathUtils.lerp(cur.position[2], nxt.position[2], ep);
  const avgH = THREE.MathUtils.lerp(cur.height, nxt.height, ep);
  const rad = (angle * Math.PI) / 180;

  return {
    position: [Math.sin(rad) * distance, avgH + 15, targetZ + Math.cos(rad) * distance],
    lookAt: [0, avgH + 6, targetZ],
  };
}

// ============================================================================
// 3D COMPONENTS
// ============================================================================

function StarField() {
  return <Stars radius={150} depth={80} count={2000} factor={5} saturation={0.3} fade speed={0} />;
}

function FloatingParticles() {
  const count = 30;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    let seed = 12345;
    const sr = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (sr() - 0.5) * 120;
      pos[i * 3 + 1] = sr() * 60;
      pos[i * 3 + 2] = (sr() - 0.5) * 200;
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

function Tower({
  position, height, color, width = 3, depth = 3, opacity = 1,
  rank, name, value, subtitle, image, showLabel, isHighlighted, visible,
}: {
  position: [number, number, number]; height: number; color: string;
  width?: number; depth?: number; opacity?: number;
  rank: number; name: string; value: string; subtitle?: string; image?: string;
  showLabel: boolean; isHighlighted: boolean; visible: boolean;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!image) { setTexture(null); setLoaded(true); return; }
    let cancelled = false;
    new THREE.TextureLoader().load(
      image,
      (tex) => { if (cancelled) return; tex.colorSpace = THREE.SRGBColorSpace; setTexture(tex); setLoaded(true); },
      undefined,
      () => { if (cancelled) return; setTexture(null); setLoaded(true); }
    );
    return () => { cancelled = true; };
  }, [image]);

  if (!loaded || !visible) return null;

  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <planeGeometry args={[width + 1.5, depth + 1.5]} />
        <meshBasicMaterial color={color} transparent opacity={0.25 * opacity} />
      </mesh>
      <Box args={[width, height, depth]} position={[0, height / 2, 0]}>
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.25}
          transparent={opacity < 1} opacity={opacity} emissive={color}
          emissiveIntensity={isHighlighted ? 0.35 : 0.12} />
      </Box>
      <Box args={[width + 0.25, 0.35, depth + 0.25]} position={[0, height + 0.175, 0]}>
        <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1}
          emissive={color} emissiveIntensity={isHighlighted ? 0.7 : 0.4}
          transparent={opacity < 1} opacity={opacity} />
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
        <TowerLabel
          rank={rank} name={name} value={value} subtitle={subtitle}
          height={height} opacity={opacity} hasImage={!!(image && texture)}
        />
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
// BACKGROUND ENVIRONMENTS
// ============================================================================

function BackgroundEnvironment({ preset, totalLength }: { preset: string; totalLength: number }) {
  const L = Math.max(totalLength, 100);
  switch (preset) {
    case 'none': return null;
    case 'cyber-grid': return <CyberGridEnvironment totalLength={L} />;
    case 'mountain-range': return <MountainRangeEnvironment totalLength={L} />;
    case 'ocean-waves': return <OceanWavesEnvironment totalLength={L} />;
    case 'forest-trees': return <ForestTreesEnvironment totalLength={L} />;
    case 'city-skyline': return <CitySkylineEnvironment totalLength={L} />;
    case 'abstract-waves': return <AbstractWavesEnvironment totalLength={L} />;
    case 'space-station': return <SpaceStationEnvironment totalLength={L} />;
    case 'aurora-borealis': return <AuroraBorealisEnvironment totalLength={L} />;
    case 'volcanic-inferno': return <VolcanicInfernoEnvironment totalLength={L} />;
    case 'crystal-caves': return <CrystalCavesEnvironment totalLength={L} />;
    case 'desert-dunes': return <DesertDunesEnvironment totalLength={L} />;
    case 'neon-tokyo': return <NeonTokyoEnvironment totalLength={L} />;
    case 'floating-islands': return <FloatingIslandsEnvironment totalLength={L} />;
    case 'deep-ocean': return <DeepOceanEnvironment totalLength={L} />;
    case 'galaxy-nebula': return <GalaxyNebulaEnvironment totalLength={L} />;
    case 'matrix-rain': return <MatrixRainEnvironment totalLength={L} />;
    case 'ice-glacier': return <IceGlacierEnvironment totalLength={L} />;
    case 'steampunk-gears': return <SteampunkGearsEnvironment totalLength={L} />;
    case 'alien-planet': return <AlienPlanetEnvironment totalLength={L} />;
    case 'tron-grid': return <TronGridEnvironment totalLength={L} />;
    case 'football-stadium': return <FootballStadiumEnvironment totalLength={L} />;
    case 'race-track': return <RaceTrackEnvironment totalLength={L} />;
    case 'concert-stage': return <ConcertStageEnvironment totalLength={L} />;
    case 'castle-grounds': return <CastleGroundsEnvironment totalLength={L} />;
    case 'airport-runway': return <AirportRunwayEnvironment totalLength={L} />;
    case 'theme-park': return <ThemeParkEnvironment totalLength={L} />;
    case 'ancient-ruins': return <AncientRuinsEnvironment totalLength={L} />;
    case 'zen-garden': return <ZenGardenEnvironment totalLength={L} />;
    case 'ski-resort': return <SkiResortEnvironment totalLength={L} />;
    case 'underwater-kingdom': return <UnderwaterKingdomEnvironment totalLength={L} />;
    case 'cyberpunk-city': return <CyberpunkCityEnvironment totalLength={L} />;
    case 'medieval-arena': return <MedievalArenaEnvironment totalLength={L} />;
    case 'space-colony': return <SpaceColonyEnvironment totalLength={L} />;
    case 'tropical-beach': return <TropicalBeachEnvironment totalLength={L} />;
    default: return <CyberGridEnvironment totalLength={L} />;
  }
}

function CyberGridEnvironment({ totalLength: L }: { totalLength: number }) {
  const gl = Math.max(L + 100, 200);
  return (
    <group>
      <gridHelper args={[gl, Math.floor(gl / 4), '#00ffff', '#ff00ff']} position={[0, 0.1, L / 2]} />
      {[...Array(Math.ceil(gl / 16))].map((_, i) => (
        <mesh key={i} position={[0, 0.05, -40 + i * 16]}>
          <boxGeometry args={[gl, 0.1, 0.2]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function MountainRangeEnvironment({ totalLength: L }: { totalLength: number }) {
  const count = Math.max(Math.ceil(L / 20), 12);
  const mountains = useMemo(() => [...Array(count)].map((_, i) => ({ x: -150 + i * 25, height: 20 + (i * 7 % 40), width: 15 + (i * 11 % 20) })), [count]);
  return (
    <group position={[0, 0, -L * 0.3]}>
      {mountains.map((m, i) => (<mesh key={i} position={[m.x, m.height / 2, i * (L / count)]}><coneGeometry args={[m.width, m.height, 4]} /><meshStandardMaterial color="#1a1a2e" flatShading /></mesh>))}
    </group>
  );
}

function OceanWavesEnvironment({ totalLength: L }: { totalLength: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, L / 2]}><planeGeometry args={[300, L + 100, 50, 50]} /><meshStandardMaterial color="#006994" transparent opacity={0.8} metalness={0.3} roughness={0.7} /></mesh>
    </group>
  );
}

function ForestTreesEnvironment({ totalLength: L }: { totalLength: number }) {
  const count = Math.max(Math.ceil(L / 5), 30);
  const trees = useMemo(() => [...Array(count)].map((_, i) => ({ x: (i % 2 === 0 ? -1 : 1) * (30 + (i * 17 % 50)), z: i * (L / count), h: 8 + (i * 13 % 15) })), [count, L]);
  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.h * 0.3, 0]}><cylinderGeometry args={[0.5, 0.8, t.h * 0.6, 6]} /><meshStandardMaterial color="#4a3728" /></mesh>
          <mesh position={[0, t.h * 0.7, 0]}><coneGeometry args={[3, t.h * 0.6, 6]} /><meshStandardMaterial color="#1a4d1a" flatShading /></mesh>
        </group>
      ))}
    </group>
  );
}

function CitySkylineEnvironment({ totalLength: L }: { totalLength: number }) {
  const count = Math.max(Math.ceil(L / 8), 25);
  const buildings = useMemo(() => [...Array(count)].map((_, i) => ({ x: (i % 2 === 0 ? -1 : 1) * (40 + (i * 23 % 60)), z: i * (L / count), h: 15 + (i * 17 % 50), w: 5 + (i * 7 % 10), d: 5 + (i * 11 % 10) })), [count, L]);
  return (
    <group>
      {buildings.map((b, i) => (<mesh key={i} position={[b.x, b.h / 2, b.z]}><boxGeometry args={[b.w, b.h, b.d]} /><meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} /></mesh>))}
    </group>
  );
}

function AbstractWavesEnvironment({ totalLength: L }: { totalLength: number }) {
  const count = Math.max(Math.ceil(L / 25), 8);
  return (
    <group position={[0, -5, L / 4]}>
      {[...Array(count)].map((_, i) => (<mesh key={i} position={[0, i * 2, i * -(L / count)]} rotation={[0, 0, i * 0.1]}><torusGeometry args={[40 - i * 3, 0.5, 8, 64, Math.PI * 2]} /><meshStandardMaterial color={`hsl(${200 + i * 20}, 70%, 50%)`} metalness={0.5} transparent opacity={Math.max(0.05, 0.6 - i * 0.05)} /></mesh>))}
    </group>
  );
}

function SpaceStationEnvironment({ totalLength: L }: { totalLength: number }) {
  return (
    <group position={[0, 20, L / 2]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[30, 3, 8, 32]} /><meshStandardMaterial color="#555555" metalness={0.8} roughness={0.2} /></mesh>
      <mesh><sphereGeometry args={[8, 16, 16]} /><meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} /></mesh>
    </group>
  );
}

function AuroraBorealisEnvironment({ totalLength: L }: { totalLength: number }) {
  const count = Math.max(Math.ceil(L / 30), 5);
  return (
    <group position={[0, 30, L / 2 - 50]}>
      {[...Array(count)].map((_, i) => (<mesh key={i} position={[-40 + (i % 5) * 20, Math.sin(i) * 10, -L / 2 + i * 30]} rotation={[0.3, 0, 0.1 * i]}><planeGeometry args={[15, 50]} /><meshBasicMaterial color={`hsl(${120 + i * 30}, 80%, 50%)`} transparent opacity={0.3} side={THREE.DoubleSide} /></mesh>))}
    </group>
  );
}

function VolcanicInfernoEnvironment({ totalLength: L }: { totalLength: number }) {
  return (
    <group>
      <mesh position={[0, 15, -80]}><coneGeometry args={[40, 60, 8]} /><meshStandardMaterial color="#1a0a0a" roughness={0.9} /></mesh>
      <mesh position={[0, 48, -80]}><sphereGeometry args={[8, 16, 16]} /><meshBasicMaterial color="#ff4400" transparent opacity={0.8} /></mesh>
      <pointLight position={[0, 50, -80]} intensity={2} color="#ff4400" distance={100} />
    </group>
  );
}

function CrystalCavesEnvironment({ totalLength: L }: { totalLength: number }) {
  const count = Math.max(Math.ceil(L / 8), 20);
  const crystals = useMemo(() => [...Array(count)].map((_, i) => ({ x: (i % 2 === 0 ? -1 : 1) * (30 + (i * 17 % 40)), z: i * (L / count), h: 5 + (i * 13 % 20), color: `hsl(${200 + (i * 7 % 60)}, 70%, 60%)` })), [count, L]);
  return (
    <group position={[0, 0, L / 2]}>
      {crystals.map((c, i) => (<mesh key={i} position={[c.x, c.h / 2, c.z - L / 2]} rotation={[0, i * 0.3, 0]}><coneGeometry args={[1.5, c.h, 6]} /><meshStandardMaterial color={c.color} transparent opacity={0.7} metalness={0.3} roughness={0.1} /></mesh>))}
    </group>
  );
}

function DesertDunesEnvironment({ totalLength: L }: { totalLength: number }) {
  return (
    <group position={[0, 0, L / 2]}>
      {[...Array(Math.max(Math.ceil(L / 20), 8))].map((_, i) => (<mesh key={i} position={[-80 + (i % 5) * 40, 0, -L / 2 + i * 20]}><sphereGeometry args={[20 + i * 2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#c2a060" roughness={0.9} /></mesh>))}
    </group>
  );
}

function NeonTokyoEnvironment({ totalLength: L }: { totalLength: number }) {
  const count = Math.max(Math.ceil(L / 12), 15);
  return (
    <group position={[0, 0, L / 2]}>
      {[...Array(count)].map((_, i) => (
        <mesh key={i} position={[-70 + (i % 10) * 15, 20 + (i % 5) * 5, -L / 2 + i * 12]}>
          <boxGeometry args={[8, 40 + (i % 6) * 8, 8]} /><meshStandardMaterial color="#0a0a15" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {[...Array(Math.ceil(L / 40))].map((_, i) => (<mesh key={`strip-${i}`} position={[0, 0.1, -L / 2 + 20 + i * 40]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[150, 2]} /><meshBasicMaterial color={i % 2 === 0 ? "#ff00ff" : "#00ffff"} /></mesh>))}
    </group>
  );
}

function FloatingIslandsEnvironment({ totalLength: L }: { totalLength: number }) {
  const count = Math.max(Math.ceil(L / 25), 6);
  const islands = useMemo(() => [...Array(count)].map((_, i) => ({ x: (i % 2 === 0 ? -1 : 1) * (30 + (i * 13 % 40)), y: 10 + (i * 17 % 30), z: i * (L / count), size: 8 + (i * 11 % 12) })), [count, L]);
  return (
    <group position={[0, 0, L / 2]}>
      {islands.map((island, i) => (
        <group key={i} position={[island.x, island.y, island.z - L / 2]}>
          <mesh><sphereGeometry args={[island.size, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#3d2817" roughness={0.9} /></mesh>
          <mesh position={[0, 1, 0]}><cylinderGeometry args={[island.size * 0.9, island.size, 2, 16]} /><meshStandardMaterial color="#2d5a27" roughness={0.8} /></mesh>
        </group>
      ))}
    </group>
  );
}

function DeepOceanEnvironment({ totalLength: L }: { totalLength: number }) {
  return (
    <group position={[0, 0, L / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]}><planeGeometry args={[300, L + 100]} /><meshStandardMaterial color="#001a33" roughness={0.9} /></mesh>
      {[...Array(Math.max(Math.ceil(L / 10), 15))].map((_, i) => (<mesh key={i} position={[-60 + (i % 10) * 12, -5, -L / 2 + i * 10]} rotation={[0, i * 0.5, 0]}><cylinderGeometry args={[0.5, 2, 8, 6]} /><meshStandardMaterial color={`hsl(${340 + i * 10}, 70%, 50%)`} roughness={0.7} /></mesh>))}
    </group>
  );
}

function GalaxyNebulaEnvironment({ totalLength: L }: { totalLength: number }) {
  return (
    <group position={[0, 30, L / 2]}>
      {[...Array(8)].map((_, i) => (<mesh key={i} position={[Math.cos(i * 0.8) * 30, Math.sin(i * 0.5) * 20, Math.sin(i * 0.3) * 20]}><sphereGeometry args={[15 + i * 2, 16, 16]} /><meshBasicMaterial color={`hsl(${250 + i * 15}, 80%, 40%)`} transparent opacity={0.15} /></mesh>))}
    </group>
  );
}

function MatrixRainEnvironment({ totalLength: L }: { totalLength: number }) {
  const count = Math.max(Math.ceil(L / 5), 40);
  return (
    <group position={[0, 30, L / 2]}>
      {[...Array(count)].map((_, i) => (<mesh key={i} position={[-60 + (i % 20) * 6, (i * 7 % 30) - 15, -L / 2 + (i % Math.ceil(L / 10)) * 10]}><boxGeometry args={[0.5, 10 + (i * 3 % 20), 0.1]} /><meshBasicMaterial color="#00ff00" transparent opacity={0.4 + (i * 7 % 10) / 25} /></mesh>))}
    </group>
  );
}

function IceGlacierEnvironment({ totalLength: L }: { totalLength: number }) {
  return (
    <group position={[0, 0, L / 2]}>
      {[...Array(Math.max(Math.ceil(L / 15), 8))].map((_, i) => (<mesh key={i} position={[-80 + (i % 6) * 30, 5, -L / 2 + i * 15]} rotation={[0, i * 0.4, 0]}><icosahedronGeometry args={[10 + (i * 3 % 5), 0]} /><meshStandardMaterial color="#a8d8ea" transparent opacity={0.8} metalness={0.1} roughness={0.2} /></mesh>))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}><planeGeometry args={[200, L + 100]} /><meshStandardMaterial color="#d4f1f9" transparent opacity={0.6} metalness={0.1} roughness={0.3} /></mesh>
    </group>
  );
}

function SteampunkGearsEnvironment({ totalLength: L }: { totalLength: number }) {
  return (
    <group position={[0, 15, L / 2]}>
      {[...Array(Math.max(Math.ceil(L / 25), 6))].map((_, i) => (<mesh key={i} position={[-40 + (i % 4) * 25, Math.sin(i) * 10, -L / 2 + i * 25]} rotation={[i * 0.5, i * 0.3, 0]}><torusGeometry args={[8 + (i * 3 % 4), 1, 8, 12]} /><meshStandardMaterial color="#8b4513" metalness={0.8} roughness={0.4} /></mesh>))}
    </group>
  );
}

function AlienPlanetEnvironment({ totalLength: L }: { totalLength: number }) {
  return (
    <group position={[0, 0, L / 2]}>
      {[...Array(Math.max(Math.ceil(L / 12), 10))].map((_, i) => (<mesh key={i} position={[-50 + (i % 8) * 15, 2, -L / 2 + i * 12]} rotation={[0, i * 0.5, 0]}><dodecahedronGeometry args={[5 + (i * 2 % 6), 0]} /><meshStandardMaterial color={`hsl(${280 + i * 15}, 60%, 30%)`} flatShading /></mesh>))}
    </group>
  );
}

function TronGridEnvironment({ totalLength: L }: { totalLength: number }) {
  const gl = Math.max(L + 100, 200);
  return (
    <group position={[0, 0, L / 2]}>
      <gridHelper args={[gl, Math.floor(gl / 5), '#00ffff', '#004444']} position={[0, 0.1, 0]} />
      {[...Array(Math.max(Math.ceil(L / 20), 10))].map((_, i) => (<mesh key={i} position={[-90 + (i % 10) * 20, 25, -L / 2 + i * 20]}><boxGeometry args={[0.3, 50, 0.3]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.6} /></mesh>))}
    </group>
  );
}

function FootballStadiumEnvironment({ totalLength: L }: { totalLength: number }) {
  const sL = Math.max(L + 80, 150);
  return (
    <group position={[0, 0, sL / 2 - 40]}>
      {[-60, 60].map((x, s) => (<mesh key={s} position={[x, 15, 0]}><boxGeometry args={[20, 35, sL]} /><meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} /></mesh>))}
      {[...Array(Math.ceil(sL / 15))].map((_, i) => (
        <group key={i}>
          <mesh position={[-48, 8 + (i % 2) * 2, -sL / 2 + i * 15]} rotation={[0, 0, 0.2]}><boxGeometry args={[12, 10, 12]} /><meshStandardMaterial color={i % 2 === 0 ? '#cc0000' : '#ffffff'} /></mesh>
          <mesh position={[48, 8 + (i % 2) * 2, -sL / 2 + i * 15]} rotation={[0, 0, -0.2]}><boxGeometry args={[12, 10, 12]} /><meshStandardMaterial color={i % 2 === 0 ? '#0066cc' : '#ffffff'} /></mesh>
        </group>
      ))}
      {[-55, 55].map((x, s) => [...Array(Math.ceil(sL / 80))].map((_, i) => (
        <group key={`light-${s}-${i}`} position={[x, 40, 40 + i * 80]}>
          <mesh><boxGeometry args={[4, 25, 4]} /><meshStandardMaterial color="#444444" /></mesh>
          <pointLight position={[0, -10, 0]} intensity={2} color="#ffffcc" distance={100} />
        </group>
      )))}
    </group>
  );
}

function RaceTrackEnvironment({ totalLength: L }: { totalLength: number }) {
  const tL = Math.max(L + 100, 200);
  return (
    <group position={[0, 0, tL / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><planeGeometry args={[80, tL]} /><meshStandardMaterial color="#333333" roughness={0.95} /></mesh>
      {[-35, 35].map((x, s) => (<mesh key={s} position={[x, 0.3, 0]}><boxGeometry args={[2, 0.5, tL]} /><meshBasicMaterial color="#ffffff" /></mesh>))}
      {[-55, 55].map((x, s) => (<mesh key={`stand-${s}`} position={[x, 12, 0]}><boxGeometry args={[20, 24, tL * 0.9]} /><meshStandardMaterial color="#1a1a2e" metalness={0.3} /></mesh>))}
    </group>
  );
}

function ConcertStageEnvironment({ totalLength: L }: { totalLength: number }) {
  const sL = Math.max(L + 60, 120);
  return (
    <group position={[0, 0, sL / 2]}>
      <mesh position={[0, 1.5, 0]}><boxGeometry args={[100, 3, sL]} /><meshStandardMaterial color="#1a1a1a" metalness={0.6} /></mesh>
      <mesh position={[0, 35, 0]}><boxGeometry args={[110, 3, sL]} /><meshStandardMaterial color="#222222" metalness={0.8} /></mesh>
      {[...Array(Math.ceil(sL / 20))].map((_, i) => (
        <group key={i} position={[0, 30, -sL / 2 + 10 + i * 20]}>
          {[-40, 0, 40].map((x, j) => (
            <group key={j} position={[x, 0, 0]}>
              <mesh><sphereGeometry args={[2, 8, 8]} /><meshStandardMaterial color="#111111" metalness={0.8} /></mesh>
              <pointLight intensity={3} color={`hsl(${(i * 30 + j * 40) % 360}, 100%, 50%)`} distance={50} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function CastleGroundsEnvironment({ totalLength: L }: { totalLength: number }) {
  const gL = Math.max(L + 80, 160);
  return (
    <group position={[0, 0, gL / 2]}>
      {[-65, 65].map((x, s) => (<mesh key={s} position={[x, 15, 0]}><boxGeometry args={[15, 35, gL]} /><meshStandardMaterial color="#4a4a5a" roughness={0.9} /></mesh>))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[110, gL]} /><meshStandardMaterial color="#605040" roughness={0.95} /></mesh>
      {[...Array(Math.ceil(gL / 30))].map((_, i) => (
        <group key={i}>
          <mesh position={[-45, 8, -gL / 2 + i * 30]}><cylinderGeometry args={[0.4, 0.4, 10, 6]} /><meshStandardMaterial color="#4a3020" /></mesh>
          <pointLight position={[-45, 14, -gL / 2 + i * 30]} intensity={1.5} color="#ff6600" distance={30} />
        </group>
      ))}
    </group>
  );
}

function AirportRunwayEnvironment({ totalLength: L }: { totalLength: number }) {
  const rL = Math.max(L + 120, 240);
  return (
    <group position={[0, 0, rL / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><planeGeometry args={[40, rL]} /><meshStandardMaterial color="#1a1a1a" roughness={0.95} /></mesh>
      {[-18, 18].map((x, s) => [...Array(Math.ceil(rL / 15))].map((_, i) => (
        <mesh key={`light-${s}-${i}`} position={[x, 0.5, -rL / 2 + i * 15]}>
          <sphereGeometry args={[0.4, 8, 8]} /><meshBasicMaterial color={x === -18 ? '#00ff00' : '#ff0000'} />
        </mesh>
      )))}
      {[-80, 80].map((x, s) => (<mesh key={`terminal-${s}`} position={[x, 15, 0]}><boxGeometry args={[50, 30, rL * 0.7]} /><meshStandardMaterial color="#3a3a4a" metalness={0.3} /></mesh>))}
    </group>
  );
}

function ThemeParkEnvironment({ totalLength: L }: { totalLength: number }) {
  const pL = Math.max(L + 60, 140);
  return (
    <group position={[0, 0, pL / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[150, pL]} /><meshStandardMaterial color="#2a5a2a" roughness={0.95} /></mesh>
      {[-60, 60].map((x, s) => [...Array(Math.ceil(pL / 100))].map((_, i) => (
        <group key={`ferris-${s}-${i}`} position={[x, 30, -pL / 2 + 50 + i * 100]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[22, 1.5, 8, 32]} /><meshStandardMaterial color="#ff4444" metalness={0.5} /></mesh>
        </group>
      )))}
    </group>
  );
}

function AncientRuinsEnvironment({ totalLength: L }: { totalLength: number }) {
  const rL = Math.max(L + 50, 120);
  return (
    <group position={[0, 0, rL / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[100, rL]} /><meshStandardMaterial color="#706050" roughness={0.98} /></mesh>
      {[-40, 40].map((x, s) => [...Array(Math.ceil(rL / 20))].map((_, i) => (
        <mesh key={`col-${s}-${i}`} position={[x, i % 3 === 0 ? 5 : 12, -rL / 2 + i * 20]}>
          <cylinderGeometry args={[2, 2.5, i % 3 === 0 ? 10 : 24, 12]} /><meshStandardMaterial color="#a09080" roughness={0.9} />
        </mesh>
      )))}
    </group>
  );
}

function ZenGardenEnvironment({ totalLength: L }: { totalLength: number }) {
  const gL = Math.max(L + 40, 100);
  return (
    <group position={[0, 0, gL / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[100, gL]} /><meshStandardMaterial color="#e8e0d0" roughness={1} /></mesh>
      {[...Array(Math.ceil(gL / 8))].map((_, i) => (<mesh key={i} position={[0, 0.05, -gL / 2 + i * 8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[100, 0.5]} /><meshBasicMaterial color="#d0c8b8" /></mesh>))}
      {[-50, 50].map((x, s) => [...Array(Math.ceil(gL / 5))].map((_, i) => (
        <mesh key={`b-${s}-${i}`} position={[x, 5, -gL / 2 + i * 5]}>
          <cylinderGeometry args={[0.3, 0.3, 10, 6]} /><meshStandardMaterial color="#5a8a4a" roughness={0.7} />
        </mesh>
      )))}
    </group>
  );
}

function SkiResortEnvironment({ totalLength: L }: { totalLength: number }) {
  const rL = Math.max(L + 80, 180);
  return (
    <group position={[0, 0, rL / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[150, rL]} /><meshStandardMaterial color="#f0f5ff" roughness={0.9} /></mesh>
      {[-85, 85].map((x, s) => (<mesh key={s} position={[x, 35, 0]} rotation={[0, 0, s === 0 ? 0.4 : -0.4]}><coneGeometry args={[70, 90, 4]} /><meshStandardMaterial color="#ffffff" roughness={0.92} /></mesh>))}
    </group>
  );
}

function UnderwaterKingdomEnvironment({ totalLength: L }: { totalLength: number }) {
  const kL = Math.max(L + 60, 140);
  return (
    <group position={[0, 0, kL / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]}><planeGeometry args={[150, kL]} /><meshStandardMaterial color="#001a33" roughness={0.95} /></mesh>
      {[-60, 60].map((x, s) => [...Array(Math.ceil(kL / 60))].map((_, i) => (
        <group key={`c-${s}-${i}`} position={[x, 20, -kL / 2 + 30 + i * 60]}>
          <mesh><cylinderGeometry args={[10, 14, 45, 6]} /><meshStandardMaterial color={`hsl(${200 + i * 20}, 60%, 40%)`} roughness={0.7} /></mesh>
          <mesh position={[0, 28, 0]}><coneGeometry args={[12, 20, 6]} /><meshStandardMaterial color={`hsl(${180 + i * 20}, 70%, 50%)`} /></mesh>
        </group>
      )))}
    </group>
  );
}

function CyberpunkCityEnvironment({ totalLength: L }: { totalLength: number }) {
  const cL = Math.max(L + 40, 120);
  return (
    <group position={[0, 0, cL / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><planeGeometry args={[120, cL]} /><meshStandardMaterial color="#0a0a0f" metalness={0.8} roughness={0.3} /></mesh>
      {[-70, 70].map((x, s) => [...Array(Math.ceil(cL / 30))].map((_, i) => (
        <mesh key={`m-${s}-${i}`} position={[x, 40 + (i % 4) * 15, -cL / 2 + i * 30]}>
          <boxGeometry args={[28, 80 + (i % 5) * 25, 22]} /><meshStandardMaterial color="#0a0a15" metalness={0.6} roughness={0.4} />
        </mesh>
      )))}
      {[-30, 30].map((x, i) => (<mesh key={i} position={[x, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2, cL]} /><meshBasicMaterial color={i === 0 ? '#ff00ff' : '#00ffff'} /></mesh>))}
    </group>
  );
}

function MedievalArenaEnvironment({ totalLength: L }: { totalLength: number }) {
  const aL = Math.max(L + 60, 150);
  return (
    <group position={[0, 0, aL / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[100, aL]} /><meshStandardMaterial color="#c2a060" roughness={0.98} /></mesh>
      {[-60, 60].map((x, s) => (<mesh key={s} position={[x, 15, 0]}><boxGeometry args={[15, 35, aL]} /><meshStandardMaterial color="#6a5a4a" roughness={0.9} /></mesh>))}
      {[...Array(Math.ceil(aL / 35))].map((_, i) => (
        <group key={i}>
          <mesh position={[-40, 7, -aL / 2 + i * 35]}><cylinderGeometry args={[0.5, 0.5, 12, 6]} /><meshStandardMaterial color="#4a3020" /></mesh>
          <pointLight position={[-40, 15, -aL / 2 + i * 35]} intensity={2} color="#ff6600" distance={35} />
        </group>
      ))}
    </group>
  );
}

function SpaceColonyEnvironment({ totalLength: L }: { totalLength: number }) {
  const cL = Math.max(L + 50, 130);
  return (
    <group position={[0, 0, cL / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[100, cL]} /><meshStandardMaterial color="#2a2a3a" metalness={0.7} roughness={0.4} /></mesh>
      {[...Array(Math.ceil(cL / 70))].map((_, i) => (
        <mesh key={i} position={[0, 25, -cL / 2 + 35 + i * 70]}>
          <sphereGeometry args={[30, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#88ccff" transparent opacity={0.3} metalness={0.1} roughness={0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function TropicalBeachEnvironment({ totalLength: L }: { totalLength: number }) {
  const bL = Math.max(L + 50, 130);
  return (
    <group position={[0, 0, bL / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[120, bL]} /><meshStandardMaterial color="#f4d03f" roughness={0.95} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-75, -0.5, 0]}><planeGeometry args={[70, bL + 60]} /><meshStandardMaterial color="#006994" transparent opacity={0.85} metalness={0.3} roughness={0.6} /></mesh>
      {[-50, 50].map((x, s) => [...Array(Math.ceil(bL / 25))].map((_, i) => (
        <group key={`p-${s}-${i}`} position={[x + (i % 3) * 10, 0, -bL / 2 + i * 25]}>
          <mesh position={[0, 7, 0]}><cylinderGeometry args={[0.7, 1.2, 14, 8]} /><meshStandardMaterial color="#8b4513" roughness={0.8} /></mesh>
          <mesh position={[0, 16, 0]}><sphereGeometry args={[6, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#228b22" roughness={0.7} /></mesh>
        </group>
      )))}
    </group>
  );
}

// ============================================================================
// SYNCHRONIZED CAMERA
// ============================================================================

function SynchronizedCamera({ cameraPosition, lookAt }: { cameraPosition: [number, number, number]; lookAt: [number, number, number] }) {
  const { camera } = useThree();
  camera.position.set(...cameraPosition);
  camera.lookAt(...lookAt);
  camera.updateProjectionMatrix();
  return null;
}

// ============================================================================
// SCENE
// ============================================================================

function TowerChartScene({
  towers, cameraPosition, lookAt, visibleStart, visibleEnd, currentIndex,
  introOpacity, revealProgress, totalItems, showLabels3D, showGround, groundColor,
  backgroundColor, ambientIntensity, backgroundPreset, customModelPath,
  customModelPosition, customModelScale, customModelRotation, towerSpacing, labelVisibleEnd,
}: {
  towers: ReturnType<typeof calculateTowers>;
  cameraPosition: [number, number, number]; lookAt: [number, number, number];
  visibleStart: number; visibleEnd: number; currentIndex: number;
  introOpacity: number; revealProgress: number; totalItems: number;
  showLabels3D: boolean; showGround: boolean; groundColor: string;
  backgroundColor: string; ambientIntensity: number; backgroundPreset: string;
  customModelPath?: string; customModelPosition: [number, number, number];
  customModelScale: number; customModelRotation: number; towerSpacing: number; labelVisibleEnd: number;
}) {
  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <fog attach="fog" args={[backgroundColor, 50, 180]} />
      <StarField />
      <FloatingParticles />
      <BackgroundEnvironment preset={backgroundPreset} totalLength={towers.length * towerSpacing} />
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[50, 80, 50]} intensity={1.1} />
      <directionalLight position={[-40, 50, -40]} intensity={0.4} color="#6666ff" />
      <pointLight position={[0, 80, 0]} intensity={0.6} />
      <hemisphereLight args={['#5555aa', '#222233', 0.4]} />
      {showGround && <Ground color={groundColor} />}
      {customModelPath && (
        <Suspense fallback={null}>
          <CustomModel modelPath={customModelPath} position={customModelPosition} scale={customModelScale} rotation={customModelRotation} />
        </Suspense>
      )}
      <SynchronizedCamera cameraPosition={cameraPosition} lookAt={lookAt} />
      {towers.map((tower, index) => {
        const inVisibleRange = index >= visibleStart && index <= visibleEnd;
        const itemReveal = Math.max(0, Math.min(1, revealProgress * totalItems * 1.2 - index * 0.12));
        const isHighlighted = index === currentIndex || index === currentIndex + 1;
        const labelVisible = index <= labelVisibleEnd && itemReveal > 0.25;
        return (
          <Tower
            key={`tower-${tower.rank}`}
            position={tower.position} height={tower.height} color={tower.color}
            opacity={itemReveal * introOpacity} rank={tower.rank} name={tower.name}
            value={tower.valueFormatted} subtitle={tower.subtitle} image={tower.image}
            showLabel={showLabels3D && labelVisible} isHighlighted={isHighlighted}
            visible={inVisibleRange || itemReveal > 0}
          />
        );
      })}
    </>
  );
}

function CustomModel({ modelPath, position, scale, rotation }: { modelPath: string; position: [number, number, number]; scale: number; rotation: number }) {
  const gltf = useGLTF(modelPath);
  const scene = gltf?.scene;
  useEffect(() => { if (scene) { scene.position.set(0, 0, 0); scene.rotation.set(0, 0, 0); scene.scale.set(1, 1, 1); } }, [scene]);
  if (!scene) return null;
  return <primitive object={scene.clone()} position={position} scale={scale} rotation={[0, (rotation * Math.PI) / 180, 0]} />;
}

// ============================================================================
// CALCULATE TOWERS
// ============================================================================

function calculateTowers(
  items: TowerChart3DBlock['items'],
  towerSpacing: number, baseHeight: number, maxHeight: number,
  gradientStart: string, gradientEnd: string, useGradientByRank: boolean, animationDirection: string
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
      : item.color || gradientStart;
    return { ...item, height, color, position: [0, 0, index * towerSpacing] as [number, number, number], valueFormatted: item.valueFormatted || formatValue(item.value) };
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
  const { fps, width } = useVideoConfig();

  const {
    title = 'Rankings', subtitle, backgroundColor = '#050510', items = [],
    gradientStart = '#3B82F6', gradientEnd = '#8B5CF6', useGradientByRank = true,
    showLabels3D = true, cameraDistance = 35, cameraPauseDuration = 0.4,
    cameraMoveSpeed = 0.5, cameraAngle = 35, groundColor = '#0a0a1f',
    showGround = true, ambientIntensity = 0.5, itemRevealDelay = 0.06,
    towerSpacing = 7, baseHeight = 4, maxHeight = 30, backgroundPreset = 'cyber-grid',
    customModelPath, customModelPosition, customModelScale = 2, customModelRotation = 0,
    animationDirection = 'top-to-bottom',
  } = data;

  useEffect(() => { if (customModelPath) preloadModel(customModelPath); }, [customModelPath]);

  const introDuration = 40;
  const totalItems = items.length;
  const totalAnimFrames = totalItems * (cameraPauseDuration * fps + cameraMoveSpeed * fps);
  const animFrame = Math.max(0, frame - introDuration);
  const animProgress = totalAnimFrames > 0 ? Math.min(animFrame / totalAnimFrames, 1) : 0;
  const currentIndex = Math.min(Math.floor(animProgress * totalItems), totalItems - 1);
  const itemProgress = (animProgress * totalItems) % 1;
  const introOpacity = Math.min(1, frame / introDuration);
  const revealProgress = Math.min(1, frame / (introDuration + totalItems * itemRevealDelay * fps * 0.5));
  const visibleStart = Math.max(0, currentIndex - 1);
  const visibleEnd = Math.min(items.length - 1, currentIndex + 4);
  const labelVisibleEnd = items.length - 1;

  const towers = useMemo(
    () => calculateTowers(items, towerSpacing, baseHeight, maxHeight, gradientStart, gradientEnd, useGradientByRank, animationDirection),
    [items, towerSpacing, baseHeight, maxHeight, gradientStart, gradientEnd, useGradientByRank, animationDirection]
  );

  const cameraState = useMemo(
    () => calculateCameraState(towers.map(t => ({ position: t.position, height: t.height })), currentIndex, itemProgress, cameraDistance, cameraAngle),
    [towers, currentIndex, itemProgress, cameraDistance, cameraAngle]
  );

  const modelPos: [number, number, number] = customModelPosition
    ? [customModelPosition.x, customModelPosition.y, customModelPosition.z]
    : [0, 35, -60];

  const titleOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 25], [-35, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Canvas
        camera={{ position: cameraState.position, fov: 50, near: 0.1, far: 600 }}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
        dpr={1}
        frameloop="demand"
      >
        <TowerChartScene
          towers={towers} cameraPosition={cameraState.position} lookAt={cameraState.lookAt}
          visibleStart={visibleStart} visibleEnd={visibleEnd} currentIndex={currentIndex}
          introOpacity={introOpacity} revealProgress={revealProgress} totalItems={totalItems}
          showLabels3D={showLabels3D} showGround={showGround} groundColor={groundColor}
          backgroundColor={backgroundColor} ambientIntensity={ambientIntensity}
          backgroundPreset={backgroundPreset} customModelPath={customModelPath}
          customModelPosition={modelPos} customModelScale={customModelScale}
          customModelRotation={customModelRotation} towerSpacing={towerSpacing}
          labelVisibleEnd={labelVisibleEnd}
        />
      </Canvas>

      <div style={{ position: 'absolute', top: 35, left: 0, right: 0, textAlign: 'center', opacity: titleOpacity, transform: `translateY(${titleY}px)`, pointerEvents: 'none', zIndex: 10 }}>
        <h1 style={{ fontSize: Math.min(48, width * 0.065), fontWeight: 900, color: '#FFFFFF', textShadow: '0 4px 25px rgba(0,0,0,0.7), 0 0 30px rgba(100,100,255,0.25)', margin: 0, letterSpacing: '-0.5px' }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: Math.min(20, width * 0.03), color: '#94A3B8', marginTop: 6 }}>{subtitle}</p>}
      </div>

      <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, opacity: titleOpacity * 0.7, zIndex: 10 }}>
        {items.slice(0, Math.min(10, items.length)).map((_, i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: frame > 40 + i * 18 ? gradientStart : '#333', boxShadow: frame > 40 + i * 18 ? `0 0 8px ${gradientStart}` : 'none' }} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

export default TowerChart3DScene;
