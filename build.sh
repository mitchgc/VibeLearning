#!/bin/bash

echo "🚀 Building VibeLearning Extension..."

# Navigate to extension directory
cd extension

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create dist directory
mkdir -p dist

# Copy static files directly (no webpack for now)
echo "📂 Copying files..."

# Copy manifest
cp manifest.json dist/

# Copy public folder
cp -r public dist/

# Copy icons (create placeholder if missing)
if [ ! -d "icons" ]; then
    mkdir icons
    # Create a simple SVG icon as placeholder
    cat > icons/icon16.png << 'EOF'
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <rect width="16" height="16" fill="#4CAF50" rx="3"/>
  <text x="8" y="12" text-anchor="middle" fill="white" font-size="12" font-family="Arial">V</text>
</svg>
EOF
fi
cp -r icons dist/ 2>/dev/null || echo "Icons folder not found, using defaults"

# Copy styles
mkdir -p dist/src/styles
cp -r src/styles dist/src/

# Copy source files directly (simplified build)
mkdir -p dist/src
cp src/*.js dist/src/

echo "✅ Build complete! Extension files are in extension/dist/"
echo ""
echo "📋 To load in Chrome:"
echo "1. Open chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked'"
echo "4. Select the extension/dist folder"
echo ""
echo "🔧 Backend setup:"
echo "cd backend && npm install && npm start"