const processedUrns = new Set();
const blockedUrns = new Set();
let newDomIdCounter = 0;

// New LinkedIn feed DOM (A/B test) - data attributes only, no class names
const FEED_ROOT_NEW_SELECTOR = 'div[data-testid="mainFeed"][data-component-type="LazyColumn"]';
const POST_MARKER_NEW_SELECTOR = 'div[data-view-name="feed-full-update"]';
const POST_ROOT_ROLE_NEW = 'listitem';

const EXPERIMENTAL_CLASSIFICATIONS = new Set([
  'hiring', 'sales_pitch', 'job_seeking', 'events',
  'educational', 'project_launch', 'congrats'
]);

let filterSettings = {
  extensionEnabled: true,
  showHiringPosts: true,
  showJobAnnouncements: false,
  showGrindset: false,
  showSponsored: false,
  showSalesPitch: false,
  showJobSeeking: false,
  showEvents: false,
  showEducational: false,
  showProjectLaunch: false,
  showCongrats: false,
  showOther: false,
  experimentalFilters: false,
  aiEnabled: true,
  opaqueOverlay: false,
  hideRevealButton: false
};
async function loadFilterSettings() {
  try {
    const result = await chrome.storage.sync.get([
      'extensionEnabled', 'showHiringPosts', 'showJobAnnouncements', 'showGrindset',
      'showSponsored', 'showSalesPitch', 'showJobSeeking', 'showEvents',
      'showEducational', 'showProjectLaunch', 'showCongrats', 'showOther', 'experimentalFilters', 'aiEnabled', 'opaqueOverlay', 'hideRevealButton'
    ]);
    filterSettings = {
      extensionEnabled: result.extensionEnabled !== undefined ? result.extensionEnabled : true,
      showHiringPosts: result.showHiringPosts !== undefined ? result.showHiringPosts : true,
      showJobAnnouncements: result.showJobAnnouncements !== undefined ? result.showJobAnnouncements : false,
      showGrindset: result.showGrindset !== undefined ? result.showGrindset : false,
      showSponsored: result.showSponsored !== undefined ? result.showSponsored : false,
      showSalesPitch: result.showSalesPitch !== undefined ? result.showSalesPitch : false,
      showJobSeeking: result.showJobSeeking !== undefined ? result.showJobSeeking : false,
      showEvents: result.showEvents !== undefined ? result.showEvents : false,
      showEducational: result.showEducational !== undefined ? result.showEducational : false,
      showProjectLaunch: result.showProjectLaunch !== undefined ? result.showProjectLaunch : false,
      showCongrats: result.showCongrats !== undefined ? result.showCongrats : false,
      showOther: result.showOther !== undefined ? result.showOther : false,
      experimentalFilters: result.experimentalFilters !== undefined ? result.experimentalFilters : false,
      aiEnabled: result.aiEnabled !== undefined ? result.aiEnabled : true,
      opaqueOverlay: result.opaqueOverlay !== undefined ? result.opaqueOverlay : false,
      hideRevealButton: result.hideRevealButton !== undefined ? result.hideRevealButton : false
    };
  } catch (error) {
    console.error('[LinkedIn Filter] Error loading settings:', error);
    filterSettings = {
      extensionEnabled: true,
      showHiringPosts: true,
      showJobAnnouncements: false,
      showGrindset: false,
      showSponsored: false,
      showSalesPitch: false,
      showJobSeeking: false,
      showEvents: false,
      showEducational: false,
      showProjectLaunch: false,
      showCongrats: false,
      showOther: false,
      experimentalFilters: false
    };
  }
}

function shouldBlockByClassification(classification) {
  if (classification === "hiring") return !filterSettings.showHiringPosts;
  if (classification === "hired_announcement") return !filterSettings.showJobAnnouncements;
  if (classification === "grindset") return !filterSettings.showGrindset;
  if (classification === "sponsored") return !filterSettings.showSponsored;
  if (classification === "sales_pitch") return !filterSettings.showSalesPitch;
  if (classification === "job_seeking") return !filterSettings.showJobSeeking;
  if (classification === "events") return !filterSettings.showEvents;
  if (classification === "educational") return !filterSettings.showEducational;
  if (classification === "project_launch") return !filterSettings.showProjectLaunch;
  if (classification === "congrats") return !filterSettings.showCongrats;
  if (classification === "other") return !filterSettings.showOther;
  return true;
}

