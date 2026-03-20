import type { ContentRequest, ContentResponse } from '../shared/messages';
import { startContentScriptDevWatcher } from '../dev/reload';
import { pushDebugLog, syncDebugTools } from './debugTools';
import { showCompletionToast, showErrorToast, renderRuntimeOverlay } from './overlay';
import { bossAdapter, type BossAdapter } from '../sites/boss/adapter';
import { jobsAdapter, type JobsAdapter } from '../sites/jobs/adapter';

function ok<T extends ContentResponse>(payload: T): T {
  return payload;
}

function resolveAdapter(): BossAdapter | JobsAdapter | null {
  if (location.pathname.startsWith('/web/geek/jobs')) {
    return jobsAdapter;
  }

  if (location.hostname.endsWith('zhipin.com')) {
    return bossAdapter;
  }

  return null;
}

async function handleRequest(request: ContentRequest): Promise<ContentResponse> {
  const adapter = resolveAdapter();

  switch (request.type) {
    case 'GET_PAGE_STATUS':
      return adapter ? ok({ ok: true, pageStatus: adapter.getPageStatus() }) : { ok: false, error: '当前页面暂不支持' };
    case 'PROCESS_CANDIDATE':
      if (!adapter) {
        return { ok: false, error: '当前页面暂不支持处理列表项' };
      }
      return ok({ ok: true, evidence: await adapter.processCandidate(request.index) });
    case 'CLICK_FAVORITE':
      if (!adapter) {
        return { ok: false, error: '当前页面暂不支持收藏动作' };
      }
      return ok({ ok: true, favorited: await adapter.clickFavorite() });
    case 'DEV_PREPARE_RELOAD':
      globalThis.setTimeout(() => {
        location.reload();
      }, 900);
      return ok({ ok: true });
    case 'SET_DEBUG_MODE':
      syncDebugTools(request.enabled);
      return ok({ ok: true });
    case 'PUSH_DEBUG_LOG':
      pushDebugLog(request.entry);
      return ok({ ok: true });
    case 'UPDATE_OVERLAY':
      renderRuntimeOverlay(request.runtime);
      return ok({ ok: true });
    case 'SHOW_COMPLETION':
      showCompletionToast(request.summary);
      return ok({ ok: true });
    case 'SHOW_ERROR':
      showErrorToast(request.message);
      return ok({ ok: true });
    default:
      return { ok: false, error: '未知内容脚本请求' };
  }
}

chrome.runtime.onMessage.addListener((request: ContentRequest, _sender, sendResponse) => {
  handleRequest(request)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      } satisfies ContentResponse);
    });
  return true;
});

void syncDebugTools();
startContentScriptDevWatcher();
