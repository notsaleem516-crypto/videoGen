// ============================================================================
// PLUGINS REGISTRY API - Returns the plugin registry
// ============================================================================

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the plugin registry
    const registryPath = path.join(process.cwd(), 'plugins', '_registry.json');
    
    if (!fs.existsSync(registryPath)) {
      // Return empty registry if file doesn't exist
      return NextResponse.json({
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        plugins: [],
        categories: {
          content: [],
          data: [],
          visual: [],
          interactive: [],
          social: [],
          media: [],
          layout: [],
          other: [],
        },
      });
    }
    
    const registryContent = fs.readFileSync(registryPath, 'utf-8');
    const registry = JSON.parse(registryContent);
    
    return NextResponse.json(registry);
  } catch (error) {
    console.error('Failed to load plugin registry:', error);
    return NextResponse.json(
      { error: 'Failed to load plugin registry' },
      { status: 500 }
    );
  }
}
