window.LinkedInFilter = window.LinkedInFilter || {};

const FEED_ROOT_NEW_SELECTOR = 'div[data-testid="mainFeed"][data-component-type="LazyColumn"]';
const POST_MARKER_NEW_SELECTOR = 'div[data-view-name="feed-full-update"]';
const POST_MARKER_V3_SELECTOR = 'h2';
const JOB_CARD_TEXT_PATTERN = /jobs recommended for you/i;

window.LinkedInFilter.isJobRecommendationCard = function(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (JOB_CARD_TEXT_PATTERN.test(text)) return true;

  const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
  if (ariaLabel && JOB_CARD_TEXT_PATTERN.test(ariaLabel)) return true;

  return false;
};

window.LinkedInFilter.findNewFeedContainer = function() {
  const candidates = Array.from(document.querySelectorAll(FEED_ROOT_NEW_SELECTOR));
  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  let bestCandidate = candidates[0];
  let bestScore = -1;

  for (const candidate of candidates) {
    const listItems = candidate.querySelectorAll('[role="listitem"], [role="article"]').length;
    const v2Markers = candidate.querySelectorAll(POST_MARKER_NEW_SELECTOR).length;
    const v3Markers = candidate.querySelectorAll(POST_MARKER_V3_SELECTOR).length;
    const score = (listItems * 10) + (v2Markers * 5) + (v3Markers * 3);

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
};

window.LinkedInFilter.shouldIgnoreElement = function(el) {
  if (window.LinkedInFilter.isJobRecommendationCard(el)) {
    return true;
  }

  const dataId = el.getAttribute('data-id');
  if (dataId && dataId.startsWith('urn:li:aggregate:')) {
    const hasAggregateArticle = el.querySelector('div[role="article"][data-urn^="urn:li:aggregate:"]');
    if (!hasAggregateArticle) {
      return true;
    }
  }

  if (el.classList && el.classList.contains('occludable-update-hint') &&
      el.classList.contains('occludable-update')) {
    const hasArticleWithUrn = el.querySelector('div[role="article"][data-urn^="urn:li:activity:"], div[role="article"][data-urn^="urn:li:aggregate:"]');
    if (!hasArticleWithUrn) {
      return true;
    }
  }

  return false;
};

window.LinkedInFilter.isNewFeedRoot = function(root) {
  return root && root.nodeType === Node.ELEMENT_NODE && root.matches && root.matches(FEED_ROOT_NEW_SELECTOR);
};

window.LinkedInFilter.isInsideNewFeed = function(root) {
  return root && root.nodeType === Node.ELEMENT_NODE && root.closest && root.closest(FEED_ROOT_NEW_SELECTOR);
};

window.LinkedInFilter.getNewFeedPostRoots = function(scope) {
  if (!scope || scope.nodeType !== Node.ELEMENT_NODE) return [];

  const roots = new Set();

  const v2Markers = scope.querySelectorAll(POST_MARKER_NEW_SELECTOR);
  v2Markers.forEach((el) => {
    const listItem = el.closest('[role="listitem"], [role="article"]');
    if (listItem) {
      if (window.LinkedInFilter.isJobRecommendationCard(listItem)) {
        return;
      }
      roots.add(listItem);
    }
  });

  const allListItems = scope.querySelectorAll('[role="listitem"], [role="article"]');
  allListItems.forEach((listItem) => {
    if (roots.has(listItem)) return;

    if (window.LinkedInFilter.isJobRecommendationCard(listItem)) {
      return;
    }

    const hasV3Marker = listItem.querySelector(POST_MARKER_V3_SELECTOR);
    const hasV2Marker = listItem.querySelector(POST_MARKER_NEW_SELECTOR);

    if (hasV3Marker && !hasV2Marker) {
      roots.add(listItem);
    }
  });

  return Array.from(roots);
};

window.LinkedInFilter.findFeedContainer = function() {
  let container = document.querySelector('.scaffold-finite-scroll__content[data-finite-scroll-hotkey-context="FEED"]');

  if (!container) {
    container = document.querySelector('.scaffold-finite-scroll__content');
  }

  return container;
};

window.LinkedInFilter.getFeedContainers = function() {
  const containers = [];
  const oldFeed = window.LinkedInFilter.findFeedContainer();
  if (oldFeed) containers.push(oldFeed);
  const newFeed = window.LinkedInFilter.findNewFeedContainer();
  if (newFeed) containers.push(newFeed);
  return containers;
};

window.LinkedInFilter.getPostElementsFromRoot = function(root) {
  if (window.LinkedInFilter.isNewFeedRoot(root) || window.LinkedInFilter.isInsideNewFeed(root)) {
    return window.LinkedInFilter.getNewFeedPostRoots(root);
  }
  if (window.LinkedInFilter.shouldIgnoreElement(root)) {
    return [];
  }
  if (window.LinkedInFilter.isJobRecommendationCard(root)) {
    return [];
  }
  return Array.from(root.querySelectorAll('div[role="article"][data-urn^="urn:li:activity:"], div[role="article"][data-urn^="urn:li:aggregate:"]'));
};
