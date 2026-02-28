export const MAX_VIDEO_DURATION_SECONDS = 120;

function sanitizeDurationSeconds(duration?: number): number | undefined {
  if (!Number.isFinite(duration) || duration === undefined || duration <= 0) {
    return undefined;
  }

  return Math.min(duration, MAX_VIDEO_DURATION_SECONDS);
}

export function calculateCompositionConfig(input: any) {
  const { videoMeta, contentBlocks } = input;
  
  // Calculate dimensions based on aspect ratio
  const aspectRatios: Record<string, { width: number; height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
    '4:5': { width: 1080, height: 1350 },
  };
  
  const { width, height } = aspectRatios[videoMeta.aspectRatio] || aspectRatios['9:16'];
  
  // Use intro/outro durations from videoMeta
  const introDuration = videoMeta.intro?.duration || 2;
  const outroDuration = videoMeta.outro?.duration || 2;
  
  // Calculate content duration based on block types
  let contentDuration = 0;
  contentBlocks.forEach(block => {
    const blockType = (block as { type: string }).type;
    if (blockType === 'whatsapp-chat') {
      // Chat duration calculation based on actual component timing:
      // - Adaptive message delay: fewer messages = slower, more messages = faster
      const messages = (block as { messages?: unknown[] }).messages || [];
      const messageCount = messages.length;
      const messageDelay = messageCount <= 5 ? 2.0 
        : messageCount <= 15 ? 1.5 
        : messageCount <= 30 ? 1.0 
        : 0.8; // 0.8s for 30+ messages
      const typingDuration = 2.5;
      const chatDuration = 0.5 + typingDuration + messageCount * messageDelay + 1.5;
      contentDuration += Math.min(60, chatDuration); // Cap at 60 seconds
    } else if (blockType === 'motivational-image') {
      // Motivational image duration logic:
      // 1. If duration is provided → use it directly
      // 2. If audioSrc provided but no duration → calculate from text + extra for audio
      // 3. If no audio, no duration → calculate from text length
      const motivationalBlock = block as { duration?: number; audioSrc?: string; text?: string };
      if (motivationalBlock.duration) {
        // Duration explicitly provided - use it
        contentDuration += motivationalBlock.duration;
      } else if (motivationalBlock.audioSrc) {
        // Audio provided but no duration - calculate from text + buffer for audio
        const textLength = motivationalBlock.text?.length || 0;
        const readingTime = Math.ceil(textLength / 20); // ~20 chars per second with audio
        contentDuration += Math.max(5, readingTime + 3); // At least 5s, with buffer
      } else {
        // No audio, no duration - calculate from text length
        const textLength = motivationalBlock.text?.length || 0;
        const readingTime = Math.ceil(textLength / 30);
        contentDuration += Math.min(10, 4 + readingTime);
      }
    } else if (blockType === 'code') {
      const code = (block as { code?: string }).code || '';
      contentDuration += Math.min(8, Math.ceil(code.length / 100));
    } else if (blockType === 'timeline') {
      const events = (block as { events?: unknown[] }).events || [];
      contentDuration += 4 + Math.ceil(events.length * 0.5);
    } else if (blockType === 'list') {
      const items = (block as { items?: unknown[] }).items || [];
      contentDuration += 3 + Math.ceil(items.length * 0.5);
    } else if (blockType === 'counter') {
      // Counter duration is based on the duration field or defaults to 3 seconds
      const counterBlock = block as { duration?: number };
      contentDuration += counterBlock.duration || 3;
    } else if (blockType === 'progress-bar') {
      // Progress bar animation takes about 2-4 seconds
      contentDuration += 3;
    } else if (blockType === 'qr-code') {
      // QR code display is typically 3-5 seconds
      contentDuration += 4;
    } else if (blockType === 'video') {
      // Video block - default to 5 seconds unless it's a loop
      const videoBlock = block as { loop?: boolean };
      contentDuration += videoBlock.loop ? 10 : 5;
    } else if (blockType === 'avatar-grid') {
      // Avatar grid depends on number of avatars
      const avatars = (block as { avatars?: unknown[] }).avatars || [];
      contentDuration += 3 + Math.ceil(avatars.length * 0.2);
    } else if (blockType === 'social-stats') {
      // Social stats display is typically 3-4 seconds
      contentDuration += 4;
    } else if (blockType === 'cta') {
      // CTA button with pulse animation - 3-5 seconds
      contentDuration += 4;
    } else if (blockType === 'gradient-text') {
      // Gradient text with animation
      const gradientBlock = block as { animationSpeed?: number };
      contentDuration += gradientBlock.animationSpeed || 3;
    } else if (blockType === 'animated-bg') {
      // Animated background is typically a visual effect - 4-6 seconds
      contentDuration += 5;
    } else if (blockType === 'countdown') {
      // Countdown typically shows for 5-10 seconds
      contentDuration += 6;
    } else if (blockType === 'weather-block') {
      // Weather block with animated icons - 4-6 seconds
      contentDuration += 5;
    } else if (blockType === 'tower-chart-3d') {
      // 3D Tower chart duration based on number of items
      const items = (block as { items?: unknown[] }).items || [];
      const cameraPauseDuration = (block as { cameraPauseDuration?: number }).cameraPauseDuration || 0.4;
      const cameraMoveSpeed = (block as { cameraMoveSpeed?: number }).cameraMoveSpeed || 0.8;
      // Intro + (items * (pause + move)) + outro buffer
      const towerDuration = 1.5 + items.length * (cameraPauseDuration + cameraMoveSpeed) + 1;
      contentDuration += Math.min(60, towerDuration); // Cap at 60 seconds
    } else {
      contentDuration += 3; // default 3 seconds per block
    }
  });
  
  const totalDurationSeconds = introDuration + contentDuration + outroDuration;
  
  // Use provided duration or calculated
  const userProvidedDuration = sanitizeDurationSeconds(videoMeta.duration);
  const safeAutoDuration = Number.isFinite(totalDurationSeconds) && totalDurationSeconds > 0
    ? Math.min(totalDurationSeconds, MAX_VIDEO_DURATION_SECONDS)
    : 8;
  const totalDuration = userProvidedDuration ?? safeAutoDuration;
  const durationInFrames = Math.round(totalDuration * videoMeta.fps);
  
  return {
    width,
    height,
    fps: videoMeta.fps,
    durationInFrames,
  };
}

