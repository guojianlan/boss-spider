import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = resolve(rootDir, 'dist');
const srcDir = resolve(rootDir, 'src');

await rm(distDir, { recursive: true, force: true });
await mkdir(resolve(distDir, 'popup'), { recursive: true });
await mkdir(resolve(distDir, 'options'), { recursive: true });

await build({
  entryPoints: [
    resolve(srcDir, 'background/index.ts'),
    resolve(srcDir, 'content/index.ts'),
    resolve(srcDir, 'popup/index.ts'),
    resolve(srcDir, 'options/index.ts')
  ],
  outdir: distDir,
  outbase: srcDir,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  platform: 'browser',
  define: {
    __DEV__: 'false',
    __DEV_SERVER_URL__: '""'
  },
  sourcemap: false,
  logLevel: 'info'
});

await Promise.all([
  cp(resolve(rootDir, 'public/manifest.json'), resolve(distDir, 'manifest.json')),
  cp(resolve(srcDir, 'popup/index.html'), resolve(distDir, 'popup/index.html')),
  cp(resolve(srcDir, 'options/index.html'), resolve(distDir, 'options/index.html'))
]);
