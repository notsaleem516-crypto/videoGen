# Video Renderer Service

## Deployment Instructions

1. Install dependencies:
   ```bash
   bun install
   ```

2. Start the service:
   ```bash
   bun start
   ```

The service runs on port 3031.

## Endpoints

- GET /health - Health check
- POST /render - Render with pre-calculated props
- POST /render-full - Full render from raw input

## Requirements

- Bun runtime
- Chrome/Chromium (bundled with Remotion)
