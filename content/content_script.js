/**
 * Content Script for LinkedIn Feed Filter
 * 
 * URN-based post identification and blocking:
 * - Identifies posts via: div[role="article"][data-urn^="urn:li:activity:"]
 * - Uses data-urn as the canonical identifier for deduplication
 * - Blocks all individual posts (no filtering logic)
 * - Performance-optimized: only scans added subtrees, uses requestIdleCallback
 */

// Session state: track processed and blocked posts by URN
const processedUrns = new Set(); // URNs we've already processed
const blockedUrns = new Set(); // URNs that are currently blocked

/**
 * Extract activity URN from an element
 * Returns the data-urn if it's a valid activity URN, else null
 * 
 * @param {Element} el - The element to check
 * @returns {string|null} The URN if valid, else null
 */
function getActivityUrn(el) {
  // Check if element itself has the URN
  const urn = el.getAttribute('data-urn');
  if (urn && urn.startsWith('urn:li:activity:')) {
    return urn;
  }
  
  // Check if element is an article with the URN
  if (el.matches && el.matches('div[role="article"][data-urn^="urn:li:activity:"]')) {
    return el.getAttribute('data-urn');
  }
  
  // Check for nested article with URN
  const article = el.querySelector('div[role="article"][data-urn^="urn:li:activity:"]');
  if (article) {
    return article.getAttribute('data-urn');
  }
  
  return null;
}

/**
 * Check if an element should be ignored (aggregate or placeholder)
 * 
 * @param {Element} el - The element to check
 * @returns {boolean} True if should be ignored
 */
function shouldIgnoreElement(el) {
  // Ignore aggregates
  const dataId = el.getAttribute('data-id');
  if (dataId && dataId.startsWith('urn:li:aggregate:')) {
    return true;
  }
  
  // Ignore lazy placeholders that don't contain articles with data-urn
  if (el.classList && el.classList.contains('occludable-update-hint') && 
      el.classList.contains('occludable-update')) {
    const hasArticleWithUrn = el.querySelector('div[role="article"][data-urn^="urn:li:activity:"]');
    if (!hasArticleWithUrn) {
      return true;
    }
  }
  
  return false;
}

/**
 * Scan a root element for post articles and process them
 * Only processes posts that haven't been seen before
 * 
 * @param {Element} root - Root element to scan within
 */
