#!/bin/bash
# Remotion Lambda Setup Script
# Run this once to deploy your site and Lambda function

set -e

echo "🚀 Setting up Remotion Lambda..."

# 1. Deploy the site to S3
echo "📦 Deploying site to S3..."
SITE_NAME="video-renderer-$(date +%s)"
npx remotion lambda sites create \
  --site-name "$SITE_NAME" \
  --bucket-name "remotionlambda-$SITE_NAME"

echo "✅ Site deployed: $SITE_NAME"

# 2. Create the Lambda function
echo "⚡ Creating Lambda function..."
npx remotion lambda functions create \
  --function-name "video-renderer-render" \
  --region us-east-1

echo "✅ Lambda function created!"

echo ""
echo "📋 Configuration to save:"
echo "  SITE_NAME=$SITE_NAME"
echo "  FUNCTION_NAME=video-renderer-render"
echo "  REGION=us-east-1"
echo ""
echo "Add these to your environment variables or .env file."
