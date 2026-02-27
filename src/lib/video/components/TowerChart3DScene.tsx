// ============================================================================
// TOWER CHART 3D SCENE - 3D Ranking visualization with Three.js
// ============================================================================

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, useValue } from 'remotion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Box, Plane, ContactShadows, Billboard, Stars, useGLTF, Float } from '@react-three/drei';
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

// CSS color lerp for 2D fallback
function lerpCSSColor(color1: string, color2: string, t: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `rgb(${r}, ${g}, ${b})`;
}

// ============================================================================
// 2D FALLBACK COMPONENT (Works in Remotion Player)
// ============================================================================

function TowerChart2DFallback({ data, frame, fps, width, height }: {
  data: TowerChart3DBlock;
  frame: number;
  fps: number;
  width: number;
  height: number;
}) {
  const {
    items = [],
    title = 'Rankings',
    subtitle,
    baseHeight = 10,
    maxHeight = 60,
    gradientStart = '#3B82F6',
    gradientEnd = '#8B5CF6',
    useGradientByRank = true,
    backgroundColor = '#0a0a1a',
  } = data;
  
  // Sort by rank
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
  
  // Title animation
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 20], [-30, 0], { extrapolateRight: 'clamp' });
  
  // Total items
  const totalItems = sortedItems.length;
  const spacing = 100 / (totalItems + 1);
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 100%, ${gradientStart}22 0%, transparent 60%)`,
        }}
      />
      
      {/* Stars/particles background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.3,
          backgroundImage: 'radial-gradient(circle at 50% 50%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Grid lines */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, #333 20%, #333 80%, transparent)',
        }}
      />
      
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <h1
          style={{
            fontSize: Math.min(48, width * 0.07),
            fontWeight: 900,
            color: '#FFFFFF',
            textShadow: '0 4px 30px rgba(0,0,0,0.8), 0 0 40px rgba(100,100,255,0.2)',
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: Math.min(20, width * 0.035),
              color: '#94A3B8',
              marginTop: 8,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Towers */}
      {sortedItems.map((item, index) => {
        const normalizedValue = (item.value - minValue) / (maxValue - minValue || 1);
        const targetHeight = baseHeight + normalizedValue * (maxHeight - baseHeight);
        
        const color = useGradientByRank
          ? lerpCSSColor(gradientEnd, gradientStart, (totalItems - item.rank) / Math.max(totalItems - 1, 1))
          : (item.color || gradientStart);
        
        // Staggered reveal animation - NO CSS transitions, pure Remotion interpolation
        const revealStart = 20 + index * 10;
        const revealProgress = interpolate(frame, [revealStart, revealStart + 20], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        
        // Smooth height animation using easeOut
        const easeProgress = 1 - Math.pow(1 - revealProgress, 3); // easeOutCubic
        const heightAnimated = easeProgress * targetHeight;
        
        // Position
        const leftPos = spacing * (index + 1);
        const heightPx = (heightAnimated / 100) * height * 0.45;
        
        // Scale effect for emphasis
        const scale = interpolate(revealProgress, [0, 0.5, 1], [0.8, 1.02, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        
        return (
          <div
            key={`tower-${item.rank}`}
            style={{
              position: 'absolute',
              bottom: 80,
              left: `${leftPos}%`,
              transform: `translateX(-50%) scale(${scale})`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity: interpolate(revealProgress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            {/* Tower */}
            <div
              style={{
                width: Math.min(55, width / (totalItems + 2)),
                height: heightPx,
                background: `linear-gradient(180deg, ${color} 0%, ${color}99 50%, ${color}66 100%)`,
                borderRadius: '6px 6px 3px 3px',
                boxShadow: `0 0 25px ${color}55, 0 4px 15px rgba(0,0,0,0.3)`,
                position: 'relative',
              }}
            >
              {/* Top glow */}
              <div
                style={{
                  position: 'absolute',
                  top: -8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80%',
                  height: 16,
                  background: `radial-gradient(ellipse, ${color}aa 0%, transparent 70%)`,
                }}
              />
              
              {/* Shimmer effect */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)`,
                  borderRadius: 'inherit',
                }}
              />
              
              {/* Image */}
              {item.image && revealProgress > 0.5 && (
                <div
                  style={{
                    position: 'absolute',
                    top: -40,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 35,
                    height: 35,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
            
            {/* Label */}
            <div
              style={{
                marginTop: 6,
                textAlign: 'center',
                maxWidth: Math.min(70, width / totalItems),
              }}
            >
              <div
                style={{
                  fontSize: Math.min(13, width * 0.02),
                  fontWeight: 'bold',
                  color: '#FFD700',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                }}
              >
                #{item.rank}
              </div>
              <div
                style={{
                  fontSize: Math.min(10, width * 0.016),
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: 2,
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontSize: Math.min(9, width * 0.014),
                  color: '#00FFAA',
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                  marginTop: 1,
                }}
              >
                {item.valueFormatted || formatValue(item.value)}
              </div>
              {item.subtitle && (
                <div
                  style={{
                    fontSize: Math.min(8, width * 0.012),
                    color: '#888',
                  }}
                >
                  {item.subtitle}
                </div>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Progress indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 25,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 5,
          opacity: titleOpacity * 0.7,
        }}
      >
        {sortedItems.slice(0, Math.min(10, totalItems)).map((item, i) => {
          const dotReveal = interpolate(frame, [20 + i * 10, 40 + i * 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: dotReveal > 0.5 ? gradientStart : '#333',
                boxShadow: dotReveal > 0.5 ? `0 0 8px ${gradientStart}` : 'none',
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ============================================================================
// 3D COMPONENTS (For actual rendering)
// ============================================================================

function StarField() {
  const starsRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });
  
  return <Stars ref={starsRef} radius={100} depth={50} count={3000} factor={4} saturation={0.5} fade speed={0.5} />;
}

function GradientBackground({ color1, color2 }: { color1: string; color2: string }) {
  return (
    <group>
      <mesh position={[0, 50, -150]}>
        <planeGeometry args={[500, 200]} />
        <meshBasicMaterial color={color1} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function FloatingParticles() {
  const count = 80;
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
  
  useFrame(() => {
    if (pointsRef.current) {
      const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArray[i * 3 + 1] += 0.02;
        if (posArray[i * 3 + 1] > 50) posArray[i * 3 + 1] = 0;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.3} color="#ffffff" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

function CustomModel({ modelPath, position = [0, 0, 0], scale = 1 }: { modelPath: string; position?: [number, number, number]; scale?: number }) {
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
      modelRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });
  
  return <primitive ref={modelRef} object={scene} position={position} scale={scale} />;
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
  const groupRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    if (image) {
      const loader = new THREE.TextureLoader();
      loader.load(image, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; setTexture(tex); }, undefined, () => setTexture(null));
    }
  }, [image]);
  
  if (!visible) return null;
  
  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <planeGeometry args={[width + 1, depth + 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.3 * opacity} />
      </mesh>
      <Box args={[width, height, depth]} position={[0, height / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} transparent={opacity < 1} opacity={opacity} emissive={color} emissiveIntensity={isHighlighted ? 0.3 : 0.1} />
      </Box>
      <Box args={[width + 0.2, 0.3, depth + 0.2]} position={[0, height + 0.15, 0]}>
        <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.1} emissive={color} emissiveIntensity={isHighlighted ? 0.6 : 0.3} transparent={opacity < 1} opacity={opacity} />
      </Box>
      {image && texture && (
        <Billboard position={[0, height + 2.5, 0]} follow={true}>
          <mesh><planeGeometry args={[2.5, 2.5]} /><meshBasicMaterial map={texture} transparent opacity={opacity} side={THREE.DoubleSide} /></mesh>
        </Billboard>
      )}
      {showLabel && (
        <Billboard position={[0, height + (image && texture ? 4.5 : 2.5), 0]} follow={true}>
          <Text position={[-width/2 - 1, 1, 0]} fontSize={0.8} color="#FFD700" anchorX="center" anchorY="middle" fontWeight="bold" outlineWidth={0.05} outlineColor="#000000">#{rank}</Text>
          <Text position={[0, 0.4, 0]} fontSize={0.7} color="#FFFFFF" anchorX="center" anchorY="middle" fontWeight="bold" outlineWidth={0.04} outlineColor="#000000" maxWidth={6}>{name}</Text>
          <Text position={[0, -0.4, 0]} fontSize={0.6} color="#00FFAA" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000000">{value}</Text>
          {subtitle && <Text position={[0, -1, 0]} fontSize={0.4} color="#AAAAAA" anchorX="center" anchorY="middle">{subtitle}</Text>}
        </Billboard>
      )}
    </group>
  );
}

function Ground({ color }: { color: string }) {
  return (
    <group>
      <Plane args={[500, 500]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
      </Plane>
      <gridHelper args={[500, 100, '#333366', '#222244']} position={[0, 0.01, 0]} />
    </group>
  );
}

function CameraController({ towers, currentIndex, progress, distance, angle }: { towers: { position: [number, number, number]; height: number }[]; currentIndex: number; progress: number; distance: number; angle: number }) {
  const { camera } = useThree();
  const smoothPos = useRef(new THREE.Vector3());
  const smoothLook = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  
  useEffect(() => {
    if (towers.length === 0) return;
    const firstTower = towers[0];
    const angleRad = (angle * Math.PI) / 180;
    camera.position.set(Math.sin(angleRad) * distance, 15, firstTower.position[2] + Math.cos(angleRad) * distance);
    smoothPos.current.copy(camera.position);
    initialized.current = true;
  }, [towers, distance, angle, camera]);
  
  useFrame(() => {
    if (!initialized.current || towers.length === 0) return;
    const currentTower = towers[Math.min(currentIndex, towers.length - 1)];
    const nextIndex = Math.min(currentIndex + 1, towers.length - 1);
    const nextTower = towers[nextIndex];
    const targetZ = THREE.MathUtils.lerp(currentTower.position[2], nextTower.position[2], progress);
    const avgHeight = (currentTower.height + nextTower.height) / 2;
    const angleRad = (angle * Math.PI) / 180;
    const targetPos = new THREE.Vector3(Math.sin(angleRad) * distance, avgHeight + 12, targetZ + Math.cos(angleRad) * distance);
    smoothPos.current.lerp(targetPos, 0.05);
    camera.position.copy(smoothPos.current);
    const lookTarget = new THREE.Vector3(0, avgHeight + 5, targetZ);
    smoothLook.current.lerp(lookTarget, 0.06);
    camera.lookAt(smoothLook.current);
  });
  
  return null;
}

function TowerChartScene({ data, frame, fps }: { data: TowerChart3DBlock; frame: number; fps: number }) {
  const { items = [], towerSpacing = 6, baseHeight = 3, maxHeight = 25, gradientStart = '#3B82F6', gradientEnd = '#8B5CF6', useGradientByRank = true, showLabels3D = true, cameraDistance = 30, cameraPauseDuration = 0.5, cameraMoveSpeed = 0.6, cameraAngle = 30, backgroundColor = '#0a0a1a', groundColor = '#0f0f2a', showGround = true, ambientIntensity = 0.6, itemRevealDelay = 0.08, customModelPath } = data;
  
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.rank - b.rank), [items]);
  const { minValue, maxValue } = useMemo(() => {
    if (items.length === 0) return { minValue: 0, maxValue: 1 };
    const values = items.map(i => i.value);
    return { minValue: Math.min(...values), maxValue: Math.max(...values) };
  }, [items]);
  
  const towers = useMemo(() => {
    return sortedItems.map((item, index) => {
      const heightRange = maxHeight - baseHeight;
      const normalizedValue = (item.value - minValue) / (maxValue - minValue || 1);
      const height = baseHeight + normalizedValue * heightRange;
      const color = useGradientByRank ? lerpColor(gradientEnd, gradientStart, (items.length - item.rank) / Math.max(items.length - 1, 1)) : (item.color || gradientStart);
      return { ...item, height, color, position: [0, 0, index * towerSpacing] as [number, number, number], valueFormatted: item.valueFormatted || formatValue(item.value) };
    });
  }, [sortedItems, minValue, maxValue, baseHeight, maxHeight, gradientStart, gradientEnd, useGradientByRank, towerSpacing, items.length]);
  
  const introDuration = 45;
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
      <fog attach="fog" args={[backgroundColor, 40, 150]} />
      <StarField />
      <FloatingParticles />
      <GradientBackground color1={backgroundColor} color2={gradientStart} />
      <ambientLight intensity={ambientIntensity} color="#ffffff" />
      <directionalLight position={[40, 60, 40]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-far={200} shadow-camera-left={-80} shadow-camera-right={80} shadow-camera-top={80} shadow-camera-bottom={-80} />
      <directionalLight position={[-30, 40, -30]} intensity={0.5} color="#8888ff" />
      <pointLight position={[0, 60, 0]} intensity={0.8} color="#ffffff" />
      <hemisphereLight args={['#6666ff', '#222233', 0.5]} />
      {showGround && <Ground color={groundColor} />}
      <ContactShadows position={[0, 0.02, 0]} opacity={0.4} scale={150} blur={2} far={60} />
      {customModelPath && <Suspense fallback={null}><Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}><CustomModel modelPath={customModelPath} position={[0, 30, -50]} scale={2} /></Float></Suspense>}
      {towers.length > 0 && <CameraController towers={towers.map(t => ({ position: t.position, height: t.height }))} currentIndex={currentIndex} progress={itemProgress} distance={cameraDistance} angle={cameraAngle} />}
      {towers.map((tower, index) => {
        const inVisibleRange = index >= visibleStart && index <= visibleEnd;
        const itemReveal = Math.max(0, Math.min(1, (revealProgress * totalItems * 1.2) - index * 0.1));
        const isHighlighted = index === currentIndex || index === currentIndex + 1;
        return <Tower key={`tower-${tower.rank}`} position={tower.position} height={tower.height} color={tower.color} opacity={itemReveal * introOpacity} rank={tower.rank} name={tower.name} value={tower.valueFormatted} subtitle={tower.subtitle} image={tower.image} showLabel={showLabels3D && itemReveal > 0.2 && inVisibleRange} isHighlighted={isHighlighted} visible={inVisibleRange || itemReveal > 0} />;
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

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch { return false; }
}

export function TowerChart3DScene({ data, motionProfile = 'dynamic' }: TowerChart3DSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const [use3D, setUse3D] = useState(false);
  
  useEffect(() => {
    const hasWebGL = supportsWebGL();
    const isRemotionPlayer = typeof window !== 'undefined' && (window.location.search.includes('composition') || window.location.pathname.includes('preview'));
    setUse3D(hasWebGL && !isRemotionPlayer);
  }, []);
  
  const { title = 'Rankings', subtitle, backgroundColor = '#0a0a1a', items = [] } = data;
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 30], [-30, 0], { extrapolateRight: 'clamp' });
  
  // Always use 2D fallback for Remotion Player
  if (!use3D) {
    return <TowerChart2DFallback data={data} frame={frame} fps={fps} width={width} height={height} />;
  }
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <Canvas shadows camera={{ position: [30, 15, -20], fov: 50, near: 0.1, far: 500 }} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }} dpr={[1, 2]}>
        <TowerChartScene data={data} frame={frame} fps={fps} />
      </Canvas>
      <div style={{ position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center', opacity: titleOpacity, transform: `translateY(${titleY}px)`, pointerEvents: 'none', zIndex: 10 }}>
        <h1 style={{ fontSize: Math.min(52, width * 0.08), fontWeight: 900, color: '#FFFFFF', textShadow: '0 4px 30px rgba(0,0,0,0.8)', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: Math.min(24, width * 0.04), color: '#94A3B8', marginTop: 10 }}>{subtitle}</p>}
      </div>
      <div style={{ position: 'absolute', bottom: 25, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, opacity: titleOpacity * 0.8, zIndex: 10 }}>
        {items.slice(0, Math.min(10, items.length)).map((_, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: frame > 45 + i * 20 ? '#6366F1' : '#333' }} />)}
      </div>
    </AbsoluteFill>
  );
}

export default TowerChart3DScene;
