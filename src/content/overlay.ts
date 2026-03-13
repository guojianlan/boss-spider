import type { RunSummary, RuntimeStatus } from '../shared/types';

const ROOT_ID = '__boss_spider_overlay__';

function ensureRoot(): HTMLDivElement {
  let root = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  if (root) {
    return root;
  }

  root = document.createElement('div');
  root.id = ROOT_ID;
  root.style.position = 'fixed';
  root.style.right = '20px';
  root.style.bottom = '20px';
  root.style.zIndex = '2147483647';
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.gap = '12px';
  root.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  document.documentElement.appendChild(root);
  return root;
}

function buildCard(): HTMLDivElement {
  const card = document.createElement('div');
  card.style.width = '320px';
  card.style.background = 'rgba(17, 24, 39, 0.96)';
  card.style.color = '#fff';
  card.style.borderRadius = '14px';
  card.style.padding = '14px';
  card.style.boxShadow = '0 20px 40px rgba(15, 23, 42, 0.35)';
  card.style.backdropFilter = 'blur(6px)';
  return card;
}

export function renderRuntimeOverlay(runtime: RuntimeStatus): void {
  const root = ensureRoot();
  let card = root.querySelector<HTMLDivElement>('[data-role="runtime"]');
  if (!card) {
    card = buildCard();
    card.dataset.role = 'runtime';
    root.appendChild(card);
  }

  card.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:8px;">Boss Spider 运行中</div>
    <div style="font-size:12px;opacity:0.86;line-height:1.6;">
      <div>状态：${runtime.message}</div>
      <div>进度：${runtime.processed}/${runtime.total || 0}</div>
      <div>收藏：${runtime.favorited}</div>
      <div>当前：${runtime.currentLabel ?? '等待中'}</div>
      <div>${runtime.stopRequested ? '已收到停止请求，正在收尾。' : '可在弹窗中停止任务。'}</div>
    </div>
  `;
}

export function showCompletionToast(summary: RunSummary): void {
  const root = ensureRoot();
  const toast = buildCard();
  toast.dataset.role = 'toast';
  toast.style.background = 'rgba(3, 105, 161, 0.95)';
  toast.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:8px;">任务完成</div>
    <div style="font-size:12px;line-height:1.6;opacity:0.92;">
      <div>处理：${summary.processed}</div>
      <div>收藏：${summary.favorited}</div>
      <div>跳过：${summary.skipped + summary.alreadyFavorited}</div>
      <div>异常：${summary.errors}</div>
    </div>
  `;

  root.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 8_000);
}

export function showErrorToast(message: string): void {
  const root = ensureRoot();
  const toast = buildCard();
  toast.dataset.role = 'toast';
  toast.style.background = 'rgba(153, 27, 27, 0.95)';
  toast.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:8px;">运行异常</div>
    <div style="font-size:12px;line-height:1.6;opacity:0.92;">${message}</div>
  `;

  root.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 10_000);
}
