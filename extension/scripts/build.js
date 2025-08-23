#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Clean and build
console.log('🧹 Cleaning dist directory...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}

console.log('🔨 Building extension...');
execSync('npm run build:vite', { stdio: 'inherit' });

console.log('📁 Copying additional assets...');
// Ensure CSS files are copied
const stylesDir = 'dist/src/styles';
if (!fs.existsSync(stylesDir)) {
  fs.mkdirSync(stylesDir, { recursive: true });
}

// Copy overlay.css
fs.copyFileSync('src/styles/overlay.css', 'dist/src/styles/overlay.css');
console.log('✅ Copied overlay.css');

// Copy any other necessary files
if (fs.existsSync('src/styles/shepherd-theme.css')) {
  fs.copyFileSync('src/styles/shepherd-theme.css', 'dist/src/styles/shepherd-theme.css');
  console.log('✅ Copied shepherd-theme.css');
}

console.log('✨ Build complete! Load dist/ folder in Chrome.');