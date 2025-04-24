#!/bin/bash
set -e

echo "Starting build process for AI Frontend..."

# Clean any previous builds
echo "Cleaning previous builds..."
rm -rf dist node_modules/.cache

# Install dependencies
echo "Installing dependencies..."
npm ci || npm install

# Build the Angular app
echo "Building Angular app..."
npm run build

# Check if build succeeded by looking for the output directory
if [ -d "dist/frontend/browser" ]; then
  echo "Build succeeded! Output files:"
  ls -la dist/frontend/browser/
  
  # Check for inlined styles and scripts
  echo "Checking index.html for style tags:"
  grep -n "<style" dist/frontend/browser/index.html || echo "No <style> tags found in index.html"
  
  echo "Checking index.html for script tags:"
  grep -n "<script" dist/frontend/browser/index.html || echo "No <script> tags found in index.html"
  
  echo "Build completed successfully!"
else
  echo "Build failed - no output directory found."
  exit 1
fi