#!/bin/bash
cd "$(dirname "$0")"
bun install 2>/dev/null
bun start
