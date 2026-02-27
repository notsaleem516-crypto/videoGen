#!/bin/bash
cd "$(dirname "$0")"
export BUNDLE_PATH="./bundle"
bun mini-service-video-renderer.js