loadFilterSettings();

function getActivityUrn(el) {
  const urn = el.getAttribute('data-urn');
  if (urn && (urn.startsWith('urn:li:activity:') || urn.startsWith('urn:li:aggregate:'))) {
    return urn;
  }
  if (el.getAttribute('data-slopblock-urn')) {
    return el.getAttribute('data-slopblock-urn');
  }
  if (el.matches && el.matches('div[role="article"][data-urn^="urn:li:activity:"], div[role="article"][data-urn^="urn:li:aggregate:"]')) {
    return el.getAttribute('data-urn');
  }
  const article = el.querySelector('div[role="article"][data-urn^="urn:li:activity:"], div[role="article"][data-urn^="urn:li:aggregate:"]');
  if (article) {
    return article.getAttribute('data-urn');
  }
  const anyUrn = el.querySelector && el.querySelector('[data-urn^="urn:li:activity:"], [data-urn^="urn:li:aggregate:"]');
  if (anyUrn) {
    return anyUrn.getAttribute('data-urn');
  }
  return null;
}

function getOrAssignNewDomUrn(listItem) {
  let urn = getActivityUrn(listItem);
  if (urn) return urn;
  urn = 'urn:li:activity:new-' + (++newDomIdCounter);
  listItem.setAttribute('data-slopblock-urn', urn);
  return urn;
}

function findNewFeedContainer() {
  return document.querySelector(FEED_ROOT_NEW_SELECTOR);
}

function getNewFeedPostRoots(scope) {
  if (!scope || scope.nodeType !== Node.ELEMENT_NODE) return [];
  const markers = scope.querySelectorAll(POST_MARKER_NEW_SELECTOR);
  const roots = new Set();
  markers.forEach((el) => {
    const listItem = el.closest('div[role="' + POST_ROOT_ROLE_NEW + '"]');
    if (listItem) {
      roots.add(listItem);
    }
  });
  return Array.from(roots);
}

function shouldIgnoreElement(el) {
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
}

function isNewFeedRoot(root) {
  return root && root.nodeType === Node.ELEMENT_NODE && root.matches && root.matches(FEED_ROOT_NEW_SELECTOR);
}

function isInsideNewFeed(root) {
  return root && root.nodeType === Node.ELEMENT_NODE && root.closest && root.closest(FEED_ROOT_NEW_SELECTOR);
}

function getPostElementsFromRoot(root) {
  if (isNewFeedRoot(root) || isInsideNewFeed(root)) {
    return getNewFeedPostRoots(root);
  }
  if (shouldIgnoreElement(root)) {
    return [];
  }
  return Array.from(root.querySelectorAll('div[role="article"][data-urn^="urn:li:activity:"], div[role="article"][data-urn^="urn:li:aggregate:"]'));
}

