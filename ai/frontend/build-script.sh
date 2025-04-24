#!/bin/bash
set -e


# Clean any previous builds
echo "Cleaning previous builds..."
rm -rf dist node_modules/.cache

# Install dependencies
echo "Installing dependencies..."
npm ci || npm install

echo "Installing dev dependencies for building..."
npm install --save-dev gulp@4.0.2 gulp-replace@1.1.4 gulp-inline-source@4.0.0 tailwindcss@3.3.5 postcss@8.4.31 autoprefixer@10.4.16

# Create proper configuration files
echo "Creating proper Tailwind configuration..."

echo "Creating postcss.config.js..."
cat > postcss.config.js << 'EOL'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOL

echo "Creating tailwind.config.js..."
cat > tailwind.config.js << 'EOL'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
EOL

# Fix the styles.css to use correct Tailwind imports
echo "Fixing styles.css..."
cat > src/styles.css << 'EOL'
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles */
body {
  font-family: 'Inter', system-ui, sans-serif;
}
EOL

# Print and verify the current directory structure
echo "Current directory structure:"
ls -la

# Show content of package.json
echo "Content of package.json:"
cat package.json | grep -A 5 -B 5 "build"

# Build the Angular app with debug output
echo "Building Angular app..."
NODE_ENV=production npm run build -- --verbose || {
  echo "Build failed! Checking for errors..."
  # If build fails, try to identify the issue
  echo "Looking for specific errors in the output..."
  # Try a simpler build without inlining
  echo "Trying a simpler build with just ng build..."
  npx ng build --configuration production || {
    echo "Basic Angular build also failed. Angular configuration issue detected."
    echo "Checking angular.json..."
    cat angular.json | grep -A 20 styles
    exit 1
  }
}

# Check if build succeeded by looking for the output directory
if [ -d "dist/frontend/browser" ]; then
  echo "Build succeeded! Output files:"
  ls -la dist/frontend/browser/
  
  # Check for CSS file
  echo "Checking for CSS files:"
  find dist/frontend/browser -name "*.css" -type f
  
  # Check main HTML file
  echo "Checking index.html for style tags:"
  grep -n "<style" dist/frontend/browser/index.html || echo "No <style> tags found in index.html"
  
  echo "Build completed successfully!"
else
  echo "Build failed - no output directory found."
  exit 1
fi
