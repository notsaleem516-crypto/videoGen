#!/usr/bin/env node
/**
 * Standalone Video Renderer
 * 
 * Usage:
 *   bun run render.ts props.json output.mp4
 *   bun run render.ts '{"input":{...},"plan":{...}}' output.mp4
 */

import { renderMedia, getCompositions } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Usage:
  bun run render.ts <props> <output>

Arguments:
  props   - JSON string or path to JSON file
  output  - Output MP4 file path

Examples:
  bun run render.ts props.json out/video.mp4
  bun run render.ts '{"input":{...},"plan":{...}}' out/video.mp4

Setup:
  1. Create bundle: npx remotion bundle out/bundle
  2. Run this script
`);
    process.exit(1);
  }
  
  const [propsArg, outputPath] = args;
  
  // Parse props
  let props: Record<string, unknown>;
  
  if (fs.existsSync(propsArg)) {
    props = JSON.parse(fs.readFileSync(propsArg, 'utf-8'));
  } else {
    props = JSON.parse(propsArg);
  }
  
  // Bundle path
  const bundlePath = path.join(process.cwd(), 'out', 'bundle');
  
  if (!fs.existsSync(bundlePath)) {
    console.error('❌ Bundle not found at:', bundlePath);
    console.error('Run: npx remotion bundle out/bundle');
    process.exit(1);
  }
  
  console.log('📁 Using bundle:', bundlePath);
  
  // Get compositions
  const compositions = await getCompositions(bundlePath);
  const composition = compositions.find(c => c.id === 'DynamicVideo');
  
  if (!composition) {
    console.error('❌ DynamicVideo composition not found');
    process.exit(1);
  }
  
  // Calculate config
  const { input, plan } = props as { 
    input: { videoMeta: { aspectRatio: string; fps: number } }; 
    plan: { decisions: { duration: number }[] } 
  };
  
  const aspectRatios: Record<string, { width: number; height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
    '4:5': { width: 1080, height: 1350 },
  };
  
  const dimensions = aspectRatios[input.videoMeta.aspectRatio] || aspectRatios['9:16'];
  const introDuration = 2;
  const outroDuration = 2;
  const contentDuration = plan.decisions.reduce((sum: number, d: { duration: number }) => sum + d.duration, 0);
  const durationInFrames = Math.round((introDuration + contentDuration + outroDuration) * input.videoMeta.fps);
  
  console.log('📐 Resolution:', `${dimensions.width}x${dimensions.height}`);
  console.log('⏱️  Duration:', `${(durationInFrames / input.videoMeta.fps).toFixed(1)}s`);
  
  // Ensure output dir
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Render
  console.log('🎬 Rendering...');
  const startTime = Date.now();
  
  await renderMedia({
    serveUrl: bundlePath,
    composition: {
      id: 'DynamicVideo',
      durationInFrames,
      fps: input.videoMeta.fps,
      width: dimensions.width,
      height: dimensions.height,
    },
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: props,
    crf: 18,
  });
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const stats = fs.statSync(outputPath);
  
  console.log(`\n✅ Done!`);
  console.log(`   📄 ${outputPath}`);
  console.log(`   📦 ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   ⏱️  ${elapsed}s`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
