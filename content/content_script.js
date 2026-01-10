/**
 * Content Script for LinkedIn Feed Filter
 * 
 * Orchestrates the feed filtering system:
 * - DOM extraction and post detection
 * - MutationObserver setup for new posts
 * - Coordinates between filtering logic and UI updates
 * 
 * Performance choices:
 * - MutationObserver watches for new posts (virtualization-safe)
 * - Overlay-based blocking avoids scroll jank (no DOM removal/height collapse)
 * - Semantic selectors (role="article") reduce breakage when LinkedIn changes CSS classes
 * - PostKey deduplication prevents duplicate classifications
 * - Async result safety checks handle DOM recycling in virtualized feeds
 */

// Note: filter.js and ui.js are loaded before this script via manifest.json
// They attach functions to window.LinkedInFilter namespace

// Session state: track processed posts
const processedPosts = new Set(); // postKeys we've already processed

// AI classification queue tracking (client-side)
const pendingClassifications = new Map(); // postKey -> {node, resolve}

/**
 * Generate a stable postKey for a post element
 * Strategy: Prefer URN/permalink, fallback to text hash
 * 
 * @param {Element} postElement - The post DOM element
 * @param {string} postText - The post text content
 * @returns {string} Unique identifier for the post
 */
function generatePostKey(postElement, postText) {
  // Try to find URN/permalink in the DOM
  // LinkedIn often stores post IDs in data attributes or links
  const linkElement = postElement.querySelector('a[href*="/feed/update/"]');
  if (linkElement) {
    const href = linkElement.getAttribute('href');
    const urnMatch = href.match(/urn:li:activity:([^?]+)/);
    if (urnMatch) {
      return `urn:${urnMatch[1]}`;
    }
    // Fallback: use the full URL path
    const pathMatch = href.match(/\/feed\/update\/([^?]+)/);
    if (pathMatch) {
      return `post:${pathMatch[1]}`;
    }
  }

  // Try data attributes
  const dataUrn = postElement.getAttribute('data-urn') || 
                  postElement.getAttribute('data-activity-urn');
  if (dataUrn) {
    return `urn:${dataUrn}`;
  }

  // Last resort: hash the text (but note this can change on "See more")
  // Use first 200 chars to reduce collision risk
  const textHash = postText.trim().substring(0, 200);
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < textHash.length; i++) {
    const char = textHash.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `hash:${Math.abs(hash).toString(36)}`;
}

/**
 * Check if a post is an activity post (someone reacting to another's post)
 * 
 * @param {Element} postElement - The post DOM element
 * @returns {boolean} True if this is an activity post
 */
function isActivityPost(postElement) {
  // Look for activity indicators in the header
  const headerTextElement = postElement.querySelector('.update-components-header__text-view');
  if (!headerTextElement) {
    return false;
  }
  
  const headerText = (headerTextElement.innerText || headerTextElement.textContent || '').toLowerCase();
  
  // Check for activity phrases
  const activityPhrases = [
    'celebrates this',
    'likes this',
    'comments on this',
    'supports this',
    'loves this',
    'insights this'
  ];
  
  return activityPhrases.some(phrase => headerText.includes(phrase));
}

/**
 * Extract the reactor's name from an activity post
 * 
 * @param {Element} postElement - The post DOM element
 * @returns {string|null} The reactor's name or null if not found
 */
function extractReactorName(postElement) {
  const headerTextElement = postElement.querySelector('.update-components-header__text-view');
  if (!headerTextElement) {
    return null;
  }
  
  // Find the first link in the header (usually the reactor's profile)
  const reactorLink = headerTextElement.querySelector('a[href*="/in/"]');
  if (reactorLink) {
    const name = (reactorLink.innerText || reactorLink.textContent || '').trim();
    if (name) {
      return name;
    }
  }
  
  return null;
}

/**
 * Extract post text from a post element
 * For activity posts, extracts the original post text (not the activity header)
 * 
 * @param {Element} postElement - The post DOM element
 * @returns {string} The extracted post text
 */
