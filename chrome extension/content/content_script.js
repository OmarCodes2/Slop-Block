const processedUrns = new Set();
const blockedUrns = new Set();
let filterSettings = {
  showHiringPosts: true,
  showJobAnnouncements: false,
  showGrindset: false,
  showAiDoomer: false,
  showChildProdigy: false,
  showSponsored: false,
  showSalesPitch: false,
  showJobSeeking: false,
  showEvents: false,
  showEngagementBait: false,
  showEducational: false,
  showProjectLaunch: false,
  showCongrats: false,
  showOther: false,
  aiEnabled: true,
  opaqueOverlay: false
};
async function loadFilterSettings() {
  try {
    const result = await chrome.storage.sync.get([
      'showHiringPosts', 'showJobAnnouncements', 'showGrindset', 'showAiDoomer', 'showChildProdigy',
      'showSponsored', 'showSalesPitch', 'showJobSeeking', 'showEvents', 'showEngagementBait',
      'showEducational', 'showProjectLaunch', 'showCongrats', 'showOther', 'aiEnabled', 'opaqueOverlay'
    ]);
    filterSettings = {
      showHiringPosts: result.showHiringPosts !== undefined ? result.showHiringPosts : true,
      showJobAnnouncements: result.showJobAnnouncements !== undefined ? result.showJobAnnouncements : false,
      showGrindset: result.showGrindset !== undefined ? result.showGrindset : false,
      showAiDoomer: result.showAiDoomer !== undefined ? result.showAiDoomer : false,
      showChildProdigy: result.showChildProdigy !== undefined ? result.showChildProdigy : false,
      showSponsored: result.showSponsored !== undefined ? result.showSponsored : false,
      showSalesPitch: result.showSalesPitch !== undefined ? result.showSalesPitch : false,
      showJobSeeking: result.showJobSeeking !== undefined ? result.showJobSeeking : false,
      showEvents: result.showEvents !== undefined ? result.showEvents : false,
      showEngagementBait: result.showEngagementBait !== undefined ? result.showEngagementBait : false,
      showEducational: result.showEducational !== undefined ? result.showEducational : false,
      showProjectLaunch: result.showProjectLaunch !== undefined ? result.showProjectLaunch : false,
      showCongrats: result.showCongrats !== undefined ? result.showCongrats : false,
      showOther: result.showOther !== undefined ? result.showOther : false,
      aiEnabled: result.aiEnabled !== undefined ? result.aiEnabled : true,
      opaqueOverlay: result.opaqueOverlay !== undefined ? result.opaqueOverlay : false
    };
  } catch (error) {
    console.error('[LinkedIn Filter] Error loading settings:', error);
    filterSettings = {
      showHiringPosts: true,
      showJobAnnouncements: false,
      showGrindset: false,
      showAiDoomer: false,
      showChildProdigy: false,
      showSponsored: false,
      showSalesPitch: false,
      showJobSeeking: false,
      showEvents: false,
      showEngagementBait: false,
      showEducational: false,
      showProjectLaunch: false,
      showCongrats: false,
      showOther: false
    };
  }
}

loadFilterSettings();

function getActivityUrn(el) {
  const urn = el.getAttribute('data-urn');
  if (urn && urn.startsWith('urn:li:activity:')) {
    return urn;
  }
  
  if (el.matches && el.matches('div[role="article"][data-urn^="urn:li:activity:"]')) {
    return el.getAttribute('data-urn');
  }
  
  const article = el.querySelector('div[role="article"][data-urn^="urn:li:activity:"]');
  if (article) {
    return article.getAttribute('data-urn');
  }
  
  return null;
}

function shouldIgnoreElement(el) {
  const dataId = el.getAttribute('data-id');
  if (dataId && dataId.startsWith('urn:li:aggregate:')) {
    return true;
  }
  
  if (el.classList && el.classList.contains('occludable-update-hint') && 
      el.classList.contains('occludable-update')) {
    const hasArticleWithUrn = el.querySelector('div[role="article"][data-urn^="urn:li:activity:"]');
    if (!hasArticleWithUrn) {
      return true;
    }
  }
  
  return false;
}

