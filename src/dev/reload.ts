import type { BackgroundRequest } from '../shared/messages';

const DEV_POLL_INTERVAL_MS = 1000;

interface DevBuildInfo {
  version: string;
  builtAt: string;
}

let startedWatchers = new Set<string>();

async function fetchBuildInfo(): Promise<DevBuildInfo | null> {
  if (!__DEV__ || !__DEV_SERVER_URL__) {
    return null;
  }

  const response = await fetch(`${__DEV_SERVER_URL__}/__boss_spider__/build-info?t=${Date.now()}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`dev server unavailable: ${response.status}`);
  }

  return (await response.json()) as DevBuildInfo;
}

function startWatcher(id: string, onChange: (buildInfo: DevBuildInfo) => void | Promise<void>): void {
  if (!__DEV__ || startedWatchers.has(id)) {
    return;
  }

  startedWatchers.add(id);
  let lastVersion: string | null = null;
  let inFlight = false;

  globalThis.setInterval(() => {
    if (inFlight) {
      return;
    }

    inFlight = true;
    void fetchBuildInfo()
      .then(async (buildInfo) => {
        if (!buildInfo) {
          return;
        }

        if (lastVersion === null) {
          lastVersion = buildInfo.version;
          return;
        }

        if (buildInfo.version === lastVersion) {
          return;
        }

        lastVersion = buildInfo.version;
        await onChange(buildInfo);
      })
      .catch(() => {
        // Keep polling quietly while the local dev server restarts.
      })
      .finally(() => {
        inFlight = false;
      });
  }, DEV_POLL_INTERVAL_MS);
}

export function startExtensionPageDevWatcher(pageId: string): void {
  startWatcher(`page:${pageId}`, () => {
    globalThis.setTimeout(() => {
      location.reload();
    }, 1200);

    const request: BackgroundRequest = { type: 'DEV_RELOAD_EXTENSION' };
    void chrome.runtime.sendMessage(request).catch(() => {
      // The extension may already be reloading.
    });
  });
}

export function startContentScriptDevWatcher(): void {
  startWatcher('content', () => {
    const request: BackgroundRequest = { type: 'DEV_RELOAD_EXTENSION' };
    void chrome.runtime.sendMessage(request).catch(() => {
      // Ignore if the background is already going away.
    });
  });
}
