import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import { getTheme } from '../utils/theme';
import type { MotionProfileType } from '../utils/animations';

interface ProgressBarBlock {
  type: 'progress-bar';
  label?: string;
  value?: number;
  color?: string;
  backgroundColor?: string;
  height?: 'small' | 'medium' | 'large';
  showPercentage?: boolean;
  animated?: boolean;
  stripes?: boolean;
}

interface ProgressBarSceneProps {
  data: ProgressBarBlock;
  theme: string;
  motionProfile: MotionProfileType;
  animation: { enter: number; hold: number; exit: number };
}

export function ProgressBarScene({ data, theme, animation }: ProgressBarSceneProps) {
  const frame = useCurrentFrame();
  const colors = getTheme(theme);
  const fps = 30;
  
  const { 
    label, 
    value = 75, 
    color, 
    backgroundColor, 
    height = 'medium', 
    showPercentage = true, 
    animated = true,
    stripes = false 
  } = data;
  
  const heights = { small: 12, medium: 24, large: 40 };
  const barHeight = heights[height] || 24;
  
  // Entrance animation
  const opacity = interpolate(
    frame,
    [0, animation.enter * fps],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  
  // Progress animation
  const progressValue = animated 
    ? interpolate(frame, [0, animation.hold * fps * 0.5], [0, value], { extrapolateRight: 'clamp' })
    : value;
  
  // Stripe animation offset
  const stripeOffset = stripes ? frame % 20 : 0;
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
        padding: 40,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          transform: `scale(${scale})`,
        }}
      >
        {/* Label */}
        {label && (
          <div
            style={{
              fontSize: 32,
              fontFamily: 'system-ui, sans-serif',
              color: colors.text,
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            {label}
          </div>
        )}
        
        {/* Progress Bar Container */}
        <div
          style={{
            width: '100%',
            height: barHeight,
            backgroundColor: backgroundColor || colors.surface,
            borderRadius: barHeight / 2,
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          {/* Progress Fill */}
          <div
            style={{
              width: `${progressValue}%`,
              height: '100%',
              background: stripes
                ? `repeating-linear-gradient(
                    -45deg,
                    ${color || colors.primary},
                    ${color || colors.primary} 10px,
                    ${color || colors.primary}cc 10px,
                    ${color || colors.primary}cc 20px
                  )`
                : color || colors.primary,
              borderRadius: barHeight / 2,
              backgroundPosition: `${stripeOffset}px 0`,
              boxShadow: `0 0 20px ${(color || colors.primary)}60`,
            }}
          />
        </div>
        
        {/* Percentage */}
        {showPercentage && (
          <div
            style={{
              fontSize: 48,
              fontFamily: 'system-ui, sans-serif',
              color: colors.text,
              marginTop: 20,
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {Math.round(progressValue)}%
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
