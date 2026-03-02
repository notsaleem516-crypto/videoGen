import { renderMedia, getCompositions } from '@remotion/renderer';
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda/client';
import { serve } from 'bun';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { z } from 'zod';
import { execSync } from 'child_process';

// Bun automatically loads .env file from project root

// ============================================================================
// VIDEO RENDERER SERVICE - Standalone service for rendering videos
// ============================================================================

const PORT = parseInt(process.env.PORT || '3031', 10);

// ============================================================================
// REMOTION LAMBDA CONFIGURATION
// ============================================================================

const LAMBDA_FUNCTION_NAME = process.env.LAMBDA_FUNCTION_NAME;
const LAMBDA_SITE_URL = process.env.LAMBDA_SITE_URL;
const LAMBDA_REGION = process.env.LAMBDA_REGION || 'us-east-1';

const useLambda = !!(LAMBDA_FUNCTION_NAME && LAMBDA_SITE_URL);

if (useLambda) {
  console.log('🎬 Using Remotion Lambda for rendering');
  console.log(`  Function: ${LAMBDA_FUNCTION_NAME}`);
  console.log(`  Site: ${LAMBDA_SITE_URL}`);
  console.log(`  Region: ${LAMBDA_REGION}`);
} else {
  console.log('🎬 Using local rendering (set LAMBDA_* env vars for Lambda)');
}

// ============================================================================
// GPU DETECTION
// ============================================================================

interface GPUInfo {
  hasGPU: boolean;
  gpuName?: string;
  vram?: number;
  vendor?: string;
}

function detectGPU(): GPUInfo {
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      try {
        const nvidiaSmiPaths = [
          'C:\\Windows\\System32\\nvidia-smi.exe',
          'nvidia-smi',
        ];

        for (const nvidiaSmi of nvidiaSmiPaths) {
          try {
            const result = execSync(
              `"${nvidiaSmi}" --query-gpu=name,memory.total --format=csv,noheader,nounits`,
              { encoding: 'utf-8', timeout: 5000, windowsHide: true }
            );
            const [name, vram] = result.trim().split(',').map(s => s.trim());
            if (name) {
              console.log(`[GPU] Detected NVIDIA GPU: ${name} with ${vram}MB VRAM`);
              return { hasGPU: true, gpuName: name, vram: parseInt(vram), vendor: 'NVIDIA' };
            }
          } catch {
            // try next path
          }
        }

        const wmicResult = execSync('wmic path win32_VideoController get name', {
          encoding: 'utf-8', timeout: 5000, windowsHide: true,
        });
        const lines = wmicResult.split('\n').filter(l => l.trim() && !l.includes('Name'));
        if (lines.length > 0) {
          const gpuName = lines[0].trim();
          console.log(`[GPU] Detected GPU via WMIC: ${gpuName}`);
          return {
            hasGPU: true,
            gpuName,
            vendor: gpuName.toLowerCase().includes('nvidia') ? 'NVIDIA'
              : gpuName.toLowerCase().includes('amd') ? 'AMD'
              : gpuName.toLowerCase().includes('intel') ? 'Intel' : 'Unknown',
          };
        }
      } catch (e) {
        console.log('[GPU] Windows GPU detection failed:', e);
      }
    } else if (platform === 'linux') {
      try {
        const result = execSync(
          'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>/dev/null',
          { encoding: 'utf-8', timeout: 5000 }
        );
        const [name, vram] = result.trim().split(',').map(s => s.trim());
        if (name) {
          console.log(`[GPU] Detected NVIDIA GPU: ${name} with ${vram}MB VRAM`);
          return { hasGPU: true, gpuName: name, vram: parseInt(vram), vendor: 'NVIDIA' };
        }
      } catch {
        try {
          const lspciResult = execSync('lspci | grep -i vga', { encoding: 'utf-8', timeout: 5000 });
          if (lspciResult.trim()) {
            console.log(`[GPU] Detected GPU via lspci: ${lspciResult.trim()}`);
            return { hasGPU: true, gpuName: lspciResult.trim(), vendor: 'Unknown' };
          }
        } catch {
          // No GPU found
        }
      }
    } else if (platform === 'darwin') {
      try {
        const result = execSync('system_profiler SPDisplaysDataType | grep "Chipset Model"', {
          encoding: 'utf-8', timeout: 10000,
        });
        const match = result.match(/Chipset Model:\s*(.+)/);
        if (match) {
          console.log(`[GPU] Detected GPU: ${match[1]}`);
          return {
            hasGPU: true,
            gpuName: match[1].trim(),
            vendor: match[1].toLowerCase().includes('apple') ? 'Apple'
              : match[1].toLowerCase().includes('amd') ? 'AMD'
              : match[1].toLowerCase().includes('intel') ? 'Intel' : 'Unknown',
          };
        }
      } catch {
        // No GPU found
      }
    }
  } catch (e) {
    console.log('[GPU] GPU detection failed:', e);
  }

  console.log('[GPU] No dedicated GPU detected, using software rendering');
  return { hasGPU: false };
}

