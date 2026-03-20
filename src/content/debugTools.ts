import type { DebugLogEntry } from '../shared/types';
import { getSettings } from '../shared/storage';

const ROOT_ID = '__boss_spider_debug__';
const STATUS_ID = '__boss_spider_debug_status__';
const BUTTON_ID = '__boss_spider_debug_export__';
const EXPORT_LOGS_BUTTON_ID = '__boss_spider_debug_export_logs__';
const CLEAR_LOGS_BUTTON_ID = '__boss_spider_debug_clear_logs__';
const LOGS_ID = '__boss_spider_debug_logs__';

type SnapshotRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

interface ElementSnapshot {
  tag: string;
  selectorHint: string;
  id?: string;
  classes?: string[];
  attributes?: Record<string, string>;
  ownText?: string;
  visible: boolean;
  rect?: SnapshotRect;
  childElementCount: number;
  children: ElementSnapshot[];
}

interface DocumentSnapshot {
  capturedAt: string;
  url: string;
  title: string;
  body: ElementSnapshot | null;
}

const attributeNames = new Set(['href', 'role', 'name', 'type', 'value', 'placeholder']);

let exportInProgress = false;
let debugLogs: DebugLogEntry[] = [];

function escapeSelectorPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function getOwnText(element: Element): string | undefined {
  const textParts: string[] = [];
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE) {
      continue;
    }
    const text = node.textContent?.replace(/\s+/g, ' ').trim();
    if (text) {
      textParts.push(text);
    }
  }

  const joined = textParts.join(' ');
  return joined ? truncate(joined, 160) : undefined;
}

function collectAttributes(element: Element): Record<string, string> | undefined {
  const attributes: Record<string, string> = {};

  for (const attribute of Array.from(element.attributes)) {
    if (attribute.name === 'id' || attribute.name === 'class' || attribute.name === 'style') {
      continue;
    }

    if (attribute.name.startsWith('data-') || attribute.name.startsWith('aria-') || attributeNames.has(attribute.name)) {
      attributes[attribute.name] = truncate(attribute.value, 200);
    }
  }

  return Object.keys(attributes).length > 0 ? attributes : undefined;
}

function getRect(element: Element): SnapshotRect | undefined {
  const rect = element.getBoundingClientRect();
  if (!rect.width && !rect.height) {
    return undefined;
  }

  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

function isVisible(element: Element, rect?: SnapshotRect): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && Boolean(rect);
}

function buildSelectorHint(element: Element): string {
  if (element === document.body) {
    return 'body';
  }

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase();
    const htmlElement = current as HTMLElement;

    if (htmlElement.id) {
      part += `#${escapeSelectorPart(htmlElement.id)}`;
      parts.unshift(part);
      break;
    }

    const classNames = Array.from(htmlElement.classList).slice(0, 2);
    if (classNames.length > 0) {
      part += classNames.map((name) => `.${escapeSelectorPart(name)}`).join('');
    }

    const currentTagName = current.tagName;
    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((child: Element) => child.tagName === currentTagName);
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }

    parts.unshift(part);
    current = parent;
  }

  return `body > ${parts.join(' > ')}`;
}

function shouldSkipElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  return tagName === 'script' || tagName === 'style' || tagName === 'template' || element.id === ROOT_ID;
}

function snapshotElement(element: Element): ElementSnapshot {
  const htmlElement = element as HTMLElement;
  const rect = getRect(element);

  return {
    tag: element.tagName.toLowerCase(),
    selectorHint: buildSelectorHint(element),
    id: htmlElement.id || undefined,
    classes: htmlElement.classList.length > 0 ? Array.from(htmlElement.classList) : undefined,
    attributes: collectAttributes(element),
    ownText: getOwnText(element),
    visible: isVisible(element, rect),
    rect,
    childElementCount: element.children.length,
    children: Array.from(element.children)
      .filter((child) => !shouldSkipElement(child))
      .map((child) => snapshotElement(child))
  };
}

