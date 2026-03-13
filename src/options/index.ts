import type { BackgroundRequest, BackgroundResponse } from '../shared/messages';
import { startExtensionPageDevWatcher } from '../dev/reload';
import type { ExtensionSettings } from '../shared/types';

let currentSettings: ExtensionSettings | null = null;
let statusText = '';

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

function render(): void {
  const app = document.getElementById('app');
  if (!app || !currentSettings) {
    return;
  }

  app.innerHTML = `
    <div class="panel">
      <h1>Boss Spider 设置</h1>
      <p>当前支持 BOSS 候选人列表页与职位列表页。请填写 baseUrl、apiKey 和 model，运行时会始终附带当前页面截图发送给模型。</p>
    </div>

    <div class="panel">
      <h2>Provider</h2>
      <div class="field">
        <label for="baseUrl">Base URL</label>
        <input id="baseUrl" value="${escapeHtml(currentSettings.provider.baseUrl)}" placeholder="例如：https://api.openai.com" />
      </div>
      <div class="field">
        <label for="apiKey">API Key</label>
        <input id="apiKey" type="password" value="${escapeHtml(currentSettings.provider.apiKey)}" placeholder="sk-..." />
      </div>
      <div class="field">
        <label for="model">Model</label>
        <input id="model" value="${escapeHtml(currentSettings.provider.model)}" placeholder="例如：gpt-4.1-mini" />
      </div>
    </div>

    <div class="panel">
      <h2>默认运行参数</h2>
      <div class="grid">
        <div class="field">
          <label for="maxItems">默认最大处理条数</label>
          <input id="maxItems" type="number" min="1" max="500" value="${currentSettings.defaults.maxItems}" />
        </div>
        <div class="field">
          <label for="delayMs">默认延迟(ms)</label>
          <input id="delayMs" type="number" min="300" max="20000" value="${currentSettings.defaults.delayMs}" />
        </div>
      </div>
      <div class="field">
        <label for="defaultNotes">默认补充说明</label>
        <textarea id="defaultNotes" rows="5" placeholder="例如：优先收藏近 3 年持续做后端研发的人选">${escapeHtml(currentSettings.defaults.notesForAI)}</textarea>
      </div>
      <div class="field">
        <label><input id="skipFavorited" type="checkbox" ${currentSettings.defaults.skipIfAlreadyFavorited ? 'checked' : ''} /> 已收藏自动跳过</label>
      </div>
      <div class="field">
        <label><input id="debugMode" type="checkbox" ${currentSettings.debug.enabled ? 'checked' : ''} /> 开启页面调试模式</label>
        <div class="muted" style="margin-top:6px;">开启后，支持页面左下角会出现“导出 DOM 快照”按钮，可把页面元素树导出成 JSON 供排查选择器。</div>
      </div>
      <div>
        <button id="save-btn">保存设置</button>
        ${statusText ? `<span class="status">${escapeHtml(statusText)}</span>` : ''}
      </div>
      <div class="muted" style="margin-top:10px;">提示：插件会把当前支持页面的截图和提取出的文本一并发送到你配置的模型服务，请只在你认可的环境下使用。</div>
    </div>
  `;

  document.getElementById('save-btn')?.addEventListener('click', () => {
    void save();
  });
}

function getInputValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? '';
}

async function save(): Promise<void> {
  if (!currentSettings) {
    return;
  }

  currentSettings = {
    provider: {
      baseUrl: getInputValue('baseUrl').trim(),
      apiKey: getInputValue('apiKey').trim(),
      model: getInputValue('model').trim() || 'gpt-4.1-mini'
    },
    defaults: {
      ...currentSettings.defaults,
      maxItems: Math.max(1, Math.min(500, Number(getInputValue('maxItems')) || 20)),
      delayMs: Math.max(300, Math.min(20_000, Number(getInputValue('delayMs')) || 1200)),
      notesForAI: getInputValue('defaultNotes').trim(),
      skipIfAlreadyFavorited: (document.getElementById('skipFavorited') as HTMLInputElement | null)?.checked ?? true
    },
    debug: {
      enabled: (document.getElementById('debugMode') as HTMLInputElement | null)?.checked ?? false
    }
  };

  try {
    await sendToBackground({ type: 'SAVE_SETTINGS', settings: currentSettings });
    statusText = '保存成功';
  } catch (error) {
    statusText = error instanceof Error ? error.message : String(error);
  }

  render();
}

async function bootstrap(): Promise<void> {
  const { settings } = await sendToBackground<{ ok: true; settings: ExtensionSettings }>({ type: 'GET_SETTINGS' });
  currentSettings = settings;
  render();
}

void bootstrap();
startExtensionPageDevWatcher('options');
