import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { getTheme } from '../utils/theme';
import type { Tower3DBlock } from '../schemas';
import type { MotionProfileType } from '../utils/animations';

interface Tower3DSceneProps {
  data: Tower3DBlock;
  theme: string;
  motionProfile: MotionProfileType;
  animation: { enter: number; hold: number; exit: number };
}

interface JourneyState {
  x: number;
  y: number;
  z: number;
  focusedItemIndex: number;
}

const FALLBACK_COLORS = [
  '#3B82F6',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#14B8A6',
  '#EAB308',
  '#06B6D4',
  '#EC4899',
  '#84CC16',
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getJourneyState(
  frameInJourney: number,
  stops: Array<{ x: number; y: number; z: number; focusedItemIndex: number }>,
  holdFrames: number,
  travelFrames: number
): JourneyState {
  if (stops.length === 0) {
    return { x: 0, y: 0, z: 0, focusedItemIndex: 0 };
  }

  let cursor = 0;
  for (let i = 0; i < stops.length; i++) {
    const holdStart = cursor;
    const holdEnd = holdStart + holdFrames;
    if (frameInJourney < holdEnd || i === stops.length - 1) {
      return stops[i];
    }

    cursor = holdEnd;
    const travelEnd = cursor + travelFrames;
    if (frameInJourney < travelEnd) {
      const t = interpolate(frameInJourney, [cursor, travelEnd], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      });
      return {
        x: interpolate(t, [0, 1], [stops[i].x, stops[i + 1].x]),
        y: interpolate(t, [0, 1], [stops[i].y, stops[i + 1].y]),
        z: interpolate(t, [0, 1], [stops[i].z, stops[i + 1].z]),
        focusedItemIndex: t < 0.5 ? stops[i].focusedItemIndex : stops[i + 1].focusedItemIndex,
      };
    }

    cursor = travelEnd;
  }

  return stops[stops.length - 1];
}

function getEnvironment(preset: Tower3DBlock['environmentPreset']) {
  if (preset === 'sunset') {
    return {
      sky: '#1f1235',
      fog: '#2a1750',
      ground: '#33184f',
      ambient: 0.62,
      keyColor: '#fb7185',
      fillColor: '#f59e0b',
      rimColor: '#fca5a5',
    };
  }
  if (preset === 'neon') {
    return {
      sky: '#020617',
      fog: '#020617',
      ground: '#0f172a',
      ambient: 0.38,
      keyColor: '#06b6d4',
      fillColor: '#a855f7',
      rimColor: '#22d3ee',
    };
  }
  return {
    sky: '#0f172a',
    fog: '#111827',
    ground: '#1f2937',
    ambient: 0.72,
    keyColor: '#93c5fd',
    fillColor: '#ffffff',
    rimColor: '#60a5fa',
  };
}

