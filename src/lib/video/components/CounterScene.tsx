import React from 'react';
import { useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { BaseScene, extractCustomization } from './BaseScene';
import { getTheme } from '../utils/theme';
import type { MotionProfileType } from '../utils/animations';
import type { CounterBlock, AnimationPhase, BlockCustomization } from '../schemas';

interface CounterSceneProps {
  data: CounterBlock;
  theme: string;
  motionProfile: MotionProfileType;
  animation: { enter: number; hold: number; exit: number };
}

export function CounterScene({ data, theme, motionProfile, animation }: CounterSceneProps) {
  const frame = useCurrentFrame();
  const colors = getTheme(theme);
  const fps = 30;
  
  const { 
    label, 
    from = 0, 
    to = 100, 
    duration = 3, 
    prefix = '', 
    suffix = '', 
    decimals = 0, 
    color, 
    animationStyle = 'easeOut' 
  } = data;
  
  // Extract customizations
  const customization = extractCustomization(data);
  
  // Calculate current value based on animation progress
  const progress = Math.min(frame / (duration * fps), 1);
  
  let easedProgress: number;
  switch (animationStyle) {
    case 'linear':
      easedProgress = progress;
      break;
    case 'bounce':
      easedProgress = spring({
        frame,
        fps,
        config: { damping: 10, stiffness: 100 },
      });
      break;
    case 'easeInOut':
      easedProgress = interpolate(progress, [0, 1], [0, 1], { 
        easing: Easing.inOut(Easing.ease) 
      });
      break;
    case 'easeOut':
    default:
      easedProgress = interpolate(progress, [0, 1], [0, 1], { 
        easing: Easing.out(Easing.ease) 
      });
  }
  
  const currentValue = from + (to - from) * easedProgress;
  
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
  
  const y = interpolate(
    frame,
    [0, animation.enter * fps],
    [50, 0],
    { extrapolateRight: 'clamp' }
  );
  
  // Format the number
  const formattedValue = decimals > 0 
    ? currentValue.toFixed(decimals)
    : Math.round(currentValue).toLocaleString();
  
  return (
    <BaseScene theme={theme} customization={customization} animation={animation} opacity={opacity}>
      <div
        style={{
          transform: `translateY(${y}px) scale(${scale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Counter Value */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            fontFamily: 'system-ui, sans-serif',
            color: color || colors.primary,
            textShadow: `0 0 40px ${(color || colors.primary)}40`,
          }}
        >
          {prefix}{formattedValue}{suffix}
        </div>
        
        {/* Label */}
        <div
          style={{
            fontSize: 36,
            fontFamily: 'system-ui, sans-serif',
            color: colors.muted,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
      </div>
    </BaseScene>
  );
}
