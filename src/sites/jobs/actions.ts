import type { CandidateEvidence, PageSupportStatus } from '../../shared/types';
import {
  getJobsCompanyName,
  getJobsDetailPanel,
  getJobsFavoriteButton,
  getJobsItemId,
  getJobsItemLabel,
  getJobsListItems,
  getJobsTags,
  getJobsTitle,
  inferJobsFavoriteState,
  isJobsPageUrl
} from './extractors';
import { getVisibleText } from '../boss/extractors';

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
    candidateCount: items.length
  };
}

export async function processJob(index: number): Promise<CandidateEvidence> {
  const items = getJobsListItems();
  const item = items[index];

  if (!item) {
    throw new Error(`未找到索引为 ${index} 的职位项`);
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
    alreadyFavorited: inferJobsFavoriteState()
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
