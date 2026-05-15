window.LinkedInFilter = window.LinkedInFilter || {};

window.LinkedInFilter.extractPostText = function(postElement) {
  if (!postElement) return '';

  const textSelectors = [
    '.feed-shared-update-v2__description',
    '.feed-shared-text-view',
    '.feed-shared-text',
    '[data-test-id="main-feed-activity-card__commentary"]',
    '.update-components-text',
    '.feed-shared-inline-show-more-text',
    '.feed-shared-text__text-view',
    'div[data-view-name="feed-full-update"]'
  ];

  let textContent = '';

  for (const selector of textSelectors) {
    const element = postElement.querySelector(selector);
    if (element) {
      textContent = element.innerText || element.textContent || '';
      if (textContent.trim()) {
        break;
      }
    }
  }

  if (!textContent.trim()) {
    const clone = postElement.cloneNode(true);
    const overlays = clone.querySelectorAll('.linkedin-filter-overlay, button, .feed-shared-social-action-bar');
    overlays.forEach(el => el.remove());
    textContent = clone.innerText || clone.textContent || '';
  }

  return textContent;
};
