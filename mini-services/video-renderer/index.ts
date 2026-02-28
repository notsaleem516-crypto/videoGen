import { renderMedia, getCompositions, makeCancelSignal } from '@remotion/renderer';
import { serve } from 'bun';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { z } from 'zod';
import { Worker } from 'worker_threads';
import { calculateCompositionConfig, generateVideoPlan } from './render-prep';

// ============================================================================
// VIDEO RENDERER SERVICE - Standalone service for rendering videos
// ============================================================================

const PORT = 3031;

// Try multiple bundle locations (development vs production)
// Priority: Check local bundle folder first (self-contained), then other locations
const BUNDLE_PATHS = [
  path.join(process.cwd(), 'bundle'),                         // Self-contained: bundle in same directory
  '/app/mini-services-dist/video-renderer/bundle',            // Published: mini-services-dist
  path.join(process.cwd(), '..', '..', 'out', 'bundle'),      // Development: from mini-services/video-renderer
  path.join(process.cwd(), '..', '..', 'bundle'),             // Development alternative
  path.join(process.cwd(), '..', 'out', 'bundle'),            // Alternative
  '/out/bundle',                                              // Published: absolute path
  '/app/out/bundle',                                          // Published: alternative
  '/app/next-service-dist/out/bundle',                        // Published: next-service-dist
];

// Find the first existing path
let BUNDLE_PATH = BUNDLE_PATHS.find(p => fs.existsSync(p));
if (!BUNDLE_PATH) {
  // Last resort: check relative to this file
  BUNDLE_PATH = path.join(__dirname, 'bundle');
}

console.log('🎬 Video Renderer Service starting...');
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`📁 Checking paths:`);
BUNDLE_PATHS.forEach(p => {
  console.log(`   ${p} - ${fs.existsSync(p) ? 'EXISTS' : 'not found'}`);
});
console.log(`📁 Using bundle path: ${BUNDLE_PATH}`);
console.log(`📁 Bundle exists: ${fs.existsSync(BUNDLE_PATH)}`);

// Quality settings for H264
const QUALITY_SETTINGS: Record<string, { crf: number }> = {
  low: { crf: 28 },
  medium: { crf: 23 },
  high: { crf: 18 },
};


const OPENGL_RENDERERS = new Set(['swangle', 'angle', 'egl', 'swiftshader', 'vulkan', 'angle-egl'] as const);

type OpenGlRenderer = 'swangle' | 'angle' | 'egl' | 'swiftshader' | 'vulkan' | 'angle-egl';
type HardwareAccelerationMode = 'disable' | 'if-possible' | 'required';

function getOpenGlRenderer(): OpenGlRenderer | null {
  const value = process.env.RENDER_OPENGL_RENDERER;
  if (!value) return 'angle-egl';
  return OPENGL_RENDERERS.has(value as OpenGlRenderer) ? (value as OpenGlRenderer) : 'angle-egl';
}

function getHardwareAccelerationMode(): HardwareAccelerationMode {
  const value = process.env.RENDER_HARDWARE_ACCELERATION;
  if (value === 'disable' || value === 'if-possible' || value === 'required') {
    return value;
  }

  return 'if-possible';
}

function getRenderConcurrency(): number {
  const cpuCount = Math.max(1, os.cpus().length);
  const envValue = Number(process.env.RENDER_CONCURRENCY);
  if (Number.isFinite(envValue) && envValue > 0) {
    return Math.max(1, Math.floor(envValue));
  }

  return Math.max(1, Math.floor(cpuCount * 0.8));
}

function getOffthreadVideoThreads(): number {
  const cpuCount = Math.max(1, os.cpus().length);
  const envValue = Number(process.env.RENDER_OFFTHREAD_THREADS);
  if (Number.isFinite(envValue) && envValue > 0) {
    return Math.max(1, Math.floor(envValue));
  }

  return Math.max(2, Math.floor(cpuCount / 2));
}

