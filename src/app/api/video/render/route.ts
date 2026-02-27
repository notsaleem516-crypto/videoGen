import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// ============================================================================
// VIDEO RENDER API - Simple public folder approach
// ============================================================================

const VIDEOS_DIR = path.join(process.cwd(), 'public', 'videos');
const LATEST_VIDEO = path.join(VIDEOS_DIR, 'latest.mp4');

// Video renderer service URL (works locally)
const RENDERER_URL = process.env.VIDEO_RENDERER_URL || 'http://127.0.0.1:3031';
const PLUGIN_SERVER_URL = process.env.PLUGIN_SERVER_URL || 'http://127.0.0.1:3040';

async function resolveBundleUrl(pluginId?: string, pluginVersion?: string): Promise<string | undefined> {
  if (!pluginId) return undefined;

  const pluginPath = pluginVersion
    ? `${PLUGIN_SERVER_URL}/plugins/${pluginId}/${pluginVersion}`
    : `${PLUGIN_SERVER_URL}/plugins/${pluginId}`;

  const response = await fetch(pluginPath, {
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`Plugin lookup failed for ${pluginId}${pluginVersion ? `@${pluginVersion}` : ''}`);
  }

  const plugin = await response.json();
  return plugin.bundleUrl;
}

/**
 * POST /api/video/render
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    if (!body.videoMeta || !body.contentBlocks) {
      return NextResponse.json({ error: 'Missing videoMeta or contentBlocks' }, { status: 400 });
    }

    try {
      const healthCheck = await fetch(`${RENDERER_URL}/health`, {
        signal: AbortSignal.timeout(3000)
      });

      if (!healthCheck.ok) {
        throw new Error('Service not healthy');
      }

      const health = await healthCheck.json();

      if (!health.bundleExists && !body.pluginId && !body.bundleUrl) {
        return NextResponse.json({
          error: 'Video renderer bundle not found',
          hint: 'Run locally: bun run video:bundle or provide pluginId/bundleUrl',
        }, { status: 503 });
      }
    } catch {
      return NextResponse.json({
        error: 'Video renderer service not available',
        hint: 'This API works locally when video-renderer service is running',
        localCommand: 'cd mini-services/video-renderer && bun run index.ts',
        alternative: 'Use the render endpoint directly: POST /render-full?XTransformPort=3031',
      }, { status: 503 });
    }

    if (!fs.existsSync(VIDEOS_DIR)) {
      fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(VIDEOS_DIR);
    files.forEach(f => {
      try { fs.unlinkSync(path.join(VIDEOS_DIR, f)); } catch {}
    });

    let bundleUrl = body.bundleUrl;
    if (!bundleUrl && body.pluginId) {
      try {
        bundleUrl = await resolveBundleUrl(body.pluginId, body.pluginVersion);
      } catch (error) {
        return NextResponse.json({
          error: 'Failed to resolve plugin bundle',
          message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 502 });
      }
    }

    console.log('🎬 Rendering video...');

    const renderResponse = await fetch(`${RENDERER_URL}/render-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, bundleUrl }),
    });

    if (!renderResponse.ok) {
      const error = await renderResponse.json().catch(() => ({ error: 'Render failed' }));
      return NextResponse.json({ error: 'Render failed', details: error }, { status: 500 });
    }

    const videoBuffer = await renderResponse.arrayBuffer();
    fs.writeFileSync(LATEST_VIDEO, Buffer.from(videoBuffer));

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const stats = fs.statSync(LATEST_VIDEO);

    return NextResponse.json({
      success: true,
      url: '/videos/latest.mp4',
      size: stats.size,
      processingTime: `${processingTime}s`,
      duration: renderResponse.headers.get('X-Video-Duration') || '',
      resolution: renderResponse.headers.get('X-Video-Resolution') || '',
      pluginId: body.pluginId || null,
      pluginVersion: body.pluginVersion || null,
      bundleUrl: bundleUrl || null,
    });

  } catch (error) {
    console.error('Render error:', error);
    return NextResponse.json({
      error: 'Failed to render video',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/video/render
 */
export async function GET() {
  const exists = fs.existsSync(LATEST_VIDEO);

  if (!exists) {
    return NextResponse.json({
      message: 'No video rendered yet',
      hint: 'POST to /api/video/render with videoMeta and contentBlocks',
      example: {
        videoMeta: { aspectRatio: '9:16', theme: 'dark_modern', fps: 30 },
        contentBlocks: [{ type: 'stat', heading: 'Revenue', value: '$1M' }],
        quality: 'high',
        pluginId: 'marketplace.default',
        pluginVersion: 'v1',
      },
      endpoints: {
        render: 'POST /api/video/render - Render and save video',
        latest: 'GET /videos/latest.mp4 - Get the latest video',
      },
    });
  }

  const stats = fs.statSync(LATEST_VIDEO);

  return NextResponse.json({
    url: '/videos/latest.mp4',
    size: stats.size,
    createdAt: stats.birthtime,
  });
}
