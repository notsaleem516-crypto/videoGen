# Plugin Server

Lightweight service that acts as a distribution layer between a plugin store and renderers.

## Responsibilities

- Ingest plugin bundles from a source location (`sourceBundlePath`).
- Persist bundles in a local plugin-store (`mini-services/plugin-server/plugin-store` (persistent on service restart)).
- Expose versioned bundle URLs to render services.
- Return plugin metadata (`latestVersion`, hash, publishedAt).

## Endpoints

- `GET /health`
- `POST /plugins/publish`
- `GET /plugins/:pluginId`
- `GET /plugins/:pluginId/:version`
- `GET /bundles/:pluginId/:version`

## Run

```bash
bun run mini-services/plugin-server/index.ts
```

## Publish

```bash
curl -X POST http://127.0.0.1:3040/plugins/publish \
  -H 'content-type: application/json' \
  -d '{
    "pluginId":"marketplace.default",
    "version":"v1",
    "sourceBundlePath":"mini-services/video-renderer/bundle"
  }'
```
