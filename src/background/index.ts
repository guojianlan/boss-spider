import { AutomationRunner } from '../automation/runner';
import type { BackgroundRequest, BackgroundResponse, ContentRequest, ContentResponse } from '../shared/messages';
import type { CandidateEvidence, ExtensionSettings, PageSupportStatus, RunSummary, RuntimeStatus } from '../shared/types';
import { getLastSummary, getSettings, saveSettings } from '../shared/storage';

function isMessageError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

let devReloadScheduled = false;

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    throw new Error('未找到当前活动标签页');
  }
  return tab;
}

async function sendToContent<TResponse extends ContentResponse>(tabId: number, message: ContentRequest): Promise<TResponse> {
  const response = (await chrome.tabs.sendMessage(tabId, message)) as TResponse | undefined;
  if (!response) {
    throw new Error('内容脚本未响应，请刷新页面后重试');
  }
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response;
}

async function requestActivePageStatus(): Promise<PageSupportStatus> {
  const tab = await getActiveTab();
  if (tab.id === undefined) {
    throw new Error('当前标签页无效');
  }
  const response = await sendToContent<{ ok: true; pageStatus: PageSupportStatus }>(tab.id, { type: 'GET_PAGE_STATUS' });
  return response.pageStatus;
}

async function syncDebugModeToActiveTab(enabled: boolean): Promise<void> {
  try {
    const tab = await getActiveTab();
    if (tab.id === undefined) {
      return;
    }
    await sendToContent(tab.id, { type: 'SET_DEBUG_MODE', enabled });
  } catch {
    // Ignore tabs without the content script. Debug mode still persists for supported pages.
  }
}

async function broadcastDevPrepareReload(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) {
        return;
      }

      try {
        await sendToContent(tab.id, { type: 'DEV_PREPARE_RELOAD' });
      } catch {
        // Ignore tabs without our content script.
      }
    })
  );
}

async function scheduleDevReload(): Promise<void> {
  if (!__DEV__ || devReloadScheduled) {
    return;
  }

  devReloadScheduled = true;
  await broadcastDevPrepareReload();
  globalThis.setTimeout(() => {
    chrome.runtime.reload();
  }, 250);
}

const runner = new AutomationRunner({
  getPageStatus: getActiveTab,
  requestPageStatus: async (tabId) => {
    const response = await sendToContent<{ ok: true; pageStatus: PageSupportStatus }>(tabId, { type: 'GET_PAGE_STATUS' });
    return response.pageStatus;
  },
  processCandidate: async (tabId, index) => {
    const response = await sendToContent<{ ok: true; evidence: CandidateEvidence }>(tabId, {
      type: 'PROCESS_CANDIDATE',
      index
    });
    return response.evidence;
  },
  clickFavorite: async (tabId) => {
    const response = await sendToContent<{ ok: true; favorited: boolean }>(tabId, { type: 'CLICK_FAVORITE' });
    return response.favorited;
  },
  captureVisibleTab: async (windowId) => {
    if (windowId === undefined) {
      return chrome.tabs.captureVisibleTab({ format: 'png' });
    }
    return chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  },
  updateOverlay: async (tabId, runtime) => {
    await sendToContent(tabId, { type: 'UPDATE_OVERLAY', runtime });
  },
  showCompletion: async (tabId, summary) => {
    await sendToContent(tabId, { type: 'SHOW_COMPLETION', summary });
  },
  showError: async (tabId, message) => {
    await sendToContent(tabId, { type: 'SHOW_ERROR', message });
  },
  getSettings
});

async function handleRequest(request: BackgroundRequest): Promise<BackgroundResponse> {
  switch (request.type) {
    case 'GET_PAGE_STATUS': {
      const pageStatus = await requestActivePageStatus();
      return { ok: true, pageStatus };
    }
    case 'GET_SETTINGS': {
      const settings = await getSettings();
      return { ok: true, settings };
    }
    case 'SAVE_SETTINGS': {
      await saveSettings(request.settings as ExtensionSettings);
      await syncDebugModeToActiveTab(Boolean(request.settings.debug?.enabled));
      return { ok: true, accepted: true };
    }
    case 'GET_RUNTIME_STATUS': {
      return { ok: true, runtime: runner.getRuntimeStatus() as RuntimeStatus };
    }
    case 'GET_LAST_SUMMARY': {
      const summary = await getLastSummary();
      return { ok: true, summary: summary as RunSummary | null };
    }
    case 'DEV_RELOAD_EXTENSION': {
      await scheduleDevReload();
      return { ok: true, accepted: true };
    }
    case 'START_RUN': {
      void runner.run(request.plan);
      return { ok: true, accepted: true };
    }
    case 'STOP_RUN': {
      runner.requestStop();
      return { ok: true, accepted: true };
    }
    default: {
      throw new Error('未知请求类型');
    }
  }
}

chrome.runtime.onMessage.addListener((request: BackgroundRequest, _sender, sendResponse) => {
  handleRequest(request)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: isMessageError(error) } satisfies BackgroundResponse));
  return true;
});

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings);
});
