import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';
import { BaseScene, extractCustomization } from './BaseScene';
import { getTheme } from '../utils/theme';
import type { MotionProfileType } from '../utils/animations';
import type { CTABlock, AnimationPhase } from '../schemas';

interface CTASceneProps {
  data: CTABlock;
  theme: string;
  motionProfile: MotionProfileType;
  animation: { enter: number; hold: number; exit: number };
}

export function CTAScene({ data, theme, motionProfile, animation }: CTASceneProps) {
  const frame = useCurrentFrame();
  const colors = getTheme(theme);
  const fps = 30;
  
  const { 
    text, 
    description, 
    buttonStyle = 'primary', 
    color, 
    size = 'large', 
    icon, 
    pulse = true 
  } = data;
  
  // Extract customizations
  const customization = extractCustomization(data);
  
  // Entrance animation
  const opacity = interpolate(
    frame,
    [0, animation.enter * fps],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const y = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  
  // Pulse animation
  const pulseScale = pulse 
    ? 1 + Math.sin(frame * 0.15) * 0.05 
    : 1;
  
  // Glow animation
  const glowIntensity = pulse ? 0.3 + Math.sin(frame * 0.1) * 0.2 : 0.3;
  
  // Size configs
  const sizes = {
    small: { padding: '12px 32px', fontSize: 20, borderRadius: 8 },
    medium: { padding: '16px 48px', fontSize: 24, borderRadius: 12 },
    large: { padding: '20px 64px', fontSize: 32, borderRadius: 16 },
  };
  const sizeConfig = sizes[size] || sizes.large;
  
  // Button style configs
  const buttonStyles = {
    primary: {
      backgroundColor: color || colors.primary,
      color: '#FFFFFF',
      border: 'none',
    },
    secondary: {
      backgroundColor: colors.surface,
      color: colors.foreground,
      border: `2px solid ${colors.border}`,
    },
    outline: {
      backgroundColor: 'transparent',
      color: color || colors.primary,
      border: `3px solid ${color || colors.primary}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.foreground,
      border: 'none',
    },
  };
  const styleConfig = buttonStyles[buttonStyle] || buttonStyles.primary;
  
  return (
    <BaseScene theme={theme} customization={customization} animation={animation} opacity={opacity}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
          transform: `translateY(${(1 - y) * 50}px)`,
        }}
      >
        {/* Description */}
        {description && (
          <div
            style={{
              fontSize: 28,
              fontFamily: 'system-ui, sans-serif',
              color: colors.muted,
              textAlign: 'center',
              maxWidth: 500,
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        )}
        
        {/* CTA Button */}
        <button
          style={{
            padding: sizeConfig.padding,
            fontSize: sizeConfig.fontSize,
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 700,
            color: styleConfig.color,
            backgroundColor: styleConfig.backgroundColor,
            border: styleConfig.border,
            borderRadius: sizeConfig.borderRadius,
            cursor: 'pointer',
            transform: `scale(${pulseScale * y})`,
            boxShadow: pulse && buttonStyle === 'primary'
              ? `0 0 60px ${(color || colors.primary)}${Math.round(glowIntensity * 255).toString(16).padStart(2, '0')}`
              : '0 10px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {icon && <span style={{ fontSize: sizeConfig.fontSize * 1.2 }}>{icon}</span>}
          {text}
        </button>
      </div>
    </BaseScene>
  );
}
