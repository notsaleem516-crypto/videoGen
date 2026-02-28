# Video Renderer Service - EC2 Deployment

## Requirements

- **OS**: Ubuntu 22.04+ or Amazon Linux 2023
- **Runtime**: Bun (https://bun.sh)
- **Port**: 3031
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: 10GB+ for temporary video files

## Quick Deploy

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 2. Install dependencies
bun install

# 3. Start the service
bun start
```

## Run as Background Service (PM2)

```bash
# Install pm2
npm install -g pm2

# Start with pm2
pm2 start "bun start" --name video-renderer

# Save pm2 config
pm2 save
pm2 startup
```

## Endpoints

- **Health**: GET /health
- **Render**: POST /render
- **Full Render**: POST /render-full

## Example Request

```bash
curl -X POST http://YOUR-EC2-IP:3031/render-full \
  -H "Content-Type: application/json" \
  -d '{
    "videoMeta": {
      "aspectRatio": "9:16",
      "theme": "dark_modern",
      "fps": 30
    },
    "contentBlocks": [
      {
        "type": "stat",
        "heading": "Revenue",
        "value": "$1M"
      }
    ]
  }' --output video.mp4
```

## Security Group (AWS)

Open port 3031 in your EC2 security group:
- Type: Custom TCP
- Port: 3031
- Source: Your IP or 0.0.0.0/0 (public)