function scanForPostArticles(root) {
  // Skip if root is not an element
  if (!root || root.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  
  // Ignore aggregates and placeholders
  if (shouldIgnoreElement(root)) {
    return;
  }
  
  // Find all article elements with activity URNs
  const articles = root.querySelectorAll('div[role="article"][data-urn^="urn:li:activity:"]');
  
  for (const article of articles) {
    const urn = article.getAttribute('data-urn');
    
    // Skip if no URN or already processed
    if (!urn || processedUrns.has(urn)) {
      continue;
    }
    
    // Mark as processed immediately to prevent double-processing
    processedUrns.add(urn);
    
    // Block the post
    blockPost(article, urn);
  }
}

/**
 * Block a post element using the existing overlay UI
 * 
 * @param {Element} postElement - The post article element
 * @param {string} urn - The URN identifier
 */
function blockPost(postElement, urn) {
  // Skip if user has already revealed this post
  if (window.LinkedInFilter.userRevealed.has(urn)) {
    return;
  }
  
  // Skip if already blocked
  if (blockedUrns.has(urn)) {
    return;
  }
  
  // Mark as blocked
  blockedUrns.add(urn);
  
  // Store URN on element for reveal functionality
  postElement.currentPostKey = urn;
  
  // Apply the existing overlay/blur UI
  window.LinkedInFilter.blurPost(postElement, false);
}

/**
 * Find the feed container element
 * 
 * @returns {Element|null} The feed container or null if not found
 */
function findFeedContainer() {
  // Primary: scaffold-finite-scroll__content with FEED context
  let container = document.querySelector('.scaffold-finite-scroll__content[data-finite-scroll-hotkey-context="FEED"]');
  
  // Fallback: scaffold-finite-scroll__content without context
  if (!container) {
    container = document.querySelector('.scaffold-finite-scroll__content');
  }
  
  return container;
}

// Track observer state
let feedObserver = null;
let isInitialized = false;
let pendingScanWork = null;

/**
 * Batch scan work using requestIdleCallback or setTimeout
 * 
 * @param {Array<Element>} roots - Array of root elements to scan
 */
function scheduleScanWork(roots) {
  // Cancel any pending work
  if (pendingScanWork) {
    if (typeof pendingScanWork === 'number') {
      clearTimeout(pendingScanWork);
    } else {
      cancelIdleCallback(pendingScanWork);
    }
  }
  
  // Use requestIdleCallback if available, fallback to setTimeout
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

/**
 * Initialize the feed observer
 * Watches for new posts using MutationObserver (virtualization-safe)
 */
function initializeFeedObserver() {
  // Prevent duplicate initialization
  if (isInitialized && feedObserver) {
    return;
  }
  
  // Find the feed container
  const feedContainer = findFeedContainer();
  
  if (!feedContainer) {
    // Retry after a delay if container not found
    setTimeout(() => {
      if (!isInitialized) {
        initializeFeedObserver();
      }
    }, 500);
    return;
  }
  
  // Initial scan of existing posts
  scanForPostArticles(feedContainer);
  
  // Set up MutationObserver to watch for new posts
  // Only scan added subtrees for performance
  const observer = new MutationObserver((mutations) => {
    const addedRoots = [];
    
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the node itself is a post article
          const urn = getActivityUrn(node);
          if (urn && !processedUrns.has(urn)) {
            addedRoots.push(node);
            continue;
          }
          
          // Check if node contains post articles (scan subtree)
          // Only add if it's not already processed
          if (!shouldIgnoreElement(node)) {
            addedRoots.push(node);
          }
        }
      }
    }
    
    // Batch the scan work to avoid blocking scroll
    if (addedRoots.length > 0) {
      scheduleScanWork(addedRoots);
    }
  });
  
  // Observe the feed container for new posts
  observer.observe(feedContainer, {
    childList: true,
    subtree: true
  });
  
  feedObserver = observer;
  isInitialized = true;
}

/**
 * Re-initialize the observer (for SPA navigation)
 */
function reinitializeFeedObserver() {
  // Disconnect existing observer if any
  if (feedObserver) {
    feedObserver.disconnect();
    feedObserver = null;
  }
  isInitialized = false;
  
  // Clear processed state to allow re-processing posts on new page
  // Note: We keep userRevealed to maintain user preferences
  processedUrns.clear();
  blockedUrns.clear();
  
  // Re-initialize after a short delay to let new page render
  setTimeout(() => {
    initializeFeedObserver();
  }, 500);
}

// Initialize when DOM is ready
function startInitialization() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Wait a bit for LinkedIn's JS to initialize
      setTimeout(initializeFeedObserver, 100);
    });
  } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
    // DOM already loaded, but wait for LinkedIn's feed to potentially load
    setTimeout(initializeFeedObserver, 100);
  } else {
    // Fallback: initialize immediately
    initializeFeedObserver();
  }
}

// Start initialization
startInitialization();

// Also listen for when page becomes fully loaded (handles slow-loading resources)
if (document.readyState !== 'complete') {
  window.addEventListener('load', () => {
    // Re-initialize when page is fully loaded (handles refresh scenarios)
    setTimeout(() => {
      if (!isInitialized || !feedObserver) {
        initializeFeedObserver();
      }
    }, 500);
  });
}

// Also re-initialize on navigation (LinkedIn is a SPA)
let lastUrl = location.href;
const navigationObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    reinitializeFeedObserver();
  }
});

// Watch for URL changes in the document
navigationObserver.observe(document, { subtree: true, childList: true });

// Also listen for popstate events (back/forward navigation)
window.addEventListener('popstate', () => {
  setTimeout(() => reinitializeFeedObserver(), 500);
});

// Listen for pushstate/replacestate (programmatic navigation)
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  setTimeout(() => reinitializeFeedObserver(), 500);
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  setTimeout(() => reinitializeFeedObserver(), 500);
};
