window.LinkedInFilter = window.LinkedInFilter || {};

window.LinkedInFilter.blockPost = function(postElement, urn, classification) {
  if (window.LinkedInFilter.userRevealed.has(urn)) {
    return;
  }

  if (window.LinkedInFilter.blockedUrns.has(urn)) {
    return;
  }

  window.LinkedInFilter.blockedUrns.add(urn);

  postElement.currentPostKey = urn;
  postElement.currentClassification = classification;

  let label = 'Uncategorized';
  const labels = window.LinkedInFilter.classificationLabels || {};
  if (labels[classification]) {
    label = labels[classification];
  }

  let actorInfo = null;
  if (window.LinkedInFilter.isInsideNewFeed(postElement)) {
    const hasV2Marker = postElement.querySelector('div[data-view-name="feed-full-update"]');
    const hasV3Marker = postElement.querySelector('h2');

    if (hasV2Marker) {
      actorInfo = window.LinkedInFilter.extractActorFromPost(postElement);
    } else if (hasV3Marker && !hasV2Marker) {
      actorInfo = window.LinkedInFilter.extractActorFromV3Post(postElement);
    } else {
      actorInfo = window.LinkedInFilter.extractActorFromPost(postElement);
    }
  } else {
    actorInfo = window.LinkedInFilter.extractActorFromV1Post(postElement);
  }

  window.LinkedInFilter.blurPost(
    postElement,
    false,
    label,
    window.LinkedInFilter.filterSettings.opaqueOverlay,
    window.LinkedInFilter.filterSettings.hideRevealButton,
    window.LinkedInFilter.filterSettings.showPosterInfo,
    actorInfo
  );
};

window.LinkedInFilter.updateAllOverlayStyles = function() {
  const containers = window.LinkedInFilter.getFeedContainers();
  for (const feedContainer of containers) {
    const blurredPosts = feedContainer.querySelectorAll('.linkedin-filter-blurred');
    for (const post of blurredPosts) {
      const urn = post.getAttribute('data-urn') || post.getAttribute('data-slopblock-urn');
      if (urn && !window.LinkedInFilter.userRevealed.has(urn)) {
        window.LinkedInFilter.updateOverlayStyle(post, window.LinkedInFilter.filterSettings.opaqueOverlay, window.LinkedInFilter.filterSettings.hideRevealButton, window.LinkedInFilter.filterSettings.showPosterInfo);
      }
    }
  }
};

window.LinkedInFilter.reEvaluateAllPosts = async function() {
  await window.LinkedInFilter.loadFilterSettings();

  const containers = window.LinkedInFilter.getFeedContainers();
  if (containers.length === 0) return;

  const articles = [];
  for (const feedContainer of containers) {
    articles.push(...window.LinkedInFilter.getPostElementsFromRoot(feedContainer));
  }

  if (!window.LinkedInFilter.filterSettings.extensionEnabled) {
    for (const article of articles) {
      const overlays = article.querySelectorAll('.linkedin-filter-overlay');
      overlays.forEach(overlay => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      });
      article.classList.remove('linkedin-filter-blurred');
      const urn = window.LinkedInFilter.getActivityUrn(article) || article.getAttribute('data-slopblock-urn');
      if (urn) window.LinkedInFilter.blockedUrns.delete(urn);
    }
    return;
  }

  for (const article of articles) {
    const isNewDom = window.LinkedInFilter.isInsideNewFeed(article);
    const urn = isNewDom ? window.LinkedInFilter.getOrAssignNewDomUrn(article) : (article.getAttribute('data-urn') || window.LinkedInFilter.getActivityUrn(article));
    if (!urn) continue;

    if (window.LinkedInFilter.userRevealed.has(urn)) {
      continue;
    }

    let classification = window.LinkedInFilter.classifyPost(article);
    if (!window.LinkedInFilter.filterSettings.experimentalFilters && window.LinkedInFilter.experimentalClassifications.has(classification)) {
      classification = 'other';
    }
    const shouldBlock = window.LinkedInFilter.shouldBlockByClassification(classification);

    const isCurrentlyBlocked = article.classList.contains('linkedin-filter-blurred');

    if (shouldBlock && !isCurrentlyBlocked) {
      window.LinkedInFilter.blockPost(article, urn, classification);
    } else if (!shouldBlock && isCurrentlyBlocked) {
      const overlays = article.querySelectorAll('.linkedin-filter-overlay');
      overlays.forEach(overlay => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      });
      article.classList.remove('linkedin-filter-blurred');
      window.LinkedInFilter.blockedUrns.delete(urn);
    }
  }
};

window.LinkedInFilter.scheduleStartupRescans = function() {
  const delays = [1000, 3000, 6000];

  for (const delay of delays) {
    setTimeout(() => {
      window.LinkedInFilter.reEvaluateAllPosts();
    }, delay);
  }
};

window.LinkedInFilter.startInitialization = function() {
  window.LinkedInFilter.loadFilterSettings();
  window.LinkedInFilter.setupNewPostsReloadListener();
  window.LinkedInFilter.startNavigationWatcher();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(window.LinkedInFilter.initializeFeedObserver, 100);
    });
  } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setTimeout(window.LinkedInFilter.initializeFeedObserver, 100);
  } else {
    window.LinkedInFilter.initializeFeedObserver();
  }

  window.LinkedInFilter.scheduleStartupRescans();

  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (!window.LinkedInFilter.isInitialized || window.LinkedInFilter.feedObservers.length === 0) {
          window.LinkedInFilter.initializeFeedObserver();
        }
      }, 500);
    });
  }
};

window.LinkedInFilter.startInitialization();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'settingsChanged') {
    window.LinkedInFilter.filterSettings = message.settings || window.LinkedInFilter.filterSettings;
    window.LinkedInFilter.filterSettings.showPosterInfo = true;
    window.LinkedInFilter.updateAllOverlayStyles();
    window.LinkedInFilter.reEvaluateAllPosts();
    sendResponse({ success: true });
  }
  return true;
});
