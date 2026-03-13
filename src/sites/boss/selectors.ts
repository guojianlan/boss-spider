export const bossSelectors = {
  listContainer: [
    '[data-testid="geek-list"]',
    '.candidate-list',
    '.ui-dropmenu-list',
    '.search-list'
  ],
  listItems: [
    '[data-testid="geek-item"]',
    '.candidate-item',
    '.geek-item',
    '.search-card'
  ],
  detailPanel: [
    '[data-testid="candidate-detail"]',
    '.candidate-detail',
    '.resume-detail',
    '.detail-content'
  ],
  favoriteButton: [
    '[data-testid="favorite-button"]',
    'button[data-action="favorite"]',
    '.btn-collect',
    '.collect-btn',
    'button:has(.icon-star)',
    'button:has(.icon-collect)'
  ],
  activeItem: ['.active', '.is-active', '[aria-selected="true"]'],
  tagElements: ['.tag', '.label', '.resume-tag', '[data-testid="tag"]']
} as const;
