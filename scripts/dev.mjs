import { context } from 'esbuild';
import { createServer } from 'node:http';
import { watch } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = resolve(rootDir, 'dist');
const srcDir = resolve(rootDir, 'src');
const devPort = Number(process.env.BOSS_SPIDER_DEV_PORT || 3456);
const devServerUrl = `http://localhost:${devPort}`;
const staticFiles = [
  resolve(rootDir, 'public/manifest.json'),
  resolve(srcDir, 'popup/index.html'),
  resolve(srcDir, 'options/index.html')
];

let buildVersion = `${Date.now()}`;
let builtAt = new Date().toISOString();
let disposed = false;

async function prepareDist() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(resolve(distDir, 'popup'), { recursive: true });
  await mkdir(resolve(distDir, 'options'), { recursive: true });
}

async function copyStaticAssets() {
  await Promise.all([
    cp(resolve(rootDir, 'public/manifest.json'), resolve(distDir, 'manifest.json')),
    cp(resolve(srcDir, 'popup/index.html'), resolve(distDir, 'popup/index.html')),
    cp(resolve(srcDir, 'options/index.html'), resolve(distDir, 'options/index.html'))
  ]);
}

function markBuildComplete(source) {
  buildVersion = `${Date.now()}`;
  builtAt = new Date().toISOString();
  console.log(`[dev] ${source} updated at ${builtAt}`);
}

function createBuildInfoServer() {
  return createServer((request, response) => {
    if (request.url?.startsWith('/__boss_spider__/build-info')) {
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      response.end(JSON.stringify({ version: buildVersion, builtAt }));
      return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  });
}

const copyStaticAssetsPlugin = {
  name: 'copy-static-assets',
  setup(buildContext) {
    buildContext.onEnd(async (result) => {
      if (result.errors.length > 0 || disposed) {
        return;
      }

      await copyStaticAssets();
      markBuildComplete('bundle');
    });
  }
};

await prepareDist();

const server = createBuildInfoServer();
server.listen(devPort, () => {
  console.log(`[dev] build info server listening on ${devServerUrl}`);
});

const ctx = await context({
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
    __DEV__: 'true',
    __DEV_SERVER_URL__: JSON.stringify(devServerUrl)
  },
  sourcemap: false,
  logLevel: 'info',
  plugins: [copyStaticAssetsPlugin]
});

await ctx.watch();
console.log('[dev] esbuild watch started');
console.log('[dev] load the unpacked extension from dist/ once, then keep this process running');

const watchers = staticFiles.map((filePath) =>
  watch(filePath, async () => {
    if (disposed) {
      return;
    }

    try {
      await copyStaticAssets();
      markBuildComplete(filePath.replace(`${rootDir}/`, ''));
    } catch (error) {
      console.error(`[dev] failed to copy static asset ${filePath}`, error);
    }
  })
);

async function dispose() {
  if (disposed) {
    return;
  }

  disposed = true;
  for (const watcher of watchers) {
    watcher.close();
  }

  await ctx.dispose();
  await new Promise((resolve) => server.close(resolve));
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    void dispose().finally(() => {
      process.exit(0);
    });
  });
}