function extractPostText(postElement) {
  // Try multiple selectors for post text
  // Use semantic/content-based selectors first, then fallback to classnames
  
  // Common LinkedIn post text containers
  const textSelectors = [
    '[data-test-id="feed-shared-update-v2__description"]',
    '.feed-shared-update-v2__description',
    '.feed-shared-text',
    '.feed-shared-update__description',
    'article .feed-shared-text',
    '[role="article"] .feed-shared-text',
    // For activity posts, the text is in the update-components-text
    '.update-components-text',
    '.feed-shared-inline-show-more-text'
  ];

  for (const selector of textSelectors) {
    const element = postElement.querySelector(selector);
    if (element) {
      const text = element.innerText || element.textContent || '';
      if (text.trim().length > 0) {
        // For activity posts, make sure we're not including the activity header text
        // The text should be from the original post content, not the "X celebrates this" part
        return text.trim();
      }
    }
  }

  // Fallback: get all text from article, but exclude activity header if present
  const article = postElement.closest('article') || postElement;
  let text = article.innerText || article.textContent || '';
  
  // If this is an activity post, try to exclude the header text
  if (isActivityPost(postElement)) {
    const headerTextElement = postElement.querySelector('.update-components-header__text-view');
    if (headerTextElement) {
      const headerText = headerTextElement.innerText || headerTextElement.textContent || '';
      // Remove the header text from the beginning if it appears there
      if (text.startsWith(headerText.trim())) {
        text = text.substring(headerText.trim().length).trim();
      }
    }
  }
  
  return text.trim();
}

/**
 * Extract author headline if available
 * 
 * @param {Element} postElement - The post DOM element
 * @returns {string|null} Author headline or null
 */
function extractAuthorHeadline(postElement) {
  const headlineSelectors = [
    '.feed-shared-actor__sub-description',
    '.feed-shared-actor__meta',
    '[data-test-id="feed-shared-actor__sub-description"]'
  ];

  for (const selector of headlineSelectors) {
    const element = postElement.querySelector(selector);
    if (element) {
      const text = element.innerText || element.textContent || '';
      if (text.trim().length > 0) {
        return text.trim();
      }
    }
  }

  return null;
}

/**
 * Handle AI classification result
 * 
 * @param {Element} postElement - The post DOM element
 * @param {string} postKey - Unique identifier for the post
 * @param {Object} response - AI classification response
 */
function handleClassificationResult(postElement, postKey, response) {
  // Check if user has revealed this post (never re-hide)
  if (window.LinkedInFilter.userRevealed.has(postKey)) {
    return; // User already revealed, don't change state
  }

  // Apply AI classification result
  if (response.decision === 'recruiter_hiring_post') {
    window.LinkedInFilter.unblurPost(postElement);
  } else {
    // Keep blurred (already blurred, so no action needed)
    // But update overlay to remove "pending" state
    window.LinkedInFilter.updateOverlayPendingState(postElement, false);
  }
}

/**
 * Process a single post element
 * Handles both regular posts and activity posts (where someone reacts to another's post)
 * 
 * @param {Element} postElement - The post DOM element
 */
function processPost(postElement) {
  // Skip if already processed
  if (postElement.dataset.linkedinFilterProcessed === 'true') {
    return;
  }

  // Check if this is an activity post (someone reacting to another's post)
  const isActivity = isActivityPost(postElement);
  
  // Extract post text (for activity posts, this extracts the original post text)
  const postText = extractPostText(postElement);
  if (!postText || postText.length < 10) {
    // Skip posts with insufficient text
    return;
  }

  // Generate postKey
  const postKey = generatePostKey(postElement, postText);
  
  // Store postKey on element for async result safety
  postElement.currentPostKey = postKey;

  // Mark as processed
  postElement.dataset.linkedinFilterProcessed = 'true';

  // Check if user has already revealed this post
  if (window.LinkedInFilter.userRevealed.has(postKey)) {
    // User already revealed, skip classification
    return;
  }

  // Apply local heuristics to the original post text
  // For activity posts, we check the original post content, not the activity header
  const localDecision = window.LinkedInFilter.applyLocalHeuristics(postText);

  if (localDecision === 'keep') {
    // CONFIDENT RECRUITER-HIRING → UNBLUR (SHOW)
    // Don't blur, post stays visible
    return;
  } else if (localDecision === 'hide') {
    // CONFIDENT NOT RECRUITER-HIRING → BLUR (HIDE)
    window.LinkedInFilter.blurPost(postElement, false);
  } else {
    // UNCERTAIN → BLUR (default) + Send to AI
    window.LinkedInFilter.blurPost(postElement, true);
    window.LinkedInFilter.classifyWithAI(postElement, postText, postKey, pendingClassifications, handleClassificationResult);
  }
}

