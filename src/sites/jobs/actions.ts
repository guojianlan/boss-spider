import type { CandidateEvidence, PageSupportStatus } from '../../shared/types';
import {
  getJobsCompanyName,
  getJobsDetailPanel,
  getJobsFavoriteButton,
  getJobsItemId,
  getJobsItemLabel,
  getJobsListItems,
  getJobsListContainer,
  getJobsModeLabel,
  getJobsTags,
  getJobsTitle,
  inferJobsFavoriteState,
  isJobsPageUrl
} from './extractors';
import { getVisibleText } from '../boss/extractors';

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function ensureJobItemLoaded(index: number): Promise<HTMLElement | null> {
  let previousCount = -1;
  let stableRounds = 0;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const items = getJobsListItems();
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

    const container = getJobsListContainer();
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
    const detail = getJobsDetailPanel();
    const text = getVisibleText(detail);
    if (detail && text && text !== previousSnapshot) {
      return detail;
    }
    await delay(250);
  }

  const detail = getJobsDetailPanel();
  if (!detail) {
    throw new Error('未找到职位详情区域');
  }
  return detail;
}

export function getJobsPageSupportStatus(): PageSupportStatus {
  const items = getJobsListItems();
  const detail = getJobsDetailPanel();

  const supported = isJobsPageUrl() && items.length > 0 && detail !== null;

  return {
    supported,
    url: location.href,
    reason: supported ? undefined : isJobsPageUrl() ? '未识别到职位列表或右侧职位详情区域' : '当前不是支持的职位列表页',
    candidateCount: items.length,
    pageKind: 'job',
    modeLabel: getJobsModeLabel(),
    dynamicList: true
  };
}

export async function processJob(index: number): Promise<CandidateEvidence | null> {
  const item = await ensureJobItemLoaded(index);

  if (!item) {
    return null;
  }

  const previousSnapshot = getVisibleText(getJobsDetailPanel());
  clickElement(item);
  await delay(500);

  const detail = await waitForDetailChange(previousSnapshot);
  const title = getJobsTitle(detail) || getJobsTitle(item);
  const companyName = getJobsCompanyName(detail) || getJobsCompanyName(item);
  const summaryText = getVisibleText(item);
  const detailText = getVisibleText(detail);
  const label = [title, companyName, getJobsItemLabel(item)].filter(Boolean).join(' / ');

  return {
    index,
    label,
    itemId: getJobsItemId(item, index),
    summaryText,
    detailText,
    tags: getJobsTags(detail),
    alreadyFavorited: inferJobsFavoriteState(),
    pageKind: 'job',
    modeLabel: getJobsModeLabel()
  };
}

export async function clickJobsFavorite(): Promise<boolean> {
  const button = getJobsFavoriteButton();
  if (!button) {
    throw new Error('未找到职位收藏按钮');
  }

  if (inferJobsFavoriteState()) {
    return true;
  }

  clickElement(button);
  await delay(500);
  return inferJobsFavoriteState();
}
