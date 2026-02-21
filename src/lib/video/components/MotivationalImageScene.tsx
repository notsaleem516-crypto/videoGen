import React from 'react';
import { 
  useCurrentFrame, 
  useVideoConfig, 
  AbsoluteFill, 
  interpolate,
  spring,
  Img,
  Audio,
} from 'remotion';
import { 
  type MotivationalImageBlock,
  type ImageEffect,
  type ColorOverlay,
  type AnimationPhase 
} from '../schemas';
import { type MotionProfileType } from '../utils/animations';

// ============================================================================
// MOTIVATIONAL IMAGE SCENE - Image with Text Overlay for Motivational Videos
// ============================================================================

export interface MotivationalImageSceneProps {
  data: MotivationalImageBlock;
  theme?: string;
  motionProfile?: MotionProfileType;
  animation?: AnimationPhase;
}

// Font size mapping (for 9:16 vertical video)
const FONT_SIZES: Record<string, number> = {
  small: 32,
  medium: 48,
  large: 64,
  xlarge: 80,
  xxlarge: 100,
};

// Image position mapping
const IMAGE_POSITIONS: Record<string, string> = {
  center: 'center',
  top: 'top center',
  bottom: 'bottom center',
  left: 'center left',
  right: 'center right',
};

export function MotivationalImageScene({
  data,
  theme = 'dark_modern',
  motionProfile = 'dynamic',
  animation,
}: MotivationalImageSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Animation timings
  const enterDuration = animation?.enter ?? 1.5;
  const holdDuration = animation?.hold ?? 3;
  const exitDuration = animation?.exit ?? 0.5;
  
  const exitStartFrame = fps * (enterDuration + holdDuration);
  
  // Exit animation progress
  const exitProgress = frame > exitStartFrame 
    ? Math.min(1, (frame - exitStartFrame) / (fps * exitDuration))
    : 0;
  
  // Image animation values
  const imageAnimation = useImageAnimation({
    effect: data.imageEffect || 'fade',
    frame,
    fps,
    duration: data.imageEffectDuration || 1.5,
  });
  
  // Color overlay animation
  const colorOverlay = data.colorOverlay;
  const overlayOpacity = colorOverlay?.enabled 
    ? getOverlayOpacity(colorOverlay, frame, fps)
    : 0;
  
  // Get text data (simplified - just one text field)
  const textData = data.text || '';
  const textStyle = data.textStyle || 'default'; // default, quote, typing, glow, outline
  
  return (
    <AbsoluteFill 
      style={{ 
        backgroundColor: data.backgroundColor || '#000000',
      }}
    >
      {/* Audio Layer - Plays background audio if provided */}
      {data.audioSrc && (
        <Audio
          src={data.audioSrc}
          volume={data.audioVolume ?? 0.7}
        />
      )}
      
      {/* Image Layer */}
      <AbsoluteFill
        style={{
          opacity: imageAnimation.opacity * (1 - exitProgress),
          transform: imageAnimation.transform,
          filter: imageAnimation.filter,
        }}
      >
        <Img
          src={data.imageSrc}
          style={{
            width: '100%',
            height: '100%',
            objectFit: data.imageFit || 'cover',
            objectPosition: IMAGE_POSITIONS[data.imagePosition || 'center'],
          }}
        />
      </AbsoluteFill>
      
      {/* Color Overlay Layer */}
      {colorOverlay?.enabled && (
        <AbsoluteFill
          style={{
            backgroundColor: colorOverlay.color || '#000000',
            opacity: overlayOpacity * (1 - exitProgress),
          }}
        />
      )}
      
      {/* Text Layer - Single text with style */}
      {textData && (
        <TextLayer
          text={textData}
          textStyle={textStyle}
          frame={frame}
          fps={fps}
          fontSize={data.fontSize || 'xlarge'}
          fontWeight={data.fontWeight || 'bold'}
          textColor={data.textColor || '#FFFFFF'}
          textAlign={data.textAlign || 'center'}
          textPosition={data.textPosition || 'center'}
          animationDelay={data.textAnimationDelay || 0.3}
          exitProgress={exitProgress}
        />
      )}
    </AbsoluteFill>
  );
}

// ============================================================================
// TEXT LAYER - Renders single text with different styles
// ============================================================================

interface TextLayerProps {
  text: string;
  textStyle: string;
  frame: number;
  fps: number;
  fontSize: string;
  fontWeight: string;
  textColor: string;
  textAlign: string;
  textPosition: string;
  animationDelay: number;
  exitProgress: number;
}