export function Tower3DScene({ data, theme, motionProfile, animation }: Tower3DSceneProps) {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const colors = getTheme(theme);

  const items = useMemo(() => {
    return [...data.items].sort((a, b) => {
      if (typeof a.rank === 'number' && typeof b.rank === 'number') {
        return a.rank - b.rank;
      }
      return b.value - a.value;
    });
  }, [data.items]);

  const values = items.map((item) => item.value);
  const maxValue = Math.max(1, ...values);
  const towerScale = motionProfile === 'energetic' ? 1.08 : motionProfile === 'subtle' ? 0.94 : 1;
  const env = getEnvironment(data.environmentPreset ?? 'studio');

  const laneSpacing = data.laneSpacing ?? 4.5;
  const laneCurve = data.laneCurve ?? 1.35;
  const minHeight = data.minHeight ?? 1.2;
  const maxHeight = data.maxHeight ?? 8.5;
  const towerWidth = data.towerWidth ?? 2;
  const towerDepth = data.towerDepth ?? 2;

  const towerData = items.map((item, index) => {
    const normalized = clamp(item.value / maxValue, 0, 1);
    const heightForItem = interpolate(normalized, [0, 1], [minHeight, maxHeight]);
    const worldX = Math.sin(index * 0.75) * laneCurve * 2.2;
    const worldZ = index * laneSpacing;
    const color = item.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
    return { ...item, worldX, worldZ, heightForItem, color };
  });

  const stops = towerData
    .map((item, focusedItemIndex) => ({
      x: item.worldX,
      y: item.heightForItem * 0.6,
      z: item.worldZ,
      focusedItemIndex,
    }))
    .reverse();
  const holdFramesRaw = Math.max(1, Math.round(((data.pauseMs ?? 250) / 1000) * fps));
  const travelFramesRaw = Math.max(2, Math.round(((data.travelMs ?? 700) / 1000) * fps));
  const enterFrames = Math.max(1, Math.round(animation.enter * fps));
  const exitFrames = Math.max(1, Math.round(animation.exit * fps));
  const availableFrames = Math.max(1, durationInFrames - enterFrames - exitFrames);
  const requiredJourneyFrames = holdFramesRaw * stops.length + travelFramesRaw * Math.max(0, stops.length - 1);
  const speedScale = requiredJourneyFrames > availableFrames ? availableFrames / requiredJourneyFrames : 1;
  const holdFrames = Math.max(1, Math.round(holdFramesRaw * speedScale));
  const travelFrames = Math.max(1, Math.round(travelFramesRaw * speedScale));

  const frameInJourney = clamp(frame - enterFrames, 0, availableFrames - 1);
  const journey = getJourneyState(frameInJourney, stops, holdFrames, travelFrames);

  const enterOpacity = interpolate(frame, [0, enterFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exitStart = durationInFrames - exitFrames;
  const exitOpacity = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = Math.min(enterOpacity, exitOpacity);

  const focusedTower = towerData[towerData.length - 1 - journey.focusedItemIndex] || towerData[0];
  const angle = ((data.cameraAngleDeg ?? 46) * Math.PI) / 180;
  const cameraDistance = data.cameraDistance ?? 20;
  const cameraHeight = data.cameraHeight ?? 12;
  const cameraX = Math.sin(angle) * cameraDistance;
  const cameraZ = Math.cos(angle) * cameraDistance;
  const sceneMidZ = ((towerData.length - 1) * laneSpacing) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: env.sky }}>
      <AbsoluteFill style={{ opacity }}>
        <ThreeCanvas width={width} height={height}>
          <color attach="background" args={[env.sky]} />
          <fog attach="fog" args={[env.fog, 25, 140]} />
          <perspectiveCamera makeDefault position={[cameraX, cameraHeight, cameraZ]} fov={44} />
          <ambientLight intensity={env.ambient} />
          <directionalLight position={[14, 26, 16]} intensity={0.9} color={env.keyColor} />
          <pointLight position={[-16, 11, 28]} intensity={0.75} color={env.fillColor} />
          <pointLight position={[20, 8, -16]} intensity={0.55} color={env.rimColor} />

          <group position={[-journey.x, -journey.y * 0.28, -journey.z]}>
            <mesh position={[0, -0.75, sceneMidZ]}>
              <boxGeometry args={[38, 0.6, sceneMidZ * 2 + 40]} />
              <meshStandardMaterial color={env.ground} roughness={0.95} metalness={0.05} />
            </mesh>
            {towerData.map((item, index) => {
              const isFocused = item.name === focusedTower?.name;
              return (
                <group key={`${item.name}-${index}`} position={[item.worldX, 0, item.worldZ]}>
                  <mesh position={[0, item.heightForItem / 2, 0]}>
                    <boxGeometry args={[towerWidth * towerScale, item.heightForItem, towerDepth * towerScale]} />
                    <meshStandardMaterial
                      color={item.color}
                      roughness={0.35}
                      metalness={0.5}
                      emissive={item.color}
                      emissiveIntensity={isFocused ? 0.25 : 0.07}
                    />
                  </mesh>
                  <mesh position={[0, -0.22, 0]}>
                    <boxGeometry args={[towerWidth * towerScale + 1.4, 0.35, towerDepth * towerScale + 1.4]} />
                    <meshStandardMaterial color="#1f2937" roughness={0.9} metalness={0.1} />
                  </mesh>
                </group>
              );
            })}
          </group>
        </ThreeCanvas>
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          top: 70,
          left: 60,
          right: 60,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity,
          color: colors.foreground,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 800 }}>{data.title || 'Top 20'}</div>
        <div style={{ fontSize: 28, color: colors.muted }}>{data.categoryLabel || 'Rankings'}</div>
      </div>

      {focusedTower && (
        <div
          style={{
            position: 'absolute',
            bottom: 90,
            left: 60,
            right: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity,
            color: colors.foreground,
            fontFamily: 'system-ui, sans-serif',
            background: 'rgba(15, 23, 42, 0.78)',
            border: '1px solid rgba(148, 163, 184, 0.35)',
            borderRadius: 16,
            padding: '18px 24px',
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 700 }}>
            #{focusedTower.rank || items.findIndex((item) => item.name === focusedTower.name) + 1} {focusedTower.name}
          </div>
          <div style={{ fontSize: 28, color: focusedTower.color }}>
            {focusedTower.value.toLocaleString()} {data.valueLabel || 'units'}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}
