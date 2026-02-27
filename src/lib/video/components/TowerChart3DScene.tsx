// ============================================================================
// TOWER CHART 3D SCENE - 3D Ranking visualization with Three.js
// ============================================================================

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Box, Plane, ContactShadows, Billboard, Stars, useGLTF, Float } from '@react-three/drei';
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
  } = data;
  
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.rank - b.rank), [items]);
  
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
            <CustomModel modelPath={customModelPath} position={[0, 35, -60]} scale={2} />
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

function CustomModel({ modelPath, position, scale }: { modelPath: string; position: [number, number, number]; scale: number }) {
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
      modelRef.current.rotation.y = state.clock.elapsedTime * 0.15;
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
