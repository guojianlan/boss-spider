import { jobsSelectors } from './selectors';
import { getTagTexts, getVisibleText, inferFavoriteState } from '../boss/extractors';

function queryFirst(selectors: readonly string[], root: ParentNode = document): HTMLElement | null {
  for (const selector of selectors) {
    const element = root.querySelector<HTMLElement>(selector);
    if (element) {
      return element;
    }
  }
  return null;
}

export function isJobsPageUrl(): boolean {
  return location.pathname.startsWith('/web/geek/jobs');
}

export function getJobsPageRoot(): HTMLElement | null {
  return queryFirst(jobsSelectors.pageRoots);
}

export function getJobsListContainer(): HTMLElement | null {
  return queryFirst(jobsSelectors.listContainer);
}

export function getJobsListItems(): HTMLElement[] {
  const container = getJobsListContainer() ?? getJobsPageRoot() ?? document;
  const seen = new Set<HTMLElement>();
  const items: HTMLElement[] = [];

  for (const selector of jobsSelectors.listItems) {
    for (const element of Array.from(container.querySelectorAll<HTMLElement>(selector))) {
      if (!seen.has(element)) {
        seen.add(element);
        items.push(element);
      }
    }
  }

  return items;
}

export function getJobsDetailPanel(): HTMLElement | null {
  return queryFirst(jobsSelectors.detailPanel);
}

export function getJobsModeLabel(): string {
  return '找职位/公司';
}

export function getJobsFavoriteButton(): HTMLButtonElement | null {
  return queryFirst(jobsSelectors.favoriteButton) as HTMLButtonElement | null;
}

export function getJobsItemId(item: HTMLElement, fallbackIndex: number): string {
  return item.getAttribute('data-job-id') ?? item.getAttribute('data-id') ?? item.getAttribute('ka') ?? item.id ?? `job-${fallbackIndex}`;
}

export function getJobsTitle(root: ParentNode = document): string {
  return getVisibleText(queryFirst(jobsSelectors.jobTitle, root)).split('\n')[0] ?? '';
}

export function getJobsCompanyName(root: ParentNode = document): string {
  return getVisibleText(queryFirst(jobsSelectors.companyName, root)).split('\n')[0] ?? '';
}

export function getJobsItemLabel(item: HTMLElement): string {
  const raw = getVisibleText(item).split('\n').filter(Boolean);
  return raw.slice(0, 4).join(' / ') || `职位 ${item.dataset.index ?? ''}`.trim();
}

export function getJobsTags(root: HTMLElement | null): string[] {
  return getTagTexts(root);
}

export function isJobsPageSupported(): boolean {
  return isJobsPageUrl() && getJobsListItems().length > 0 && getJobsDetailPanel() !== null;
}

export function inferJobsFavoriteState(): boolean {
  return inferFavoriteState(getJobsFavoriteButton());
}