function getRenderMediaPerformanceOptions(quality: string) {
  const x264PresetMap: Record<string, 'veryfast' | 'medium' | 'slow'> = {
    low: 'veryfast',
    medium: 'medium',
    high: 'slow',
  };

  return {
    // GPU + browser path
    hardwareAcceleration: getHardwareAccelerationMode(),
    chromeMode: 'chrome-for-testing' as const,
    chromiumOptions: {
      enableMultiProcessOnLinux: true,
      gl: getOpenGlRenderer(),
    },
    // CPU tuning for frame generation
    concurrency: getRenderConcurrency(),
    offthreadVideoThreads: getOffthreadVideoThreads(),
    // Encoding quality/speed tuning
    x264Preset: x264PresetMap[quality] || 'medium',
  };
}
function getRenderTimeoutMs(durationInFrames: number, fps: number): number {
  const durationSeconds = Math.max(1, durationInFrames / fps);
  const estimatedMs = durationSeconds * 4000 + 90_000;
  return Math.min(Math.max(120_000, estimatedMs), MAX_RENDER_TIMEOUT_MS);
}

async function renderMediaWithTimeout(
  renderOptions: Parameters<typeof renderMedia>[0],
  timeoutMs: number
): Promise<void> {
  const { cancelSignal, cancel } = makeCancelSignal();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    timeoutHandle = setTimeout(() => {
      cancel();
    }, timeoutMs);

    await renderMedia({
      ...renderOptions,
      cancelSignal,
      timeoutInMilliseconds: timeoutMs,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('got cancelled')) {
      throw new Error(`Render timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    }

    throw error;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

// ============================================================================
// SCHEMAS (copied to avoid React context issues)
// ============================================================================

const IntroOutroSchema = z.object({
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  logoUrl: z.string().url().optional(),
  duration: z.number().min(1).max(5).optional().default(2),
});

// Block customization schema - shared styling options
const BlockCustomizationSchema = z.object({
  // Position/Alignment settings
  verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
  horizontalAlign: z.enum(['left', 'center', 'right']).optional(),
  
  // Animation settings
  enterAnimation: z.enum(['fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom', 'bounce', 'rotate', 'flip', 'none']).optional(),
  exitAnimation: z.enum(['fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom', 'bounce', 'rotate', 'flip', 'none']).optional(),
  animationDuration: z.number().min(0.1).max(2).optional(),
  
  // Background settings
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  backgroundBlur: z.number().min(0).max(20).optional(),
  
  // Border settings
  borderColor: z.string().optional(),
  borderWidth: z.number().min(0).max(10).optional(),
  borderRadius: z.number().min(0).max(100).optional(),
  shadowEnabled: z.boolean().optional(),
  shadowColor: z.string().optional(),
  shadowBlur: z.number().min(0).max(50).optional(),
  
  // Spacing settings
  padding: z.number().min(0).max(100).optional(),
  margin: z.number().min(0).max(50).optional(),
});

const VideoMetaSchema = z.object({
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5']).default('9:16'),
  theme: z.enum(['dark_modern', 'light_clean', 'gradient_vibrant', 'minimal_bw']).default('dark_modern'),
  fps: z.number().int().min(1).max(60).default(30),
  duration: z.number().optional(),
  intro: IntroOutroSchema.optional(),
  outro: IntroOutroSchema.optional(),
});

const ContentBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('stat'),
    heading: z.string(),
    value: z.string(),
    subtext: z.string().optional(),
    trend: z.enum(['up', 'down', 'neutral']).optional(),
  }).merge(BlockCustomizationSchema),
  z.object({
    type: z.literal('comparison'),
    items: z.array(z.object({
      label: z.string(),
      value: z.number(),
      color: z.string().optional(),
    })),
    title: z.string().optional(),
  }).merge(BlockCustomizationSchema),
  z.object({
    type: z.literal('text'),
    content: z.string(),
    style: z.enum(['body', 'heading', 'caption']).optional(),
  }).merge(BlockCustomizationSchema),
  z.object({
    type: z.literal('quote'),
    text: z.string(),
    author: z.string().optional(),
  }).merge(BlockCustomizationSchema),
  z.object({
    type: z.literal('list'),
    items: z.array(z.string()),
    style: z.enum(['bullet', 'numbered', 'checklist']).optional(),
  }).merge(BlockCustomizationSchema),
  z.object({
    type: z.literal('timeline'),
    events: z.array(z.object({
      year: z.string(),
      title: z.string(),
      description: z.string().optional(),
    })),
  }).merge(BlockCustomizationSchema),
  z.object({
    type: z.literal('callout'),
    title: z.string(),
    content: z.string(),
    variant: z.enum(['success', 'warning', 'error', 'info']).optional(),
  }).merge(BlockCustomizationSchema),
  z.object({
    type: z.literal('icon-list'),
    items: z.array(z.object({
      icon: z.string(),
      title: z.string(),
      description: z.string().optional(),
    })),
  }).merge(BlockCustomizationSchema),
  z.object({
    type: z.literal('line-chart'),
    data: z.array(z.number()),
    title: z.string().optional(),
    xAxis: z.array(z.string()).optional(),
  }).merge(BlockCustomizationSchema),
  z.object({
    type: z.literal('pie-chart'),
    segments: z.array(z.object({
      label: z.string(),
      value: z.number(),
      color: z.string().optional(),
    })),
    title: z.string().optional(),
  }).merge(BlockCustomizationSchema),
  z.object({
    type: z.literal('code'),
    code: z.string(),
    language: z.string().optional(),
    filename: z.string().optional(),
  }).merge(BlockCustomizationSchema),
  z.object({
    type: z.literal('testimonial'),
    quote: z.string(),
    author: z.string(),
    role: z.string().optional(),
    avatar: z.string().optional(),
  }).merge(BlockCustomizationSchema),
  z.object({
    type: z.literal('image'),
    src: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional(),
  }).merge(BlockCustomizationSchema),
  // WhatsApp Chat block
  z.object({
    type: z.literal('whatsapp-chat'),
    title: z.string().max(100).optional(),
    person1: z.object({
      name: z.string().max(50),
      avatar: z.string().optional(),
      isOnline: z.boolean().optional().default(true),
    }),
    person2: z.object({
      name: z.string().max(50),
      avatar: z.string().optional(),
      isOnline: z.boolean().optional().default(true),
    }),
    messages: z.array(z.object({
      from: z.enum(['person1', 'person2']),
      text: z.string().max(500),
      time: z.string().max(20).optional(),
      showReadReceipt: z.boolean().optional().default(true),
    })).min(1).max(50),
    showTypingIndicator: z.boolean().optional().default(true),
    lastSeen: z.string().max(50).optional(),
  }).merge(BlockCustomizationSchema),
  // Motivational Image block
  z.object({
    type: z.literal('motivational-image'),
    imageSrc: z.string().min(1),
    imageAlt: z.string().max(200).optional(),
    imageEffect: z.enum([
      'none', 'fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
      'zoom-in', 'zoom-out', 'ken-burns', 'blur', 'rotate', 'bounce'
    ]).default('fade'),
    imageEffectDuration: z.number().min(0.5).max(5).default(1.5),
    text: z.string().min(1).max(500).optional(),
    textStyle: z.enum([
      'default', 'quote', 'typing', 'words', 'glow', 'outline', 'bold-glow', 'shadow'
    ]).default('default'),
    fontSize: z.enum(['small', 'medium', 'large', 'xlarge', 'xxlarge']).default('xlarge'),
    fontWeight: z.enum(['normal', 'bold', 'black']).default('bold'),
    textColor: z.string().default('#FFFFFF'),
    textAlign: z.enum(['left', 'center', 'right']).default('center'),
    textPosition: z.enum(['top', 'center', 'bottom']).default('center'),
    textAnimationDelay: z.number().min(0).max(5).default(0.3),
    colorOverlay: z.object({
      enabled: z.boolean().default(false),
      color: z.string().default('#000000'),
      opacity: z.number().min(0).max(1).default(0.4),
      animation: z.enum(['none', 'fade', 'pulse']).default('fade'),
    }).optional(),
    backgroundColor: z.string().default('#000000'),
    imageFit: z.enum(['cover', 'contain', 'fill']).default('cover'),
    imagePosition: z.enum(['center', 'top', 'bottom', 'left', 'right']).default('center'),
    audioSrc: z.string().optional(),
    audioVolume: z.number().min(0).max(1).default(0.7),
    duration: z.number().min(1).max(120).optional(),
  }).merge(BlockCustomizationSchema),
  // ========================================================================
  // NEW ADVANCED BLOCK SCHEMAS
  // ========================================================================

  // Counter Block - Animated counting numbers
  z.object({
    type: z.literal('counter'),
    label: z.string().max(100),
    from: z.number().default(0),
    to: z.number().default(100),
    duration: z.number().min(1).max(10).default(3),
    prefix: z.string().max(20).optional(),
    suffix: z.string().max(20).optional(),
    decimals: z.number().min(0).max(5).default(0),
    color: z.string().default('#3B82F6'),
    animationStyle: z.enum(['linear', 'easeOut', 'easeInOut', 'bounce']).default('easeOut'),
  }).merge(BlockCustomizationSchema),

  // Progress Bar Block
  z.object({
    type: z.literal('progress-bar'),
    label: z.string().max(100).optional(),
    value: z.number().min(0).max(100).default(75),
    color: z.string().default('#10B981'),
    backgroundColor: z.string().default('#1F2937'),
    height: z.enum(['small', 'medium', 'large']).default('medium'),
    showPercentage: z.boolean().default(true),
    animated: z.boolean().default(true),
    stripes: z.boolean().default(false),
  }).merge(BlockCustomizationSchema),

  // QR Code Block
  z.object({
    type: z.literal('qr-code'),
    data: z.string().min(1).max(500),
    title: z.string().max(100).optional(),
    subtitle: z.string().max(200).optional(),
    size: z.enum(['small', 'medium', 'large']).default('medium'),
    fgColor: z.string().default('#000000'),
    bgColor: z.string().default('#FFFFFF'),
  }).merge(BlockCustomizationSchema),

  // Video/GIF Block
  z.object({
    type: z.literal('video'),
    src: z.string().min(1),
    poster: z.string().optional(),
    autoPlay: z.boolean().default(true),
    loop: z.boolean().default(false),
    muted: z.boolean().default(true),
    controls: z.boolean().default(false),
    caption: z.string().max(200).optional(),
  }).merge(BlockCustomizationSchema),

  // Avatar Grid Block
  z.object({
    type: z.literal('avatar-grid'),
    title: z.string().max(100).optional(),
    subtitle: z.string().max(200).optional(),
    avatars: z.array(z.object({
      name: z.string().max(50),
      role: z.string().max(100).optional(),
      image: z.string().optional(),
    })).min(1).max(12),
    layout: z.enum(['grid', 'carousel', 'stacked']).default('grid'),
    columns: z.number().min(2).max(6).default(3),
  }).merge(BlockCustomizationSchema),

  // Social Stats Block
  z.object({
    type: z.literal('social-stats'),
    platform: z.enum(['twitter', 'instagram', 'youtube', 'tiktok', 'linkedin', 'facebook']),
    username: z.string().max(50),
    followers: z.number().min(0),
    posts: z.number().min(0).optional(),
    likes: z.number().min(0).optional(),
    verified: z.boolean().default(false),
    showGrowth: z.boolean().default(true),
    growthPercentage: z.number().optional(),
  }).merge(BlockCustomizationSchema),

  // CTA Button Block
  z.object({
    type: z.literal('cta'),
    text: z.string().max(50),
    description: z.string().max(200).optional(),
    buttonStyle: z.enum(['primary', 'secondary', 'outline', 'ghost']).default('primary'),
    color: z.string().default('#3B82F6'),
    size: z.enum(['small', 'medium', 'large']).default('large'),
    icon: z.string().optional(),
    pulse: z.boolean().default(true),
  }).merge(BlockCustomizationSchema),

  // Gradient Text Block
  z.object({
    type: z.literal('gradient-text'),
    text: z.string().max(200),
    gradient: z.array(z.string()).min(2).max(5).default(['#3B82F6', '#8B5CF6']),
    angle: z.number().min(0).max(360).default(45),
    animate: z.boolean().default(true),
    animationSpeed: z.number().min(1).max(10).default(3),
    fontSize: z.enum(['small', 'medium', 'large', 'xlarge', 'xxlarge']).default('xlarge'),
    fontWeight: z.enum(['normal', 'bold', 'black']).default('bold'),
  }).merge(BlockCustomizationSchema),

  // Animated Background Block
  z.object({
    type: z.literal('animated-bg'),
    style: z.enum(['particles', 'waves', 'gradient', 'noise', 'geometric', 'aurora']),
    primaryColor: z.string().default('#3B82F6'),
    secondaryColor: z.string().default('#8B5CF6'),
    speed: z.number().min(0.5).max(5).default(1),
    intensity: z.number().min(0.1).max(1).default(0.5),
    overlay: z.boolean().default(false),
    overlayOpacity: z.number().min(0).max(1).default(0.3),
  }).merge(BlockCustomizationSchema),

  // Countdown Timer Block
  z.object({
    type: z.literal('countdown'),
    title: z.string().max(100).optional(),
    targetDate: z.string().optional(),
    days: z.number().min(0).optional(),
    hours: z.number().min(0).max(23).optional(),
    minutes: z.number().min(0).max(59).optional(),
    seconds: z.number().min(0).max(59).optional(),
    style: z.enum(['modern', 'classic', 'minimal', 'flip']).default('modern'),
    color: z.string().default('#FFFFFF'),
    showLabels: z.boolean().default(true),
  }).merge(BlockCustomizationSchema),

  // Weather Block
  z.object({
    type: z.literal('weather-block'),
    location: z.string().max(100).default('San Francisco'),
    temperature: z.number().default(72),
    unit: z.enum(['F', 'C']).default('F'),
    condition: z.enum(['sunny', 'partly-cloudy', 'cloudy', 'rainy', 'stormy', 'snowy', 'windy', 'foggy', 'night-clear', 'night-cloudy']).default('partly-cloudy'),
    description: z.string().max(100).optional(),
    humidity: z.number().min(0).max(100).default(65),
    windSpeed: z.number().min(0).default(12),
    highTemp: z.number().optional(),
    lowTemp: z.number().optional(),
    showForecast: z.boolean().default(true),
    showDetails: z.boolean().default(true),
    cardStyle: z.enum(['glass', 'solid', 'minimal', 'gradient']).default('glass'),
    accentColor: z.string().default('#38BDF8'),
    animateIcon: z.boolean().default(true),
  }).merge(BlockCustomizationSchema),

  // 3D Tower Chart Block
  z.object({
    type: z.literal('tower-chart-3d'),
    title: z.string().max(100).default('Top Rankings'),
    subtitle: z.string().max(200).optional(),
    items: z.array(z.object({
      rank: z.number().int().min(1),
      name: z.string().max(100),
      value: z.number().min(0),
      valueFormatted: z.string().max(50).optional(),
      color: z.string().optional(),
      image: z.string().optional(),
      subtitle: z.string().max(100).optional(),
    })).min(1).max(50),
    towerStyle: z.enum(['boxes', 'cylinders', 'hexagons']).default('boxes'),
    towerSpacing: z.number().min(2).max(10).default(5),
    baseHeight: z.number().min(1).max(5).default(2),
    maxHeight: z.number().min(10).max(50).default(25),
    gradientStart: z.string().default('#3B82F6'),
    gradientEnd: z.string().default('#8B5CF6'),
    useGradientByRank: z.boolean().default(true),
    showValueLabels: z.boolean().default(true),
    showRankNumbers: z.boolean().default(true),
    cameraDistance: z.number().min(10).max(50).default(20),
    cameraPauseDuration: z.number().min(0.2).max(2).default(0.4),
    cameraMoveSpeed: z.number().min(0.3).max(3).default(0.8),
    cameraAngle: z.number().min(0).max(90).default(30),
    animationDirection: z.enum(['top-to-bottom', 'bottom-to-top']).default('top-to-bottom'),
    backgroundColor: z.string().default('#0a0a1a'),
    groundColor: z.string().default('#151525'),
    showGround: z.boolean().default(true),
    ambientIntensity: z.number().min(0.3).max(2).default(0.6),
    showLabels3D: z.boolean().default(true),
    backgroundPreset: z.enum([
      'none', 'cyber-grid', 'mountain-range', 'ocean-waves', 'forest-trees',
      'city-skyline', 'abstract-waves', 'space-station', 'aurora-borealis',
      'volcanic-inferno', 'crystal-caves', 'desert-dunes', 'neon-tokyo',
      'floating-islands', 'deep-ocean', 'galaxy-nebula', 'matrix-rain',
      'ice-glacier', 'steampunk-gears', 'alien-planet', 'tron-grid',
      'football-stadium', 'race-track', 'concert-stage', 'castle-grounds',
      'airport-runway', 'theme-park', 'ancient-ruins', 'zen-garden',
      'ski-resort', 'vineyard'
    ]).default('cyber-grid'),
    introAnimation: z.enum(['fade', 'zoom', 'slide-up', 'none']).default('fade'),
    itemRevealDelay: z.number().min(0).max(0.5).default(0.05),
    customModelPath: z.string().optional(),
    customModelPosition: z.object({
      x: z.number().default(0),
      y: z.number().default(35),
      z: z.number().default(-60),
    }).optional(),
    customModelScale: z.number().min(0.1).max(10).default(2),
    customModelRotation: z.number().min(0).max(360).default(0),
  }).merge(BlockCustomizationSchema),
]);

const VideoInputSchema = z.object({
  videoMeta: VideoMetaSchema,
  contentBlocks: z.array(ContentBlockSchema),
});

// ============================================================================
// COMPOSITION CONFIG CALCULATOR
// ============================================================================

type PreparedRenderData = {
  plan: any;
  compositionConfig: { width: number; height: number; fps: number; durationInFrames: number };
  props: any;
};

const ENABLE_PREP_WORKER = process.env.RENDER_PREP_WORKER !== 'false';

async function prepareRenderData(input: any, title: string, subtitle: string): Promise<PreparedRenderData> {
  if (!ENABLE_PREP_WORKER) {
    const plan = await generateVideoPlan(input.videoMeta, input.contentBlocks);
    const compositionConfig = calculateCompositionConfig(input);
    return {
      plan,
      compositionConfig,
      props: { input, plan, title, subtitle },
    };
  }

  console.log('🧵 Using prep worker for render planning...');
  const worker = new Worker(new URL('./prep-worker.ts', import.meta.url), {
    workerData: null,
  });

  try {
    return await new Promise((resolve, reject) => {
      const cleanup = () => {
        worker.removeAllListeners();
        void worker.terminate();
      };

      worker.once('message', (message: any) => {
        cleanup();
        if (message?.ok) {
          resolve({
            plan: message.plan,
            compositionConfig: message.compositionConfig,
            props: message.props,
          });
          return;
        }

        reject(new Error(message?.error || 'Render prep worker failed'));
      });

      worker.once('error', (error) => {
        cleanup();
        reject(error);
      });

      worker.postMessage({ input, title, subtitle });
    });
  } catch (error) {
    console.warn('⚠️ Prep worker failed, falling back to main thread:', error);
    const plan = await generateVideoPlan(input.videoMeta, input.contentBlocks);
    const compositionConfig = calculateCompositionConfig(input);
    return {
      plan,
      compositionConfig,
      props: { input, plan, title, subtitle },
    };
  }
}

// ============================================================================
// HTTP SERVER
// ============================================================================

serve({
  port: PORT,
  
  async fetch(req) {
    const url = new URL(req.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Health check
    if (url.pathname === '/health') {
      return Response.json({ 
        status: 'ok', 
        service: 'video-renderer',
        cwd: process.cwd(),
        bundlePath: BUNDLE_PATH,
        bundleExists: fs.existsSync(BUNDLE_PATH),
        checkedPaths: BUNDLE_PATHS.map(p => ({ path: p, exists: fs.existsSync(p) })),
        port: PORT 
      }, { headers: corsHeaders });
    }
    
    // Debug endpoint - list files
    if (url.pathname === '/debug' && req.method === 'GET') {
      const listDir = (dir: string) => {
        try {
          return fs.readdirSync(dir).map(f => {
            const p = path.join(dir, f);
            const stat = fs.statSync(p);
            return { name: f, isDir: stat.isDirectory(), size: stat.size };
          });
        } catch {
          return null;
        }
      };
      
      return Response.json({
        cwd: process.cwd(),
        env: {
          NODE_ENV: process.env.NODE_ENV,
          HOME: process.env.HOME,
        },
        directories: {
          '.': listDir(process.cwd()),
          '..': listDir(path.join(process.cwd(), '..')),
          'bundle': fs.existsSync(path.join(process.cwd(), 'bundle')) ? listDir(path.join(process.cwd(), 'bundle'))?.slice(0, 5) : 'not found',
        }
      }, { headers: corsHeaders });
    }
    
    // Render endpoint (receives pre-calculated props)
    if (url.pathname === '/render' && req.method === 'POST') {
      const startTime = Date.now();
      let outputPath: string | null = null;
      
      try {
        const body = await req.json();
        const { compositionConfig, props, quality = 'medium' } = body;
        
        // Validate required fields
        if (!compositionConfig || !props) {
          return Response.json(
            { error: 'Missing compositionConfig or props' },
            { status: 400, headers: corsHeaders }
          );
        }
        
        // Check bundle
        if (!fs.existsSync(BUNDLE_PATH)) {
          return Response.json(
            { 
              error: 'Remotion bundle not found',
              bundlePath: BUNDLE_PATH,
              setupInstruction: 'Run: bun run video:bundle'
            },
            { status: 500, headers: corsHeaders }
          );
        }
        
        console.log('🎥 Rendering video...');
        console.log('  Composition:', compositionConfig);
        console.log('  Quality:', quality);
        
        // Create output path
        const tempDir = os.tmpdir();
        const videoId = crypto.randomBytes(8).toString('hex');
        const outputFileName = `video-${videoId}.mp4`;
        outputPath = path.join(tempDir, outputFileName);
        
        const { crf } = QUALITY_SETTINGS[quality] || QUALITY_SETTINGS.medium;
        
        // Get compositions from bundle with inputProps
        const compositions = await getCompositions(BUNDLE_PATH, {
          inputProps: props,
        });
        const composition = compositions.find(c => c.id === 'DynamicVideo');
        
        if (!composition) {
          return Response.json(
            { error: 'DynamicVideo composition not found in bundle' },
            { status: 500, headers: corsHeaders }
          );
        }
        
        // Render the video with H264 settings for maximum compatibility
        const renderTimeoutMs = getRenderTimeoutMs(compositionConfig.durationInFrames, compositionConfig.fps);

        const renderPerformanceOptions = getRenderMediaPerformanceOptions(quality);

        await renderMediaWithTimeout({
          serveUrl: BUNDLE_PATH,
          composition: {
            id: composition.id,
            durationInFrames: compositionConfig.durationInFrames,
            fps: compositionConfig.fps,
            width: compositionConfig.width,
            height: compositionConfig.height,
            props: props,
          },
          codec: 'h264',
          outputLocation: outputPath,
          inputProps: props,
          crf,
          logLevel: 'warn',
          // Ensure audio track exists even if silent (required for some players)
          enforceAudioTrack: true,
          ...renderPerformanceOptions,
        }, renderTimeoutMs);
        
        // Read the video file
        const videoBuffer = fs.readFileSync(outputPath);

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`✅ Video rendered in ${processingTime}s (${videoBuffer.length} bytes)`);
        
        // Return MP4 as binary
        return new Response(videoBuffer, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'video/mp4',
            'Content-Disposition': `attachment; filename="video.mp4"`,
            'Content-Length': String(videoBuffer.length),
            'X-Processing-Time': `${processingTime}s`,
            'X-Video-Duration': `${(compositionConfig.durationInFrames / compositionConfig.fps).toFixed(1)}s`,
            'X-Video-Resolution': `${compositionConfig.width}x${compositionConfig.height}`,
          },
        });
        
      } catch (error) {
        console.error('❌ Render error:', error);
        return Response.json(
          { 
            error: 'Failed to render video',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500, headers: corsHeaders }
        );
      } finally {
        if (outputPath && fs.existsSync(outputPath)) {
          try { fs.unlinkSync(outputPath); } catch {}
        }
      }
    }
    
    // Full render endpoint (handles everything from raw input)
    if (url.pathname === '/render-full' && req.method === 'POST') {
      const startTime = Date.now();
      let outputPath: string | null = null;
      
      try {
        const body = await req.json();
        
        // Validate input
        const validationResult = VideoInputSchema.safeParse(body);
        
        if (!validationResult.success) {
          return Response.json(
            { error: 'Validation failed', details: validationResult.error.issues },
            { status: 400, headers: corsHeaders }
          );
        }
        
        const input = validationResult.data;
        const title = body.title || 'Video';
        const subtitle = body.subtitle || '';
        const quality = body.quality || 'medium';
        
        // Check bundle
        if (!fs.existsSync(BUNDLE_PATH)) {
          return Response.json(
            { 
              error: 'Remotion bundle not found',
              bundlePath: BUNDLE_PATH,
              setupInstruction: 'Run: bun run video:bundle'
            },
            { status: 500, headers: corsHeaders }
          );
        }
        
        const { plan, compositionConfig, props } = await prepareRenderData(input, title, subtitle);
        
        console.log('🎥 Full render requested...');
        console.log('  Content blocks:', input.contentBlocks.length);
        console.log('  Duration:', `${(compositionConfig.durationInFrames / compositionConfig.fps).toFixed(1)}s`);
        console.log('  Resolution:', `${compositionConfig.width}x${compositionConfig.height}`);
        console.log('  Props:', JSON.stringify(props, null, 2));
        
        // Create output path
        const tempDir = os.tmpdir();
        const videoId = crypto.randomBytes(8).toString('hex');
        const outputFileName = `video-${videoId}.mp4`;
        outputPath = path.join(tempDir, outputFileName);
        
        const { crf } = QUALITY_SETTINGS[quality] || QUALITY_SETTINGS.medium;
        
        // Get compositions from bundle with inputProps
        const compositions = await getCompositions(BUNDLE_PATH, {
          inputProps: props,
        });
        const composition = compositions.find(c => c.id === 'DynamicVideo');
        
        if (!composition) {
          return Response.json(
            { error: 'DynamicVideo composition not found in bundle' },
            { status: 500, headers: corsHeaders }
          );
        }
        
        // Render the video with H264 settings for maximum compatibility
        const renderTimeoutMs = getRenderTimeoutMs(compositionConfig.durationInFrames, compositionConfig.fps);

        const renderPerformanceOptions = getRenderMediaPerformanceOptions(quality);

        await renderMediaWithTimeout({
          serveUrl: BUNDLE_PATH,
          composition: {
            id: composition.id,
            durationInFrames: compositionConfig.durationInFrames,
            fps: compositionConfig.fps,
            width: compositionConfig.width,
            height: compositionConfig.height,
            props: props,
          },
          codec: 'h264',
          outputLocation: outputPath,
          inputProps: props,
          crf,
          logLevel: 'warn',
          // Ensure audio track exists even if silent (required for some players)
          enforceAudioTrack: true,
          ...renderPerformanceOptions,
        }, renderTimeoutMs);
        
        // Read the video file
        const videoBuffer = fs.readFileSync(outputPath);

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`✅ Video rendered in ${processingTime}s (${videoBuffer.length} bytes)`);
        
        // Return MP4 as binary
        return new Response(videoBuffer, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'video/mp4',
            'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '-').toLowerCase()}.mp4"`,
            'Content-Length': String(videoBuffer.length),
            'X-Processing-Time': `${processingTime}s`,
            'X-Video-Duration': `${(compositionConfig.durationInFrames / compositionConfig.fps).toFixed(1)}s`,
            'X-Video-Resolution': `${compositionConfig.width}x${compositionConfig.height}`,
          },
        });
        
      } catch (error) {
        console.error('❌ Full render error:', error);
        return Response.json(
          { 
            error: 'Failed to render video',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          },
          { status: 500, headers: corsHeaders }
        );
      } finally {
        if (outputPath && fs.existsSync(outputPath)) {
          try { fs.unlinkSync(outputPath); } catch {}
        }
      }
    }
    
    // Default 404
    return Response.json(
      { error: 'Not found', endpoints: ['GET /health', 'POST /render', 'POST /render-full'] },
      { status: 404, headers: corsHeaders }
    );
  },
});

console.log(`🚀 Video Renderer Service running on port ${PORT}`);
console.log(`📡 Endpoints:`);
console.log(`   GET  /health      - Health check`);
console.log(`   POST /render      - Render with pre-calculated props`);
console.log(`   POST /render-full - Full render from raw input`);
