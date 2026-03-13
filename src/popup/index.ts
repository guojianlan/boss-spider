import type { BackgroundRequest, BackgroundResponse } from '../shared/messages';
import { startExtensionPageDevWatcher } from '../dev/reload';
import { normalizeRunPlan } from '../shared/schema/runPlan';
import { defaultSettings } from '../shared/storage';
import type { ExtensionSettings, PageSupportStatus, RunSummary, RuntimeStatus } from '../shared/types';

interface PopupState {
  pageStatus: PageSupportStatus | null;
  settings: ExtensionSettings;
  runtime: RuntimeStatus | null;
  summary: RunSummary | null;
  feedback: string;
  feedbackError: boolean;
}

const state: PopupState = {
  pageStatus: null,
  settings: defaultSettings,
  runtime: null,
  summary: null,
  feedback: '',
  feedbackError: false
};

let runtimePollingTimer: number | null = null;

async function sendToBackground<T extends BackgroundResponse>(request: BackgroundRequest): Promise<T> {
  const response = (await chrome.runtime.sendMessage(request)) as T;
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ensureRuntimePolling(): void {
  if (runtimePollingTimer !== null) {
    return;
  }

  runtimePollingTimer = window.setInterval(() => {
    void refreshRuntime(false);
  }, 1500);
}

function render(): void {
  const app = document.getElementById('app');
  if (!app) {
    return;
  }

  const pageStatus = state.pageStatus;
  const runtime = state.runtime;
  const summary = state.summary;
  const defaults = state.settings.defaults;
  const statusClass = pageStatus?.supported ? 'status' : 'status error';
  const statusText = pageStatus
    ? pageStatus.supported
      ? `页面可运行，识别到 ${pageStatus.candidateCount} 条可处理结果`
      : pageStatus.reason ?? '当前页面暂不支持'
    : '正在检查当前页面';

  app.innerHTML = `
    <div class="panel">
      <h1>Boss Spider</h1>
      <div class="${statusClass}">${escapeHtml(statusText)}</div>
      <div class="hint" style="margin-top:10px;">请先在 BOSS 直聘支持的列表页手动筛选后再启动任务。</div>
      <div style="margin-top:10px;"><span class="link" id="open-options">打开设置页</span></div>
    </div>

    <div class="panel">
      <h2>调试</h2>
      <div class="field">
        <label><input id="debugMode" type="checkbox" ${state.settings.debug.enabled ? 'checked' : ''} /> 开启页面调试模式</label>
        <div class="hint" style="margin-top:6px;">开启后会在当前页面左下角注入“导出 DOM 快照”按钮，导出的 JSON 可以发给我定位列表和详情区域。</div>
      </div>
      <div class="actions">
        <button class="secondary" id="save-debug-btn">保存调试设置</button>
      </div>
    </div>

    <div class="panel">
      <h2>运行规则</h2>
      <div class="field">
        <label for="must">必须命中关键词</label>
        <textarea id="must" placeholder="例如：Java, Spring Boot, Redis">${escapeHtml(defaults.keywordsMustMatch)}</textarea>
      </div>
      <div class="field">
        <label for="optional">加分关键词</label>
        <textarea id="optional" placeholder="例如：Kafka, Docker, 微服务">${escapeHtml(defaults.keywordsOptional)}</textarea>
      </div>
      <div class="field">
        <label for="exclude">排除关键词</label>
        <textarea id="exclude" placeholder="例如：外包, 转岗">${escapeHtml(defaults.keywordsExclude)}</textarea>
      </div>
      <div class="field">
        <label for="notes">补充给 AI 的说明</label>
        <textarea id="notes" placeholder="例如：更看重近 3 年 Java 后端项目经验">${escapeHtml(defaults.notesForAI)}</textarea>
      </div>
      <div class="grid">
        <div class="field">
          <label for="maxItems">最多处理条数</label>
          <input id="maxItems" type="number" min="1" max="500" value="${defaults.maxItems}" />
        </div>
        <div class="field">
          <label for="delayMs">每条延迟(ms)</label>
          <input id="delayMs" type="number" min="300" max="20000" value="${defaults.delayMs}" />
        </div>
      </div>
      <div class="field">
        <label><input id="skipFavorited" type="checkbox" ${defaults.skipIfAlreadyFavorited ? 'checked' : ''} /> 已收藏自动跳过</label>
      </div>
      <div class="actions">
        <button class="primary" id="start-btn" ${pageStatus?.supported ? '' : 'disabled'}>运行 AI 代理</button>
        <button class="secondary" id="stop-btn">停止</button>
      </div>
      ${state.feedback ? `<div class="hint" style="margin-top:10px;color:${state.feedbackError ? '#b91c1c' : '#047857'};">${escapeHtml(state.feedback)}</div>` : ''}
    </div>

    <div class="panel">
      <h2>运行状态</h2>
      <div class="summary-row">状态：${escapeHtml(runtime?.message ?? '暂无运行中的任务')}</div>
      <div class="summary-row">进度：${runtime ? `${runtime.processed}/${runtime.total}` : '-'}</div>
      <div class="summary-row">收藏：${runtime?.favorited ?? 0}</div>
      <div class="summary-row">当前：${escapeHtml(runtime?.currentLabel ?? '-')}</div>
    </div>

    <div class="panel">
      <h2>最近一次结果</h2>
      <div class="summary-row">处理：${summary?.processed ?? 0}</div>
      <div class="summary-row">收藏：${summary?.favorited ?? 0}</div>
      <div class="summary-row">跳过：${summary ? summary.skipped + summary.alreadyFavorited : 0}</div>
      <div class="summary-row">异常：${summary?.errors ?? 0}</div>
    </div>
  `;

  document.getElementById('open-options')?.addEventListener('click', () => {
    void chrome.runtime.openOptionsPage();
  });

  document.getElementById('save-debug-btn')?.addEventListener('click', () => {
    void saveDebugSettings();
  });

  document.getElementById('start-btn')?.addEventListener('click', () => {
    void startRun();
  });

  document.getElementById('stop-btn')?.addEventListener('click', () => {
    void stopRun();
  });
}

function getInputValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? '';
}