/**
 * Find post elements in the DOM
 * Uses semantic selectors first, then falls back to classnames
 * Excludes header/navigation elements to prevent overlays from covering the header
 * 
 * @param {Element} container - Container to search within
 * @returns {NodeList|Array} List of post elements
 */
function findPostElements(container = document) {
  // Exclude header/navigation areas
  const headerSelectors = [
    'header',
    'nav',
    '[role="banner"]',
    '[role="navigation"]',
    '.global-nav',
    '.artdeco-global-nav',
    '.scaffold-layout__header'
  ];
  
  // Check if element is within header/navigation
  const isInHeader = (element) => {
    for (const selector of headerSelectors) {
      if (element.closest(selector)) {
        return true;
      }
    }
    return false;
  };

  // Primary: semantic selectors (more stable)
  let posts = Array.from(container.querySelectorAll('article[role="article"]'));
  
  if (posts.length === 0) {
    // Fallback: try other semantic patterns
    posts = Array.from(container.querySelectorAll('article'));
  }

  if (posts.length === 0) {
    // Last resort: known classnames (may break when LinkedIn changes them)
    // Include activity post containers
    posts = Array.from(container.querySelectorAll(
      '.feed-shared-update-v2, ' +
      '.feed-shared-update-v2__description, ' +
      '.feed-shared-update-v2__control-menu-container'
    ));
  }

  // Filter out any posts that are in header/navigation areas
  return posts.filter(post => !isInHeader(post));
}

// Track if observer is already initialized to avoid duplicates
let feedObserver = null;
let isInitialized = false;

/**
 * Initialize the feed observer
 * Watches for new posts using MutationObserver (virtualization-safe)
 */
function initializeFeedObserver() {
  // Prevent duplicate initialization
  if (isInitialized && feedObserver) {
    return;
  }

  // Find the main feed container
  // Use semantic selectors first
  let feedContainer = document.querySelector('main[role="main"]') ||
                      document.querySelector('[role="main"]') ||
                      document.querySelector('.scaffold-layout__main') ||
                      document.querySelector('main');

  if (!feedContainer) {
    // Fallback: use body if no main container found
    feedContainer = document.body;
  }

  // Process existing posts
  const existingPosts = findPostElements(feedContainer);
  existingPosts.forEach(post => {
    // Use setTimeout to avoid blocking initial render
    setTimeout(() => processPost(post), 0);
  });

  // If no posts found initially, retry after a delay (handles slow-loading feeds)
  if (existingPosts.length === 0) {
    let retryCount = 0;
    const maxRetries = 10; // Try for up to 5 seconds (10 * 500ms)
    const retryInterval = setInterval(() => {
      retryCount++;
      const posts = findPostElements(feedContainer);
      if (posts.length > 0 || retryCount >= maxRetries) {
        clearInterval(retryInterval);
        if (posts.length > 0) {
          posts.forEach(post => setTimeout(() => processPost(post), 0));
        }
      }
    }, 500);
  }

  // Set up MutationObserver to watch for new posts
  // This is virtualization-safe: we don't remove nodes, just add overlays
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if this node is a post
          if (node.matches && (node.matches('article') || node.matches('[role="article"]'))) {
            processPost(node);
          }

          // Check for posts within this node
          const posts = findPostElements(node);
          posts.forEach(post => processPost(post));
        }
      }
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
  
  // Clear processed state to allow re-processing posts
  // Note: We keep userRevealed and processedPosts to maintain user preferences
  
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
