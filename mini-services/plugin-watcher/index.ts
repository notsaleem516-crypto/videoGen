// ============================================================================
// PLUGIN WATCHER SERVICE - Watches plugins directory for changes
// ============================================================================

import { serve } from 'bun';
import fs from 'fs';
import path from 'path';
import { watch } from 'chokidar';

const PORT = 3034;
const PLUGINS_DIR = path.join(process.cwd(), '..', '..', 'plugins');

// ============================================================================
// PLUGIN SCANNER
// ============================================================================

interface PluginInfo {
  id: string;
  path: string;
  type: 'core' | 'custom';
  manifest: Record<string, unknown> | null;
  schema: Record<string, unknown> | null;
  valid: boolean;
  errors: string[];
}

/**
 * Scan a plugin directory and return info
 */
function scanPlugin(pluginPath: string, type: 'core' | 'custom'): PluginInfo {
  const id = path.basename(pluginPath);
  const errors: string[] = [];
  
  // Check for required files
  const manifestPath = path.join(pluginPath, 'plugin.json');
  const schemaPath = path.join(pluginPath, 'schema.json');
  
  let manifest: Record<string, unknown> | null = null;
  let schema: Record<string, unknown> | null = null;
  
  // Read manifest
  if (fs.existsSync(manifestPath)) {
    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      manifest = JSON.parse(content);
    } catch (e) {
      errors.push(`Failed to parse plugin.json: ${e}`);
    }
  } else {
    errors.push('Missing plugin.json');
  }
  
  // Read schema
  if (fs.existsSync(schemaPath)) {
    try {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      schema = JSON.parse(content);
    } catch (e) {
      errors.push(`Failed to parse schema.json: ${e}`);
    }
  } else {
    errors.push('Missing schema.json');
  }
  
  // Validate manifest
  if (manifest) {
    if (!manifest.id) errors.push('Missing id in plugin.json');
    if (!manifest.name) errors.push('Missing name in plugin.json');
    if (!manifest.category) errors.push('Missing category in plugin.json');
    if (!manifest.scene) errors.push('Missing scene in plugin.json');
  }
  
  return {
    id,
    path: pluginPath,
    type,
    manifest,
    schema,
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Scan all plugins in directory
 */
function scanAllPlugins(): PluginInfo[] {
  const plugins: PluginInfo[] = [];
  
  // Scan core plugins
  const coreDir = path.join(PLUGINS_DIR, 'core');
  if (fs.existsSync(coreDir)) {
    const corePlugins = fs.readdirSync(coreDir).filter(f => {
      const p = path.join(coreDir, f);
      return fs.statSync(p).isDirectory();
    });
    
    for (const plugin of corePlugins) {
      const pluginPath = path.join(coreDir, plugin);
      plugins.push(scanPlugin(pluginPath, 'core'));
    }
  }
  
  // Scan custom plugins
  const customDir = path.join(PLUGINS_DIR, 'custom');
  if (fs.existsSync(customDir)) {
    const customPlugins = fs.readdirSync(customDir).filter(f => {
      const p = path.join(customDir, f);
      return fs.statSync(p).isDirectory() && !f.startsWith('.');
    });
    
    for (const plugin of customPlugins) {
      const pluginPath = path.join(customDir, plugin);
      plugins.push(scanPlugin(pluginPath, 'custom'));
    }
  }
  
  return plugins;
}

// ============================================================================
// REGISTRY GENERATOR
// ============================================================================

/**
 * Generate plugin registry from scanned plugins
 */
function generateRegistry(plugins: PluginInfo[]): Record<string, unknown> {
  const categories: Record<string, string[]> = {
    content: [],
    data: [],
    visual: [],
    interactive: [],
    social: [],
    media: [],
    layout: [],
    other: [],
  };
  
  const pluginEntries = plugins
    .filter(p => p.valid && p.manifest)
    .map(p => {
      const category = (p.manifest?.category as string) || 'other';
      if (categories[category]) {
        categories[category].push(p.id);
      } else {
        categories.other.push(p.id);
      }
      
      return {
        id: p.id,
        name: p.manifest?.name,
        path: `./plugins/${p.type}/${p.id}`,
        category: p.manifest?.category || 'other',
        icon: p.manifest?.icon,
        color: p.manifest?.color,
        description: p.manifest?.description,
        version: p.manifest?.version,
        status: p.manifest?.status,
      };
    });
  
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    plugins: pluginEntries,
    categories,
  };
}

