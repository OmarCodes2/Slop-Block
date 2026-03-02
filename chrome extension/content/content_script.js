const processedUrns = new Set();
const blockedUrns = new Set();
let newDomIdCounter = 0;

// New LinkedIn feed DOM (A/B test) - data attributes only, no class names
const FEED_ROOT_NEW_SELECTOR = 'div[data-testid="mainFeed"][data-component-type="LazyColumn"]';
const POST_MARKER_NEW_SELECTOR = 'div[data-view-name="feed-full-update"]';
const POST_ROOT_ROLE_NEW = 'listitem';

const EXPERIMENTAL_CLASSIFICATIONS = new Set([
  'sales_pitch', 'job_seeking', 'events',
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
  hideRevealButton: false,
  showPosterInfo: true
};
async function loadFilterSettings() {
  try {
    const result = await chrome.storage.sync.get([
      'extensionEnabled', 'showHiringPosts', 'showJobAnnouncements', 'showGrindset',
      'showSponsored', 'showSalesPitch', 'showJobSeeking', 'showEvents',
      'showEducational', 'showProjectLaunch', 'showCongrats', 'showOther', 'experimentalFilters', 'aiEnabled', 'opaqueOverlay', 'hideRevealButton', 'showPosterInfo'
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
      hideRevealButton: result.hideRevealButton !== undefined ? result.hideRevealButton : false,
      showPosterInfo: true
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

// Job cards ("Jobs recommended for you") are not posts — exclude them from filtering
const JOB_CARD_SELECTOR = '[data-view-name="job-card"]';

function getNewFeedPostRoots(scope) {
  if (!scope || scope.nodeType !== Node.ELEMENT_NODE) return [];
  const markers = scope.querySelectorAll(POST_MARKER_NEW_SELECTOR);
  const roots = new Set();
  markers.forEach((el) => {
    const listItem = el.closest('div[role="' + POST_ROOT_ROLE_NEW + '"]');
    if (listItem) {
      // Skip listitems that are or contain job cards (recommended jobs), not feed posts
      if (listItem.querySelector(JOB_CARD_SELECTOR) || listItem.closest(JOB_CARD_SELECTOR)) {
        return;
      }
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
    // Never treat job cards ("Jobs recommended for you") as posts
    if (article.querySelector(JOB_CARD_SELECTOR) || article.closest(JOB_CARD_SELECTOR)) {
      continue;
    }
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

// Invalid actor name labels (from LinkedIn UI) - do not use as display name
const INVALID_ACTOR_NAMES = new Set([
  'Follow', 'Promoted', 'Feed post', 'Like', 'Comment', 'Repost', 'Send', 'View more options'
]);

const ACTOR_URL_PATTERNS = /linkedin\.com\/(in|company|school)\//;

// Match both ASCII apostrophe (') and Unicode right single quote (')
const APOS = "'\u2019";

/** Return just the name: strip "company: ", "'s profile", " profile", trailing "'s". */
function normalizeActorName(s) {
  if (!s || typeof s !== 'string') return '';
  let t = s.trim();
  t = t.replace(/^company:\s*/i, '').trim();
  t = t.replace(new RegExp(`[${APOS}]s\\s+profile$`, 'i'), '').trim();
  t = t.replace(/\s+profile$/i, '').trim();
  t = t.replace(new RegExp(`[${APOS}]s$`, 'i'), '').trim();
  return t.trim();
}

function extractNameFromLabel(label) {
  if (!label || typeof label !== 'string') return '';
  let t = label.trim();
  t = t.replace(/^view[:\s]+/i, '');
  t = t.replace(/^open control menu for post by\s+/i, '');
  t = t.replace(/^dismiss post by\s+/i, '');
  t = t.split(' • ')[0];
  t = t.replace(/\s+premium\b.*$/i, '');
  t = t.replace(/\s+link$/i, '');
  t = t.replace(new RegExp(`[${APOS}]s.*$`, 'i'), '');
  return normalizeActorName(t);
}

/**
 * Extract actor info from a single feed post root (v2 DOM only).
 * Post root = element with role="listitem" that contains [data-view-name="feed-full-update"].
 * Returns { actorName, actorProfileUrl, actorPfpUrl } or null if invalid.
 * DOM-only; no network requests. Uses data-view-name, href patterns, aria-label, alt.
 */
function extractActorFromPost(postRoot) {
  if (!postRoot || !postRoot.querySelector) return null;

  const feedFull = postRoot.querySelector('[data-view-name="feed-full-update"]');
  if (!feedFull) return null;

  // 2) Choose actor anchor: prefer original author (feed-actor-image), then header (feed-header-actor-image)
  let anchor = feedFull.querySelector('a[data-view-name="feed-actor-image"][href]');
  if (anchor && anchor.href && ACTOR_URL_PATTERNS.test(anchor.href)) {
    // use this
  } else {
    anchor = feedFull.querySelector('a[data-view-name="feed-header-actor-image"][href]');
  }
  if (!anchor || !anchor.href || !ACTOR_URL_PATTERNS.test(anchor.href)) {
    const actorImageAnchors = feedFull.querySelectorAll('a[data-view-name$="actor-image"][href]');
    for (const a of actorImageAnchors) {
      if (a.href && ACTOR_URL_PATTERNS.test(a.href)) {
        anchor = a;
        break;
      }
    }
  }
  if (!anchor || !anchor.href || !ACTOR_URL_PATTERNS.test(anchor.href)) {
    const commentary = feedFull.querySelector('[data-view-name="feed-commentary"], [data-testid="expandable-text-box"]');
    const allActorLinks = feedFull.querySelectorAll('a[href*="linkedin.com/in/"], a[href*="linkedin.com/company/"], a[href*="linkedin.com/school/"]');
    for (const a of allActorLinks) {
      if (commentary && commentary.contains(a)) continue;
      anchor = a;
      break;
    }
    if (!anchor) anchor = allActorLinks[0] || null;
  }

  if (!anchor || !anchor.href) return null;

  const actorProfileUrl = anchor.href.startsWith('http') ? anchor.href : new URL(anchor.href, document.baseURI).href;
  if (!ACTOR_URL_PATTERNS.test(actorProfileUrl)) return null;

  // 3) actorName
  let actorName = null;
  const strong = anchor.querySelector('strong');
  const p = anchor.querySelector('p');
  if (strong && strong.textContent && strong.textContent.trim()) {
    actorName = strong.textContent.trim();
  } else if (p && p.textContent && p.textContent.trim()) {
    actorName = p.textContent.trim();
  }
  if (!actorName) {
    const avatarImg = anchor.querySelector('img[alt]') || anchor.querySelector('figure img[alt]');
    if (avatarImg && avatarImg.alt) {
      let alt = avatarImg.alt.trim();
      if (alt.startsWith('View ')) {
        alt = alt.slice(5);
        alt = alt.replace(new RegExp(`[${APOS}]s profile$`, 'i'), '').replace(/\s+profile$/i, '').replace(/\s+company:\s*$/i, '').trim();
      }
      if (alt && alt.length < 200) actorName = alt;
    }
  }
  if (!actorName && anchor.closest) {
    const row = anchor.closest('div');
    if (row) {
      const paragraphs = row.querySelectorAll('p');
      for (const para of paragraphs) {
        const text = para.textContent && para.textContent.trim();
        if (text && text.length > 0 && text.length < 80) {
          actorName = text;
          break;
        }
      }
    }
  }
  if (!actorName) {
    try {
      const url = new URL(actorProfileUrl);
      const path = url.pathname;
      const companyMatch = path.match(/\/company\/([^/]+)/);
      const inMatch = path.match(/\/in\/([^/]+)/);
      const schoolMatch = path.match(/\/school\/([^/]+)/);
      const slug = (companyMatch && companyMatch[1]) || (inMatch && inMatch[1]) || (schoolMatch && schoolMatch[1]);
      if (slug) {
        actorName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    } catch (_) {}
  }

  actorName = normalizeActorName(actorName);
  if (!actorName || INVALID_ACTOR_NAMES.has(actorName)) return null;

  // 4) actorPfpUrl
  let actorPfpUrl = null;
  const pfpImg = anchor.querySelector('img[src]');
  if (pfpImg && pfpImg.src && pfpImg.src.startsWith('http') && pfpImg.src.includes('media.licdn.com') && !pfpImg.src.startsWith('data:')) {
    actorPfpUrl = pfpImg.src;
  }
  if (!actorPfpUrl) {
    const figure = anchor.querySelector('figure') || anchor.closest('figure');
    const figImg = figure && figure.querySelector('img[src]');
    if (figImg && figImg.src && figImg.src.startsWith('http') && figImg.src.includes('media.licdn.com')) {
      actorPfpUrl = figImg.src;
    }
  }

  return { actorName, actorProfileUrl, actorPfpUrl: actorPfpUrl || null };
}

/**
 * Extract actor info from a single feed post root (v1 DOM only).
 * Post root = element that contains .update-components-actor__container.
 * Returns { actorName, actorProfileUrl, actorPfpUrl } or null if invalid.
 */
function extractActorFromV1Post(postRoot) {
  if (!postRoot || !postRoot.querySelector) return null;

  const actorContainer = postRoot.querySelector('.update-components-actor__container');
  if (!actorContainer) return null;

  let anchor = actorContainer.querySelector('a.update-components-actor__image[href]')
    || actorContainer.querySelector('a.update-components-actor__meta-link[href]');

  if (!anchor) {
    const links = actorContainer.querySelectorAll('a[href*="linkedin.com/in/"], a[href*="linkedin.com/company/"], a[href*="linkedin.com/school/"]');
    anchor = links[0] || null;
  }
  if (!anchor || !anchor.href) return null;

  const actorProfileUrl = anchor.href.startsWith('http') ? anchor.href : new URL(anchor.href, document.baseURI).href;
  if (!ACTOR_URL_PATTERNS.test(actorProfileUrl)) return null;

  let actorName = null;
  const nameSpan = actorContainer.querySelector('.update-components-actor__single-line-truncate span[aria-hidden="true"]');
  if (nameSpan && nameSpan.textContent && nameSpan.textContent.trim()) {
    actorName = nameSpan.textContent.trim();
  }
  if (!actorName && anchor.getAttribute) {
    actorName = extractNameFromLabel(anchor.getAttribute('aria-label'));
  }
  if (!actorName) {
    const altImg = actorContainer.querySelector('img[alt]');
    if (altImg && altImg.alt) {
      actorName = extractNameFromLabel(altImg.alt);
    }
  }
  if (!actorName) {
    try {
      const url = new URL(actorProfileUrl);
      const path = url.pathname;
      const companyMatch = path.match(/\/company\/([^/]+)/);
      const inMatch = path.match(/\/in\/([^/]+)/);
      const schoolMatch = path.match(/\/school\/([^/]+)/);
      const slug = (companyMatch && companyMatch[1]) || (inMatch && inMatch[1]) || (schoolMatch && schoolMatch[1]);
      if (slug) {
        actorName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    } catch (_) {}
  }

  actorName = normalizeActorName(actorName);
  if (!actorName || INVALID_ACTOR_NAMES.has(actorName)) return null;

  let actorPfpUrl = null;
  const pfpImg = actorContainer.querySelector('img.update-components-actor__avatar-image[src]')
    || actorContainer.querySelector('img[src]');
  if (pfpImg && pfpImg.src && pfpImg.src.startsWith('http') && pfpImg.src.includes('media.licdn.com') && !pfpImg.src.startsWith('data:')) {
    actorPfpUrl = pfpImg.src;
  }

  return { actorName, actorProfileUrl, actorPfpUrl: actorPfpUrl || null };
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

  // Extract actor info from the right DOM version.
  let actorInfo = null;
  if (isInsideNewFeed(postElement)) {
    actorInfo = extractActorFromPost(postElement);
  } else {
    actorInfo = extractActorFromV1Post(postElement);
  }

  window.LinkedInFilter.blurPost(postElement, false, label, filterSettings.opaqueOverlay, filterSettings.hideRevealButton, filterSettings.showPosterInfo, actorInfo);
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
        window.LinkedInFilter.updateOverlayStyle(post, filterSettings.opaqueOverlay, filterSettings.hideRevealButton, filterSettings.showPosterInfo);
      }
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'settingsChanged') {
    filterSettings = message.settings || filterSettings;
    filterSettings.showPosterInfo = true;
    updateAllOverlayStyles();
    reEvaluateAllPosts();
    sendResponse({ success: true });
  }
  return true;
});
