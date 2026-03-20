import {
  getDetailPanel,
  getFavoriteButton,
  getListContainer,
  getBossModeLabel,
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

async function ensureCandidateItemLoaded(index: number): Promise<HTMLElement | null> {
  let previousCount = -1;
  let stableRounds = 0;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const items = getListItems();
    const target = items[index];
    if (target) {
      return target;
    }

    const currentCount = items.length;
    if (currentCount === previousCount) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
      previousCount = currentCount;
    }

    if (stableRounds >= 3) {
      return null;
    }

    const lastItem = items.at(-1);
    lastItem?.scrollIntoView({ block: 'end', behavior: 'smooth' });

    const container = getListContainer();
    if (container) {
      container.scrollTop = container.scrollHeight;
    }

    window.scrollBy({ top: Math.max(window.innerHeight * 0.75, 420), behavior: 'smooth' });
    await delay(700);
  }

  return null;
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
    candidateCount: items.length,
    pageKind: 'candidate',
    modeLabel: getBossModeLabel(),
    dynamicList: true
  };
}

export async function processCandidate(index: number): Promise<CandidateEvidence | null> {
  const item = await ensureCandidateItemLoaded(index);

  if (!item) {
    return null;
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
    alreadyFavorited: inferFavoriteState(favoriteButton),
    pageKind: 'candidate',
    modeLabel: getBossModeLabel()
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
