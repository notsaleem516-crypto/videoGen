import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  spring,
  Audio,
} from 'remotion';
import {
  Intro,
  Outro,
  StatScene,
  ComparisonScene,
  TextScene,
  QuoteScene,
} from '../components';
import { ListScene } from '../components/ListScene';
import { TimelineScene } from '../components/TimelineScene';
import { CalloutScene } from '../components/CalloutScene';
import { IconListScene } from '../components/IconListScene';
import { LineChartScene, PieChartScene } from '../components/ChartScene';
import { CodeScene, TestimonialScene } from '../components/CodeTestimonialScene';
import { WhatsAppChatScene } from '../components/WhatsAppChatScene';
import { MotivationalImageScene } from '../components/MotivationalImageScene';
// New block components
import { CounterScene } from '../components/CounterScene';
import { ProgressBarScene } from '../components/ProgressBarScene';
import { QRCodeScene } from '../components/QRCodeScene';
import { VideoScene } from '../components/VideoScene';
import { AvatarGridScene } from '../components/AvatarGridScene';
import { SocialStatsScene } from '../components/SocialStatsScene';
import { CTAScene } from '../components/CTAScene';
import { GradientTextScene } from '../components/GradientTextScene';
import { AnimatedBgScene } from '../components/AnimatedBgScene';
import { CountdownScene } from '../components/CountdownScene';
import { WeatherScene } from '../components/WeatherScene';
import { TowerChart3DScene } from '../components/TowerChart3DScene';
import {
  type VideoInput,
  type AIDecision,
  type VideoPlan,
  type ContentBlock,
  type StatBlock,
  type ComparisonBlock,
  type TextBlock,
  type QuoteBlock,
  type ListBlock,
  type TimelineBlock,
  type CalloutBlock,
  type IconListBlock,
  type LineChartBlock,
  type PieChartBlock,
  type CodeBlock,
  type TestimonialBlock,
  type WhatsAppChatBlock,
  type MotivationalImageBlock,
  // New block types
  type CounterBlock,
  type ProgressBarBlock,
  type QRCodeBlock,
  type VideoBlock,
  type AvatarGridBlock,
  type SocialStatsBlock,
  type CTABlock,
  type GradientTextBlock,
  type AnimatedBackgroundBlock,
  type CountdownBlock,
  type WeatherBlock,
  type TowerChart3DBlock,
  COMPONENT_IDS,
} from '../schemas';
import { getTheme } from '../utils/theme';
import type { MotionProfileType } from '../utils/animations';

// ============================================================================
// DYNAMIC VIDEO COMPOSITION
// ============================================================================

export interface DynamicVideoProps {
  input: VideoInput;
  plan: VideoPlan;
}

/**
 * Main video composition that dynamically renders based on AI decisions
 */
export function DynamicVideo({
  input,
  plan,
}: DynamicVideoProps): React.ReactElement {
  const { videoMeta, contentBlocks } = input;
  const { decisions, suggestedTransitions } = plan;
  const colors = getTheme(videoMeta.theme);

  // Get audio tracks
  const audioTracks = videoMeta.audioTracks || [];

  // Get intro/outro config with defaults
  const introConfig = videoMeta.intro || {};
  const outroConfig = videoMeta.outro || {};

  const introTitle = introConfig.title || 'Video Report';
  const introSubtitle = introConfig.subtitle || '';
  const introDuration = introConfig.duration || 2;

  const outroMessage = outroConfig.title || 'Thank You';
  const outroCta = outroConfig.subtitle || '';
  const outroDuration = outroConfig.duration || 2;

  // Build timeline
  const timeline = buildTimeline(
    contentBlocks,
    decisions,
    introDuration,
    outroDuration,
    videoMeta.fps
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
      }}
    >
      {/* Audio Tracks - render all non-muted tracks */}
      {audioTracks.map((track, index) => !track.muted && (
        <Audio
          key={track.id || `audio-${index}`}
          src={track.src}
          volume={track.volume}
          startFrom={Math.round(track.startTime * videoMeta.fps)}
          loop={track.loop}
        />
      ))}

      {/* Intro */}
      <Sequence from={0} durationInFrames={frames(introDuration, videoMeta.fps)}>
        <Intro
          title={introTitle}
          subtitle={introSubtitle}
          theme={videoMeta.theme}
          logoUrl={introConfig.logoUrl}
        />
      </Sequence>

      {/* Dynamic Content Scenes */}
      {timeline.scenes.map((scene, index) => (
        <Sequence
          key={`scene-${index}`}
          from={scene.startFrame}
          durationInFrames={scene.durationFrames}
        >
          <SceneRenderer
            block={scene.block}
            decision={scene.decision}
            theme={videoMeta.theme}
            transition={suggestedTransitions?.[index]}
          />
        </Sequence>
      ))}

      {/* Outro */}
      <Sequence
        from={timeline.totalFrames - frames(outroDuration, videoMeta.fps)}
        durationInFrames={frames(outroDuration, videoMeta.fps)}
      >
        <Outro
          message={outroMessage}
          cta={outroCta}
          theme={videoMeta.theme}
          logoUrl={outroConfig.logoUrl}
        />
      </Sequence>
    </AbsoluteFill>
  );
}