function scanForPostArticles(root) {
  // Early exit if extension is disabled
  if (!filterSettings.extensionEnabled) {
    return;
  }
  
  if (!root || root.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  
  const isNewDom = isNewFeedRoot(root) || isInsideNewFeed(root);
  const postElements = getPostElementsFromRoot(root);
  
  for (const article of postElements) {
    const urn = isNewDom ? getOrAssignNewDomUrn(article) : (article.getAttribute('data-urn') || getActivityUrn(article));
    
    if (!urn || processedUrns.has(urn)) {
      continue;
    }
    
    processedUrns.add(urn);
    
    let classification = window.LinkedInFilter.classifyPost(article);
    if (!filterSettings.experimentalFilters && EXPERIMENTAL_CLASSIFICATIONS.has(classification)) {
      classification = "other";
    }
    const shouldBlock = shouldBlockByClassification(classification);
    
    if (shouldBlock) {
      blockPost(article, urn, classification);
      
      if (classification === "other") {
        categorizePostWithAI(article, urn);
      }
    }
  }
}

async function categorizePostWithAI(postElement, urn) {
  // Skip AI processing if disabled in settings
  if (!filterSettings.aiEnabled) {
    console.log('[LinkedIn Filter] AI processing disabled, keeping "Uncategorized" label');
    return;
  }
  
  const postText = window.LinkedInFilter.extractPostText(postElement);
  
  if (!postText || !postText.trim()) {
    console.log('[LinkedIn Filter] No text found for post:', urn);
    return;
  }
  
  window.LinkedInFilter.updateOverlayLabel(postElement, "Processing...");
  
  const prompt = `Categorize this LinkedIn post in exactly 1-3 words only. Return ONLY the category name with no markdown, stars, asterisks, or formatting. Just the words. Post: "${postText.substring(0, 1000)}"`;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: "llm",
      text: prompt
    });
    
    if (response.error) {
      console.error('[LinkedIn Filter] AI categorization error:', response.error);
      window.LinkedInFilter.updateOverlayLabel(postElement, "Uncategorized");
    } else {
      console.log('[LinkedIn Filter] AI categorization for post', urn, ':', response.result);
      
      let aiLabel = response.result
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#/g, '')
        .replace(/\[|\]/g, '')
        .trim();
      
      const words = aiLabel.split(/\s+/).slice(0, 3);
      aiLabel = words.join(' ');
      
      if (!aiLabel || aiLabel.length === 0) {
        aiLabel = "Uncategorized";
      }
      
      window.LinkedInFilter.updateOverlayLabel(postElement, aiLabel);
    }
  } catch (error) {
    console.error('[LinkedIn Filter] Failed to categorize post with AI:', error);
    window.LinkedInFilter.updateOverlayLabel(postElement, "Uncategorized");
  }
}

function blockPost(postElement, urn, classification) {
  if (window.LinkedInFilter.userRevealed.has(urn)) {
    return;
  }
  
  if (blockedUrns.has(urn)) {
    return;
  }
  
  blockedUrns.add(urn);
  
  postElement.currentPostKey = urn;
  postElement.currentClassification = classification;
  
  let label = "Uncategorized";
  if (classification === "hiring") {
    label = "Hiring";
  } else if (classification === "hired_announcement") {
    label = "Hired announcement";
  } else if (classification === "grindset") {
    label = "Hustle culture";
  } else if (classification === "sponsored") {
    label = "Sponsored/Ad";
  } else if (classification === "sales_pitch") {
    label = "Sales Pitch";
  } else if (classification === "job_seeking") {
    label = "Job Seeking";
  } else if (classification === "events") {
    label = "Event/Webinar";
  } else if (classification === "educational") {
    label = "Educational/Tips";
  } else if (classification === "project_launch") {
    label = "Project Launch";
  } else if (classification === "congrats") {
    label = "Certifications";
  } else if (classification === "other") {
    label = "Uncategorized";
  }
  
  window.LinkedInFilter.blurPost(postElement, false, label, filterSettings.opaqueOverlay, filterSettings.hideRevealButton);
}

function findFeedContainer() {
  let container = document.querySelector('.scaffold-finite-scroll__content[data-finite-scroll-hotkey-context="FEED"]');
  
  if (!container) {
    container = document.querySelector('.scaffold-finite-scroll__content');
  }
  
  return container;
}

function getFeedContainers() {
  const containers = [];
  const oldFeed = findFeedContainer();
  if (oldFeed) containers.push(oldFeed);
  const newFeed = findNewFeedContainer();
  if (newFeed) containers.push(newFeed);
  return containers;
}

let feedObservers = [];
let isInitialized = false;
let pendingScanWork = null;

