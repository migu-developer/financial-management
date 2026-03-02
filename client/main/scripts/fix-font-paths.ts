#!/usr/bin/env node

// Reason: This script is used to copy vector-icon fonts
// to dist/fonts so they are deployed
// (Amplify may exclude paths containing node_modules).
/* eslint-disable no-console */

/**
 * Copy vector-icon fonts to dist/fonts so they are deployed (Amplify may exclude paths containing node_modules).
 * Replace asset paths in JS bundles so the browser requests /fonts/ instead of /assets/__node_modules/...
 * Usage: tsx scripts/fix-font-paths.ts [distPath]
 *   distPath defaults to ./dist when run from client/main.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const nodeModulesFontsRegex = /\/assets\/__node_modules\/[^"]*Fonts\//g;

function copyFonts(dir: string, fontsDir: string): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      copyFonts(full, fontsDir);
    } else if (e.isFile() && /\.(ttf|otf)$/i.test(e.name)) {
      fs.copyFileSync(full, path.join(fontsDir, e.name));
    }
  }
}

function processFile(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('__node_modules')) return;
  content = content.replace(nodeModulesFontsRegex, '/fonts/');
  fs.writeFileSync(filePath, content, 'utf8');
}

function walkJs(dir: string): void {
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

/**
 * Run the fix: copy fonts to dist/fonts and replace paths in JS bundles.
 * Exported for testing.
 */
export function runFixFontPaths(distPath: string): void {
  const fontsDir = path.join(distPath, 'fonts');
  const nodeModulesAssets = path.join(distPath, 'assets', '__node_modules');

  if (!fs.existsSync(distPath)) {
    console.warn('fix-font-paths: dist path does not exist:', distPath);
    return;
  }

  if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
  }

  copyFonts(nodeModulesAssets, fontsDir);
  walkJs(distPath);
}

function main(): void {
  const distPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(root, 'dist');
  runFixFontPaths(distPath);
}

const isEntry =
  (typeof require !== 'undefined' && require.main === module) ||
  path.basename(process.argv[1] ?? '') === 'fix-font-paths.ts';
if (isEntry) main();
