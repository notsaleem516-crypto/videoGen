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
  cameraY: number;
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
  stops: number[],
  holdFrames: number,
  travelFrames: number
): JourneyState {
  if (stops.length === 0) {
    return { cameraY: 0, focusedItemIndex: 0 };
  }

  let cursor = 0;
  for (let i = 0; i < stops.length; i++) {
    const holdStart = cursor;
    const holdEnd = holdStart + holdFrames;
    if (frameInJourney < holdEnd || i === stops.length - 1) {
      return { cameraY: stops[i], focusedItemIndex: i };
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
        cameraY: interpolate(t, [0, 1], [stops[i], stops[i + 1]]),
        focusedItemIndex: i + (t > 0.5 ? 1 : 0),
      };
    }

    cursor = travelEnd;
  }

  return { cameraY: stops[stops.length - 1], focusedItemIndex: stops.length - 1 };
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

  const levelSpacing = 3.6;
  const minHeight = data.minHeight ?? 1.2;
  const maxHeight = data.maxHeight ?? 8.5;
  const towerWidth = data.towerWidth ?? 2;
  const towerDepth = data.towerDepth ?? 2;

  const towerData = items.map((item, index) => {
    const normalized = clamp(item.value / maxValue, 0, 1);
    const heightForItem = interpolate(normalized, [0, 1], [minHeight, maxHeight]);
    const baseY = (items.length - 1 - index) * levelSpacing;
    const color = item.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
    return { ...item, baseY, heightForItem, color };
  });

  const stops = towerData.map((item) => item.baseY + item.heightForItem / 2).reverse();
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

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <AbsoluteFill style={{ opacity }}>
        <ThreeCanvas width={width} height={height}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[8, 14, 10]} intensity={1.1} />
          <pointLight position={[-8, 8, 12]} intensity={0.6} />

          <group position={[0, -journey.cameraY, 0]}>
            {towerData.map((item, index) => {
              const isFocused = item.name === focusedTower?.name;
              return (
                <group key={`${item.name}-${index}`} position={[0, item.baseY, 0]}>
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
                  <mesh position={[0, -0.2, 0]}>
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
            background: 'rgba(15, 23, 42, 0.7)',
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