function scheduleScanWork(roots) {
  if (pendingScanWork) {
    if (typeof pendingScanWork === 'number') {
      clearTimeout(pendingScanWork);
    } else {
      cancelIdleCallback(pendingScanWork);
    }
  }
  
  if (window.requestIdleCallback) {
    pendingScanWork = requestIdleCallback(() => {
      for (const root of roots) {
        scanForPostArticles(root);
      }
      pendingScanWork = null;
    }, { timeout: 100 });
  } else {
    pendingScanWork = setTimeout(() => {
      for (const root of roots) {
        scanForPostArticles(root);
      }
      pendingScanWork = null;
    }, 0);
  }
}

function attachFeedObserver(feedContainer) {
  scanForPostArticles(feedContainer);

  const observer = new MutationObserver((mutations) => {
    const addedRoots = [];

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const urn = getActivityUrn(node);
          if (urn && !processedUrns.has(urn)) {
            addedRoots.push(node);
            continue;
          }
          if (node.closest && node.closest(FEED_ROOT_NEW_SELECTOR)) {
            addedRoots.push(node);
            continue;
          }
          if (!shouldIgnoreElement(node)) {
            addedRoots.push(node);
          }
        }
      }
    }

    if (addedRoots.length > 0) {
      scheduleScanWork(addedRoots);
    }
  });

  observer.observe(feedContainer, {
    childList: true,
    subtree: true
  });

  feedObservers.push(observer);
}

function initializeFeedObserver() {
  if (isInitialized && feedObservers.length > 0) {
    return;
  }

  const containers = getFeedContainers();

  if (containers.length === 0) {
    setTimeout(() => {
      if (!isInitialized) {
        initializeFeedObserver();
      }
    }, 500);
    return;
  }

  feedObservers = [];
  for (const feedContainer of containers) {
    attachFeedObserver(feedContainer);
  }
  isInitialized = true;
}

function reinitializeFeedObserver() {
  for (const obs of feedObservers) {
    obs.disconnect();
  }
  feedObservers = [];
  isInitialized = false;

  processedUrns.clear();
  blockedUrns.clear();

  setTimeout(() => {
    initializeFeedObserver();
  }, 500);
}

function startInitialization() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeFeedObserver, 100);
    });
  } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setTimeout(initializeFeedObserver, 100);
  } else {
    initializeFeedObserver();
  }
}

startInitialization();

function setupNewPostsReloadListener() {
  console.log('[LinkedIn Filter] Setting up New posts button listener...');
  
  // Use event delegation on the document to catch clicks on the "New posts" button
  document.addEventListener('click', (e) => {
    const button = e.target.closest('button[type="button"]');
    
    if (!button) return;
    
    // Check if this button contains "New posts" text
    const buttonText = button.textContent || '';
    if (buttonText.includes('New posts')) {
      console.log('[LinkedIn Filter] New posts button clicked, reloading page...');
      e.preventDefault();
      e.stopPropagation();
      
      // Small delay to ensure the click is processed
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }, true); // Use capture phase to catch it early
  
  console.log('[LinkedIn Filter] New posts listener active');
}

// Ensure the New posts listener is active
setupNewPostsReloadListener();

if (document.readyState !== 'complete') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (!isInitialized || feedObservers.length === 0) {
        initializeFeedObserver();
      }
    }, 500);
  });
}

let lastUrl = location.href;
function isFeedPath(href) {
  try {
    const urlObj = new URL(href, location.origin);
    const path = urlObj.pathname || '';
    return path === '/feed' || path.startsWith('/feed/');
  } catch (e) {
    return typeof href === 'string' && href.includes('/feed');
  }
}

function handleUrlChange(prevUrl, nextUrl) {
  const wentToFeed = !isFeedPath(prevUrl) && isFeedPath(nextUrl);
  if (wentToFeed) {
    try {
      window.location.reload();
    } catch (e) {
      // Swallow failures silently
    }
    return;
  }
  setTimeout(() => reinitializeFeedObserver(), 500);
}

const navigationObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    handleUrlChange(lastUrl, url);
    lastUrl = url;
  }
});

navigationObserver.observe(document, { subtree: true, childList: true });

window.addEventListener('popstate', () => {
  const url = location.href;
  if (url !== lastUrl) {
    handleUrlChange(lastUrl, url);
    lastUrl = url;
  }
});

