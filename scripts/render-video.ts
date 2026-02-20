#!/usr/bin/env bun
/**
 * Standalone Video Renderer - Called by Next.js API
 * 
 * This script is part of the main project and uses the main project's node_modules.
 * It renders videos using Remotion.
 */

import { renderMedia, getCompositions } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';

// ============================================================================
// TYPES
// ============================================================================

interface VideoMeta {
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5';
  theme?: string;
  fps?: number;
  duration?: number;
}

interface ContentBlock {
  type: string;
  [key: string]: unknown;
}

interface RenderRequest {
  videoMeta: VideoMeta;
  contentBlocks: ContentBlock[];
  title?: string;
  subtitle?: string;
  quality?: 'low' | 'medium' | 'high';
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: bun run scripts/render-video.ts <request.json> <output.mp4>');
    process.exit(1);
  }
  
  const [inputPath, outputPath] = args;
  
  // Read request
  const request: RenderRequest = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const { videoMeta, contentBlocks, title = 'video', quality = 'medium' } = request;
  
  // Bundle path
  const bundlePath = path.join(process.cwd(), 'out', 'bundle');
  
  if (!fs.existsSync(bundlePath)) {
    console.error('ERROR: Bundle not found at:', bundlePath);
    console.error('Run: bun run video:bundle');
    process.exit(1);
  }
  
  // Calculate dimensions
  const aspectRatios: Record<string, { width: number; height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
    '4:5': { width: 1080, height: 1350 },
  };
  
  const dimensions = aspectRatios[videoMeta.aspectRatio || '9:16'] || aspectRatios['9:16'];
  const fps = videoMeta.fps || 30;
  
  // Calculate duration
  const baseDuration = 60;
  const perBlockDuration = 30;
  const durationInFrames = videoMeta.duration 
    ? videoMeta.duration * fps 
    : baseDuration + (contentBlocks.length * perBlockDuration);
  
  // Quality CRF
  const crf = quality === 'high' ? 18 : quality === 'low' ? 28 : 23;
  
  // Build props for Remotion
  const props = {
    input: request,
    plan: {
      blocks: contentBlocks.map((block, index) => ({
        ...block,
        startFrame: index * perBlockDuration,
        endFrame: (index + 1) * perBlockDuration,
      })),
      globalStyle: { theme: videoMeta.theme || 'dark_modern' },
    },
    title,
    subtitle: request.subtitle || '',
  };
  
  console.log('Resolution:', `${dimensions.width}x${dimensions.height}`);
  console.log('Duration:', `${(durationInFrames / fps).toFixed(1)}s`);
  console.log('FPS:', fps);
  console.log('CRF:', crf);
  
  // Get compositions
  const compositions = await getCompositions(bundlePath);
  const composition = compositions.find(c => c.id === 'DynamicVideo');
  
  if (!composition) {
    console.error('ERROR: DynamicVideo composition not found');
    process.exit(1);
  }
  
  // Ensure output directory
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Render
  console.log('Rendering...');
  const startTime = Date.now();
  
  await renderMedia({
    serveUrl: bundlePath,
    composition: {
      id: 'DynamicVideo',
      durationInFrames,
      fps,
      width: dimensions.width,
      height: dimensions.height,
    },
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: props,
    crf,
    logLevel: 'warn',
  });
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const stats = fs.statSync(outputPath);
  
  console.log('Done!');
  console.log('Time:', elapsed + 's');
  console.log('Size:', (stats.size / 1024).toFixed(1) + ' KB');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
