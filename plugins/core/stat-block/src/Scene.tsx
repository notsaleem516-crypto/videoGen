import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { BaseScene, extractCustomization, getThemeColors } from '../../../shared/plugin-utils';
import type { AnimationConfig } from '../../../shared/plugin-types';

export interface StatSceneProps {
  data: {
    heading: string;
    value: string;
    subtext?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: string;
  };
  theme?: string;
  animation?: AnimationConfig;
}

export const StatScene: React.FC<StatSceneProps> = ({
  data, theme = 'dark_modern', animation = { enter: 0.4, hold: 2, exit: 0.4 },
}) => {
  const frame = useCurrentFrame();
  const themeColors = getThemeColors(theme);
  const { heading, value, subtext, trend = 'neutral', color } = data;
  
  const accentColor = color || themeColors.accent;
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const translateY = interpolate(frame, [0, 15], [20, 0], { extrapolateRight: 'clamp' });
  
  const trendColors = { up: '#10B981', down: '#EF4444', neutral: themeColors.textSecondary };
  const trendColor = trendColors[trend];
  
  return (
    <BaseScene theme={theme} customization={extractCustomization(data)} animation={animation}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, opacity, transform: `translateY(${translateY}px)` }}>
        <div style={{ fontSize: 36, color: themeColors.textSecondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2 }}>
          {heading}
        </div>
        <div style={{ fontSize: 120, fontWeight: 900, color: accentColor }}>
          {value}
        </div>
        {subtext && (
          <div style={{ fontSize: 28, color: trendColor }}>
            {trend === 'up' && '↑ '}{trend === 'down' && '↓ '}{subtext}
          </div>
        )}
      </div>
    </BaseScene>
  );
};

export default StatScene;
