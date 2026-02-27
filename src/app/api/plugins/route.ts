import { NextResponse } from 'next/server';

const PLUGIN_SERVER_URL = process.env.PLUGIN_SERVER_URL || 'http://127.0.0.1:3040';

export async function GET() {
  try {
    const response = await fetch(`${PLUGIN_SERVER_URL}/plugins`, {
      signal: AbortSignal.timeout(5000),
    });

    const body = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch plugins', details: body }, { status: 502 });
    }

    return NextResponse.json(body);
  } catch (error) {
    return NextResponse.json({
      error: 'Plugin server unavailable',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}
