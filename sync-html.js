#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const SOURCE_FILE = path.join(ROOT, 'index.source.html');
const WEB_INDEX_FILE = path.join(ROOT, 'index.html');
const ANDROID_ASSETS = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets');
const ANDROID_INDEX_FILE = path.join(ANDROID_ASSETS, 'index.html');

const SUPPORT_FILES = ['manifest.json', 'sw.js', 'icon-512.png'];
const SUPPORT_DIRS = ['css', 'js', 'data'];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(source, target) {
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function copyDir(source, target) {
  if (!fs.existsSync(source)) return;
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      copyFile(from, to);
    }
  }
}

if (!fs.existsSync(SOURCE_FILE)) {
  throw new Error(`Missing source file: ${SOURCE_FILE}`);
}

const source = fs.readFileSync(SOURCE_FILE, 'utf-8');
fs.writeFileSync(WEB_INDEX_FILE, source, 'utf-8');
copyFile(SOURCE_FILE, ANDROID_INDEX_FILE);

for (const file of SUPPORT_FILES) {
  const sourcePath = path.join(ROOT, file);
  if (fs.existsSync(sourcePath)) {
    copyFile(sourcePath, path.join(ANDROID_ASSETS, file));
  }
}

for (const dir of SUPPORT_DIRS) {
  copyDir(path.join(ROOT, dir), path.join(ANDROID_ASSETS, dir));
}

console.log('Synced index.source.html as the app entry point.');
console.log(`Web index: ${WEB_INDEX_FILE}`);
console.log(`Android asset index: ${ANDROID_INDEX_FILE}`);