function TextLayer({
  text,
  textStyle,
  frame,
  fps,
  fontSize,
  fontWeight,
  textColor,
  textAlign,
  textPosition,
  animationDelay,
  exitProgress,
}: TextLayerProps) {
  const delayedFrame = Math.max(0, frame - animationDelay * fps);
  const animationDuration = 1 * fps;
  const progress = Math.min(1, delayedFrame / animationDuration);
  
  // Position
  const positionStyles = getPositionStyles(textPosition);
  
  // Animation based on style
  const animationStyles = getTextAnimation(textStyle, progress, delayedFrame, fps);
  
  // Font size
  const fontSizePx = FONT_SIZES[fontSize] || FONT_SIZES.large;
  
  // Base text styles
  const baseStyles: React.CSSProperties = {
    fontSize: fontSizePx,
    fontWeight: fontWeight as React.CSSProperties['fontWeight'],
    color: textColor,
    textAlign: textAlign as React.CSSProperties['textAlign'],
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    padding: '40px',
    maxWidth: '95%',
    opacity: animationStyles.opacity * (1 - exitProgress),
    transform: animationStyles.transform,
  };
  
  // Style-specific modifications
  const styleSpecifics = getTextStyleSpecifics(textStyle, textColor);
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        justifyContent: textAlign === 'left' ? 'flex-start' 
          : textAlign === 'right' ? 'flex-end' 
          : 'center',
        alignItems: positionStyles.alignItems,
        padding: '40px',
        pointerEvents: 'none',
      }}
    >
      <div style={{ ...baseStyles, ...styleSpecifics }}>
        {textStyle === 'typing' ? (
          <TypewriterText text={text} frame={delayedFrame} fps={fps} />
        ) : textStyle === 'words' ? (
          <WordByWordText text={text} frame={delayedFrame} fps={fps} />
        ) : (
          text
        )}
      </div>
    </AbsoluteFill>
  );
}

// ============================================================================
// TEXT STYLES
// ============================================================================

function getTextStyleSpecifics(textStyle: string, textColor: string): React.CSSProperties {
  switch (textStyle) {
    case 'quote':
      return {
        fontStyle: 'italic',
        textShadow: `0 4px 20px rgba(0,0,0,0.8), 0 0 60px rgba(0,0,0,0.5)`,
        borderLeft: `4px solid ${textColor}`,
        paddingLeft: '30px',
      };
    case 'glow':
      return {
        textShadow: `0 0 10px ${textColor}, 0 0 20px ${textColor}, 0 0 40px ${textColor}, 0 0 80px ${textColor}`,
      };
    case 'outline':
      return {
        color: 'transparent',
        WebkitTextStroke: `2px ${textColor}`,
        textShadow: 'none',
      };
    case 'bold-glow':
      return {
        fontWeight: 900,
        textShadow: `0 0 10px ${textColor}, 0 4px 20px rgba(0,0,0,0.9)`,
      };
    case 'shadow':
      return {
        textShadow: `3px 3px 0 rgba(0,0,0,0.8), 6px 6px 0 rgba(0,0,0,0.5)`,
      };
    case 'default':
    default:
      return {
        textShadow: `0 4px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)`,
      };
  }
}

// ============================================================================
// TEXT ANIMATIONS
// ============================================================================

function getTextAnimation(
  textStyle: string, 
  progress: number, 
  frame: number, 
  fps: number
): { opacity: number; transform: string } {
  switch (textStyle) {
    case 'typing':
    case 'words':
      return {
        opacity: 1,
        transform: 'none',
      };
    case 'quote':
      return {
        opacity: interpolate(progress, [0, 0.5, 1], [0, 0.8, 1]),
        transform: `translateX(${interpolate(progress, [0, 1], [-30, 0])}px)`,
      };
    case 'glow':
      const pulse = 0.8 + 0.2 * Math.sin(frame / fps * Math.PI * 2);
      return {
        opacity: interpolate(progress, [0, 1], [0, 1]) * pulse,
        transform: 'none',
      };
    case 'outline':
      return {
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `scale(${interpolate(progress, [0, 1], [0.9, 1])})`,
      };
    case 'bold-glow':
      const springProgress = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
      return {
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `scale(${springProgress})`,
      };
    case 'shadow':
      return {
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
      };
    default:
      return {
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: 'none',
      };
  }
}

// ============================================================================
// TYPEWRITER EFFECT
// ============================================================================

function TypewriterText({ text, frame, fps }: { text: string; frame: number; fps: number }) {
  const charsPerSecond = 20;
  const totalChars = text.length;
  const duration = totalChars / charsPerSecond;
  const progress = Math.min(1, (frame / fps) / duration);
  const visibleChars = Math.floor(progress * totalChars);
  const visibleText = text.slice(0, visibleChars);
  
  return (
    <>
      {visibleText}
      {progress < 1 && <span style={{ opacity: 0.8 }}>|</span>}
    </>
  );
}

// ============================================================================
// WORD BY WORD EFFECT
// ============================================================================

