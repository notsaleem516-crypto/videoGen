import React from 'react';
import { useCurrentFrame, useVideoConfig, AbsoluteFill } from 'remotion';
import { BaseScene } from './BaseScene';
import { 
  useFadeIn, 
  useScaleIn, 
  useSlideIn, 
  type MotionProfileType 
} from '../utils/animations';
import { getTheme } from '../utils/theme';
import type { CalloutBlock, AnimationPhase } from '../schemas';

// ============================================================================
// CALLOUT SCENE COMPONENT
// ============================================================================

export interface CalloutSceneProps {
  data: CalloutBlock;
  theme?: string;
  motionProfile?: MotionProfileType;
  animation?: AnimationPhase;
}

export function CalloutScene({
  data,
  theme = 'dark_modern',
  motionProfile = 'dynamic',
  animation,
}: CalloutSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = getTheme(theme);
  
  // Animation timings
  const enterDuration = animation?.enter ?? 0.5;
  const holdDuration = animation?.hold ?? 2.5;
  
  // Physics-based animations
  const cardScale = useScaleIn(0.5, 0, motionProfile);
  const cardOpacity = useFadeIn(0.4, 0, motionProfile);
  
  const titleSlide = useSlideIn('up', 30, 0.4, 0.1, motionProfile);
  const titleOpacity = useFadeIn(0.3, 0.1, motionProfile);
  
  const contentSlide = useSlideIn('up', 20, 0.4, 0.2, motionProfile);
  const contentOpacity = useFadeIn(0.3, 0.2, motionProfile);
  
  // Exit animation
  const exitStart = (enterDuration + holdDuration) * fps;
  const exitProgress = frame > exitStart 
    ? Math.min(1, (frame - exitStart) / (fps * 0.4))
    : 0;
  const exitOpacity = 1 - exitProgress;
  
  // Variant colors
  const variantColors = {
    success: {
      bg: '#10b98120',
      border: '#10b981',
      icon: '#10b981',
    },
    warning: {
      bg: '#f59e0b20',
      border: '#f59e0b',
      icon: '#f59e0b',
    },
    info: {
      bg: '#3b82f620',
      border: '#3b82f6',
      icon: '#3b82f6',
    },
    default: {
      bg: `${colors.primary}20`,
      border: colors.primary,
      icon: colors.primary,
    },
  };
  
  const variant = variantColors[data.variant ?? 'default'];
  
  return (
    <BaseScene theme={theme} opacity={exitOpacity}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 60,
        }}
      >
        {/* Callout card */}
        <div
          style={{
            background: variant.bg,
            border: `3px solid ${variant.border}`,
            borderRadius: 24,
            padding: '50px 60px',
            maxWidth: 800,
            transform: `scale(${cardScale})`,
            opacity: cardOpacity,
            boxShadow: `0 20px 60px ${variant.border}20`,
          }}
        >
          {/* Icon */}
          <div
            style={{
              marginBottom: 24,
              opacity: titleOpacity,
              transform: `translate(${titleSlide.x}px, ${titleSlide.y}px)`,
            }}
          >
            {data.variant === 'success' && (
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={variant.icon} strokeWidth={2.5}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
            {data.variant === 'warning' && (
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={variant.icon} strokeWidth={2.5}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            {data.variant === 'info' && (
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={variant.icon} strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
            {(!data.variant || data.variant === 'default') && (
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={variant.icon} strokeWidth={2.5}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            )}
          </div>
          
          {/* Title */}
          <h2
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: colors.foreground,
              margin: '0 0 16px 0',
              opacity: titleOpacity,
              transform: `translate(${titleSlide.x}px, ${titleSlide.y}px)`,
            }}
          >
            {data.title}
          </h2>
          
          {/* Content */}
          <p
            style={{
              fontSize: 26,
              color: colors.muted,
              margin: 0,
              lineHeight: 1.5,
              opacity: contentOpacity,
              transform: `translate(${contentSlide.x}px, ${contentSlide.y}px)`,
            }}
          >
            {data.content}
          </p>
        </div>
      </div>
    </BaseScene>
  );
}
