#!/usr/bin/env node
/** Yerel sunucu üzerinde statik dosya + JS import zinciri smoke test */
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8080';

const PATHS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/sw.js',
  '/styles/main.css',
  '/styles/tokens.css',
  '/styles/_base.css',
  '/styles/motion.css',
  '/js/main.js',
  '/js/app.js',
  '/js/config.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

const JS_MODULES = [
  '/js/utils/sanitize.js',
  '/js/utils/markdown.js',
  '/js/services/storage.js',
  '/js/services/offlineQueue.js',
  '/js/services/gemini.js',
  '/js/dom/messageRenderer.js',
  '/js/dom/virtualList.js',
  '/js/features/theme.js',
  '/js/features/pwa.js',
  '/js/features/speech.js',
  '/js/features/modal.js',
];

async function check(path) {
  const url = BASE + path;
  const res = await fetch(url);
  const ok = res.ok;
  const ct = res.headers.get('content-type') || '';
  return { path, ok, status: res.status, ct, size: res.headers.get('content-length') };
}

async function main() {
  let failed = 0;
  console.log('Smoke test:', BASE, '\n');

  for (const p of [...PATHS, ...JS_MODULES]) {
    const r = await check(p);
    const mark = r.ok ? 'OK' : 'FAIL';
    if (!r.ok) failed++;
    console.log(`${mark} ${r.status} ${p} (${r.ct})`);
  }

  const html = await (await fetch(BASE + '/index.html')).text();
  const checks = [
    ['type="module"', html.includes('type="module"')],
    ['chatMessages', html.includes('id="chatMessages"')],
    ['manifest.webmanifest', html.includes('manifest.webmanifest')],
    ['no icon.png', !html.includes('icon.png')],
    ['no apple-touch duplicate', !html.includes('apple-touch-icon.png')],
    ['no maskable-512 file ref', !html.includes('icon-maskable-512')],
  ];
  console.log('\nHTML checks:');
  for (const [name, pass] of checks) {
    if (!pass) failed++;
    console.log(`${pass ? 'OK' : 'FAIL'} ${name}`);
  }

  const sw = await (await fetch(BASE + '/sw.js')).text();
  if (sw.includes('apple-touch-icon')) {
    console.log('FAIL sw still references apple-touch-icon');
    failed++;
  } else {
    console.log('OK sw precache clean');
  }

  console.log(failed ? `\n${failed} FAILED` : '\nAll passed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