const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  const prev = lastUrl;
  const target = args.length >= 3 ? args[2] : undefined;
  let nextCandidate = null;
  if (typeof target === 'string') {
    try {
      nextCandidate = new URL(target, location.origin).href;
    } catch {}
  }
  if (nextCandidate && !isFeedPath(prev) && isFeedPath(nextCandidate)) {
    lastUrl = nextCandidate;
    try { window.location.href = nextCandidate; } catch {}
    try { window.location.reload(); } catch {}
    return;
  }
  originalPushState.apply(history, args);
  const next = location.href;
  if (next !== prev) {
    handleUrlChange(prev, next);
    lastUrl = next;
  }
};

history.replaceState = function(...args) {
  const prev = lastUrl;
  const target = args.length >= 3 ? args[2] : undefined;
  let nextCandidate = null;
  if (typeof target === 'string') {
    try {
      nextCandidate = new URL(target, location.origin).href;
    } catch {}
  }
  if (nextCandidate && !isFeedPath(prev) && isFeedPath(nextCandidate)) {
    lastUrl = nextCandidate;
    try { window.location.href = nextCandidate; } catch {}
    try { window.location.reload(); } catch {}
    return;
  }
  originalReplaceState.apply(history, args);
  const next = location.href;
  if (next !== prev) {
    handleUrlChange(prev, next);
    lastUrl = next;
  }
};

async function reEvaluateAllPosts() {
  await loadFilterSettings();

  const containers = getFeedContainers();
  if (containers.length === 0) return;

  const articles = [];
  for (const feedContainer of containers) {
    articles.push(...getPostElementsFromRoot(feedContainer));
  }

  // If extension is disabled, remove all overlays
  if (!filterSettings.extensionEnabled) {
    for (const article of articles) {
      const overlays = article.querySelectorAll('.linkedin-filter-overlay');
      overlays.forEach(overlay => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      });
      article.classList.remove('linkedin-filter-blurred');
      const urn = getActivityUrn(article) || article.getAttribute('data-slopblock-urn');
      if (urn) blockedUrns.delete(urn);
    }
    return;
  }

  for (const article of articles) {
    const isNewDom = isInsideNewFeed(article);
    const urn = isNewDom ? getOrAssignNewDomUrn(article) : (article.getAttribute('data-urn') || getActivityUrn(article));
    if (!urn) continue;

    if (window.LinkedInFilter.userRevealed.has(urn)) {
      continue;
    }

    let classification = window.LinkedInFilter.classifyPost(article);
    if (!filterSettings.experimentalFilters && EXPERIMENTAL_CLASSIFICATIONS.has(classification)) {
      classification = "other";
    }
    const shouldBlock = shouldBlockByClassification(classification);

    const isCurrentlyBlocked = article.classList.contains('linkedin-filter-blurred');

    if (shouldBlock && !isCurrentlyBlocked) {
      blockPost(article, urn, classification);
    } else if (!shouldBlock && isCurrentlyBlocked) {
      const overlays = article.querySelectorAll('.linkedin-filter-overlay');
      overlays.forEach(overlay => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      });
      article.classList.remove('linkedin-filter-blurred');
      blockedUrns.delete(urn);
    }
  }
}

function updateAllOverlayStyles() {
  const containers = getFeedContainers();
  for (const feedContainer of containers) {
    const blurredPosts = feedContainer.querySelectorAll('.linkedin-filter-blurred');
    for (const post of blurredPosts) {
      const urn = post.getAttribute('data-urn') || post.getAttribute('data-slopblock-urn');
      if (urn && !window.LinkedInFilter.userRevealed.has(urn)) {
        window.LinkedInFilter.updateOverlayStyle(post, filterSettings.opaqueOverlay, filterSettings.hideRevealButton);
      }
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'settingsChanged') {
    filterSettings = message.settings || filterSettings;
    updateAllOverlayStyles();
    reEvaluateAllPosts();
    sendResponse({ success: true });
  }
  return true;
});
