import { serve } from 'bun';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';

const PORT = Number(process.env.PLUGIN_SERVER_PORT || 3040);
const HOST = process.env.PLUGIN_SERVER_HOST || 'http://127.0.0.1';
const STORE_ROOT = path.resolve(import.meta.dir, 'plugin-store');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type PluginRecord = {
  pluginId: string;
  version: string;
  bundleDir: string;
  hash: string;
  publishedAt: string;
};

const pluginIndex = new Map<string, PluginRecord[]>();

const PluginIdSchema = z.string().min(2).regex(/^[a-zA-Z0-9._-]+$/);
const VersionSchema = z.string().min(1).regex(/^[a-zA-Z0-9._-]+$/);

const PublishPluginSchema = z.object({
  pluginId: PluginIdSchema,
  version: VersionSchema.default('latest'),
  sourceBundlePath: z.string().min(1),
});

const ensureDir = (target: string) => {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
};

const copyDir = (source: string, destination: string) => {
  ensureDir(destination);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dest = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
      continue;
    }
    fs.copyFileSync(src, dest);
  }
};

const computeDirHash = (dir: string): string => {
  const hash = crypto.createHash('sha256');
  const walk = (current: string) => {
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      hash.update(entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        hash.update(fs.readFileSync(fullPath));
      }
    }
  };
  walk(dir);
  return hash.digest('hex');
};

const getBundleUrl = (pluginId: string, version: string) => `${HOST}:${PORT}/bundles/${pluginId}/${version}`;

const upsertRecord = (record: PluginRecord) => {
  const existing = pluginIndex.get(record.pluginId) || [];
  pluginIndex.set(record.pluginId, [record, ...existing.filter((entry) => entry.version !== record.version)]);
};

const metadataPath = (bundleDir: string) => path.join(bundleDir, '.plugin-meta.json');

const writeMetadata = (record: PluginRecord) => {
  fs.writeFileSync(metadataPath(record.bundleDir), JSON.stringify(record, null, 2));
};

const loadFromDisk = () => {
  ensureDir(STORE_ROOT);

  for (const pluginId of fs.readdirSync(STORE_ROOT)) {
    const pluginDir = path.join(STORE_ROOT, pluginId);
    if (!fs.statSync(pluginDir).isDirectory()) continue;

    for (const version of fs.readdirSync(pluginDir)) {
      const bundleDir = path.join(pluginDir, version);
      if (!fs.statSync(bundleDir).isDirectory()) continue;

      const metaFile = metadataPath(bundleDir);
      let record: PluginRecord;
      if (fs.existsSync(metaFile)) {
        record = JSON.parse(fs.readFileSync(metaFile, 'utf8')) as PluginRecord;
      } else {
        record = {
          pluginId,
          version,
          bundleDir,
          hash: computeDirHash(bundleDir),
          publishedAt: new Date(fs.statSync(bundleDir).mtimeMs).toISOString(),
        };
        writeMetadata(record);
      }
      upsertRecord(record);
    }
  }
};

const publishPlugin = (pluginId: string, version: string, sourceBundlePath: string): PluginRecord => {
  const resolvedSource = path.resolve(sourceBundlePath);
  if (!fs.existsSync(resolvedSource)) {
    throw new Error(`Source bundle path not found: ${resolvedSource}`);
  }

  const destination = path.join(STORE_ROOT, pluginId, version);
  if (fs.existsSync(destination)) {
    fs.rmSync(destination, { recursive: true, force: true });
  }

  copyDir(resolvedSource, destination);
  const hash = computeDirHash(destination);

  const record: PluginRecord = {
    pluginId,
    version,
    bundleDir: destination,
    hash,
    publishedAt: new Date().toISOString(),
  };

  writeMetadata(record);
  upsertRecord(record);
  return record;
};

