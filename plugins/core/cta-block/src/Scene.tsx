import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { BaseScene, extractCustomization, getThemeColors } from '../../../shared/plugin-utils';
import type { AnimationConfig } from '../../../shared/plugin-types';

const SIZES: Record<string, { padding: string; fontSize: number }> = {
  small: { padding: '12px 24px', fontSize: 18 },
  medium: { padding: '16px 32px', fontSize: 24 },
  large: { padding: '20px 48px', fontSize: 32 },
};

export interface CTASceneProps {
  data: {
    text: string;
    description?: string;
    color?: string;
    style?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    pulse?: boolean;
  };
  theme?: string;
  animation?: AnimationConfig;
}

export const CTAScene: React.FC<CTASceneProps> = ({
  data,
  theme = 'dark_modern',
  animation = { enter: 0.4, hold: 3, exit: 0.4 },
}) => {
  const frame = useCurrentFrame();
  const themeColors = getThemeColors(theme);
  
  const { text, description, color = '#3B82F6', style = 'primary', size = 'large', pulse = true } = data;
  const sizeConfig = SIZES[size];
  
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const scale = pulse ? 1 + Math.sin(frame * 0.1) * 0.02 : 1;
  
  const buttonStyles: React.CSSProperties = {
    padding: sizeConfig.padding,
    fontSize: sizeConfig.fontSize,
    fontWeight: 700,
    borderRadius: 9999,
    border: style === 'outline' ? `2px solid ${color}` : 'none',
    backgroundColor: style === 'primary' ? color : style === 'secondary' ? themeColors.backgroundSecondary : 'transparent',
    color: style === 'outline' || style === 'ghost' ? color : '#FFFFFF',
    cursor: 'pointer',
    transform: `scale(${scale})`,
    opacity,
    boxShadow: style === 'primary' ? `0 10px 40px ${color}40` : 'none',
  };
  
  return (
    <BaseScene theme={theme} customization={extractCustomization(data)} animation={animation}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <button style={buttonStyles}>{text}</button>
        {description && (
          <div style={{ fontSize: 24, color: themeColors.textSecondary, opacity, textAlign: 'center' }}>
            {description}
          </div>
        )}
      </div>
    </BaseScene>
  );
};

export default CTAScene;
