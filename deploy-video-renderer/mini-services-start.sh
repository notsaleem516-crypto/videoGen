#!/bin/sh
echo "🚀 Starting video-renderer service..."
cd "$(dirname "$0")"
bun mini-service-video-renderer.js &
echo "✅ Video renderer started on port 3031"
wait