// ============================================================================
// SCENE RENDERER
// ============================================================================

interface SceneRendererProps {
  block: ContentBlock;
  decision: AIDecision;
  theme: string;
  transition?: 'fade' | 'slide' | 'zoom' | 'wipe';
}

function SceneRenderer({
  block,
  decision,
  theme,
}: SceneRendererProps): React.ReactElement {
  const motionProfile = decision.motionProfile as MotionProfileType;
  const animation = decision.animation ?? {
    enter: 0.4,
    hold: decision.duration - 0.6,
    exit: 0.2,
  };
  
  // Render based on component ID
  switch (decision.componentId) {
    case COMPONENT_IDS.STAT:
      return (
        <StatScene
          data={block as StatBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.COMPARISON:
      return (
        <ComparisonScene
          data={block as ComparisonBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.TEXT:
      return (
        <TextScene
          data={block as TextBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.QUOTE:
      return (
        <QuoteScene
          data={block as QuoteBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.LIST:
      return (
        <ListScene
          data={block as ListBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.TIMELINE:
      return (
        <TimelineScene
          data={block as TimelineBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.CALLOUT:
      return (
        <CalloutScene
          data={block as CalloutBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.ICON_LIST:
      return (
        <IconListScene
          data={block as IconListBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.LINE_CHART:
      return (
        <LineChartScene
          data={block as LineChartBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.PIE_CHART:
      return (
        <PieChartScene
          data={block as PieChartBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.CODE:
      return (
        <CodeScene
          data={block as CodeBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.TESTIMONIAL:
      return (
        <TestimonialScene
          data={block as TestimonialBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.WHATSAPP_CHAT:
      return (
        <WhatsAppChatScene
          data={block as WhatsAppChatBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.MOTIVATIONAL_IMAGE:
      return (
        <MotivationalImageScene
          data={block as MotivationalImageBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    // New blocks
    case COMPONENT_IDS.COUNTER:
      return (
        <CounterScene
          data={block as CounterBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.PROGRESS_BAR:
      return (
        <ProgressBarScene
          data={block as ProgressBarBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.QR_CODE:
      return (
        <QRCodeScene
          data={block as QRCodeBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.VIDEO:
      return (
        <VideoScene
          data={block as VideoBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.AVATAR_GRID:
      return (
        <AvatarGridScene
          data={block as AvatarGridBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.SOCIAL_STATS:
      return (
        <SocialStatsScene
          data={block as SocialStatsBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.CTA:
      return (
        <CTAScene
          data={block as CTABlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.GRADIENT_TEXT:
      return (
        <GradientTextScene
          data={block as GradientTextBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.ANIMATED_BG:
      return (
        <AnimatedBgScene
          data={block as AnimatedBackgroundBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.COUNTDOWN:
      return (
        <CountdownScene
          data={block as CountdownBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.WEATHER:
      return (
        <WeatherScene
          data={block as WeatherBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    case COMPONENT_IDS.TOWER_CHART_3D:
      return (
        <TowerChart3DScene
          data={block as TowerChart3DBlock}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
      
    default:
      // Fallback: render based on block type directly
      return renderByBlockType(block, theme, motionProfile, animation);
  }
}

/**
 * Fallback renderer that uses block type directly
 */
function renderByBlockType(
  block: ContentBlock,
  theme: string,
  motionProfile: MotionProfileType,
  animation: { enter: number; hold: number; exit: number }
): React.ReactElement {
  switch (block.type) {
    case 'stat':
      return <StatScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'comparison':
      return <ComparisonScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'text':
      return <TextScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'quote':
      return <QuoteScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'list':
      return <ListScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'timeline':
      return <TimelineScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'callout':
      return <CalloutScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'icon-list':
      return <IconListScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'line-chart':
      return <LineChartScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'pie-chart':
      return <PieChartScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'code':
      return <CodeScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'testimonial':
      return <TestimonialScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'whatsapp-chat':
      return <WhatsAppChatScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'motivational-image':
      return <MotivationalImageScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    // New blocks
    case 'counter':
      return <CounterScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'progress-bar':
      return <ProgressBarScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'qr-code':
      return <QRCodeScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'video':
      return <VideoScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'avatar-grid':
      return <AvatarGridScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'social-stats':
      return <SocialStatsScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'cta':
      return <CTAScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'gradient-text':
      return <GradientTextScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'animated-bg':
      return <AnimatedBgScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'countdown':
      return <CountdownScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'weather-block':
      return <WeatherScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    case 'tower-chart-3d':
      return <TowerChart3DScene data={block} theme={theme} motionProfile={motionProfile} animation={animation} />;
    default:
      return (
        <TextScene
          data={{ type: 'text', content: 'Unsupported content type' }}
          theme={theme}
          motionProfile={motionProfile}
          animation={animation}
        />
      );
  }
}

// ============================================================================
// TIMELINE BUILDER
// ============================================================================

interface TimelineScene {
  block: ContentBlock;
  decision: AIDecision;
  startFrame: number;
  durationFrames: number;
}

interface Timeline {
  scenes: TimelineScene[];
  totalFrames: number;
}

function buildTimeline(
  blocks: ContentBlock[],
  decisions: AIDecision[],
  introDuration: number,
  outroDuration: number,
  fps: number
): Timeline {
  const scenes: TimelineScene[] = [];
  let currentFrame = frames(introDuration, fps);
  
  blocks.forEach((block, index) => {
    const decision = decisions[index];
    const durationFrames = frames(decision.duration, fps);
    
    scenes.push({
      block,
      decision,
      startFrame: currentFrame,
      durationFrames,
    });
    
    currentFrame += durationFrames;
  });
  
  const totalFrames = currentFrame + frames(outroDuration, fps);
  
  return { scenes, totalFrames };
}

/**
 * Convert seconds to frames
 */
function frames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

// ============================================================================
// COMPOSITION CONFIG HELPER
// ============================================================================

/**
 * Generate Remotion composition configuration from video input and plan
 */
export function getCompositionConfig(
  input: VideoInput,
  plan: VideoPlan
): {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
} {
  const dimensions = getAspectRatioDimensions(input.videoMeta.aspectRatio);
  const introDuration = input.videoMeta.intro?.duration || 2;
  const outroDuration = input.videoMeta.outro?.duration || 2;
  const contentDuration = plan.decisions.reduce((sum, d) => sum + d.duration, 0);
  const totalDuration = introDuration + contentDuration + outroDuration;
  
  return {
    width: dimensions.width,
    height: dimensions.height,
    fps: input.videoMeta.fps,
    durationInFrames: Math.round(totalDuration * input.videoMeta.fps),
  };
}

function getAspectRatioDimensions(ratio: string): { width: number; height: number } {
  const ratios: Record<string, { width: number; height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
    '4:5': { width: 1080, height: 1350 },
  };
  
  return ratios[ratio] ?? ratios['9:16'];
}