function captureDocumentSnapshot(): DocumentSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    url: location.href,
    title: document.title,
    body: document.body ? snapshotElement(document.body) : null
  };
}

function downloadSnapshot(snapshot: DocumentSnapshot): string {
  const fileName = `boss-spider-dom-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  return fileName;
}

function setStatus(message: string): void {
  const status = document.getElementById(STATUS_ID);
  if (status) {
    status.textContent = message;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getKindLabel(kind: DebugLogEntry['kind']): string {
  switch (kind) {
    case 'input':
      return 'Input';
    case 'prompt':
      return 'Prompt';
    case 'output':
      return 'Output';
    case 'action':
      return 'Action';
    case 'error':
      return 'Error';
    case 'status':
      return 'Status';
    default:
      return kind;
  }
}

function renderLogs(): void {
  const logsRoot = document.getElementById(LOGS_ID);
  if (!logsRoot) {
    return;
  }

  logsRoot.innerHTML =
    debugLogs.length > 0
      ? debugLogs
          .map(
            (entry) => `
              <details style="background:rgba(15,23,42,0.72);border:1px solid rgba(148,163,184,0.22);border-radius:10px;padding:8px 10px;">
                <summary style="cursor:pointer;font-size:12px;font-weight:700;line-height:1.5;">
                  <span style="color:#7dd3fc;">${escapeHtml(getKindLabel(entry.kind))}</span>
                  <span style="opacity:0.92;"> ${escapeHtml(entry.title)}</span>
                  <span style="opacity:0.6;font-weight:400;"> ${escapeHtml(new Date(entry.createdAt).toLocaleTimeString())}</span>
                </summary>
                <pre style="margin:8px 0 0;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.5;color:#e2e8f0;max-height:260px;overflow:auto;">${escapeHtml(entry.content)}</pre>
              </details>
            `
          )
          .join('')
      : '<div style="font-size:12px;line-height:1.6;opacity:0.75;">暂无调试日志。启动任务后，这里会显示输入、Prompt、模型输出和执行动作。</div>';
}

function downloadLogs(): string {
  const fileName = `boss-spider-debug-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const blob = new Blob([JSON.stringify(debugLogs, null, 2)], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  return fileName;
}

async function handleExportClick(): Promise<void> {
  if (exportInProgress) {
    return;
  }

  exportInProgress = true;
  const button = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  if (button) {
    button.disabled = true;
    button.textContent = '导出中...';
  }

  try {
    setStatus('正在采集 document.body 下的元素树...');
    const snapshot = captureDocumentSnapshot();
    const fileName = downloadSnapshot(snapshot);
    setStatus(`已下载 ${fileName}`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  } finally {
    exportInProgress = false;
    if (button) {
      button.disabled = false;
      button.textContent = '导出 DOM 快照';
    }
  }
}

function removeDebugRoot(): void {
  document.getElementById(ROOT_ID)?.remove();
}

function buildDebugRoot(): HTMLDivElement {
  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.style.position = 'fixed';
  root.style.left = '20px';
  root.style.bottom = '20px';
  root.style.zIndex = '2147483647';
  root.style.width = '420px';
  root.style.maxHeight = '70vh';
  root.style.overflow = 'hidden';
  root.style.padding = '14px';
  root.style.borderRadius = '14px';
  root.style.background = 'rgba(15, 23, 42, 0.96)';
  root.style.color = '#fff';
  root.style.boxShadow = '0 20px 40px rgba(15, 23, 42, 0.35)';
  root.style.backdropFilter = 'blur(6px)';
  root.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  const title = document.createElement('div');
  title.textContent = 'Boss Spider Debug';
  title.style.fontSize = '14px';
  title.style.fontWeight = '700';
  title.style.marginBottom = '8px';

  const description = document.createElement('div');
  description.textContent = '导出 document.body 的元素树、关键属性和可见区域，方便定位列表区和详情区。';
  description.style.fontSize = '12px';
  description.style.lineHeight = '1.6';
  description.style.opacity = '0.88';
  description.style.marginBottom = '10px';

  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.textContent = '导出 DOM 快照';
  button.style.width = '100%';
  button.style.border = '0';
  button.style.borderRadius = '10px';
  button.style.padding = '10px 12px';
  button.style.background = '#38bdf8';
  button.style.color = '#082f49';
  button.style.fontSize = '13px';
  button.style.fontWeight = '700';
  button.style.cursor = 'pointer';
  button.addEventListener('click', () => {
    void handleExportClick();
  });

  const exportLogsButton = document.createElement('button');
  exportLogsButton.id = EXPORT_LOGS_BUTTON_ID;
  exportLogsButton.type = 'button';
  exportLogsButton.textContent = '导出调试日志';
  exportLogsButton.style.flex = '1';
  exportLogsButton.style.border = '0';
  exportLogsButton.style.borderRadius = '10px';
  exportLogsButton.style.padding = '10px 12px';
  exportLogsButton.style.background = '#1d4ed8';
  exportLogsButton.style.color = '#dbeafe';
  exportLogsButton.style.fontSize = '13px';
  exportLogsButton.style.fontWeight = '700';
  exportLogsButton.style.cursor = 'pointer';
  exportLogsButton.addEventListener('click', () => {
    const fileName = downloadLogs();
    setStatus(`已下载 ${fileName}`);
  });

  const clearLogsButton = document.createElement('button');
  clearLogsButton.id = CLEAR_LOGS_BUTTON_ID;
  clearLogsButton.type = 'button';
  clearLogsButton.textContent = '清空日志';
  clearLogsButton.style.width = '100%';
  clearLogsButton.style.border = '1px solid rgba(148,163,184,0.3)';
  clearLogsButton.style.borderRadius = '10px';
  clearLogsButton.style.padding = '10px 12px';
  clearLogsButton.style.background = 'transparent';
  clearLogsButton.style.color = '#cbd5e1';
  clearLogsButton.style.fontSize = '12px';
  clearLogsButton.style.fontWeight = '600';
  clearLogsButton.style.cursor = 'pointer';
  clearLogsButton.style.marginTop = '8px';
  clearLogsButton.addEventListener('click', () => {
    debugLogs = [];
    renderLogs();
    setStatus('调试日志已清空');
  });

  const actionRow = document.createElement('div');
  actionRow.style.display = 'flex';
  actionRow.style.gap = '8px';
  actionRow.style.marginTop = '8px';
  actionRow.appendChild(exportLogsButton);

  const logs = document.createElement('div');
  logs.id = LOGS_ID;
  logs.style.marginTop = '12px';
  logs.style.display = 'flex';
  logs.style.flexDirection = 'column';
  logs.style.gap = '8px';
  logs.style.maxHeight = '38vh';
  logs.style.overflow = 'auto';

  const status = document.createElement('div');
  status.id = STATUS_ID;
  status.textContent = '调试模式已开启';
  status.style.marginTop = '10px';
  status.style.fontSize = '12px';
  status.style.lineHeight = '1.6';
  status.style.opacity = '0.8';

  root.appendChild(title);
  root.appendChild(description);
  root.appendChild(button);
  root.appendChild(actionRow);
  root.appendChild(clearLogsButton);
  root.appendChild(status);
  root.appendChild(logs);
  renderLogs();
  return root;
}

function ensureDebugRoot(): void {
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  document.documentElement.appendChild(buildDebugRoot());
}

export async function syncDebugTools(enabled?: boolean): Promise<void> {
  const nextEnabled = typeof enabled === 'boolean' ? enabled : (await getSettings()).debug.enabled;
  if (!nextEnabled) {
    removeDebugRoot();
    return;
  }

  ensureDebugRoot();
  setStatus('调试模式已开启');
  renderLogs();
}

export function pushDebugLog(entry: DebugLogEntry): void {
  debugLogs = [entry, ...debugLogs].slice(0, 30);
  renderLogs();
}