/**
 * Write registry to file
 */
function writeRegistry(registry: Record<string, unknown>): void {
  const registryPath = path.join(PLUGINS_DIR, '_registry.json');
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log(`📝 Updated registry at ${registryPath}`);
}

// ============================================================================
// FILE WATCHER
// ============================================================================

let watcher: ReturnType<typeof watch> | null = null;
const connectedClients: Set<WebSocket> = new Set();

/**
 * Start watching plugins directory
 */
function startWatcher(): void {
  console.log('👀 Starting plugin watcher...');
  console.log(`📁 Watching: ${PLUGINS_DIR}`);
  
  watcher = watch([
    path.join(PLUGINS_DIR, 'core', '**/plugin.json'),
    path.join(PLUGINS_DIR, 'core', '**/schema.json'),
    path.join(PLUGINS_DIR, 'custom', '**/plugin.json'),
    path.join(PLUGINS_DIR, 'custom', '**/schema.json'),
  ], {
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });
  
  watcher
    .on('add', (filePath) => {
      console.log(`➕ File added: ${filePath}`);
      rebuildRegistry();
    })
    .on('change', (filePath) => {
      console.log(`📝 File changed: ${filePath}`);
      rebuildRegistry();
    })
    .on('unlink', (filePath) => {
      console.log(`➖ File removed: ${filePath}`);
      rebuildRegistry();
    })
    .on('error', (error) => {
      console.error('❌ Watcher error:', error);
    });
}

/**
 * Rebuild registry and notify clients
 */
function rebuildRegistry(): void {
  console.log('🔄 Rebuilding plugin registry...');
  
  const plugins = scanAllPlugins();
  const registry = generateRegistry(plugins);
  writeRegistry(registry);
  
  // Notify connected clients
  const notification = JSON.stringify({
    type: 'reload',
    timestamp: Date.now(),
    plugins: plugins.map(p => ({
      id: p.id,
      valid: p.valid,
      errors: p.errors,
    })),
  });
  
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(notification);
    }
  }
  
  console.log(`✅ Registry updated: ${plugins.length} plugins`);
}

/**
 * Stop watching
 */
function stopWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('🛑 Plugin watcher stopped');
  }
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
      const plugins = scanAllPlugins();
      return Response.json({
        status: 'ok',
        service: 'plugin-watcher',
        port: PORT,
        pluginsDir: PLUGINS_DIR,
        pluginsCount: plugins.length,
        validPlugins: plugins.filter(p => p.valid).length,
      }, { headers: corsHeaders });
    }
    
    // Get all plugins
    if (url.pathname === '/plugins') {
      const plugins = scanAllPlugins();
      return Response.json({ plugins }, { headers: corsHeaders });
    }
    
    // Get registry
    if (url.pathname === '/registry') {
      const plugins = scanAllPlugins();
      const registry = generateRegistry(plugins);
      return Response.json(registry, { headers: corsHeaders });
    }
    
    // Rebuild registry
    if (url.pathname === '/rebuild' && req.method === 'POST') {
      rebuildRegistry();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // WebSocket for hot reload
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        return undefined;
      }
      return new Response('WebSocket upgrade failed', { status: 500 });
    }
    
    // Default 404
    return Response.json(
      { error: 'Not found', endpoints: ['GET /health', 'GET /plugins', 'GET /registry', 'POST /rebuild', 'GET /ws'] },
      { status: 404, headers: corsHeaders }
    );
  },
  
  websocket: {
    open(ws) {
      connectedClients.add(ws as unknown as WebSocket);
      console.log('🔌 Client connected');
    },
    close(ws) {
      connectedClients.delete(ws as unknown as WebSocket);
      console.log('🔌 Client disconnected');
    },
    message(ws, message) {
      // Handle incoming messages
      console.log('📩 Received:', message);
    },
  },
});

// Start watcher
startWatcher();

console.log(`🚀 Plugin Watcher Service running on port ${PORT}`);
console.log(`📡 Endpoints:`);
console.log(`   GET  /health      - Health check`);
console.log(`   GET  /plugins     - List all plugins`);
console.log(`   GET  /registry    - Get plugin registry`);
console.log(`   POST /rebuild     - Rebuild registry`);
console.log(`   GET  /ws          - WebSocket for hot reload`);

// Initial registry build
rebuildRegistry();
