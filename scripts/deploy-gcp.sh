#!/bin/bash
# Deploy Video Renderer to Google Cloud GPU VM
# Usage: ./scripts/deploy-gcp.sh [PROJECT_ID]

set -e

PROJECT_ID=${1:-$(gcloud config get-value project)}
REGION="us-central1"
ZONE="${REGION}-a"
INSTANCE_NAME="video-renderer-vm"
MACHINE_TYPE="n1-standard-4"
GPU_TYPE="nvidia-tesla-t4"
GPU_COUNT=1
BUCKET_NAME="video-renderer-assets-${PROJECT_ID}"

echo "🚀 Deploying Video Renderer to Google Cloud..."
echo "📋 Project: ${PROJECT_ID}"
echo "🖼️ Zone: ${ZONE}"

# 1. Enable required APIs
echo "🔌 Enabling APIs..."
gcloud services enable compute.googleapis.com container.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# 2. Create storage bucket for bundle
echo "📦 Creating storage bucket..."
gsutil mb -l ${REGION} gs://${BUCKET_NAME} 2>/dev/null || echo "Bucket already exists"

# 3. Upload bundle to GCS
echo "📤 Uploading bundle to Cloud Storage..."
gsutil rsync -r ./videoGen/bundle gs://${BUCKET_NAME}/bundle/

# 4. Create startup script
echo "📝 Creating startup script..."
gcloud compute instances add-tags ${INSTANCE_NAME} --tags=http-server,https-server --zone=${ZONE} 2>/dev/null || true

# 5. Create the GPU VM with container deployment
echo "🖥️ Creating GPU VM..."

# Check if instance exists
if gcloud compute instances describe ${INSTANCE_NAME} --zone=${ZONE} &>/dev/null; then
    echo "⚠️ Instance exists, updating..."
    gcloud compute instances delete ${INSTANCE_NAME} --zone=${ZONE} --quiet
fi

gcloud compute instances create ${INSTANCE_NAME} \
    --zone=${ZONE} \
    --machine-type=${MACHINE_TYPE} \
    --accelerator=type=${GPU_TYPE},count=${GPU_COUNT} \
    --boot-disk-size=100GB \
    --boot-disk-type=pd-ssd \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --service-account=${PROJECT_ID}-compute@developer.gserviceaccount.com \
    --scopes=cloud-platform \
    --metadata=startup-script-url=gs://${BUCKET_NAME}/scripts/gcp-startup.sh,bundle-url=gs://${BUCKET_NAME}/bundle

# 6. Upload startup script to GCS
gsutil cp scripts/gcp-startup.sh gs://${BUCKET_NAME}/scripts/gcp-startup.sh

# 7. Wait for VM to be ready
echo "⏳ Waiting for VM to start..."
sleep 30

# 8. Get external IP
IP=$(gcloud compute instances describe ${INSTANCE_NAME} --zone=${ZONE} --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "✅ Deployment complete!"
echo "🌐 Video Renderer URL: http://${IP}:3031"
echo "📊 Health Check: http://${IP}:3031/health"
