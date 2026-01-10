/**
 * Content Script for LinkedIn Feed Filter
 * 
 * Implements hybrid classification pipeline:
 * - Stage A: Fast local keyword/phrase heuristic
 * - Stage B: AI escalation for uncertain cases
 * 
 * Performance choices:
 * - MutationObserver watches for new posts (virtualization-safe)
 * - Overlay-based blocking avoids scroll jank (no DOM removal/height collapse)
 * - Semantic selectors (role="article") reduce breakage when LinkedIn changes CSS classes
 * - PostKey deduplication prevents duplicate classifications
 * - Async result safety checks handle DOM recycling in virtualized feeds
 */

// Session state: track revealed posts and processed posts
const userRevealed = new Set(); // postKeys that user has manually revealed
const processedPosts = new Set(); // postKeys we've already processed

// AI classification queue tracking (client-side)
const pendingClassifications = new Map(); // postKey -> {node, resolve}

// Positive signal categories for local heuristics
const POSITIVE_SIGNALS = {
  RECRUITER_IDENTITY: [
    'recruiter',
    'technical recruiter',
    'talent partner',
    'talent acquisition',
    'hiring manager',
    'staffing',
    'people team',
    'people & culture',
    'hr team',
    'we are hiring',
    'we\'re hiring',
    'we are actively hiring',
    'we\'re growing the team'
  ],
  CALL_TO_ACTION: [
    'apply here',
    'apply now',
    'apply below',
    'link to apply',
    'drop your resume',
    'send your resume',
    'dm me your resume',
    'reach out if interested',
    'reach out to me',
    'message me directly',
    'feel free to dm',
    'happy to chat'
  ],
  ROLE_LISTING: [
    'open role',
    'open roles',
    'open position',
    'open positions',
    'hiring for',
    'looking for a',
    'seeking a',
    'we\'re looking for',
    'join our team',
    'join the team'
  ],
  STRUCTURAL: [
    // These will be detected via pattern matching (bullet points, tech stacks, etc.)
    'compensation',
    'salary',
    'remote',
    'hybrid',
    'visa sponsorship',
    'visa',
    'relocation'
  ]
};

// Negative signals (any of these = confident hide)
const NEGATIVE_SIGNALS = [
  // Job announcement / offer posts
  'i\'m excited to announce',
  'i am excited to share',
  'thrilled to announce',
  'happy to announce',
  'grateful to announce',
  'proud to announce',
  // Acceptance / offer signals
  'accepted an offer',
  'accepted my offer',
  'signed an offer',
  'offer from',
  'joining as',
  'starting as',
  'will be joining',
  'excited to start',
  'next chapter',
  // Brag / outcome posts
  'after months of grinding',
  'hard work pays off',
  'dream company',
  'dream role',
  'blessed',
  'humbled',
  'manifested',
  'finally made it',
  'from rejection to offer',
  'offers from',
  // Thank-you posts
  'thankful for the opportunity',
  'thanks to my mentors',
  'couldn\'t have done this without',
  'shoutout to'
];

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
 * Extract post text from a post element
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
    '[role="article"] .feed-shared-text'
  ];

  for (const selector of textSelectors) {
    const element = postElement.querySelector(selector);
    if (element) {
      const text = element.innerText || element.textContent || '';
      if (text.trim().length > 0) {
        return text.trim();
      }
    }
  }

  // Fallback: get all text from article
  const article = postElement.closest('article') || postElement;
  const text = article.innerText || article.textContent || '';
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
 * Count positive signal categories present in text
 * 
 * @param {string} text - The text to analyze
 * @returns {number} Number of positive signal categories (0-4)
 */
function countPositiveCategories(text) {
  const lowerText = text.toLowerCase();
  let categoryCount = 0;

  // Check recruiter identity signals
  if (POSITIVE_SIGNALS.RECRUITER_IDENTITY.some(signal => lowerText.includes(signal))) {
    categoryCount++;
  }

  // Check call-to-action signals
  if (POSITIVE_SIGNALS.CALL_TO_ACTION.some(signal => lowerText.includes(signal))) {
    categoryCount++;
  }

  // Check role listing signals
  if (POSITIVE_SIGNALS.ROLE_LISTING.some(signal => lowerText.includes(signal))) {
    categoryCount++;
  }

  // Check structural signals (bullet points, tech stacks, compensation, etc.)
  const hasBulletPoints = /[•·▪▫◦‣⁃]\s/.test(text) || /^\s*[-*+]\s/m.test(text);
  const hasTechStack = /\b(react|node|python|java|javascript|typescript|aws|azure|gcp|docker|kubernetes)\b/i.test(text);
  const hasCompensation = POSITIVE_SIGNALS.STRUCTURAL.some(signal => lowerText.includes(signal));
  
  if (hasBulletPoints || hasTechStack || hasCompensation) {
    categoryCount++;
  }

  return categoryCount;
}

/**
 * Apply local heuristics to classify a post
 * 
 * Decision logic (default blur behavior):
 * - 2+ positive categories → CONFIDENT RECRUITER-HIRING → UNBLUR (SHOW)
 * - Any negative signal → CONFIDENT NOT RECRUITER-HIRING → KEEP BLURRED (HIDE)
 * - Mixed/uncertain → UNCERTAIN → BLUR + Send to AI
 * 
 * @param {string} text - The post text
 * @returns {'keep'|'hide'|'uncertain'} Classification decision
 */
