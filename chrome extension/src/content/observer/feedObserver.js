window.LinkedInFilter = window.LinkedInFilter || {};

window.LinkedInFilter.scanForPostArticles = function(root) {
  const settings = window.LinkedInFilter.filterSettings || {};
  if (!settings.extensionEnabled) {
    return;
  }

  if (!root || root.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const isNewDom = window.LinkedInFilter.isNewFeedRoot(root) || window.LinkedInFilter.isInsideNewFeed(root);
  const postElements = window.LinkedInFilter.getPostElementsFromRoot(root);

  for (const article of postElements) {
    if (article.querySelector('[data-view-name="job-card"]') || article.closest('[data-view-name="job-card"]')) {
      continue;
    }
    const urn = isNewDom ? window.LinkedInFilter.getOrAssignNewDomUrn(article) : (article.getAttribute('data-urn') || window.LinkedInFilter.getActivityUrn(article));
    if (!urn || window.LinkedInFilter.processedUrns.has(urn)) {
      continue;
    }

    window.LinkedInFilter.processedUrns.add(urn);

    let classification = window.LinkedInFilter.classifyPost(article);
    if (!settings.experimentalFilters && window.LinkedInFilter.experimentalClassifications.has(classification)) {
      classification = "other";
    }
    const shouldBlock = window.LinkedInFilter.shouldBlockByClassification(classification);

    if (shouldBlock) {
      window.LinkedInFilter.blockPost(article, urn, classification);

      if (classification === "other") {
        window.LinkedInFilter.categorizePostWithAI(article, urn);
      }
    }
  }
};

window.LinkedInFilter.scheduleScanWork = function(roots) {
  if (window.LinkedInFilter.pendingScanWork) {
    if (typeof window.LinkedInFilter.pendingScanWork === 'number') {
      clearTimeout(window.LinkedInFilter.pendingScanWork);
    } else {
      cancelIdleCallback(window.LinkedInFilter.pendingScanWork);
    }
  }

  if (window.requestIdleCallback) {
    window.LinkedInFilter.pendingScanWork = requestIdleCallback(() => {
      for (const root of roots) {
        window.LinkedInFilter.scanForPostArticles(root);
      }
      window.LinkedInFilter.pendingScanWork = null;
    }, { timeout: 100 });
  } else {
    window.LinkedInFilter.pendingScanWork = setTimeout(() => {
      for (const root of roots) {
        window.LinkedInFilter.scanForPostArticles(root);
      }
      window.LinkedInFilter.pendingScanWork = null;
    }, 0);
  }
};

window.LinkedInFilter.attachFeedObserver = function(feedContainer) {
  window.LinkedInFilter.scanForPostArticles(feedContainer);

  const observer = new MutationObserver((mutations) => {
    const addedRoots = [];

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const urn = window.LinkedInFilter.getActivityUrn(node);
          if (urn && !window.LinkedInFilter.processedUrns.has(urn)) {
            addedRoots.push(node);
            continue;
          }
          if (node.closest && node.closest('div[data-testid="mainFeed"][data-component-type="LazyColumn"]')) {
            addedRoots.push(node);
            continue;
          }
          if (!window.LinkedInFilter.shouldIgnoreElement(node)) {
            addedRoots.push(node);
          }
        }
      }
    }

    if (addedRoots.length > 0) {
      window.LinkedInFilter.scheduleScanWork(addedRoots);
    }
  });

  observer.observe(feedContainer, {
    childList: true,
    subtree: true
  });

  window.LinkedInFilter.feedObservers.push(observer);
};

window.LinkedInFilter.initializeFeedObserver = function() {
  if (window.LinkedInFilter.isInitialized && window.LinkedInFilter.feedObservers.length > 0) {
    return;
  }

  const containers = window.LinkedInFilter.getFeedContainers();

  if (containers.length === 0) {
    setTimeout(() => {
      if (!window.LinkedInFilter.isInitialized) {
        window.LinkedInFilter.initializeFeedObserver();
      }
    }, 500);
    return;
  }

  window.LinkedInFilter.feedObservers = [];
  for (const feedContainer of containers) {
    window.LinkedInFilter.attachFeedObserver(feedContainer);
  }
  window.LinkedInFilter.isInitialized = true;
};

window.LinkedInFilter.reinitializeFeedObserver = function() {
  for (const obs of window.LinkedInFilter.feedObservers) {
    obs.disconnect();
  }
  window.LinkedInFilter.feedObservers = [];
  window.LinkedInFilter.isInitialized = false;

  window.LinkedInFilter.processedUrns.clear();
  window.LinkedInFilter.blockedUrns.clear();

  setTimeout(() => {
    window.LinkedInFilter.initializeFeedObserver();
  }, 500);
};
