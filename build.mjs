import * as esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(path.dirname(fileURLToPath(import.meta.url)));

const result = await esbuild.build({
  entryPoints: ['src/index.jsx'],
  absWorkingDir: process.cwd(),
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2019'],
  jsx: 'automatic',
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  write: false,
  outfile: 'app.js',
});

const js = result.outputFiles[0].text;
const css = await fs.readFile('src/styles.css', 'utf8');
const manifest = await fs.readFile('src/manifest.json', 'utf8');
const icon = await fs.readFile('src/icon.svg', 'utf8');

const iconDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(icon).toString('base64');
const manifestObj = JSON.parse(manifest);
manifestObj.icons = manifestObj.icons.map((i) => ({ ...i, src: iconDataUrl }));
const manifestDataUrl =
  'data:application/manifest+json;base64,' +
  Buffer.from(JSON.stringify(manifestObj)).toString('base64');

const html = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${manifestObj.name}</title>
<meta name="description" content="A private, offline personal-development challenge tracker. All data stays in this browser." />
<meta name="theme-color" content="#0e2444" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#070c16" media="(prefers-color-scheme: dark)" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="${manifestObj.short_name}" />
<link rel="manifest" href="${manifestDataUrl}" />
<link rel="icon" href="${iconDataUrl}" />
<link rel="apple-touch-icon" href="${iconDataUrl}" />
<style>
${css}
</style>
</head>
<body>
<div id="root"></div>
<noscript>This app needs JavaScript enabled.</noscript>
<script>
${js}
</script>
<script>
// Optional PWA service worker: only registers when the file is served over http(s)
// AND a sibling sw.js exists. Opening the file directly (file://) still works fully
// offline -- the whole app is inside this one file.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
</script>
</body>
</html>
`;

const sw = `/* Optional service worker — only used when the app is SERVED over http(s).
   Opening the .html file directly works offline already; this exists so the app
   can be installed to a phone home screen from a hosted copy. */
const CACHE = 'pdt-v1';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a)))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./')))
  );
});
`;

await fs.writeFile('index.html', html);
await fs.writeFile('sw.js', sw);
await fs.writeFile('manifest.json', JSON.stringify(manifestObj, null, 2));
await fs.copyFile('src/icon.svg', 'icon.svg');
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`built index.html (${kb} KB)`);
