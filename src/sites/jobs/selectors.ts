export const jobsSelectors = {
  pageRoots: ['.job-search-page', '.job-list-box', '.job-recommend-main', '[data-page="job-list"]'],
  listContainer: ['.job-list-box', '.rec-job-list', '.search-job-result', '.job-list'],
  listItems: ['.job-card-wrapper', '.job-card-box', '.job-card-body', '.search-job-result .job-card-wrapper'],
  detailPanel: ['.job-detail-box', '.job-detail', '.job-detail-content', '.job-info-main'],
  favoriteButton: [
    'button:has(.icon-collect)',
    'button:has(.icon-star)',
    '.btn-collect',
    '.collect-btn',
    'button[data-action="favorite"]'
  ],
  tagElements: ['.tag-list li', '.job-label-list li', '.labels-tag li', '.job-tag', '.company-tag li'],
  companyName: ['.company-name', '.company-info h3', '.company-card .name', '.company-title'],
  jobTitle: ['.job-name', '.name', '.job-title', '.info-primary .name'],
  activeItem: ['.active', '.is-active', '[aria-selected="true"]']
} as const;
