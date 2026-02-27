import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { BaseScene, extractCustomization, getThemeColors } from '../../../shared/plugin-utils';
import type { AnimationConfig } from '../../../shared/plugin-types';

const FONT_SIZES: Record<string, number> = {
  small: 24,
  medium: 36,
  large: 56,
  xlarge: 80,
  xxlarge: 120,
};

const FONT_WEIGHTS: Record<string, number> = {
  normal: 400,
  medium: 500,
  bold: 700,
  black: 900,
};

export interface TextSceneProps {
  data: {
    content: string;
    style?: 'heading' | 'body' | 'caption' | 'quote';
    align?: 'left' | 'center' | 'right';
    color?: string;
    fontSize?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
    fontWeight?: 'normal' | 'medium' | 'bold' | 'black';
  };
  theme?: string;
  animation?: AnimationConfig;
  motionProfile?: 'subtle' | 'dynamic' | 'energetic';
}

export const TextScene: React.FC<TextSceneProps> = ({
  data,
  theme = 'dark_modern',
  animation = { enter: 0.4, hold: 2, exit: 0.4 },
}) => {
  const frame = useCurrentFrame();
  const themeColors = getThemeColors(theme);
  
  const {
    content,
    style = 'heading',
    align = 'center',
    color,
    fontSize = 'xlarge',
    fontWeight = 'bold',
  } = data;
  
  const textColor = color || themeColors.text;
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  
  const styleProps: React.CSSProperties = {
    fontSize: FONT_SIZES[fontSize],
    fontWeight: FONT_WEIGHTS[fontWeight],
    fontFamily: style === 'quote' ? 'Georgia, serif' : 'system-ui, -apple-system, sans-serif',
    fontStyle: style === 'quote' ? 'italic' : 'normal',
    textAlign: align,
    color: textColor,
    opacity,
    lineHeight: 1.2,
    maxWidth: '90%',
  };
  
  return (
    <BaseScene
      theme={theme}
      customization={extractCustomization(data)}
      animation={animation}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        justifyContent: 'center',
        width: '100%',
        padding: 40,
      }}>
        {style === 'quote' && (
          <div style={{
            width: 4,
            height: FONT_SIZES[fontSize] * 1.5,
            backgroundColor: themeColors.accent,
            marginRight: 20,
            borderRadius: 2,
          }} />
        )}
        <div style={styleProps}>{content}</div>
      </div>
    </BaseScene>
  );
};

export default TextScene;