function WordByWordText({ text, frame, fps }: { text: string; frame: number; fps: number }) {
  const words = text.split(' ');
  const wordsPerSecond = 2;
  const duration = words.length / wordsPerSecond;
  const progress = Math.min(1, (frame / fps) / duration);
  const visibleWords = Math.floor(progress * words.length);
  
  return (
    <>
      {words.map((word, i) => (
        <span 
          key={i} 
          style={{ 
            opacity: i < visibleWords ? 1 : 0,
            transition: 'opacity 0.2s',
            marginRight: '0.3em',
          }}
        >
          {word}
        </span>
      ))}
    </>
  );
}

// ============================================================================
// POSITION HELPER
// ============================================================================

function getPositionStyles(position: string): { alignItems: string } {
  switch (position) {
    case 'top':
      return { alignItems: 'flex-start' };
    case 'bottom':
      return { alignItems: 'flex-end' };
    case 'center':
    default:
      return { alignItems: 'center' };
  }
}

// ============================================================================
// IMAGE ANIMATION
// ============================================================================

interface ImageAnimationValues {
  opacity: number;
  transform: string;
  filter: string;
}

function useImageAnimation({
  effect,
  frame,
  fps,
  duration,
}: {
  effect: ImageEffect;
  frame: number;
  fps: number;
  duration: number;
}): ImageAnimationValues {
  const effectDuration = duration * fps;
  const progress = Math.min(1, frame / effectDuration);
  
  switch (effect) {
    case 'none':
      return { opacity: 1, transform: 'none', filter: 'none' };
      
    case 'fade':
      return {
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: 'none',
        filter: 'none',
      };
      
    case 'slide-up':
      return {
        opacity: interpolate(progress, [0, 0.3, 1], [0, 0.5, 1]),
        transform: `translateY(${interpolate(progress, [0, 1], [100, 0])}px)`,
        filter: 'none',
      };
      
    case 'slide-down':
      return {
        opacity: interpolate(progress, [0, 0.3, 1], [0, 0.5, 1]),
        transform: `translateY(${interpolate(progress, [0, 1], [-100, 0])}px)`,
        filter: 'none',
      };
      
    case 'zoom-in':
      return {
        opacity: interpolate(progress, [0, 0.5, 1], [0, 0.5, 1]),
        transform: `scale(${interpolate(progress, [0, 1], [0.5, 1])})`,
        filter: 'none',
      };
      
    case 'zoom-out':
      return {
        opacity: interpolate(progress, [0, 0.5, 1], [0, 0.5, 1]),
        transform: `scale(${interpolate(progress, [0, 1], [1.5, 1])})`,
        filter: 'none',
      };
      
    case 'ken-burns': {
      const time = frame / fps;
      const zoom = 1 + Math.sin(time * 0.3) * 0.1;
      const panX = Math.sin(time * 0.2) * 20;
      const panY = Math.cos(time * 0.15) * 15;
      return {
        opacity: interpolate(progress, [0, 0.3, 1], [0, 1, 1]),
        transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
        filter: 'none',
      };
    }
      
    case 'blur':
      return {
        opacity: interpolate(progress, [0, 0.3, 1], [0, 0.7, 1]),
        transform: 'none',
        filter: `blur(${interpolate(progress, [0, 1], [20, 0])}px)`,
      };
      
    case 'rotate':
      return {
        opacity: interpolate(progress, [0, 0.5, 1], [0, 0.7, 1]),
        transform: `rotate(${interpolate(progress, [0, 1], [-15, 0])}deg) scale(${interpolate(progress, [0, 1], [1.2, 1])})`,
        filter: 'none',
      };
      
    case 'bounce': {
      const bounceProgress = spring({
        frame,
        fps,
        config: { damping: 10, stiffness: 100, mass: 0.8 },
      });
      return {
        opacity: interpolate(progress, [0, 0.3, 1], [0, 0.7, 1]),
        transform: `scale(${bounceProgress})`,
        filter: 'none',
      };
    }
      
    default:
      return { opacity: 1, transform: 'none', filter: 'none' };
  }
}

// ============================================================================
// COLOR OVERLAY OPACITY
// ============================================================================

function getOverlayOpacity(
  overlay: ColorOverlay,
  frame: number,
  fps: number
): number {
  const baseOpacity = overlay.opacity ?? 0.4;
  const fadeInFrames = fps * 0.5;
  const progress = Math.min(1, frame / fadeInFrames);
  
  switch (overlay.animation) {
    case 'none':
      return baseOpacity;
    case 'fade':
      return baseOpacity * progress;
    case 'pulse':
      const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 2);
      return baseOpacity * (0.7 + 0.3 * pulse);
    default:
      return baseOpacity * progress;
  }
}

export default MotivationalImageScene;
