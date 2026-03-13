import { bossSelectors } from './selectors';

function queryFirst(selectors: readonly string[], root: ParentNode = document): HTMLElement | null {
  for (const selector of selectors) {
    const element = root.querySelector<HTMLElement>(selector);
    if (element) {
      return element;
    }
  }
  return null;
}

export function getListContainer(): HTMLElement | null {
  return queryFirst(bossSelectors.listContainer);
}

export function getListItems(): HTMLElement[] {
  const container = getListContainer() ?? document;
  const seen = new Set<HTMLElement>();
  const items: HTMLElement[] = [];

  for (const selector of bossSelectors.listItems) {
    for (const element of Array.from(container.querySelectorAll<HTMLElement>(selector))) {
      if (!seen.has(element)) {
        seen.add(element);
        items.push(element);
      }
    }
  }

  return items;
}

export function getDetailPanel(): HTMLElement | null {
  return queryFirst(bossSelectors.detailPanel);
}

export function getFavoriteButton(): HTMLButtonElement | null {
  return queryFirst(bossSelectors.favoriteButton) as HTMLButtonElement | null;
}

export function getVisibleText(element: HTMLElement | null): string {
  return (element?.innerText ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

export function getItemLabel(item: HTMLElement): string {
  return getVisibleText(item).split('\n').slice(0, 3).join(' / ') || `候选人 ${item.dataset.index ?? ''}`.trim();
}

export function getItemId(item: HTMLElement, fallbackIndex: number): string {
  return item.getAttribute('data-id') ?? item.getAttribute('ka') ?? item.id ?? `item-${fallbackIndex}`;
}

export function getTagTexts(root: HTMLElement | null): string[] {
  if (!root) {
    return [];
  }

  const seen = new Set<string>();
  for (const selector of bossSelectors.tagElements) {
    for (const element of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
      const text = element.innerText.trim();
      if (text) {
        seen.add(text);
      }
    }
  }
  return Array.from(seen);
}

export function inferFavoriteState(button: HTMLButtonElement | null): boolean {
  if (!button) {
    return false;
  }

  const joinedText = `${button.innerText} ${button.getAttribute('aria-label') ?? ''} ${button.className}`.toLowerCase();
  return /已收藏|取消收藏|已关注|active|collected|favorited/.test(joinedText);
}
