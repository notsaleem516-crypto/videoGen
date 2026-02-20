import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// VIDEO RENDER SYNC API - Proxies to Video Renderer Service
// ============================================================================

/**
 * POST /api/video/render-sync
 * 
 * This endpoint proxies to the Video Renderer Service (port 3031).
 * 
 * For DIRECT access (recommended for external callers):
 *   POST https://your-domain/render-full?XTransformPort=3031
 * 
 * This bypasses Next.js and goes straight to the video renderer.
 */

// Video Renderer Service URL
const RENDERER_SERVICE_URL = process.env.VIDEO_RENDERER_URL || 'http://127.0.0.1:3031';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Validate basic structure
    if (!body.videoMeta || !body.contentBlocks) {
      return NextResponse.json(
        { error: 'Missing videoMeta or contentBlocks' },
        { status: 400 }
      );
    }
    
    console.log('🎬 Forwarding to Video Renderer Service...');
    
    // Forward request to the Video Renderer Service
    const renderResponse = await fetch(`${RENDERER_SERVICE_URL}/render-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!renderResponse.ok) {
      const errorData = await renderResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Renderer service error:', errorData);
      
      return NextResponse.json({
        success: false,
        error: 'Video rendering failed',
        details: errorData,
        hint: 'Try calling the video renderer directly: POST /render-full?XTransformPort=3031',
      }, { status: 500 });
    }
    
    // Get the MP4 buffer
    const videoBuffer = await renderResponse.arrayBuffer();
    
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const title = body.title || 'video';
    
    console.log(`✅ Video rendered in ${processingTime}s`);
    
    // Return MP4 as binary
    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '-').toLowerCase()}.mp4"`,
        'Content-Length': String(videoBuffer.byteLength),
        'X-Processing-Time': `${processingTime}s`,
        'X-Video-Duration': renderResponse.headers.get('X-Video-Duration') || '',
        'X-Video-Resolution': renderResponse.headers.get('X-Video-Resolution') || '',
      },
    });
    
  } catch (error) {
    console.error('Video render sync error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to render video',
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: 'The video renderer service may not be running. Try direct access: POST /render-full?XTransformPort=3031',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - API Documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/video/render-sync',
    method: 'POST',
    description: 'Render video and return MP4 directly',
    
    important: {
      message: 'For external access, use the direct video renderer endpoint',
      directEndpoint: 'POST /render-full?XTransformPort=3031',
      example: `curl -X POST "https://your-domain/render-full?XTransformPort=3031" \\
  -H "Content-Type: application/json" \\
  -d '{"videoMeta": {...}, "contentBlocks": [...]}' \\
  --output video.mp4`,
    },
    
    requestFormat: {
      videoMeta: { 
        aspectRatio: '16:9 | 9:16 | 1:1 | 4:5',
        theme: 'dark_modern | light_clean | gradient_vibrant | minimal_bw',
        fps: 'number (default: 30)'
      },
      contentBlocks: 'Array of content blocks',
      title: 'string (optional)',
      quality: 'low | medium | high',
    },
    
    response: {
      success: { status: 200, contentType: 'video/mp4' },
      error: { status: 400 | 500, contentType: 'application/json' },
    },
    
    contentBlocks: {
      stat: { type: 'stat', heading: 'string', value: 'string', trend: 'up|down|neutral' },
      text: { type: 'text', content: 'string' },
      comparison: { type: 'comparison', items: [{ label: 'string', value: 'number' }] },
      quote: { type: 'quote', text: 'string', author: 'string' },
      list: { type: 'list', items: ['string'] },
      timeline: { type: 'timeline', events: [{ year: 'string', title: 'string' }] },
      lineChart: { type: 'line-chart', data: [1, 2, 3], title: 'string' },
      pieChart: { type: 'pie-chart', segments: [{ label: 'string', value: 1 }] },
    },
  });
}
