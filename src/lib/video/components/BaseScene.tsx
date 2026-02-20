import React from 'react';
import { AbsoluteFill } from 'remotion';
import { getTheme, type ThemeColors } from '../utils/theme';

// ============================================================================
// BASE SCENE WRAPPER
// ============================================================================

export interface BaseSceneProps {
  theme?: string;
  children: React.ReactNode;
  opacity?: number;
  style?: React.CSSProperties;
}

/**
 * Base scene wrapper with theme support
 */
export function BaseScene({ 
  theme = 'dark_modern', 
  children, 
  opacity = 1,
  style 
}: BaseSceneProps): React.ReactElement {
  const colors = getTheme(theme);
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
        opacity,
        ...style,
      }}
    >
      {/* Background gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 30% 20%, ${colors.primary}15 0%, transparent 50%),
                       radial-gradient(ellipse at 70% 80%, ${colors.secondary}10 0%, transparent 50%)`,
          pointerEvents: 'none',
        }}
      />
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {children}
      </div>
    </AbsoluteFill>
  );
}

/**
 * Text component with theme colors
 */
export function ThemedText({
  children,
  variant = 'primary',
  theme = 'dark_modern',
  style,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'muted';
  theme?: string;
  style?: React.CSSProperties;
}): React.ReactElement {
  const colors = getTheme(theme);
  
  const colorMap: Record<string, string> = {
    primary: colors.foreground,
    secondary: colors.muted,
    accent: colors.accent,
    muted: colors.muted,
  };
  
  return (
    <span style={{ color: colorMap[variant], ...style }}>
      {children}
    </span>
  );
}

/**
 * Container with centered content
 */
export function CenteredContent({ 
  children, 
  style 
}: { 
  children: React.ReactNode;
  style?: React.CSSProperties;
}): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
