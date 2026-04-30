#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const SOURCE_FILE = path.join(ROOT, 'index.source.html');
const TARGET_FILE = path.join(ROOT, 'index.html');

function buildInlineHtml() {
  let source = fs.readFileSync(SOURCE_FILE, 'utf-8');

  source = source.replace(
    /<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g,
    (match, href) => {
      const filePath = path.join(ROOT, href);
      if (!fs.existsSync(filePath)) {
        console.warn(`WARNING: CSS file not found: ${filePath}`);
        return match;
      }
      const css = fs.readFileSync(filePath, 'utf-8');
      return `<style>\n${css}\n  </style>`;
    }
  );

  source = source.replace(
    /<script\s+src="([^"]+)"\s*><\/script>/g,
    (match, src) => {
      const filePath = path.join(ROOT, src);
      if (!fs.existsSync(filePath)) {
        console.warn(`WARNING: JS file not found: ${filePath}`);
        return match;
      }
      const js = fs.readFileSync(filePath, 'utf-8');
      return `<script>\n${path.basename(src)} */\n${js}\n  </script>`;
    }
  );

  return source;
}

const result = buildInlineHtml();
fs.writeFileSync(TARGET_FILE, result, 'utf-8');
console.log(`Synced index.source.html -> index.html (${result.split('\n').length} lines)`);