// ============================================================================
// AI DECISION ROUTER (simplified)
// ============================================================================

export async function generateVideoPlan(videoMeta: any, contentBlocks: any[]) {
  // Map block types to component IDs (must match COMPONENT_IDS in schemas)
  const typeToComponentId: Record<string, string> = {
    'stat': 'stat-scene',
    'comparison': 'comparison-scene',
    'text': 'text-scene',
    'quote': 'quote-scene',
    'list': 'list-scene',
    'timeline': 'timeline-scene',
    'callout': 'callout-scene',
    'icon-list': 'icon-list-scene',
    'line-chart': 'line-chart-scene',
    'pie-chart': 'pie-chart-scene',
    'code': 'code-scene',
    'testimonial': 'testimonial-scene',
    'image': 'image-scene',
    'whatsapp-chat': 'whatsapp-chat-scene',
    'motivational-image': 'motivational-image-scene',
    // New block types
    'counter': 'counter-scene',
    'progress-bar': 'progress-bar-scene',
    'qr-code': 'qr-code-scene',
    'video': 'video-scene',
    'avatar-grid': 'avatar-grid-scene',
    'social-stats': 'social-stats-scene',
    'cta': 'cta-scene',
    'gradient-text': 'gradient-text-scene',
    'animated-bg': 'animated-bg-scene',
    'countdown': 'countdown-scene',
    'weather-block': 'weather-scene',
    'tower-chart-3d': 'tower-chart-3d-scene',
  };
  
  // Create decisions for each block
  const decisions = contentBlocks.map((block, index) => {
    const blockType = (block as { type: string }).type;
    
    // Calculate duration based on block type
    let duration = 2; // default 2 seconds
    
    if (blockType === 'whatsapp-chat') {
      // Chat duration calculation based on actual component timing:
      // - Adaptive message delay: fewer messages = slower, more messages = faster
      const messages = (block as { messages?: unknown[] }).messages || [];
      const messageCount = messages.length;
      const messageDelay = messageCount <= 5 ? 2.0 
        : messageCount <= 15 ? 1.5 
        : messageCount <= 30 ? 1.0 
        : 0.8; // 0.8s for 30+ messages
      const typingDuration = 2.5;
      const chatDuration = 0.5 + typingDuration + messageCount * messageDelay + 1.5;
      duration = Math.min(60, chatDuration); // Cap at 60 seconds
    } else if (blockType === 'motivational-image') {
      // Motivational image duration logic:
      // 1. If duration is provided → use it directly
      // 2. If audioSrc provided but no duration → calculate from text + extra for audio
      // 3. If no audio, no duration → calculate from text length
      const motivationalBlock = block as { duration?: number; audioSrc?: string; text?: string };
      if (motivationalBlock.duration) {
        // Duration explicitly provided - use it
        duration = motivationalBlock.duration;
      } else if (motivationalBlock.audioSrc) {
        // Audio provided but no duration - calculate from text + buffer for audio
        const textLength = motivationalBlock.text?.length || 0;
        const readingTime = Math.ceil(textLength / 20); // ~20 chars per second with audio
        duration = Math.max(5, readingTime + 3); // At least 5s, with buffer
      } else {
        // No audio, no duration - calculate from text length
        const textLength = motivationalBlock.text?.length || 0;
        const readingTime = Math.ceil(textLength / 30);
        duration = Math.min(10, 4 + readingTime);
      }
    } else if (blockType === 'code') {
      const code = (block as { code?: string }).code || '';
      duration = Math.min(8, Math.ceil(code.length / 100));
    } else if (blockType === 'timeline') {
      const events = (block as { events?: unknown[] }).events || [];
      duration = 4 + Math.ceil(events.length * 0.5);
    } else if (blockType === 'list') {
      const items = (block as { items?: unknown[] }).items || [];
      duration = 3 + Math.ceil(items.length * 0.5);
    } else if (blockType === 'counter') {
      // Counter duration is based on the duration field or defaults to 3 seconds
      const counterBlock = block as { duration?: number };
      duration = counterBlock.duration || 3;
    } else if (blockType === 'progress-bar') {
      // Progress bar animation takes about 2-4 seconds
      duration = 3;
    } else if (blockType === 'qr-code') {
      // QR code display is typically 3-5 seconds
      duration = 4;
    } else if (blockType === 'video') {
      // Video block - default to 5 seconds unless it's a loop
      const videoBlock = block as { loop?: boolean };
      duration = videoBlock.loop ? 10 : 5;
    } else if (blockType === 'avatar-grid') {
      // Avatar grid depends on number of avatars
      const avatars = (block as { avatars?: unknown[] }).avatars || [];
      duration = 3 + Math.ceil(avatars.length * 0.2);
    } else if (blockType === 'social-stats') {
      // Social stats display is typically 3-4 seconds
      duration = 4;
    } else if (blockType === 'cta') {
      // CTA button with pulse animation - 3-5 seconds
      duration = 4;
    } else if (blockType === 'gradient-text') {
      // Gradient text with animation
      const gradientBlock = block as { animationSpeed?: number };
      duration = gradientBlock.animationSpeed || 3;
    } else if (blockType === 'animated-bg') {
      // Animated background is typically a visual effect - 4-6 seconds
      duration = 5;
    } else if (blockType === 'countdown') {
      // Countdown typically shows for 5-10 seconds
      duration = 6;
    } else if (blockType === 'weather-block') {
      // Weather block with animated icons - 4-6 seconds
      duration = 5;
    } else if (blockType === 'tower-chart-3d') {
      // 3D Tower chart duration based on number of items
      const items = (block as { items?: unknown[] }).items || [];
      const cameraPauseDuration = (block as { cameraPauseDuration?: number }).cameraPauseDuration || 0.4;
      const cameraMoveSpeed = (block as { cameraMoveSpeed?: number }).cameraMoveSpeed || 0.8;
      // Intro + (items * (pause + move)) + outro buffer
      duration = Math.min(60, 1.5 + items.length * (cameraPauseDuration + cameraMoveSpeed) + 1);
    }
    
    return {
      blockIndex: index,
      componentId: typeToComponentId[blockType] || 'text-scene',
      duration,
      motionProfile: blockType === 'whatsapp-chat' ? 'subtle' as const 
        : blockType === 'motivational-image' ? 'dynamic' as const
        : 'dynamic' as const,
      animation: {
        enter: 0.4,
        hold: duration - 0.8,
        exit: 0.4,
      },
    };
  });
  
  return {
    decisions,
    globalStyle: {
      theme: videoMeta.theme,
    },
  };
}

// ============================================================================
// HTTP SERVER
