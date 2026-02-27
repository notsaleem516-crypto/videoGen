// ============================================================================
// PLUGIN SCHEMA API - Returns schema for a specific plugin
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
    
    // Read schema
    const schemaPath = path.join(pluginDir, 'schema.json');
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json(
        { error: 'Schema not found' },
        { status: 404 }
      );
    }
    
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);
    
    return NextResponse.json(schema);
  } catch (error) {
    console.error('Failed to load schema:', error);
    return NextResponse.json(
      { error: 'Failed to load schema' },
      { status: 500 }
    );
  }
}