function scanForPostArticles(root) {
  if (!root || root.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  
  if (shouldIgnoreElement(root)) {
    return;
  }
  
  const articles = root.querySelectorAll('div[role="article"][data-urn^="urn:li:activity:"]');
  
  for (const article of articles) {
    const urn = article.getAttribute('data-urn');
    
    if (!urn || processedUrns.has(urn)) {
      continue;
    }
    
    processedUrns.add(urn);
    
    const classification = window.LinkedInFilter.classifyPost(article);
    
    let shouldBlock = false;
    
    if (classification === "hiring") {
      shouldBlock = !filterSettings.showHiringPosts;
    } else if (classification === "hired_announcement") {
      shouldBlock = !filterSettings.showJobAnnouncements;
    } else if (classification === "grindset") {
      shouldBlock = !filterSettings.showGrindset;
    } else if (classification === "ai_doomer") {
      shouldBlock = !filterSettings.showAiDoomer;
    } else if (classification === "child_prodigy") {
      shouldBlock = !filterSettings.showChildProdigy;
    } else if (classification === "sponsored") {
      shouldBlock = !filterSettings.showSponsored;
    } else if (classification === "sales_pitch") {
      shouldBlock = !filterSettings.showSalesPitch;
    } else if (classification === "job_seeking") {
      shouldBlock = !filterSettings.showJobSeeking;
    } else if (classification === "events") {
      shouldBlock = !filterSettings.showEvents;
    } else if (classification === "engagement_bait") {
      shouldBlock = !filterSettings.showEngagementBait;
    } else if (classification === "educational") {
      shouldBlock = !filterSettings.showEducational;
    } else if (classification === "project_launch") {
      shouldBlock = !filterSettings.showProjectLaunch;
    } else if (classification === "congrats") {
      shouldBlock = !filterSettings.showCongrats;
    } else if (classification === "other") {
      shouldBlock = !filterSettings.showOther;
    } else {
      shouldBlock = true;
    }
    
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
    console.log('[LinkedIn Filter] AI processing disabled, keeping "Other" label');
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
      window.LinkedInFilter.updateOverlayLabel(postElement, "Other");
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
        aiLabel = "Other";
      }
      
      window.LinkedInFilter.updateOverlayLabel(postElement, aiLabel);
    }
  } catch (error) {
    console.error('[LinkedIn Filter] Failed to categorize post with AI:', error);
    window.LinkedInFilter.updateOverlayLabel(postElement, "Other");
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
  
  let label = "Other";
  if (classification === "hiring") {
    label = "Hiring";
  } else if (classification === "hired_announcement") {
    label = "Hired announcement";
  } else if (classification === "grindset") {
    label = "LinkedIn Grindset Final Boss";
  } else if (classification === "ai_doomer") {
    label = "AI Doomer";
  } else if (classification === "child_prodigy") {
    label = "Child Prodigy Flex";
  } else if (classification === "sponsored") {
    label = "Sponsored/Ad";
  } else if (classification === "sales_pitch") {
    label = "Sales Pitch";
  } else if (classification === "job_seeking") {
    label = "Job Seeking";
  } else if (classification === "events") {
    label = "Event/Webinar";
  } else if (classification === "engagement_bait") {
    label = "Engagement Bait";
  } else if (classification === "educational") {
    label = "Educational/Tips";
  } else if (classification === "project_launch") {
    label = "Project Launch";
  } else if (classification === "congrats") {
    label = "Congrats/Cert";
  } else if (classification === "other") {
    label = "Other";
  }
  
  window.LinkedInFilter.blurPost(postElement, false, label, filterSettings.opaqueOverlay);
}

function findFeedContainer() {
  let container = document.querySelector('.scaffold-finite-scroll__content[data-finite-scroll-hotkey-context="FEED"]');
  
  if (!container) {
    container = document.querySelector('.scaffold-finite-scroll__content');
  }
  
  return container;
}

let feedObserver = null;
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

function initializeFeedObserver() {
  if (isInitialized && feedObserver) {
    return;
  }
  
  const feedContainer = findFeedContainer();
  
  if (!feedContainer) {
    setTimeout(() => {
      if (!isInitialized) {
        initializeFeedObserver();
      }
    }, 500);
    return;
  }
  
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
  
  feedObserver = observer;
  isInitialized = true;
}

function reinitializeFeedObserver() {
  if (feedObserver) {
    feedObserver.disconnect();
    feedObserver = null;
  }
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

if (document.readyState !== 'complete') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (!isInitialized || !feedObserver) {
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
  
  const feedContainer = findFeedContainer();
  if (!feedContainer) return;
  
  const articles = feedContainer.querySelectorAll('div[role="article"][data-urn^="urn:li:activity:"]');
  
  for (const article of articles) {
    const urn = article.getAttribute('data-urn');
    if (!urn) continue;
    
    if (window.LinkedInFilter.userRevealed.has(urn)) {
      continue;
    }
    
    const classification = window.LinkedInFilter.classifyPost(article);
    
    let shouldBlock = false;
    
    if (classification === "hiring") {
      shouldBlock = !filterSettings.showHiringPosts;
    } else if (classification === "hired_announcement") {
      shouldBlock = !filterSettings.showJobAnnouncements;
    } else if (classification === "grindset") {
      shouldBlock = !filterSettings.showGrindset;
    } else if (classification === "ai_doomer") {
      shouldBlock = !filterSettings.showAiDoomer;
    } else if (classification === "child_prodigy") {
      shouldBlock = !filterSettings.showChildProdigy;
    } else if (classification === "sponsored") {
      shouldBlock = !filterSettings.showSponsored;
    } else if (classification === "sales_pitch") {
      shouldBlock = !filterSettings.showSalesPitch;
    } else if (classification === "job_seeking") {
      shouldBlock = !filterSettings.showJobSeeking;
    } else if (classification === "events") {
      shouldBlock = !filterSettings.showEvents;
    } else if (classification === "engagement_bait") {
      shouldBlock = !filterSettings.showEngagementBait;
    } else if (classification === "educational") {
      shouldBlock = !filterSettings.showEducational;
    } else if (classification === "project_launch") {
      shouldBlock = !filterSettings.showProjectLaunch;
    } else if (classification === "congrats") {
      shouldBlock = !filterSettings.showCongrats;
    } else if (classification === "other") {
      shouldBlock = !filterSettings.showOther;
    } else {
      shouldBlock = true;
    }
    
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
  const feedContainer = findFeedContainer();
  if (!feedContainer) return;
  
  const blurredPosts = feedContainer.querySelectorAll('.linkedin-filter-blurred');
  
  for (const post of blurredPosts) {
    const urn = post.getAttribute('data-urn');
    if (urn && !window.LinkedInFilter.userRevealed.has(urn)) {
      window.LinkedInFilter.updateOverlayStyle(post, filterSettings.opaqueOverlay);
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