const GPU_INFO = detectGPU();
console.log(`[GPU] GPU Info:`, GPU_INFO);

// ============================================================================
// LAMBDA RENDER HELPERS
// ============================================================================

async function waitForLambdaRender(
  region: string,
  renderId: string,
  bucketName: string,
  timeoutMs: number = 9000000
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const progress = await getRenderProgress({
      region: region as 'us-east-1',
      functionName: LAMBDA_FUNCTION_NAME!,
      renderId,
      bucketName,
    });

    const percent = Math.round((progress.overallProgress ?? 0) * 100);
    console.log(`  Lambda progress: ${percent}% | done: ${progress.done} | error: ${progress.fatalErrorEncountered}`);

    if (progress.done) {
      if (progress.outputFile) {
        return progress.outputFile;
      }
      throw new Error('Render done but no output file returned');
    }

    if (progress.fatalErrorEncountered) {
      throw new Error(
        `Lambda render failed: ${progress.errors?.[0]?.message || 'Unknown error'}`
      );
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Lambda render timed out after 5 minutes');
}

async function renderWithLambda(
  props: any,
  compositionConfig: { durationInFrames: number; fps: number; width: number; height: number },
  crf: number = 23
): Promise<Buffer> {
  console.log('🎬 Starting Lambda render...');
  console.log(`  Composition: DynamicVideo`);
  console.log(`  Duration: ${compositionConfig.durationInFrames} frames @ ${compositionConfig.fps}fps`);
  console.log(`  Resolution: ${compositionConfig.width}x${compositionConfig.height}`);

  const { renderId, bucketName } = await renderMediaOnLambda({
    region: LAMBDA_REGION as 'us-east-1',
    functionName: LAMBDA_FUNCTION_NAME!,
    serveUrl: LAMBDA_SITE_URL!,
    composition: 'DynamicVideo',
    inputProps: props,
    codec: 'h264',
    audioCodec: 'aac',
    imageFormat: 'jpeg',
    maxRetries: 1,
    framesPerLambda: 120,
    privacy: 'public',
    outName: `video-${Date.now()}.mp4`,
  });

  console.log(`  Render ID: ${renderId}`);
  console.log(`  Bucket: ${bucketName}`);

  const outputUrl = await waitForLambdaRender(LAMBDA_REGION, renderId, bucketName);
  console.log(`  Output URL: ${outputUrl}`);

  const response = await fetch(outputUrl);
  if (!response.ok) {
    throw new Error(`Failed to download rendered video: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// ============================================================================
// CHROMIUM OPTIONS
// ============================================================================

function getChromiumOptions(useGPU: boolean) {
  const baseArgs = [
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--allow-file-access-from-files',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-frame-rate-limit',
    '--disable-gpu-sandbox',
    '--disable-threaded-animation',
    '--disable-threaded-scrolling',
    '--disable-checker-imaging',
    '--disable-new-content-rendering-timeout',
    '--chrome-mode=chrome-for-testing',
  ];

  if (useGPU) {
    console.log('[GPU] Using GPU acceleration with angle/gl-egl');
    return {
      args: [
        ...baseArgs,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-gpu-rasterization',
        '--enable-zero-copy',
        '--use-gl=angle',
        '--use-angle=gl-egl',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--disable-software-rasterizer',
        '--disable-gpu-vsync',
        '--disable-dev-shm-usage',
      ],
      gl: 'angle' as const,
    };
  } else {
    console.log('[GPU] Using software rendering (angle/egl)');
    return {
      args: [
        ...baseArgs,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-vulkan',
        '--use-gl=angle',
        '--use-angle=gl',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--disable-gpu-sandbox',
        '--disable-dev-shm-usage',
      ],
      gl: 'angle' as const,
    };
  }
}

// ============================================================================
// BUNDLE PATH RESOLUTION
// ============================================================================

const BUNDLE_PATHS = [
  path.join(process.cwd(), 'bundle'),
  '/app/mini-services-dist/video-renderer/bundle',
  path.join(process.cwd(), '..', '..', 'out', 'bundle'),
  path.join(process.cwd(), '..', '..', 'bundle'),
  path.join(process.cwd(), '..', 'out', 'bundle'),
  '/out/bundle',
  '/app/out/bundle',
  '/app/next-service-dist/out/bundle',
];

let BUNDLE_PATH = BUNDLE_PATHS.find(p => fs.existsSync(p));
if (!BUNDLE_PATH) {
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

// ============================================================================
// QUALITY SETTINGS
// ============================================================================

const QUALITY_SETTINGS: Record<string, { crf: number }> = {
  low: { crf: 28 },
  medium: { crf: 23 },
  high: { crf: 18 },
};

// ============================================================================
// SCHEMAS
// ============================================================================

const IntroOutroSchema = z.object({
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  logoUrl: z.string().url().optional(),
  duration: z.number().min(1).max(5).optional().default(2),
});

const BlockCustomizationSchema = z.object({
  verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
  horizontalAlign: z.enum(['left', 'center', 'right']).optional(),
  enterAnimation: z.enum(['fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom', 'bounce', 'rotate', 'flip', 'none']).optional(),
  exitAnimation: z.enum(['fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom', 'bounce', 'rotate', 'flip', 'none']).optional(),
  animationDuration: z.number().min(0.1).max(2).optional(),
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  backgroundBlur: z.number().min(0).max(20).optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().min(0).max(10).optional(),
  borderRadius: z.number().min(0).max(100).optional(),
  shadowEnabled: z.boolean().optional(),
  shadowColor: z.string().optional(),
  shadowBlur: z.number().min(0).max(50).optional(),
  padding: z.number().min(0).max(100).optional(),
  margin: z.number().min(0).max(50).optional(),
});

const AudioTrackSchema = z.object({
  id: z.string().optional(),
  name: z.string().default('Audio Track'),
  src: z.string(),
  volume: z.number().min(0).max(1).default(0.7),
  startTime: z.number().min(0).default(0),
  fadeIn: z.number().min(0).max(10).default(0),
  fadeOut: z.number().min(0).max(10).default(0),
  loop: z.boolean().default(true),
  muted: z.boolean().default(false),
});

const VideoMetaSchema = z.object({
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5']).default('9:16'),
  theme: z.enum(['dark_modern', 'light_clean', 'gradient_vibrant', 'minimal_bw']).default('dark_modern'),
  fps: z.number().int().min(1).max(60).default(30),
  duration: z.number().optional(),
  intro: IntroOutroSchema.optional(),
  outro: IntroOutroSchema.optional(),
  audioTracks: z.array(AudioTrackSchema).optional().default([]),
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
  z.object({
    type: z.literal('qr-code'),
    data: z.string().min(1).max(500),
    title: z.string().max(100).optional(),
    subtitle: z.string().max(200).optional(),
    size: z.enum(['small', 'medium', 'large']).default('medium'),
    fgColor: z.string().default('#000000'),
    bgColor: z.string().default('#FFFFFF'),
  }).merge(BlockCustomizationSchema),
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
    backgroundPreset: z.string().default('cyber-grid'),
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

function calculateCompositionConfig(input: z.infer<typeof VideoInputSchema>) {
  const { videoMeta, contentBlocks } = input;

  const aspectRatios: Record<string, { width: number; height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
    '4:5': { width: 1080, height: 1350 },
  };

  const { width, height } = aspectRatios[videoMeta.aspectRatio] || aspectRatios['9:16'];
  const introDuration = videoMeta.intro?.duration || 2;
  const outroDuration = videoMeta.outro?.duration || 2;

  let contentDuration = 0;
  contentBlocks.forEach(block => {
    const blockType = (block as { type: string }).type;
    if (blockType === 'whatsapp-chat') {
      const messages = (block as { messages?: unknown[] }).messages || [];
      const messageCount = messages.length;
      const messageDelay = messageCount <= 5 ? 2.0
        : messageCount <= 15 ? 1.5
        : messageCount <= 30 ? 1.0
        : 0.8;
      contentDuration += Math.min(60, 0.5 + 2.5 + messageCount * messageDelay + 1.5);
    } else if (blockType === 'motivational-image') {
      const b = block as { duration?: number; audioSrc?: string; text?: string };
      if (b.duration) {
        contentDuration += b.duration;
      } else if (b.audioSrc) {
        contentDuration += Math.max(5, Math.ceil((b.text?.length || 0) / 20) + 3);
      } else {
        contentDuration += Math.min(10, 4 + Math.ceil((b.text?.length || 0) / 30));
      }
    } else if (blockType === 'code') {
      contentDuration += Math.min(8, Math.ceil(((block as { code?: string }).code || '').length / 100));
    } else if (blockType === 'timeline') {
      contentDuration += 4 + Math.ceil(((block as { events?: unknown[] }).events || []).length * 0.5);
    } else if (blockType === 'list') {
      contentDuration += 3 + Math.ceil(((block as { items?: unknown[] }).items || []).length * 0.5);
    } else if (blockType === 'counter') {
      contentDuration += (block as { duration?: number }).duration || 3;
    } else if (blockType === 'progress-bar') {
      contentDuration += 3;
    } else if (blockType === 'qr-code') {
      contentDuration += 4;
    } else if (blockType === 'video') {
      contentDuration += (block as { loop?: boolean }).loop ? 10 : 5;
    } else if (blockType === 'avatar-grid') {
      contentDuration += 3 + Math.ceil(((block as { avatars?: unknown[] }).avatars || []).length * 0.2);
    } else if (blockType === 'social-stats') {
      contentDuration += 4;
    } else if (blockType === 'cta') {
      contentDuration += 4;
    } else if (blockType === 'gradient-text') {
      contentDuration += (block as { animationSpeed?: number }).animationSpeed || 3;
    } else if (blockType === 'animated-bg') {
      contentDuration += 5;
    } else if (blockType === 'countdown') {
      contentDuration += 6;
    } else if (blockType === 'tower-chart-3d') {
      const b = block as { items?: unknown[]; cameraPauseDuration?: number; cameraMoveSpeed?: number };
      const itemCount = (b.items || []).length;
      contentDuration += 1.5 + itemCount * ((b.cameraPauseDuration || 0.4) + (b.cameraMoveSpeed || 0.8)) + 1;
    } else {
      contentDuration += 3;
    }
  });

  const totalDuration = videoMeta.duration || (introDuration + contentDuration + outroDuration);
  const durationInFrames = Math.round(totalDuration * videoMeta.fps);

  return { width, height, fps: videoMeta.fps, durationInFrames };
}

// ============================================================================
// VIDEO PLAN GENERATOR
// ============================================================================

async function generateVideoPlan(
  videoMeta: z.infer<typeof VideoMetaSchema>,
  contentBlocks: z.infer<typeof ContentBlockSchema>[]
) {
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
    'tower-chart-3d': 'tower-chart-3d-scene',
  };

  const decisions = contentBlocks.map((block, index) => {
    const blockType = (block as { type: string }).type;
    let duration = 2;

    if (blockType === 'whatsapp-chat') {
      const messages = (block as { messages?: unknown[] }).messages || [];
      const messageCount = messages.length;
      const messageDelay = messageCount <= 5 ? 2.0
        : messageCount <= 15 ? 1.5
        : messageCount <= 30 ? 1.0
        : 0.8;
      duration = Math.min(60, 0.5 + 2.5 + messageCount * messageDelay + 1.5);
    } else if (blockType === 'motivational-image') {
      const b = block as { duration?: number; audioSrc?: string; text?: string };
      if (b.duration) {
        duration = b.duration;
      } else if (b.audioSrc) {
        duration = Math.max(5, Math.ceil((b.text?.length || 0) / 20) + 3);
      } else {
        duration = Math.min(10, 4 + Math.ceil((b.text?.length || 0) / 30));
      }
    } else if (blockType === 'code') {
      duration = Math.min(8, Math.ceil(((block as { code?: string }).code || '').length / 100));
    } else if (blockType === 'timeline') {
      duration = 4 + Math.ceil(((block as { events?: unknown[] }).events || []).length * 0.5);
    } else if (blockType === 'list') {
      duration = 3 + Math.ceil(((block as { items?: unknown[] }).items || []).length * 0.5);
    } else if (blockType === 'counter') {
      duration = (block as { duration?: number }).duration || 3;
    } else if (blockType === 'progress-bar') {
      duration = 3;
    } else if (blockType === 'qr-code') {
      duration = 4;
    } else if (blockType === 'video') {
      duration = (block as { loop?: boolean }).loop ? 10 : 5;
    } else if (blockType === 'avatar-grid') {
      duration = 3 + Math.ceil(((block as { avatars?: unknown[] }).avatars || []).length * 0.2);
    } else if (blockType === 'social-stats') {
      duration = 4;
    } else if (blockType === 'cta') {
      duration = 4;
    } else if (blockType === 'gradient-text') {
      duration = (block as { animationSpeed?: number }).animationSpeed || 3;
    } else if (blockType === 'animated-bg') {
      duration = 5;
    } else if (blockType === 'countdown') {
      duration = 6;
    } else if (blockType === 'tower-chart-3d') {
      const b = block as { items?: unknown[]; cameraPauseDuration?: number; cameraMoveSpeed?: number };
      const itemCount = (b.items || []).length;
      duration = 1.5 + itemCount * ((b.cameraPauseDuration || 0.4) + (b.cameraMoveSpeed || 0.8)) + 1;
    }

    return {
      blockIndex: index,
      componentId: typeToComponentId[blockType] || 'text-scene',
      duration,
      motionProfile: blockType === 'whatsapp-chat' ? 'subtle' as const : 'dynamic' as const,
      animation: {
        enter: 0.4,
        hold: Math.max(0, duration - 0.8),
        exit: 0.4,
      },
    };
  });

  return {
    decisions,
    globalStyle: { theme: videoMeta.theme },
  };
}

// ============================================================================
// HTTP SERVER
// ============================================================================

serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ── Health check ──────────────────────────────────────────────────────────
    if (url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        service: 'video-renderer',
        renderMode: useLambda ? 'lambda' : 'local',
        lambda: useLambda ? {
          function: LAMBDA_FUNCTION_NAME,
          site: LAMBDA_SITE_URL,
          region: LAMBDA_REGION,
        } : null,
        cwd: process.cwd(),
        bundlePath: BUNDLE_PATH,
        bundleExists: fs.existsSync(BUNDLE_PATH),
        gpu: GPU_INFO,
        port: PORT,
      }, { headers: corsHeaders });
    }

    // ── Debug ─────────────────────────────────────────────────────────────────
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
        env: { NODE_ENV: process.env.NODE_ENV, HOME: process.env.HOME },
        directories: {
          '.': listDir(process.cwd()),
          '..': listDir(path.join(process.cwd(), '..')),
          'bundle': fs.existsSync(path.join(process.cwd(), 'bundle'))
            ? listDir(path.join(process.cwd(), 'bundle'))?.slice(0, 5)
            : 'not found',
        },
      }, { headers: corsHeaders });
    }

    // ── /render ───────────────────────────────────────────────────────────────
    if (url.pathname === '/render' && req.method === 'POST') {
      const startTime = Date.now();

      try {
        const body = await req.json();
        const { compositionConfig, props, quality = 'medium' } = body;

        if (!compositionConfig || !props) {
          return Response.json(
            { error: 'Missing compositionConfig or props' },
            { status: 400, headers: corsHeaders }
          );
        }

        const { crf } = QUALITY_SETTINGS[quality] || QUALITY_SETTINGS.medium;

        // Use Lambda if configured
        if (useLambda) {
          try {
            const videoBuffer = await renderWithLambda(props, compositionConfig, crf);
            const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`✅ Lambda render done in ${processingTime}s (${videoBuffer.length} bytes)`);
            return new Response(new Uint8Array(videoBuffer), {
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'video/mp4',
                'Content-Disposition': 'attachment; filename="video.mp4"',
                'Content-Length': String(videoBuffer.length),
                'X-Processing-Time': `${processingTime}s`,
                'X-Render-Mode': 'lambda',
              },
            });
          } catch (error) {
            console.error('❌ Lambda render error:', error);
            return Response.json(
              { error: 'Lambda render failed', message: error instanceof Error ? error.message : 'Unknown error' },
              { status: 500, headers: corsHeaders }
            );
          }
        }

        // Local render
        if (!fs.existsSync(BUNDLE_PATH)) {
          return Response.json(
            { error: 'Remotion bundle not found', bundlePath: BUNDLE_PATH },
            { status: 500, headers: corsHeaders }
          );
        }

        console.log('🎥 Local render starting...');
        console.log('  Composition:', compositionConfig);
        console.log('  Quality:', quality);
        console.log('  GPU Mode:', GPU_INFO.hasGPU ? 'Enabled' : 'Disabled');

        const tempDir = os.tmpdir();
        const outputPath = path.join(tempDir, `video-${crypto.randomBytes(8).toString('hex')}.mp4`);
        const chromiumOptions = getChromiumOptions(GPU_INFO.hasGPU);
        console.log('  GL args:', chromiumOptions.args.filter(a => a.includes('gl') || a.includes('angle') || a.includes('vulkan')));

        const compositions = await getCompositions(BUNDLE_PATH, { inputProps: props });
        const composition = compositions.find(c => c.id === 'DynamicVideo');
        if (!composition) {
          return Response.json({ error: 'DynamicVideo composition not found' }, { status: 500, headers: corsHeaders });
        }

        await renderMedia({
          serveUrl: BUNDLE_PATH,
          composition: {
            id: composition.id,
            durationInFrames: compositionConfig.durationInFrames,
            fps: compositionConfig.fps,
            width: compositionConfig.width,
            height: compositionConfig.height,
            props,
          },
          codec: 'h264',
          audioCodec: 'aac',
          outputLocation: outputPath,
          inputProps: props,
          crf,
          logLevel: 'warn',
          concurrency: 1,
          delayRenderTimeoutInMilliseconds: 60000,
          chromiumOptions: { args: chromiumOptions.args, gl: chromiumOptions.gl },
        });

        const videoBuffer = fs.readFileSync(outputPath);
        try { fs.unlinkSync(outputPath); } catch {}

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ Local render done in ${processingTime}s (${videoBuffer.length} bytes)`);

        return new Response(videoBuffer, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'video/mp4',
            'Content-Disposition': 'attachment; filename="video.mp4"',
            'Content-Length': String(videoBuffer.length),
            'X-Processing-Time': `${processingTime}s`,
            'X-Video-Duration': `${(compositionConfig.durationInFrames / compositionConfig.fps).toFixed(1)}s`,
            'X-Video-Resolution': `${compositionConfig.width}x${compositionConfig.height}`,
            'X-Render-Mode': 'local',
          },
        });

      } catch (error) {
        console.error('❌ Render error:', error);
        return Response.json(
          { error: 'Failed to render video', message: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // ── /render-full ──────────────────────────────────────────────────────────
    if (url.pathname === '/render-full' && req.method === 'POST') {
      const startTime = Date.now();

      try {
        const body = await req.json();

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
        const { crf } = QUALITY_SETTINGS[quality] || QUALITY_SETTINGS.medium;

        // Check bundle (only needed for local render)
        if (!useLambda && !fs.existsSync(BUNDLE_PATH)) {
          return Response.json(
            { error: 'Remotion bundle not found', bundlePath: BUNDLE_PATH, setupInstruction: 'Run: bun run video:bundle' },
            { status: 500, headers: corsHeaders }
          );
        }

        const plan = await generateVideoPlan(input.videoMeta, input.contentBlocks);
        const compositionConfig = calculateCompositionConfig(input);
        const props = { input, plan, title, subtitle };

        console.log('🎥 Full render requested...');
        console.log('  Render mode:', useLambda ? 'Lambda' : 'Local');
        console.log('  Content blocks:', input.contentBlocks.length);
        console.log('  Audio tracks:', input.videoMeta.audioTracks?.length || 0);
        console.log('  Duration:', `${(compositionConfig.durationInFrames / compositionConfig.fps).toFixed(1)}s`);
        console.log('  Resolution:', `${compositionConfig.width}x${compositionConfig.height}`);

        // ── Lambda path ──────────────────────────────────────────────────────
        if (useLambda) {
          const videoBuffer = await renderWithLambda(props, compositionConfig, crf);
          const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`✅ Lambda render done in ${processingTime}s (${videoBuffer.length} bytes)`);

          return new Response(new Uint8Array(videoBuffer), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'video/mp4',
              'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '-').toLowerCase()}.mp4"`,
              'Content-Length': String(videoBuffer.length),
              'X-Processing-Time': `${processingTime}s`,
              'X-Video-Duration': `${(compositionConfig.durationInFrames / compositionConfig.fps).toFixed(1)}s`,
              'X-Video-Resolution': `${compositionConfig.width}x${compositionConfig.height}`,
              'X-Render-Mode': 'lambda',
            },
          });
        }

        // ── Local path ───────────────────────────────────────────────────────
        console.log('  GPU Mode:', GPU_INFO.hasGPU ? 'Enabled' : 'Disabled');

        const tempDir = os.tmpdir();
        const outputPath = path.join(tempDir, `video-${crypto.randomBytes(8).toString('hex')}.mp4`);
        const chromiumOptions = getChromiumOptions(GPU_INFO.hasGPU);
        console.log('  GL args:', chromiumOptions.args.filter(a => a.includes('gl') || a.includes('angle') || a.includes('vulkan')));

        const compositions = await getCompositions(BUNDLE_PATH, { inputProps: props });
        const composition = compositions.find(c => c.id === 'DynamicVideo');
        if (!composition) {
          return Response.json({ error: 'DynamicVideo composition not found' }, { status: 500, headers: corsHeaders });
        }

        await renderMedia({
          serveUrl: BUNDLE_PATH,
          composition: {
            id: composition.id,
            durationInFrames: compositionConfig.durationInFrames,
            fps: compositionConfig.fps,
            width: compositionConfig.width,
            height: compositionConfig.height,
            props,
          },
          codec: 'h264',
          audioCodec: 'aac',
          outputLocation: outputPath,
          inputProps: props,
          crf,
          logLevel: 'warn',
          concurrency: 1,
          delayRenderTimeoutInMilliseconds: 60000,
          chromiumOptions: { args: chromiumOptions.args, gl: chromiumOptions.gl },
        });

        const videoBuffer = fs.readFileSync(outputPath);
        try { fs.unlinkSync(outputPath); } catch {}

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ Local render done in ${processingTime}s (${videoBuffer.length} bytes)`);

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
            'X-Render-Mode': 'local',
          },
        });

      } catch (error) {
        console.error('❌ Full render error:', error);
        return Response.json(
          {
            error: 'Failed to render video',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // ── 404 ───────────────────────────────────────────────────────────────────
    return Response.json(
      { error: 'Not found', endpoints: ['GET /health', 'GET /debug', 'POST /render', 'POST /render-full'] },
      { status: 404, headers: corsHeaders }
    );
  },
});

console.log(`🚀 Video Renderer Service running on port ${PORT}`);
console.log(`📡 Endpoints:`);
console.log(`   GET  /health      - Health check`);
console.log(`   GET  /debug       - Debug filesystem`);
console.log(`   POST /render      - Render with pre-calculated props`);
console.log(`   POST /render-full - Full render from raw input`);