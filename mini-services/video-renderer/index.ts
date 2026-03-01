import { renderMedia, getCompositions } from '@remotion/renderer';
import { serve } from 'bun';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { z } from 'zod';
import { execSync } from 'child_process';

// ============================================================================
// VIDEO RENDERER SERVICE - Standalone service for rendering videos
// ============================================================================

const PORT = parseInt(process.env.PORT || '3031', 10);

// ============================================================================
// GPU DETECTION - Detect GPU for hardware acceleration
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
      // Windows: Use WMIC or nvidia-smi
      try {
        // Try nvidia-smi first (for NVIDIA GPUs)
        const nvidiaSmiPaths = [
          'C:\\Windows\\System32\\nvidia-smi.exe',
          'nvidia-smi',
        ];
        
        for (const nvidiaSmi of nvidiaSmiPaths) {
          try {
            const result = execSync(`"${nvidiaSmi}" --query-gpu=name,memory.total --format=csv,noheader,nounits`, {
              encoding: 'utf-8',
              timeout: 5000,
              windowsHide: true,
            });
            
            const [name, vram] = result.trim().split(',').map(s => s.trim());
            if (name) {
              console.log(`[GPU] Detected NVIDIA GPU: ${name} with ${vram}MB VRAM`);
              return {
                hasGPU: true,
                gpuName: name,
                vram: parseInt(vram),
                vendor: 'NVIDIA',
              };
            }
          } catch {
            // nvidia-smi not found or failed, try WMIC
          }
        }
        
        // Fallback to WMIC for any GPU
        const wmicResult = execSync('wmic path win32_VideoController get name', {
          encoding: 'utf-8',
          timeout: 5000,
          windowsHide: true,
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
      // Linux: Check for NVIDIA GPU
      try {
        const result = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>/dev/null', {
          encoding: 'utf-8',
          timeout: 5000,
        });
        
        const [name, vram] = result.trim().split(',').map(s => s.trim());
        if (name) {
          console.log(`[GPU] Detected NVIDIA GPU: ${name} with ${vram}MB VRAM`);
          return {
            hasGPU: true,
            gpuName: name,
            vram: parseInt(vram),
            vendor: 'NVIDIA',
          };
        }
      } catch {
        // No NVIDIA GPU, check for other GPUs
        try {
          const lspciResult = execSync('lspci | grep -i vga', {
            encoding: 'utf-8',
            timeout: 5000,
          });
          if (lspciResult.trim()) {
            console.log(`[GPU] Detected GPU via lspci: ${lspciResult.trim()}`);
            return {
              hasGPU: true,
              gpuName: lspciResult.trim(),
              vendor: 'Unknown',
            };
          }
        } catch {
          // No GPU found
        }
      }
    } else if (platform === 'darwin') {
      // macOS: Check for GPU
      try {
        const result = execSync('system_profiler SPDisplaysDataType | grep "Chipset Model"', {
          encoding: 'utf-8',
          timeout: 10000,
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

// Detect GPU at startup
const GPU_INFO = detectGPU();
console.log(`[GPU] GPU Info:`, GPU_INFO);

// ============================================================================
// CHROMIUM OPTIONS FOR GPU RENDERING
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
    // Deterministic rendering options
    '--disable-threaded-animation',
    '--disable-threaded-scrolling',
    '--disable-checker-imaging',
    '--disable-new-content-rendering-timeout',
    // Chrome for Testing mode
    '--chrome-mode=chrome-for-testing',
  ];

  if (useGPU) {
    // GPU-enabled options - use angle-egl (recommended for Docker/Cloud GPU)
    console.log('[GPU] Attempting GPU acceleration with angle-egl');
    return {
      args: [
        ...baseArgs,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-gpu-rasterization',
        '--enable-zero-copy',
        '--enable-native-gpu-memory-buffers',
        '--use-gl=angle-egl',
        '--use-angle=angle-egl',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--disable-software-rasterizer',
        '--disable-gpu-vsync',
        '--disable-dev-shm-usage',
      ],
      gl: 'angle-egl' as const,
    };
  } else {
    // CPU-only options (SwiftShader) - most deterministic
    console.log('[GPU] Using software rendering (SwiftShader)');
    return {
       args: [
        ...baseArgs,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-gl=angle',           // ← was 'swiftshader'
        '--use-angle=swangle',      // ← SWANGLE = ANGLE on top of Vulkan/SwiftShader
        '--enable-webgl',           // ← explicitly enable WebGL
        '--ignore-gpu-blocklist',   // ← bypass GPU blocklist
        '--disable-gpu-sandbox',
        '--disable-dev-shm-usage',
      ],
      gl: 'angle' as const,        // ← was 'swiftshader'
    };
  }
}

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
  // Tower Chart 3D Block - 3D ranking visualization
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
    } else if (blockType === 'tower-chart-3d') {
      // Tower chart 3D duration based on number of items
      const towerBlock = block as { items?: unknown[]; cameraPauseDuration?: number; cameraMoveSpeed?: number };
      const itemCount = towerBlock.items?.length || 5;
      const pauseDuration = towerBlock.cameraPauseDuration || 0.4;
      const moveSpeed = towerBlock.cameraMoveSpeed || 0.8;
      contentDuration += 1.5 + itemCount * (pauseDuration + moveSpeed) + 1;
    } else {
      contentDuration += 3; // default 3 seconds per block
    }
  });
  
  const totalDurationSeconds = introDuration + contentDuration + outroDuration;
  
  // Use provided duration or calculated
  const totalDuration = videoMeta.duration || totalDurationSeconds;
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