async function startRun(): Promise<void> {
  try {
    if (!state.settings.provider.baseUrl.trim() || !state.settings.provider.apiKey.trim()) {
      throw new Error('请先打开设置页配置 baseUrl 和 apiKey');
    }

    const plan = normalizeRunPlan({
      keywordsMustMatch: getInputValue('must'),
      keywordsOptional: getInputValue('optional'),
      keywordsExclude: getInputValue('exclude'),
      notesForAI: getInputValue('notes'),
      maxItems: getInputValue('maxItems'),
      delayMs: getInputValue('delayMs'),
      skipIfAlreadyFavorited: (document.getElementById('skipFavorited') as HTMLInputElement | null)?.checked ?? true
    });

    state.settings = {
      ...state.settings,
      defaults: {
        ...state.settings.defaults,
        keywordsMustMatch: getInputValue('must'),
        keywordsOptional: getInputValue('optional'),
        keywordsExclude: getInputValue('exclude'),
        notesForAI: getInputValue('notes'),
        maxItems: plan.maxItems,
        delayMs: plan.delayMs,
        skipIfAlreadyFavorited: plan.skipIfAlreadyFavorited
      }
    };

    await sendToBackground({ type: 'SAVE_SETTINGS', settings: state.settings });
    await sendToBackground({ type: 'START_RUN', plan });
    state.feedback = '任务已开始，请保持当前页面可见。';
    state.feedbackError = false;
    await refreshRuntime(false);
  } catch (error) {
    state.feedback = error instanceof Error ? error.message : String(error);
    state.feedbackError = true;
  }
  render();
}

async function saveDebugSettings(): Promise<void> {
  try {
    state.settings = {
      ...state.settings,
      debug: {
        enabled: (document.getElementById('debugMode') as HTMLInputElement | null)?.checked ?? false
      }
    };

    await sendToBackground({ type: 'SAVE_SETTINGS', settings: state.settings });
    state.feedback = state.settings.debug.enabled
      ? '调试模式已开启，当前页面左下角会出现导出按钮。'
      : '调试模式已关闭。';
    state.feedbackError = false;
  } catch (error) {
    state.feedback = error instanceof Error ? error.message : String(error);
    state.feedbackError = true;
  }

  render();
}

async function stopRun(): Promise<void> {
  try {
    await sendToBackground({ type: 'STOP_RUN' });
    state.feedback = '已请求停止任务。';
    state.feedbackError = false;
    await refreshRuntime(false);
  } catch (error) {
    state.feedback = error instanceof Error ? error.message : String(error);
    state.feedbackError = true;
  }
  render();
}

async function refreshRuntime(shouldRender = true): Promise<void> {
  const runtimeResponse = await sendToBackground<{ ok: true; runtime: RuntimeStatus }>({ type: 'GET_RUNTIME_STATUS' });
  const summaryResponse = await sendToBackground<{ ok: true; summary: RunSummary | null }>({ type: 'GET_LAST_SUMMARY' });
  state.runtime = runtimeResponse.runtime;
  state.summary = summaryResponse.summary;
  if (shouldRender) {
    render();
  }
}

async function bootstrap(): Promise<void> {
  try {
    const [{ pageStatus }, { settings }] = await Promise.all([
      sendToBackground<{ ok: true; pageStatus: PageSupportStatus }>({ type: 'GET_PAGE_STATUS' }),
      sendToBackground<{ ok: true; settings: ExtensionSettings }>({ type: 'GET_SETTINGS' })
    ]);
    state.pageStatus = pageStatus;
    state.settings = settings;
    await refreshRuntime(false);
    ensureRuntimePolling();
  } catch (error) {
    state.feedback = error instanceof Error ? error.message : String(error);
    state.feedbackError = true;
  }
  render();
}

void bootstrap();
startExtensionPageDevWatcher('popup');