loadFromDisk();

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', service: 'plugin-server', plugins: pluginIndex.size, storeRoot: STORE_ROOT }, { headers: CORS_HEADERS });
    }

    if (url.pathname === '/plugins/publish' && req.method === 'POST') {
      try {
        const body = await req.json();
        const parsed = PublishPluginSchema.parse(body);
        const record = publishPlugin(parsed.pluginId, parsed.version, parsed.sourceBundlePath);

        return Response.json({
          success: true,
          pluginId: record.pluginId,
          version: record.version,
          hash: record.hash,
          bundleUrl: getBundleUrl(record.pluginId, record.version),
          publishedAt: record.publishedAt,
        }, { headers: CORS_HEADERS });
      } catch (error) {
        return Response.json({ error: 'Failed to publish plugin bundle', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 400, headers: CORS_HEADERS });
      }
    }

    const pluginVersionMatch = url.pathname.match(/^\/plugins\/([^/]+)\/([^/]+)$/);
    if (pluginVersionMatch && req.method === 'GET') {
      const pluginId = PluginIdSchema.parse(pluginVersionMatch[1]);
      const version = VersionSchema.parse(pluginVersionMatch[2]);
      const versions = pluginIndex.get(pluginId) || [];
      const entry = versions.find((item) => item.version === version);
      if (!entry) {
        return Response.json({ error: `Plugin version not found: ${pluginId}@${version}` }, { status: 404, headers: CORS_HEADERS });
      }

      return Response.json({
        pluginId,
        version,
        bundleUrl: getBundleUrl(pluginId, version),
        hash: entry.hash,
        publishedAt: entry.publishedAt,
      }, { headers: CORS_HEADERS });
    }

    const pluginMatch = url.pathname.match(/^\/plugins\/([^/]+)$/);
    if (pluginMatch && req.method === 'GET') {
      const pluginId = PluginIdSchema.parse(pluginMatch[1]);
      const versions = pluginIndex.get(pluginId) || [];
      const latest = versions[0];
      if (!latest) {
        return Response.json({ error: `Plugin not found: ${pluginId}` }, { status: 404, headers: CORS_HEADERS });
      }

      return Response.json({
        pluginId,
        latestVersion: latest.version,
        bundleUrl: getBundleUrl(pluginId, latest.version),
        versions: versions.map((entry) => ({ version: entry.version, hash: entry.hash, publishedAt: entry.publishedAt })),
      }, { headers: CORS_HEADERS });
    }

    if (url.pathname.startsWith('/bundles/')) {
      const relativePath = url.pathname.replace(/^\/bundles\//, '');
      const filePath = path.join(STORE_ROOT, relativePath);
      const normalizedPath = path.normalize(filePath);

      if (!normalizedPath.startsWith(`${STORE_ROOT}${path.sep}`) && normalizedPath !== STORE_ROOT) {
        return Response.json({ error: 'Invalid bundle path' }, { status: 400, headers: CORS_HEADERS });
      }

      if (!fs.existsSync(normalizedPath)) {
        return Response.json({ error: 'Bundle path not found' }, { status: 404, headers: CORS_HEADERS });
      }

      const stat = fs.statSync(normalizedPath);
      if (stat.isDirectory()) {
        const entries = fs.readdirSync(normalizedPath);
        if (entries.includes('index.html')) {
          return new Response(Bun.file(path.join(normalizedPath, 'index.html')), { headers: CORS_HEADERS });
        }
        return Response.json({ directory: relativePath, files: entries }, { headers: CORS_HEADERS });
      }

      return new Response(Bun.file(normalizedPath), { headers: CORS_HEADERS });
    }

    return Response.json({
      error: 'Not found',
      endpoints: [
        'GET /health',
        'POST /plugins/publish',
        'GET /plugins/:pluginId',
        'GET /plugins/:pluginId/:version',
        'GET /bundles/:pluginId/:version',
      ],
    }, { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`🔌 Plugin server running on ${HOST}:${PORT}`);
console.log(`📦 Plugin store root: ${STORE_ROOT}`);