function applyLocalHeuristics(text) {
  const lowerText = text.toLowerCase();

  // Check for strong negative signals first
  // If ANY negative signal appears → CONFIDENT HIDE
  for (const signal of NEGATIVE_SIGNALS) {
    if (lowerText.includes(signal)) {
      return 'hide';
    }
  }

  // Count positive signal categories
  const positiveCategoryCount = countPositiveCategories(text);

  // If 2+ positive categories → CONFIDENT RECRUITER-HIRING → KEEP (unblur)
  if (positiveCategoryCount >= 2) {
    return 'keep';
  }

  // Mixed/uncertain → send to AI
  return 'uncertain';
}

/**
 * Apply blur overlay to a post element
 * 
 * @param {Element} postElement - The post DOM element
 * @param {boolean} isPending - Whether this is a pending (AI-classifying) post
 */
function blurPost(postElement, isPending = false) {
  // Don't blur if already blurred or if user has revealed it
  if (postElement.classList.contains('linkedin-filter-blurred')) {
    return;
  }

  // Ensure post element has relative positioning for overlay
  const computedStyle = window.getComputedStyle(postElement);
  if (computedStyle.position === 'static') {
    postElement.style.position = 'relative';
  }

  // Create overlay element
  const overlay = document.createElement('div');
  overlay.className = 'linkedin-filter-overlay';
  overlay.setAttribute('data-pending', isPending ? 'true' : 'false');

  overlay.innerHTML = `
    <div class="linkedin-filter-message">
      <h3 class="linkedin-filter-title">Be mindful</h3>
      <p class="linkedin-filter-subtitle">This post is being checked. You can reveal it anytime.</p>
      <button class="linkedin-filter-reveal-button">⚠️ Warning (Reveal)</button>
    </div>
  `;

  // Add reveal button click handler
  const revealButton = overlay.querySelector('.linkedin-filter-reveal-button');
  revealButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    unblurPost(postElement);
  });

  // Add blur class and overlay
  postElement.classList.add('linkedin-filter-blurred');
  postElement.appendChild(overlay);
}

/**
 * Remove blur overlay from a post element
 * 
 * @param {Element} postElement - The post DOM element
 */
function unblurPost(postElement) {
  // Remove all overlay elements first (in case there are multiple)
  const overlays = postElement.querySelectorAll('.linkedin-filter-overlay');
  overlays.forEach(overlay => {
    // Force immediate removal
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });
  
  // Remove the blur class to remove blur effect
  postElement.classList.remove('linkedin-filter-blurred');

  // Mark as user-revealed using the postKey stored on the element
  const postKey = postElement.currentPostKey;
  if (postKey) {
    userRevealed.add(postKey);
  }
}

/**
 * Send post to AI for classification
 * 
 * @param {Element} postElement - The post DOM element
 * @param {string} postText - The post text
 * @param {string} postKey - Unique identifier for the post
 */
function classifyWithAI(postElement, postText, postKey) {
  // Check if already classifying this postKey
  if (pendingClassifications.has(postKey)) {
    return;
  }

  // Store reference for async result safety
  const classificationPromise = new Promise((resolve) => {
    pendingClassifications.set(postKey, { node: postElement, resolve });
  });

  // Send to background service worker
  chrome.runtime.sendMessage(
    {
      action: 'classify',
      postText: postText.substring(0, 1200), // Limit to 1200 chars
      postKey
    },
    (response) => {
      // Handle response
      if (chrome.runtime.lastError) {
        console.warn('[LinkedIn Filter] Message error:', chrome.runtime.lastError);
        // Keep blurred on error (safe default)
        return;
      }

      if (response.error) {
        console.warn('[LinkedIn Filter] Classification error:', response.error);
        // Keep blurred on error (safe default)
        return;
      }

      // Async result safety: verify postKey matches and node still exists
      const pending = pendingClassifications.get(postKey);
      if (!pending || pending.node !== postElement) {
        // Node was recycled or removed, ignore result
        return;
      }

      // Verify currentPostKey still matches (handles DOM recycling)
      if (postElement.currentPostKey !== postKey) {
        // Post element was recycled for a different post, ignore result
        return;
      }

      // Check if user has revealed this post (never re-hide)
      if (userRevealed.has(postKey)) {
        return; // User already revealed, don't change state
      }

      // Apply AI classification result
      if (response.decision === 'recruiter_hiring_post') {
        unblurPost(postElement);
      } else {
        // Keep blurred (already blurred, so no action needed)
        // But update overlay to remove "pending" state
        const overlay = postElement.querySelector('.linkedin-filter-overlay');
        if (overlay) {
          overlay.setAttribute('data-pending', 'false');
        }
      }

      // Clean up
      pendingClassifications.delete(postKey);
    }
  );
}

/**
 * Process a single post element
 * 
 * @param {Element} postElement - The post DOM element
 */
function processPost(postElement) {
  // Skip if already processed
  if (postElement.dataset.linkedinFilterProcessed === 'true') {
    return;
  }

  // Extract post text
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
  if (userRevealed.has(postKey)) {
    // User already revealed, skip classification
    return;
  }

  // Apply local heuristics
  const localDecision = applyLocalHeuristics(postText);

  if (localDecision === 'keep') {
    // CONFIDENT RECRUITER-HIRING → UNBLUR (SHOW)
    // Don't blur, post stays visible
    return;
  } else if (localDecision === 'hide') {
    // CONFIDENT NOT RECRUITER-HIRING → BLUR (HIDE)
    blurPost(postElement, false);
  } else {
    // UNCERTAIN → BLUR (default) + Send to AI
    blurPost(postElement, true);
    classifyWithAI(postElement, postText, postKey);
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
    posts = Array.from(container.querySelectorAll('.feed-shared-update-v2, .feed-shared-update-v2__description'));
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
