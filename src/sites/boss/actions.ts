import {
  getDetailPanel,
  getFavoriteButton,
  getItemId,
  getItemLabel,
  getListItems,
  getTagTexts,
  getVisibleText,
  inferFavoriteState
} from './extractors';
import type { CandidateEvidence, PageSupportStatus } from '../../shared/types';

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clickElement(element: HTMLElement): void {
  element.scrollIntoView({ block: 'center', behavior: 'smooth' });
  element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  element.click();
}

async function waitForDetailChange(previousSnapshot: string, timeoutMs = 6_000): Promise<HTMLElement> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const detail = getDetailPanel();
    const text = getVisibleText(detail);
    if (detail && text && text !== previousSnapshot) {
      return detail;
    }
    await delay(250);
  }

  const detail = getDetailPanel();
  if (!detail) {
    throw new Error('未找到右侧详情区域');
  }

  return detail;
}

export function getPageSupportStatus(): PageSupportStatus {
  const items = getListItems();
  const detail = getDetailPanel();

  return {
    supported: items.length > 0 && detail !== null,
    url: location.href,
    reason: items.length > 0 && detail ? undefined : '未识别到列表或右侧详情区域',
    candidateCount: items.length
  };
}

export async function processCandidate(index: number): Promise<CandidateEvidence> {
  const items = getListItems();
  const item = items[index];

  if (!item) {
    throw new Error(`未找到索引为 ${index} 的候选人项`);
  }

  const previousSnapshot = getVisibleText(getDetailPanel());
  clickElement(item);
  await delay(500);

  const detail = await waitForDetailChange(previousSnapshot);
  const favoriteButton = getFavoriteButton();

  return {
    index,
    label: getItemLabel(item),
    itemId: getItemId(item, index),
    detailText: getVisibleText(detail),
    summaryText: getVisibleText(item),
    tags: getTagTexts(detail),
    alreadyFavorited: inferFavoriteState(favoriteButton)
  };
}

export async function clickFavorite(): Promise<boolean> {
  const button = getFavoriteButton();
  if (!button) {
    throw new Error('未找到收藏按钮');
  }

  const before = inferFavoriteState(button);
  if (before) {
    return true;
  }

  clickElement(button);
  await delay(500);
  return inferFavoriteState(getFavoriteButton());
}
