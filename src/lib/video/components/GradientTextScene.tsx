import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import { getTheme } from '../utils/theme';
import type { MotionProfileType } from '../utils/animations';

interface GradientTextBlock {
  type: 'gradient-text';
  text: string;
  gradient?: string[];
  angle?: number;
  animate?: boolean;
  animationSpeed?: number;
  fontSize?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  fontWeight?: 'normal' | 'bold' | 'black';
}

interface GradientTextSceneProps {
  data: GradientTextBlock;
  theme: string;
  motionProfile: MotionProfileType;
  animation: { enter: number; hold: number; exit: number };
}

export function GradientTextScene({ data, theme, animation }: GradientTextSceneProps) {
  const frame = useCurrentFrame();
  const colors = getTheme(theme);
  const fps = 30;
  
  const { 
    text, 
    gradient = ['#3B82F6', '#8B5CF6', '#EC4899'], 
    angle = 45, 
    animate = true, 
    animationSpeed = 3, 
    fontSize: fontSizeName = 'xlarge', 
    fontWeight: fontWeightName = 'bold' 
  } = data;
  
  // Font size mapping
  const fontSizes = {
    small: 48,
    medium: 72,
    large: 96,
    xlarge: 128,
    xxlarge: 160,
  };
  const fontSize = fontSizes[fontSizeName] || 128;
  
  // Font weight mapping
  const fontWeights = {
    normal: 400,
    bold: 700,
    black: 900,
  };
  const fontWeight = fontWeights[fontWeightName] || 700;
  
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
    config: { damping: 12, stiffness: 100 },
  });
  
  // Animated gradient angle
  const currentAngle = animate 
    ? angle + (frame / (animationSpeed * fps)) * 360 
    : angle;
  
  // Gradient string
  const gradientString = gradient.length >= 2
    ? `linear-gradient(${currentAngle}deg, ${gradient.join(', ')})`
    : `linear-gradient(${currentAngle}deg, #3B82F6, #8B5CF6)`;
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '0 40px',
          transform: `translateY(${(1 - y) * 50}px)`,
        }}
      >
        <div
          style={{
            fontSize,
            fontFamily: 'system-ui, sans-serif',
            fontWeight,
            background: gradientString,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          {text}
        </div>
        
        {/* Glow effect behind text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: -1,
            filter: 'blur(40px)',
            opacity: 0.4,
          }}
        >
          <div
            style={{
              fontSize,
              fontFamily: 'system-ui, sans-serif',
              fontWeight,
              background: gradientString,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.2,
              maxWidth: 900,
            }}
          >
            {text}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
