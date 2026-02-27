import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { spawn } from 'child_process';

export const runtime = 'nodejs';

const PLUGIN_SERVER_URL = process.env.PLUGIN_SERVER_URL || 'http://127.0.0.1:3040';

type BundleResult = {
  code: number;
  output: string;
};

const runBundleCommand = async (): Promise<BundleResult> => {
  return await new Promise((resolve) => {
    const cmd = spawn('bun', ['run', 'video:bundle'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';

    cmd.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    cmd.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });

    cmd.on('close', (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pluginId = body.pluginId;
    const version = body.version || 'latest';
    const buildBundle = body.buildBundle !== false;

    if (typeof pluginId !== 'string' || pluginId.length < 2) {
      return NextResponse.json({ error: 'pluginId must be a string with length >= 2' }, { status: 400 });
    }

    if (buildBundle) {
      const bundleResult = await runBundleCommand();
      if (bundleResult.code !== 0) {
        return NextResponse.json({
          error: 'Failed to build remotion bundle',
          logs: bundleResult.output,
        }, { status: 500 });
      }
    }

    const sourceBundlePath = path.join(process.cwd(), 'mini-services', 'video-renderer', 'bundle');

    const publishResponse = await fetch(`${PLUGIN_SERVER_URL}/plugins/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId, version, sourceBundlePath }),
      signal: AbortSignal.timeout(15000),
    });

    const publishBody = await publishResponse.json();

    if (!publishResponse.ok) {
      return NextResponse.json({
        error: 'Plugin server publish failed',
        details: publishBody,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      pluginId,
      version,
      buildBundle,
      bundlePath: sourceBundlePath,
      publish: publishBody,
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to publish plugin',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
