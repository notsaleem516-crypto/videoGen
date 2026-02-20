import React from 'react';
import { 
  useCurrentFrame, 
  useVideoConfig, 
  AbsoluteFill, 
  interpolate,
  spring,
  Img,
  Sequence 
} from 'remotion';
import { 
  type MotivationalImageBlock, 
  type TextOverlay, 
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

// Font size mapping (larger for better visibility on vertical videos)
const FONT_SIZES: Record<string, number> = {
  small: 36,
  medium: 52,
  large: 72,
  xlarge: 96,
};

// Image position mapping for object-position
const IMAGE_POSITIONS: Record<string, string> = {
  center: 'center',
  top: 'top center',
  bottom: 'bottom center',
  left: 'center left',
  right: 'center right',
};

// ============================================================================
// RENDER TEXT OVERLAYS - Stacks multiple overlays at same position
// ============================================================================

function renderTextOverlays(
  textOverlays: TextOverlay[],
  frame: number,
  fps: number,
  width: number,
  height: number,
  exitProgress: number
): React.ReactElement[] {
  // Group overlays by position
  const positionGroups: Record<string, TextOverlay[]> = {
    top: [],
    center: [],
    bottom: [],
    custom: [],
  };
  
  textOverlays.forEach((overlay) => {
    const pos = overlay.position || 'center';
    if (!positionGroups[pos]) {
      positionGroups[pos] = [];
    }
    positionGroups[pos].push(overlay);
  });
  
  const elements: React.ReactElement[] = [];
  let globalIndex = 0;
  
  // Render each position group
  Object.entries(positionGroups).forEach(([position, overlays]) => {
    overlays.forEach((overlay, indexInGroup) => {
      elements.push(
        <TextOverlayComponent
          key={`text-${globalIndex++}`}
          textOverlay={overlay}
          frame={frame}
          fps={fps}
          width={width}
          height={height}
          exitProgress={exitProgress}
          indexInGroup={indexInGroup}
          totalInGroup={overlays.length}
        />
      );
    });
  });
  
  return elements;
}

export function MotivationalImageScene({
  data,
  theme = 'dark_modern',
  motionProfile = 'dynamic',
  animation,
}: MotivationalImageSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  // Animation timings
  const enterDuration = animation?.enter ?? 1.5;
  const holdDuration = animation?.hold ?? 3;
  const exitDuration = animation?.exit ?? 0.5;
  
  const enterEndFrame = fps * enterDuration;
  const holdEndFrame = fps * (enterDuration + holdDuration);
  const exitStartFrame = holdEndFrame;
  const totalFrames = fps * (enterDuration + holdDuration + exitDuration);
  
  // Exit animation progress
  const exitProgress = frame > exitStartFrame 
    ? Math.min(1, (frame - exitStartFrame) / (fps * exitDuration))
    : 0;
  
  // Image animation values
  const imageAnimation = useImageAnimation({
    effect: data.imageEffect,
    frame,
    fps,
    duration: data.imageEffectDuration,
  });
  
  // Color overlay animation
  const colorOverlay = data.colorOverlay;
  const overlayOpacity = colorOverlay?.enabled 
    ? getOverlayOpacity(colorOverlay, frame, fps, enterDuration)
    : 0;
  
  return (
    <AbsoluteFill 
      style={{ 
        backgroundColor: data.backgroundColor || '#000000',
      }}
    >
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
      
      {/* Text Overlay Layers - Grouped by position for proper stacking */}
      {renderTextOverlays(data.textOverlays, frame, fps, width, height, exitProgress)}
    </AbsoluteFill>
  );
}

// ============================================================================
// IMAGE ANIMATION HOOK
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
      
    case 'slide-left':
      return {
        opacity: interpolate(progress, [0, 0.3, 1], [0, 0.5, 1]),
        transform: `translateX(${interpolate(progress, [0, 1], [200, 0])}px)`,
        filter: 'none',
      };
      
    case 'slide-right':
      return {
        opacity: interpolate(progress, [0, 0.3, 1], [0, 0.5, 1]),
        transform: `translateX(${interpolate(progress, [0, 1], [-200, 0])}px)`,
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
      // Slow continuous zoom with pan
      const time = frame / fps;
      const zoom = 1 + Math.sin(time * 0.3) * 0.1; // Subtle zoom oscillation
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
  fps: number,
  enterDuration: number
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

// ============================================================================
// TEXT OVERLAY COMPONENT
// ============================================================================

interface TextOverlayComponentProps {
  textOverlay: TextOverlay;
  frame: number;
  fps: number;
  width: number;
  height: number;
  exitProgress: number;
  indexInGroup: number;
  totalInGroup: number;
}

function TextOverlayComponent({
  textOverlay,
  frame,
  fps,
  width,
  height,
  exitProgress,
  indexInGroup,
  totalInGroup,
}: TextOverlayComponentProps): React.ReactElement {
  const delay = (textOverlay.animationDelay || 0) * fps;
  const adjustedFrame = Math.max(0, frame - delay);
  const animationDuration = 0.8 * fps; // 0.8 seconds for text animation
  
  const fontSize = FONT_SIZES[textOverlay.fontSize || 'large'];
  
  // Get text animation values
  const textAnimation = getTextAnimation({
    animation: textOverlay.animation || 'fade',
    frame: adjustedFrame,
    fps,
    duration: animationDuration,
  });
  
  // Text shadow style - stronger for better readability
  const textShadow = textOverlay.shadow
    ? `0 4px 12px ${textOverlay.shadowColor || 'rgba(0,0,0,0.9)'}, 0 2px 4px ${textOverlay.shadowColor || 'rgba(0,0,0,0.8)'}, 0 0 40px rgba(0,0,0,0.5)`
    : 'none';
  
  // Calculate vertical offset for stacking multiple texts at same position
  // Each text gets spaced out vertically within its position group
  const lineHeight = fontSize * 1.3;
  const groupSpacing = 20; // Extra space between stacked texts
  
  // Calculate offset: center the group, then offset each item
  const totalGroupHeight = (totalInGroup - 1) * (lineHeight + groupSpacing);
  const baseOffset = -totalGroupHeight / 2; // Center the group
  const stackOffset = indexInGroup * (lineHeight + groupSpacing);
  const verticalOffset = baseOffset + stackOffset;
  
  // Position-based alignment
  const position = textOverlay.position || 'center';
  let alignItems: string;
  let paddingTop = 0;
  let paddingBottom = 0;
  
  switch (position) {
    case 'top':
      alignItems = 'flex-start';
      paddingTop = 80 + indexInGroup * (lineHeight + groupSpacing);
      break;
    case 'bottom':
      alignItems = 'flex-end';
      paddingBottom = 80 + (totalInGroup - 1 - indexInGroup) * (lineHeight + groupSpacing);
      break;
    case 'center':
    default:
      alignItems = 'center';
      break;
  }
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems,
        padding: '60px',
        paddingTop: paddingTop || undefined,
        paddingBottom: paddingBottom || undefined,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          opacity: textAnimation.opacity * (1 - exitProgress),
          transform: position === 'center' 
            ? `${textAnimation.transform} translateY(${verticalOffset}px)`
            : textAnimation.transform,
          transformOrigin: 'center center',
          textAlign: textOverlay.alignment || 'center',
        }}
      >
        <TextWithAnimation
          text={textOverlay.text}
          animation={textOverlay.animation || 'fade'}
          frame={adjustedFrame}
          fps={fps}
          style={{
            fontSize,
            fontWeight: textOverlay.fontWeight || 'bold',
            color: textOverlay.color || '#FFFFFF',
            textAlign: textOverlay.alignment || 'center',
            textShadow,
            textWrap: 'balance',
            maxWidth: '900px',
            fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

// ============================================================================
// TEXT POSITION HELPER
// ============================================================================

function getTextPosition(
  textOverlay: TextOverlay, 
  width: number, 
  height: number
): { x?: number; y?: number; alignItems: string; transform: string } {
  if (textOverlay.position === 'custom' && textOverlay.customPosition) {
    return {
      x: textOverlay.customPosition.x,
      y: textOverlay.customPosition.y,
      alignItems: 'flex-start',
      transform: 'translate(-50%, -50%)',
    };
  }
  
  switch (textOverlay.position) {
    case 'top':
      return { alignItems: 'flex-start', transform: 'none' };
    case 'bottom':
      return { alignItems: 'flex-end', transform: 'none' };
    case 'center':
    default:
      return { alignItems: 'center', transform: 'none' };
  }
}

// ============================================================================
// TEXT ANIMATION
// ============================================================================

interface TextAnimationValues {
  opacity: number;
  transform: string;
}

function getTextAnimation({
  animation,
  frame,
  fps,
  duration,
}: {
  animation: TextOverlay['animation'];
  frame: number;
  fps: number;
  duration: number;
}): TextAnimationValues {
  const progress = Math.min(1, frame / duration);
  
  switch (animation) {
    case 'none':
      return { opacity: 1, transform: 'none' };
      
    case 'fade':
      return {
        opacity: interpolate(progress, [0, 1], [0, 1], { extrapolateRight: 'clamp' }),
        transform: 'none',
      };
      
    case 'slide-up':
      return {
        opacity: interpolate(progress, [0, 0.5, 1], [0, 0.7, 1], { extrapolateRight: 'clamp' }),
        transform: `translateY(${interpolate(progress, [0, 1], [50, 0])}px)`,
      };
      
    case 'slide-down':
      return {
        opacity: interpolate(progress, [0, 0.5, 1], [0, 0.7, 1], { extrapolateRight: 'clamp' }),
        transform: `translateY(${interpolate(progress, [0, 1], [-50, 0])}px)`,
      };
      
    case 'slide-left':
      return {
        opacity: interpolate(progress, [0, 0.5, 1], [0, 0.7, 1], { extrapolateRight: 'clamp' }),
        transform: `translateX(${interpolate(progress, [0, 1], [100, 0])}px)`,
      };
      
    case 'slide-right':
      return {
        opacity: interpolate(progress, [0, 0.5, 1], [0, 0.7, 1], { extrapolateRight: 'clamp' }),
        transform: `translateX(${interpolate(progress, [0, 1], [-100, 0])}px)`,
      };
      
    case 'zoom': {
      const scaleProgress = spring({
        frame,
        fps,
        config: { damping: 12, stiffness: 100 },
      });
      return {
        opacity: interpolate(progress, [0, 0.5, 1], [0, 0.7, 1], { extrapolateRight: 'clamp' }),
        transform: `scale(${interpolate(scaleProgress, [0, 1], [0.5, 1])})`,
      };
    }
      
    case 'reveal':
      return {
        opacity: interpolate(progress, [0, 0.5, 1], [0, 0.8, 1], { extrapolateRight: 'clamp' }),
        transform: `scaleY(${interpolate(progress, [0, 1], [0, 1])})`,
      };
      
    default:
      return { opacity: 1, transform: 'none' };
  }
}

// ============================================================================
// TEXT WITH ANIMATION (for typewriter effect)
// ============================================================================

interface TextWithAnimationProps {
  text: string;
  animation: TextOverlay['animation'];
  frame: number;
  fps: number;
  style: React.CSSProperties;
}

function TextWithAnimation({
  text,
  animation,
  frame,
  fps,
  style,
}: TextWithAnimationProps): React.ReactElement {
  // Typewriter effect
  if (animation === 'typewriter') {
    const charactersPerSecond = 15;
    const totalCharacters = text.length;
    const animationDuration = totalCharacters / charactersPerSecond;
    const progress = Math.min(1, (frame / fps) / animationDuration);
    const visibleCharacters = Math.floor(progress * totalCharacters);
    const visibleText = text.slice(0, visibleCharacters);
    
    return (
      <div style={style}>
        {visibleText}
        {progress < 1 && <span style={{ opacity: 0.7 }}>|</span>}
      </div>
    );
  }
  
  // Default: render full text
  return <div style={style}>{text}</div>;
}

export default MotivationalImageScene;
