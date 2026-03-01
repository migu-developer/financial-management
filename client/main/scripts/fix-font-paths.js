#!/usr/bin/env node

/**
 * Copy vector-icon fonts to dist/fonts so they are deployed (Amplify may exclude paths containing node_modules).
 * Replace asset paths in JS bundles so the browser requests /fonts/ instead of /assets/__node_modules/...
 * Usage: node scripts/fix-font-paths.js [distPath]
 *   distPath defaults to ./dist when run from client/main.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const distPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'dist');

const fontsDir = path.join(distPath, 'fonts');
const nodeModulesAssets = path.join(distPath, 'assets', '__node_modules');

if (!fs.existsSync(distPath)) {
  console.warn('fix-font-paths: dist path does not exist:', distPath);
  process.exit(0);
}

// Create dist/fonts
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Copy all .ttf/.otf from __node_modules to dist/fonts
function copyFonts(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      copyFonts(full);
    } else if (e.isFile() && /\.(ttf|otf)$/i.test(e.name)) {
      fs.copyFileSync(full, path.join(fontsDir, e.name));
    }
  }
}
copyFonts(nodeModulesAssets);

// Replace /assets/__node_modules/.../Fonts/ with /fonts/ in JS bundles
const nodeModulesFontsRegex = /\/assets\/__node_modules\/[^"]*Fonts\//g;
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('__node_modules')) return;
  content = content.replace(nodeModulesFontsRegex, '/fonts/');
  fs.writeFileSync(filePath, content, 'utf8');
}

function walkJs(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkJs(full);
    } else if (e.isFile() && e.name.endsWith('.js')) {
      processFile(full);
    }
  }
}
walkJs(distPath);
