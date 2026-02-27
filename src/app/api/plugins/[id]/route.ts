// ============================================================================
// PLUGINS API - Individual plugin endpoints
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET /api/plugins/[id] - Get plugin by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Find plugin directory
    const pluginsDir = path.join(process.cwd(), 'plugins');
    const coreDir = path.join(pluginsDir, 'core', id);
    const customDir = path.join(pluginsDir, 'custom', id);
    
    let pluginDir: string | null = null;
    
    if (fs.existsSync(coreDir)) {
      pluginDir = coreDir;
    } else if (fs.existsSync(customDir)) {
      pluginDir = customDir;
    }
    
    if (!pluginDir) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      );
    }
    
    // Read plugin manifest
    const manifestPath = path.join(pluginDir, 'plugin.json');
    if (!fs.existsSync(manifestPath)) {
      return NextResponse.json(
        { error: 'Plugin manifest not found' },
        { status: 404 }
      );
    }
    
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    // Read schema
    const schemaPath = path.join(pluginDir, 'schema.json');
    let schema = {};
    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      schema = JSON.parse(schemaContent);
    }
    
    // Return plugin definition
    return NextResponse.json({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      category: manifest.category,
      icon: manifest.icon,
      color: manifest.color,
      description: manifest.description,
      schema,
      defaults: schema.defaults || {},
      remotion: manifest.remotion,
      features: manifest.features,
    });
  } catch (error) {
    console.error('Failed to load plugin:', error);
    return NextResponse.json(
      { error: 'Failed to load plugin' },
      { status: 500 }
    );
  }
}
