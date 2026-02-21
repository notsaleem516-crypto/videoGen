import { renderMedia, getCompositions } from '@remotion/renderer';
import { serve } from 'bun';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { z } from 'zod';

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

// ============================================================================
// SCHEMAS (copied to avoid React context issues)
// ============================================================================

const IntroOutroSchema = z.object({
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  logoUrl: z.string().url().optional(),
  duration: z.number().min(1).max(5).optional().default(2),
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
  }),
  z.object({
    type: z.literal('comparison'),
    items: z.array(z.object({
      label: z.string(),
      value: z.number(),
      color: z.string().optional(),
    })),
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal('text'),
    content: z.string(),
    style: z.enum(['body', 'heading', 'caption']).optional(),
  }),
  z.object({
    type: z.literal('quote'),
    text: z.string(),
    author: z.string().optional(),
  }),
  z.object({
    type: z.literal('list'),
    items: z.array(z.string()),
    style: z.enum(['bullet', 'numbered', 'checklist']).optional(),
  }),
  z.object({
    type: z.literal('timeline'),
    events: z.array(z.object({
      year: z.string(),
      title: z.string(),
      description: z.string().optional(),
    })),
  }),
  z.object({
    type: z.literal('callout'),
    title: z.string(),
    content: z.string(),
    variant: z.enum(['success', 'warning', 'error', 'info']).optional(),
  }),
  z.object({
    type: z.literal('icon-list'),
    items: z.array(z.object({
      icon: z.string(),
      title: z.string(),
      description: z.string().optional(),
    })),
  }),
  z.object({
    type: z.literal('line-chart'),
    data: z.array(z.number()),
    title: z.string().optional(),
    xAxis: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal('pie-chart'),
    segments: z.array(z.object({
      label: z.string(),
      value: z.number(),
      color: z.string().optional(),
    })),
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal('code'),
    code: z.string(),
    language: z.string().optional(),
    filename: z.string().optional(),
  }),
  z.object({
    type: z.literal('testimonial'),
    quote: z.string(),
    author: z.string(),
    role: z.string().optional(),
    avatar: z.string().optional(),
  }),
  z.object({
    type: z.literal('image'),
    src: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional(),
  }),
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
    })).min(1).max(50), // Increased from 12 to 50 messages
    showTypingIndicator: z.boolean().optional().default(true),
    lastSeen: z.string().max(50).optional(),
  }),
  // Motivational Image block (Simplified: Single text with style options)
  // Audio support: Optional background audio with duration control
  z.object({
    type: z.literal('motivational-image'),
    imageSrc: z.string().min(1),
    imageAlt: z.string().max(200).optional(),
    imageEffect: z.enum([
      'none', 'fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right',
      'zoom-in', 'zoom-out', 'ken-burns', 'blur', 'rotate', 'bounce'
    ]).default('fade'),
    imageEffectDuration: z.number().min(0.5).max(5).default(1.5),
    // Single text field with style options - optional if you want image+audio only
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
    // Audio support (optional)
    audioSrc: z.string().optional(), // URL to mp3 audio file
    audioVolume: z.number().min(0).max(1).default(0.7), // Volume level (0-1)
    duration: z.number().min(1).max(120).optional(), // Optional duration override in seconds
  }),
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
        
        // Create output path
        const tempDir = os.tmpdir();
        const videoId = crypto.randomBytes(8).toString('hex');
        const outputFileName = `video-${videoId}.mp4`;
        const outputPath = path.join(tempDir, outputFileName);
        
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
        
        // Render the video
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
          outputLocation: outputPath,
          inputProps: props,
          crf,
          logLevel: 'warn',
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
        console.log('  Duration:', `${(compositionConfig.durationInFrames / compositionConfig.fps).toFixed(1)}s`);
        console.log('  Resolution:', `${compositionConfig.width}x${compositionConfig.height}`);
        console.log('  Props:', JSON.stringify(props, null, 2));
        
        // Create output path
        const tempDir = os.tmpdir();
        const videoId = crypto.randomBytes(8).toString('hex');
        const outputFileName = `video-${videoId}.mp4`;
        const outputPath = path.join(tempDir, outputFileName);
        
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
        
        // Render the video
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
          outputLocation: outputPath,
          inputProps: props,
          crf,
          logLevel: 'warn',
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
