#!/bin/bash
# Startup script for Video Renderer VM on Google Cloud
# This script runs on VM startup to deploy the container

set -e

echo "🚀 Starting Video Renderer deployment..."

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
fi

# Install NVIDIA Docker runtime
echo "🔧 Installing NVIDIA Docker runtime..."
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/nvidia-docker/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-docker-keyring.gpg
curl -fsSL "https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list" | \
    sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-docker2

# Configure Docker to use NVIDIA runtime
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
    "default-runtime": "nvidia",
    "runtimes": {
        "nvidia": {
            "path": "nvidia-container-runtime",
            "runtimeArgs": []
        }
    }
}
EOF

sudo systemctl restart docker

# Pull latest image from GCR (or use local if specified)
IMAGE_NAME=${1:-"gcr.io/PROJECT_ID/video-renderer:latest"}
echo "📥 Pulling image: $IMAGE_NAME"

# Try to pull, if fails use local build
if docker pull $IMAGE_NAME 2>/dev/null; then
    echo "✅ Image pulled successfully"
else
    echo "⚠️ Could not pull image, will use existing local image"
fi

# Run the container
echo "🚀 Starting Video Renderer container..."
docker run -d \
    --name video-renderer \
    --gpus all \
    -p 3031:3031 \
    -v /bundle:/app/bundle:ro \
    --restart unless-stopped \
    $IMAGE_NAME

echo "✅ Video Renderer deployed successfully!"
echo "🌐 Service available at: http://localhost:3031"