async function generateVideoPlan(videoMeta: z.infer<typeof VideoMetaSchema>, contentBlocks: z.infer<typeof ContentBlockSchema>[]) {
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
    } else if (blockType === 'tower-chart-3d') {
      // Tower chart 3D duration based on number of items
      // Each item: pause duration + move speed, plus intro animation
      const towerBlock = block as { items?: unknown[]; cameraPauseDuration?: number; cameraMoveSpeed?: number };
      const itemCount = towerBlock.items?.length || 5;
      const pauseDuration = towerBlock.cameraPauseDuration || 0.4;
      const moveSpeed = towerBlock.cameraMoveSpeed || 0.8;
      // Intro (1.5s) + items * (pause + move) + outro buffer
      duration = 1.5 + itemCount * (pauseDuration + moveSpeed) + 1;
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
        gpu: GPU_INFO,
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
        console.log('  GPU Mode:', GPU_INFO.hasGPU ? 'Enabled' : 'Disabled');
        
        // Create output path
        const tempDir = os.tmpdir();
        const videoId = crypto.randomBytes(8).toString('hex');
        const outputFileName = `video-${videoId}.mp4`;
        const outputPath = path.join(tempDir, outputFileName);
        
        const { crf } = QUALITY_SETTINGS[quality] || QUALITY_SETTINGS.medium;
        
        // Get chromium options based on GPU detection
        const chromiumOptions = getChromiumOptions(GPU_INFO.hasGPU);
        console.log('  Chromium args:', chromiumOptions.args.filter(a => a.includes('gl') || a.includes('gpu')));
        
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
        
        // Render the video with GPU-optimized settings
        // CRITICAL: concurrency=1 to prevent flickering from multi-threading
        // See: https://www.remotion.dev/docs/flickering
        await renderMedia({
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
          audioCodec: 'aac',
          outputLocation: outputPath,
          inputProps: props,
          crf,
          logLevel: 'warn',
          // FIX: Force single-threaded rendering to prevent flickering
          // Multi-threading causes frame timing issues with WebGL/Three.js
          concurrency: 1,
          // GPU-specific options for deterministic frame rendering
          delayRenderTimeoutInMilliseconds: 60000,
          chromiumOptions: {
            args: chromiumOptions.args,
            gl: chromiumOptions.gl,
          },
        });
        
        // Read the video file
        const videoBuffer = fs.readFileSync(outputPath);
        
        // Clean up
        try { fs.unlinkSync(outputPath); } catch {}
        
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
      }
    }
    
    // Full render endpoint (handles everything from raw input)
    if (url.pathname === '/render-full' && req.method === 'POST') {
      const startTime = Date.now();
      
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
        
        // Generate AI plan
        const plan = await generateVideoPlan(input.videoMeta, input.contentBlocks);
        
        // Calculate composition config
        const compositionConfig = calculateCompositionConfig(input);
        
        // Props for Remotion
        const props = {
          input,
          plan,
          title,
          subtitle,
        };
        
        console.log('🎥 Full render requested...');
        console.log('  Content blocks:', input.contentBlocks.length);
        console.log('  Audio tracks:', input.videoMeta.audioTracks?.length || 0);
        console.log('  Duration:', `${(compositionConfig.durationInFrames / compositionConfig.fps).toFixed(1)}s`);
        console.log('  Resolution:', `${compositionConfig.width}x${compositionConfig.height}`);
        console.log('  GPU Mode:', GPU_INFO.hasGPU ? 'Enabled' : 'Disabled');
        console.log('  Props:', JSON.stringify(props, null, 2));
        
        // Create output path
        const tempDir = os.tmpdir();
        const videoId = crypto.randomBytes(8).toString('hex');
        const outputFileName = `video-${videoId}.mp4`;
        const outputPath = path.join(tempDir, outputFileName);
        
        const { crf } = QUALITY_SETTINGS[quality] || QUALITY_SETTINGS.medium;
        
        // Get chromium options based on GPU detection
        const chromiumOptions = getChromiumOptions(GPU_INFO.hasGPU);
        console.log('  Chromium args:', chromiumOptions.args.filter(a => a.includes('gl') || a.includes('gpu')));
        
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
        
        // Render the video with GPU-optimized settings
        // CRITICAL: concurrency=1 to prevent flickering from multi-threading
        // See: https://www.remotion.dev/docs/flickering
        await renderMedia({
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
          audioCodec: 'aac',
          outputLocation: outputPath,
          inputProps: props,
          crf,
          logLevel: 'warn',
          // FIX: Force single-threaded rendering to prevent flickering
          // Multi-threading causes frame timing issues with WebGL/Three.js
          concurrency: 1,
          // GPU-specific options for deterministic frame rendering
          delayRenderTimeoutInMilliseconds: 60000,
          chromiumOptions: {
            args: chromiumOptions.args,
            gl: chromiumOptions.gl,
          },
        });
        
        // Read the video file
        const videoBuffer = fs.readFileSync(outputPath);
        
        // Clean up
        try { fs.unlinkSync(outputPath); } catch {}
        
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
