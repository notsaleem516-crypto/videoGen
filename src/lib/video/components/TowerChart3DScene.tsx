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
