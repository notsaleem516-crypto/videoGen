// ============================================================================
// COUNTER SCENE COMPONENT - Animated counter for video blocks
// ============================================================================

import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring } from 'remotion';
import { BaseScene, extractCustomization, getThemeColors } from '../../../shared/plugin-utils';
import type { AnimationConfig } from '../../../shared/plugin-types';

/**
 * Counter scene props
 */
export interface CounterSceneProps {
  data: {
    value: number;
    from?: number;
    prefix?: string;
    suffix?: string;
    label?: string;
    color?: string;
    animationStyle?: 'linear' | 'easeOut' | 'easeInOut' | 'bounce';
    duration?: number;
    decimals?: number;
    fontSize?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
    fontWeight?: 'normal' | 'bold' | 'black';
    glowEnabled?: boolean;
    glowColor?: string;
    // Customization props (inherited from BaseScene)
    verticalAlign?: 'top' | 'center' | 'bottom';
    horizontalAlign?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    padding?: number;
    enterAnimation?: string;
    exitAnimation?: string;
  };
  theme?: string;
  animation?: AnimationConfig;
  motionProfile?: 'subtle' | 'dynamic' | 'energetic';
}

/**
 * Font size mapping
 */
const FONT_SIZES: Record<string, number> = {
  small: 48,
  medium: 72,
  large: 96,
  xlarge: 120,
  xxlarge: 160,
};

/**
 * Font weight mapping
 */
const FONT_WEIGHTS: Record<string, number> = {
  normal: 400,
  bold: 700,
  black: 900,
};

/**
 * Easing functions
 */
function applyEasing(progress: number, style: string): number {
  switch (style) {
    case 'linear':
      return progress;
    case 'easeOut':
      return 1 - Math.pow(1 - progress, 3);
    case 'easeInOut':
      return progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    default:
      return progress;
  }
}

/**
 * Counter Scene Component
 */
export const CounterScene: React.FC<CounterSceneProps> = ({
  data,
  theme = 'dark_modern',
  animation = { enter: 0.4, hold: 3, exit: 0.4 },
  motionProfile = 'dynamic',
}) => {
  const frame = useCurrentFrame();
  const fps = 30;
  
  const {
    value = 10000,
    from = 0,
    prefix = '',
    suffix = '',
    label = '',
    color,
    animationStyle = 'easeOut',
    duration = 3,
    decimals = 0,
    fontSize = 'xxlarge',
    fontWeight = 'black',
    glowEnabled = true,
    glowColor,
  } = data;
  
  // Get theme colors
  const themeColors = getThemeColors(theme);
  const textColor = color || themeColors.accent;
  const effectiveGlowColor = glowColor || textColor;
  
  // Calculate animation progress
  const durationFrames = duration * fps;
  const progress = Math.min(frame / durationFrames, 1);
  
  // Apply easing
  let easedProgress: number;
  
  if (animationStyle === 'bounce') {
    easedProgress = spring({
      frame,
      fps,
      config: { damping: 10, stiffness: 100, mass: 1 },
    });
  } else {
    easedProgress = applyEasing(progress, animationStyle);
  }
  
  // Calculate current value
  const currentValue = from + (value - from) * easedProgress;
  
  // Format the number
  const formatNumber = (num: number): string => {
    if (decimals > 0) {
      return num.toFixed(decimals);
    }
    return Math.round(num).toLocaleString();
  };
  
  const formattedValue = formatNumber(currentValue);
  const displayText = `${prefix}${formattedValue}${suffix}`;
  
  // Label animation (fade in after counter)
  const labelOpacity = frame > durationFrames * 0.5 
    ? Math.min((frame - durationFrames * 0.5) / 15, 1)
    : 0;
  
  return (
    <BaseScene
      theme={theme}
      customization={extractCustomization(data)}
      animation={animation}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          width: '100%',
        }}
      >
        {/* Counter Value */}
        <div
          style={{
            fontSize: FONT_SIZES[fontSize] || FONT_SIZES.xxlarge,
            fontWeight: FONT_WEIGHTS[fontWeight] || FONT_WEIGHTS.black,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: textColor,
            textShadow: glowEnabled
              ? `0 0 40px ${effectiveGlowColor}60, 0 0 80px ${effectiveGlowColor}30`
              : 'none',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {displayText}
        </div>
        
        {/* Label */}
        {label && (
          <div
            style={{
              fontSize: 36,
              fontWeight: 500,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              color: themeColors.textSecondary,
              letterSpacing: 2,
              textTransform: 'uppercase',
              opacity: labelOpacity,
            }}
          >
            {label}
          </div>
        )}
      </div>
    </BaseScene>
  );
};

export default CounterScene;
