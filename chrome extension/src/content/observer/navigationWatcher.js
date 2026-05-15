window.LinkedInFilter = window.LinkedInFilter || {};

window.LinkedInFilter.setupNewPostsReloadListener = function() {
  console.log('[LinkedIn Filter] Setting up New posts button listener...');

  document.addEventListener('click', (e) => {
    const button = e.target.closest('button[type="button"]');

    if (!button) return;

    const buttonText = button.textContent || '';
    if (buttonText.includes('New posts')) {
      console.log('[LinkedIn Filter] New posts button clicked, reloading page...');
      e.preventDefault();
      e.stopPropagation();

      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }, true);

  console.log('[LinkedIn Filter] New posts listener active');
};

window.LinkedInFilter.isFeedPath = function(href) {
  try {
    const urlObj = new URL(href, location.origin);
    const path = urlObj.pathname || '';
    return path === '/feed' || path.startsWith('/feed/');
  } catch (e) {
    return typeof href === 'string' && href.includes('/feed');
  }
};

window.LinkedInFilter.handleUrlChange = function(prevUrl, nextUrl) {
  const wentToFeed = !window.LinkedInFilter.isFeedPath(prevUrl) && window.LinkedInFilter.isFeedPath(nextUrl);
  if (wentToFeed) {
    try {
      window.location.reload();
    } catch (e) {
    }
    return;
  }
  setTimeout(() => window.LinkedInFilter.reinitializeFeedObserver(), 500);
};

window.LinkedInFilter.startNavigationWatcher = function() {
  let lastUrl = location.href;

  const navigationObserver = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      window.LinkedInFilter.handleUrlChange(lastUrl, url);
      lastUrl = url;
    }
  });

  navigationObserver.observe(document, { subtree: true, childList: true });

  window.addEventListener('popstate', () => {
    const url = location.href;
    if (url !== lastUrl) {
      window.LinkedInFilter.handleUrlChange(lastUrl, url);
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
    if (nextCandidate && !window.LinkedInFilter.isFeedPath(prev) && window.LinkedInFilter.isFeedPath(nextCandidate)) {
      lastUrl = nextCandidate;
      try { window.location.href = nextCandidate; } catch {}
      try { window.location.reload(); } catch {}
      return;
    }
    originalPushState.apply(history, args);
    const next = location.href;
    if (next !== prev) {
      window.LinkedInFilter.handleUrlChange(prev, next);
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
    if (nextCandidate && !window.LinkedInFilter.isFeedPath(prev) && window.LinkedInFilter.isFeedPath(nextCandidate)) {
      lastUrl = nextCandidate;
      try { window.location.href = nextCandidate; } catch {}
      try { window.location.reload(); } catch {}
      return;
    }
    originalReplaceState.apply(history, args);
    const next = location.href;
    if (next !== prev) {
      window.LinkedInFilter.handleUrlChange(prev, next);
      lastUrl = next;
    }
  };
};
