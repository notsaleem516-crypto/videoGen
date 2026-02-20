import React from 'react';
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate } from 'remotion';
import { BaseScene } from './BaseScene';
import { 
  useFadeIn, 
  useScaleIn, 
  useSlideIn, 
  type MotionProfileType 
} from '../utils/animations';
import { getTheme } from '../utils/theme';
import type { TextBlock, QuoteBlock, AnimationPhase } from '../schemas';

// ============================================================================
// TEXT SCENE COMPONENT
// ============================================================================

export interface TextSceneProps {
  data: TextBlock;
  theme?: string;
  motionProfile?: MotionProfileType;
  animation?: AnimationPhase;
}

export function TextScene({
  data,
  theme = 'dark_modern',
  motionProfile = 'subtle',
  animation,
}: TextSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = getTheme(theme);
  
  // Animation timings
  const enterDuration = animation?.enter ?? 0.5;
  const holdDuration = animation?.hold ?? 2;
  
  // Physics-based animations
  const textSlide = useSlideIn('up', 50, 0.6, 0, motionProfile);
  const textOpacity = useFadeIn(0.5, 0, motionProfile);
  const textScale = useScaleIn(0.5, 0, motionProfile);
  
  // Determine font size based on emphasis
  const fontSize = data.emphasis === 'high' ? 48 : data.emphasis === 'low' ? 28 : 36;
  
  // Exit animation
  const exitStart = (enterDuration + holdDuration) * fps;
  const exitProgress = frame > exitStart 
    ? Math.min(1, (frame - exitStart) / (fps * 0.4))
    : 0;
  const exitOpacity = 1 - exitProgress;
  
  return (
    <BaseScene theme={theme} opacity={exitOpacity}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 60,
          transform: `translate(${textSlide.x}px, ${textSlide.y}px) scale(${textScale})`,
          opacity: textOpacity,
        }}
      >
        <p
          style={{
            fontSize,
            fontWeight: data.emphasis === 'high' ? 700 : 400,
            color: colors.foreground,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 900,
            margin: 0,
          }}
        >
          {data.content}
        </p>
      </div>
    </BaseScene>
  );
}

// ============================================================================
// QUOTE SCENE COMPONENT
// ============================================================================

export interface QuoteSceneProps {
  data: QuoteBlock;
  theme?: string;
  motionProfile?: MotionProfileType;
  animation?: AnimationPhase;
}

export function QuoteScene({
  data,
  theme = 'dark_modern',
  motionProfile = 'dynamic',
  animation,
}: QuoteSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = getTheme(theme);
  
  // Animation timings
  const enterDuration = animation?.enter ?? 0.5;
  const holdDuration = animation?.hold ?? 3;
  
  // Physics-based animations
  const quoteSlide = useSlideIn('up', 60, 0.6, 0, motionProfile);
  const quoteOpacity = useFadeIn(0.5, 0, motionProfile);
  
  const authorSlide = useSlideIn('up', 30, 0.4, 0.3, motionProfile);
  const authorOpacity = useFadeIn(0.4, 0.3, motionProfile);
  
  // Quotation mark animation
  const markScale = useScaleIn(0.4, 0, motionProfile);
  const markOpacity = useFadeIn(0.3, 0, motionProfile);
  
  // Exit animation
  const exitStart = (enterDuration + holdDuration) * fps;
  const exitProgress = frame > exitStart 
    ? Math.min(1, (frame - exitStart) / (fps * 0.4))
    : 0;
  const exitOpacity = 1 - exitProgress;
  
  return (
    <BaseScene theme={theme} opacity={exitOpacity}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 80,
          gap: 40,
        }}
      >
        {/* Opening quote mark */}
        <div
          style={{
            transform: `scale(${markScale})`,
            opacity: markOpacity,
          }}
        >
          <span
            style={{
              fontSize: 120,
              color: colors.primary,
              opacity: 0.5,
              lineHeight: 0.5,
            }}
          >
            "
          </span>
        </div>
        
        {/* Quote text */}
        <div
          style={{
            transform: `translate(${quoteSlide.x}px, ${quoteSlide.y}px)`,
            opacity: quoteOpacity,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 44,
              fontWeight: 500,
              color: colors.foreground,
              fontStyle: 'italic',
              lineHeight: 1.5,
              maxWidth: 800,
              margin: 0,
            }}
          >
            {data.text}
          </p>
        </div>
        
        {/* Author */}
        {data.author && (
          <div
            style={{
              transform: `translate(${authorSlide.x}px, ${authorSlide.y}px)`,
              opacity: authorOpacity,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 2,
                  background: colors.primary,
                }}
              />
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: colors.muted,
                }}
              >
                {data.author}
              </span>
            </div>
          </div>
        )}
      </div>
    </BaseScene>
  );
}

// ============================================================================
// HIGHLIGHT TEXT SCENE (for key messages)
// ============================================================================

export interface HighlightTextSceneProps {
  text: string;
  highlightWords?: string[];
  theme?: string;
  motionProfile?: MotionProfileType;
  animation?: AnimationPhase;
}

export function HighlightTextScene({
  text,
  highlightWords = [],
  theme = 'dark_modern',
  motionProfile = 'dynamic',
}: HighlightTextSceneProps): React.ReactElement {
  const colors = getTheme(theme);
  
  const textSlide = useSlideIn('up', 40, 0.5, 0, motionProfile);
  const textOpacity = useFadeIn(0.4, 0, motionProfile);
  
  // Split text and highlight matching words
  const renderText = () => {
    const words = text.split(' ');
    return words.map((word, index) => {
      const isHighlighted = highlightWords.some(
        hw => word.toLowerCase().includes(hw.toLowerCase())
      );
      
      return (
        <span
          key={index}
          style={{
            color: isHighlighted ? colors.primary : colors.foreground,
            fontWeight: isHighlighted ? 700 : 400,
          }}
        >
          {word}{' '}
        </span>
      );
    });
  };
  
  return (
    <BaseScene theme={theme}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 60,
          transform: `translate(${textSlide.x}px, ${textSlide.y}px)`,
          opacity: textOpacity,
        }}
      >
        <p
          style={{
            fontSize: 42,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 900,
          }}
        >
          {renderText()}
        </p>
      </div>
    </BaseScene>
  );
}
