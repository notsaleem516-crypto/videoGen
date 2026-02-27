// ============================================================================
// TOWER CHART 3D SCENE - 3D Ranking visualization with Three.js
// ============================================================================

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Box, Plane, ContactShadows, Billboard, Stars, useGLTF, Float, useTexture, Image as DreiImage } from '@react-three/drei';
import * as THREE from 'three';
import type { TowerChart3DBlock, TowerItem, AnimationPhase } from '../schemas';
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
// 3D BACKGROUND COMPONENTS
// ============================================================================

/**
 * Animated Stars Background
 */
function StarField() {
  const starsRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
      starsRef.current.rotation.x = state.clock.elapsedTime * 0.005;
    }
  });
  
  return (
    <Stars
      ref={starsRef}
      radius={100}
      depth={50}
      count={3000}
      factor={4}
      saturation={0.5}
      fade
      speed={0.5}
    />
  );
}

/**
 * Gradient Background Planes
 */
function GradientBackground({ color1, color2 }: { color1: string; color2: string }) {
  return (
    <group>
      {/* Far background plane */}
      <mesh position={[0, 50, -150]}>
        <planeGeometry args={[500, 200]} />
        <meshBasicMaterial color={color1} transparent opacity={0.8} />
      </mesh>
      {/* Side gradient planes */}
      <mesh position={[-100, 25, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[300, 100]} />
        <meshBasicMaterial color={color2} transparent opacity={0.3} />
      </mesh>
      <mesh position={[100, 25, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[300, 100]} />
        <meshBasicMaterial color={color2} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/**
 * Floating Particles
 */
function FloatingParticles() {
  const count = 100;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = Math.random() * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    return pos;
  }, []);
  
  const pointsRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += 0.02;
        if (positions[i * 3 + 1] > 50) {
          positions[i * 3 + 1] = 0;
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.3} color="#ffffff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// ============================================================================
// CUSTOM MODEL LOADER
// ============================================================================

interface CustomModelProps {
  modelPath: string;
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
}

function CustomModel({ modelPath, position = [0, 0, 0], scale = 1, rotation = [0, 0, 0] }: CustomModelProps) {
  const { scene } = useGLTF(modelPath);
  const modelRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (scene) {
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
      // Subtle floating animation
      modelRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });
  
  return (
    <primitive
      ref={modelRef}
      object={scene}
      position={position}
      scale={scale}
      rotation={rotation}
    />
  );
}

// ============================================================================
// 3D TOWER COMPONENTS
// ============================================================================

interface TowerProps {
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
}

function Tower({ 
  position, 
  height, 
  color, 
  width = 3, 
  depth = 3, 
  opacity = 1,
  rank,
  name,
  value,
  subtitle,
  image,
  showLabel,
  isHighlighted,
  visible
}: TowerProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  if (!visible) return null;
  
  return (
    <group ref={groupRef} position={position}>
      {/* Tower base glow */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <planeGeometry args={[width + 1, depth + 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.3 * opacity} />
      </mesh>
      
      {/* Main tower body */}
      <Box args={[width, height, depth]} position={[0, height / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial 
          color={color} 
          metalness={0.4} 
          roughness={0.3}
          transparent={opacity < 1}
          opacity={opacity}
          emissive={color}
          emissiveIntensity={isHighlighted ? 0.3 : 0.1}
        />
      </Box>
      
      {/* Top cap with glow effect */}
      <Box args={[width + 0.2, 0.3, depth + 0.2]} position={[0, height + 0.15, 0]}>
        <meshStandardMaterial 
          color="#ffffff"
          metalness={0.8} 
          roughness={0.1}
          emissive={color}
          emissiveIntensity={isHighlighted ? 0.6 : 0.3}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </Box>
      
      {/* Image/Icon on top */}
      {image && (
        <Billboard position={[0, height + 2.5, 0]} follow={true}>
          <DreiImage
            url={image}
            scale={2.5}
            transparent
            opacity={opacity}
          />
        </Billboard>
      )}
      
      {/* Labels */}
      {showLabel && (
        <Billboard position={[0, height + (image ? 4.5 : 2.5), 0]} follow={true}>
          {/* Rank badge */}
          <Text
            position={[-width/2 - 1, 1, 0]}
            fontSize={0.8}
            color="#FFD700"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            #{rank}
          </Text>
          
          {/* Name */}
          <Text
            position={[0, 0.4, 0]}
            fontSize={0.7}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
            outlineWidth={0.04}
            outlineColor="#000000"
            maxWidth={6}
          >
            {name}
          </Text>
          
          {/* Value */}
          <Text
            position={[0, -0.4, 0]}
            fontSize={0.6}
            color="#00FFAA"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#000000"
          >
            {value}
          </Text>
          
          {/* Subtitle */}
          {subtitle && (
            <Text
              position={[0, -1, 0]}
              fontSize={0.4}
              color="#AAAAAA"
              anchorX="center"
              anchorY="middle"
            >
              {subtitle}
            </Text>
          )}
        </Billboard>
      )}
    </group>
  );
}

/**
 * Ground Plane with Grid
 */
function Ground({ color }: { color: string }) {
  return (
    <group>
      <Plane 
        args={[500, 500]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <meshStandardMaterial 
          color={color} 
          metalness={0.5} 
          roughness={0.5}
        />
      </Plane>
      {/* Main grid */}
      <gridHelper args={[500, 100, '#333366', '#222244']} position={[0, 0.01, 0]} />
      {/* Accent grid lines */}
      <gridHelper args={[500, 20, '#4444aa', 'transparent']} position={[0, 0.02, 0]} />
    </group>
  );
}

/**
 * Animated Camera Controller - keeps 3-4 towers in view
 */
interface CameraControllerProps {
  towers: { position: [number, number, number]; height: number }[];
  currentIndex: number;
  progress: number;
  distance: number;
  angle: number;
}

function CameraController({
  towers,
  currentIndex,
  progress,
  distance,
  angle,
}: CameraControllerProps) {
  const { camera } = useThree();
  const smoothPos = useRef(new THREE.Vector3());
  const smoothLook = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  
  useEffect(() => {
    if (towers.length === 0) return;
    // Initialize camera position
    const firstTower = towers[0];
    const angleRad = (angle * Math.PI) / 180;
    camera.position.set(
      Math.sin(angleRad) * distance,
      15,
      firstTower.position[2] + Math.cos(angleRad) * distance
    );
    smoothPos.current.copy(camera.position);
    initialized.current = true;
  }, []);
  
  useFrame(() => {
    if (!initialized.current || towers.length === 0) return;
    
    // Calculate target position - center on current + next tower
    const currentTower = towers[Math.min(currentIndex, towers.length - 1)];
    const nextIndex = Math.min(currentIndex + 1, towers.length - 1);
    const nextTower = towers[nextIndex];
    
    // Interpolate between current and next tower Z position
    const targetZ = THREE.MathUtils.lerp(
      currentTower.position[2],
      nextTower.position[2],
      progress
    );
    
    // Average height of nearby towers for camera Y
    const avgHeight = (currentTower.height + nextTower.height) / 2;
    
    // Camera angle
    const angleRad = (angle * Math.PI) / 180;
    
    // Target camera position - adjusted for better visibility
    const targetPos = new THREE.Vector3(
      Math.sin(angleRad) * distance,
      avgHeight + 12,
      targetZ + Math.cos(angleRad) * distance
    );
    
    // Smooth camera movement
    smoothPos.current.lerp(targetPos, 0.05);
    camera.position.copy(smoothPos.current);
    
    // Look at point between towers
    const lookTarget = new THREE.Vector3(0, avgHeight + 5, targetZ);
    smoothLook.current.lerp(lookTarget, 0.06);
    camera.lookAt(smoothLook.current);
  });
  
  return null;
}

/**
 * Main 3D Scene
 */
interface TowerChartSceneProps {
  data: TowerChart3DBlock;
  frame: number;
  fps: number;
}

function TowerChartScene({ data, frame, fps }: TowerChartSceneProps) {
  const {
    items = [],
    towerSpacing = 6,
    baseHeight = 3,
    maxHeight = 25,
    gradientStart = '#3B82F6',
    gradientEnd = '#8B5CF6',
    useGradientByRank = true,
    showLabels3D = true,
    cameraDistance = 30,
    cameraPauseDuration = 0.5,
    cameraMoveSpeed = 0.6,
    cameraAngle = 30,
    backgroundColor = '#0a0a1a',
    groundColor = '#0f0f2a',
    showGround = true,
    ambientIntensity = 0.6,
    itemRevealDelay = 0.08,
    customModelPath,
  } = data;
  
  // Sort items by rank (ascending)
  const sortedItems = useMemo(() => 
    [...items].sort((a, b) => a.rank - b.rank), 
    [items]
  );
  
  // Value range
  const { minValue, maxValue } = useMemo(() => {
    if (items.length === 0) return { minValue: 0, maxValue: 1 };
    const values = items.map(i => i.value);
    return { minValue: Math.min(...values), maxValue: Math.max(...values) };
  }, [items]);
  
  // Calculate tower data
  const towers = useMemo(() => {
    return sortedItems.map((item, index) => {
      const heightRange = maxHeight - baseHeight;
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
  
  // Animation timing
  const introDuration = 45; // 1.5 seconds intro
  const totalItems = items.length;
  const pauseFrames = cameraPauseDuration * fps;
  const moveFrames = cameraMoveSpeed * fps;
  const framesPerItem = pauseFrames + moveFrames;
  const totalAnimFrames = totalItems * framesPerItem;
  
  // Animation progress
  const animFrame = Math.max(0, frame - introDuration);
  const animProgress = Math.min(animFrame / totalAnimFrames, 1);
  
  // Current index and progress within item
  const currentIndex = Math.min(Math.floor(animProgress * totalItems), totalItems - 1);
  const itemProgress = (animProgress * totalItems) % 1;
  
  // Intro fade
  const introOpacity = Math.min(1, frame / introDuration);
  
  // Item reveal - staggered
  const revealProgress = Math.min(1, frame / (introDuration + totalItems * itemRevealDelay * fps * 0.5));
  
  // Calculate visible range (3-4 towers visible)
  const visibleRange = 4;
  const visibleStart = Math.max(0, currentIndex - 1);
  const visibleEnd = Math.min(towers.length - 1, currentIndex + visibleRange);
  
  return (
    <>
      {/* Background color */}
      <color attach="background" args={[backgroundColor]} />
      
      {/* Fog for depth */}
      <fog attach="fog" args={[backgroundColor, 40, 150]} />
      
      {/* Stars background */}
      <StarField />
      
      {/* Floating particles */}
      <FloatingParticles />
      
      {/* Gradient background planes */}
      <GradientBackground color1={backgroundColor} color2={gradientStart} />
      
      {/* Lighting */}
      <ambientLight intensity={ambientIntensity} color="#ffffff" />
      <directionalLight 
        position={[40, 60, 40]} 
        intensity={1.2} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
      <directionalLight position={[-30, 40, -30]} intensity={0.5} color="#8888ff" />
      <pointLight position={[0, 60, 0]} intensity={0.8} color="#ffffff" />
      <hemisphereLight args={['#6666ff', '#222233', 0.5]} />
      
      {/* Ground */}
      {showGround && <Ground color={groundColor} />}
      
      {/* Contact shadows */}
      <ContactShadows 
        position={[0, 0.02, 0]}
        opacity={0.4}
        scale={150}
        blur={2}
        far={60}
      />
      
      {/* Custom 3D Model if provided */}
      {customModelPath && (
        <Suspense fallback={null}>
          <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
            <CustomModel 
              modelPath={customModelPath} 
              position={[0, 30, -50]} 
              scale={2}
            />
          </Float>
        </Suspense>
      )}
      
      {/* Camera Controller */}
      {towers.length > 0 && (
        <CameraController
          towers={towers.map(t => ({ position: t.position, height: t.height }))}
          currentIndex={currentIndex}
          progress={itemProgress}
          distance={cameraDistance}
          angle={cameraAngle}
        />
      )}
      
      {/* Towers */}
      {towers.map((tower, index) => {
        // Visibility - show towers in visible range
        const inVisibleRange = index >= visibleStart && index <= visibleEnd;
        
        // Reveal animation
        const itemReveal = Math.max(0, Math.min(1, (revealProgress * totalItems * 1.2) - index * 0.1));
        
        // Highlight current tower
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
            showLabel={showLabels3D && itemReveal > 0.2 && inVisibleRange}
            isHighlighted={isHighlighted}
            visible={inVisibleRange || itemReveal > 0}
          />
        );
      })}
    </>
  );
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

export function TowerChart3DScene({
  data,
  motionProfile = 'dynamic',
}: TowerChart3DSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  const { title = 'Rankings', subtitle, backgroundColor = '#0a0a1a', items = [] } = data;
  
  // Title animation
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 30], [-30, 0], { extrapolateRight: 'clamp' });
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* 3D Canvas - full size */}
      <Canvas
        shadows
        camera={{ position: [30, 15, -20], fov: 50, near: 0.1, far: 500 }}
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'absolute', 
          top: 0, 
          left: 0 
        }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
      >
        <TowerChartScene data={data} frame={frame} fps={fps} />
      </Canvas>
      
      {/* Title Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <h1 style={{
          fontSize: Math.min(52, width * 0.08),
          fontWeight: 900,
          color: '#FFFFFF',
          textShadow: '0 4px 30px rgba(0,0,0,0.8), 0 0 40px rgba(100,100,255,0.3)',
          margin: 0,
          letterSpacing: '-0.5px',
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ 
            fontSize: Math.min(24, width * 0.04), 
            color: '#94A3B8', 
            marginTop: 10, 
            textShadow: '0 2px 10px rgba(0,0,0,0.5)' 
          }}>
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Progress dots */}
      <div style={{
        position: 'absolute',
        bottom: 25,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 6,
        opacity: titleOpacity * 0.8,
        zIndex: 10,
      }}>
        {items.slice(0, Math.min(10, items.length)).map((_, i) => (
          <div key={i} style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: frame > 45 + i * 20 ? '#6366F1' : '#333',
            boxShadow: frame > 45 + i * 20 ? '0 0 10px #6366F1' : 'none',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

export default TowerChart3DScene;
