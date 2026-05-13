window.LinkedInFilter = window.LinkedInFilter || {};

const INVALID_ACTOR_NAMES = new Set([
  'Follow', 'Promoted', 'Feed post', 'Like', 'Comment', 'Repost', 'Send', 'View more options'
]);

const ACTOR_URL_PATTERNS = /linkedin\.com\/(in|company|school)\//;
const APOS = "'\u2019";

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

function getV3ActorNameHint(postRoot) {
  if (!postRoot || !postRoot.querySelector) return '';

  const labelSources = postRoot.querySelectorAll('button[aria-label*="post by"], [aria-label*="post by"]');
  for (const source of labelSources) {
    const label = source.getAttribute && source.getAttribute('aria-label');
    const actorName = extractNameFromLabel(label);
    if (actorName) return actorName;
  }

  return '';
}

function isLikelyV3ActorAnchor(anchor, actorNameHint = '') {
  if (!anchor || !anchor.href || !ACTOR_URL_PATTERNS.test(anchor.href)) return false;

  const text = [
    anchor.textContent,
    anchor.getAttribute && anchor.getAttribute('aria-label')
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (/\b(reacted|likes this|comment|repost|follow|send|view my website|open control menu|hide post)\b/i.test(text)) {
    return false;
  }

  if (anchor.closest && anchor.closest('[data-testid="expandable-text-box"], [componentkey^="feed-commentary"]')) {
    return false;
  }

  if (!actorNameHint) {
    return true;
  }

  const hint = actorNameHint.toLowerCase();
  const candidates = [
    anchor.textContent,
    anchor.getAttribute && anchor.getAttribute('aria-label'),
    anchor.querySelector && anchor.querySelector('strong') && anchor.querySelector('strong').textContent,
    anchor.querySelector && anchor.querySelector('p') && anchor.querySelector('p').textContent,
    anchor.querySelector && anchor.querySelector('img[alt]') && anchor.querySelector('img[alt]').alt
  ]
    .filter(Boolean)
    .map(value => String(value).toLowerCase());

  return candidates.some(value => value.includes(hint));
}

function scoreV3ActorAnchor(anchor, actorNameHint = '') {
  let score = 0;
  if (!anchor || !anchor.href || !ACTOR_URL_PATTERNS.test(anchor.href)) return -1;

  if (anchor.querySelector('strong')) score += 4;
  if (anchor.querySelector('p')) score += 3;
  if (anchor.querySelector('img[alt]')) score += 2;
  if (anchor.getAttribute && anchor.getAttribute('aria-label')) score += 1;

  const text = [
    anchor.textContent,
    anchor.getAttribute && anchor.getAttribute('aria-label')
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (/\b(reacted|likes this|comment|repost|follow|send|view my website|open control menu|hide post)\b/i.test(text)) {
    score -= 10;
  }

  if (actorNameHint && text.toLowerCase().includes(actorNameHint.toLowerCase())) {
    score += 5;
  }

  return score;
}

window.LinkedInFilter.extractActorFromPost = function(postRoot) {
  if (!postRoot || !postRoot.querySelector) return null;

  const feedFull = postRoot.querySelector('[data-view-name="feed-full-update"]');
  if (!feedFull) return null;

  let anchor = feedFull.querySelector('a[data-view-name="feed-actor-image"][href]');
  if (anchor && anchor.href && ACTOR_URL_PATTERNS.test(anchor.href)) {
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
};

window.LinkedInFilter.extractActorFromV3Post = function(postRoot) {
  if (!postRoot || !postRoot.querySelector) return null;

  const actorNameHint = getV3ActorNameHint(postRoot);
  const allActorLinks = postRoot.querySelectorAll('a[href*="linkedin.com/in/"], a[href*="linkedin.com/company/"], a[href*="linkedin.com/school/"]');

  let anchor = null;
  for (const link of allActorLinks) {
    if (isLikelyV3ActorAnchor(link, actorNameHint)) {
      anchor = link;
      break;
    }
  }

  if (!anchor) {
    let bestScore = -1;
    for (const link of allActorLinks) {
      const score = scoreV3ActorAnchor(link, actorNameHint);
      if (score > bestScore) {
        bestScore = score;
        anchor = link;
      }
    }
  }

  if (!anchor || !anchor.href) return null;

  const actorProfileUrl = anchor.href.startsWith('http') ? anchor.href : new URL(anchor.href, document.baseURI).href;
  if (!ACTOR_URL_PATTERNS.test(actorProfileUrl)) return null;

  let actorName = actorNameHint || null;
  const p = anchor.querySelector('p');
  if (!actorName && p && p.textContent && p.textContent.trim()) {
    actorName = p.textContent.trim();
  }

  if (!actorName) {
    const img = anchor.querySelector('img[alt]');
    if (img && img.alt) {
      let alt = img.alt.trim();
      if (alt.startsWith('View ')) {
        alt = alt.slice(5);
        alt = alt.replace(new RegExp(`[${APOS}]s profile$`, 'i'), '').replace(/\s+profile$/i, '').replace(/\s+company:\s*$/i, '').trim();
      }
      if (alt && alt.length < 200) actorName = alt;
    }
  }

  if (!actorName && anchor.getAttribute('aria-label')) {
    actorName = extractNameFromLabel(anchor.getAttribute('aria-label'));
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
  const img = anchor.querySelector('img[src]');
  if (img && img.src && img.src.startsWith('http') && img.src.includes('media.licdn.com') && !img.src.startsWith('data:')) {
    actorPfpUrl = img.src;
  }

  return { actorName, actorProfileUrl, actorPfpUrl: actorPfpUrl || null };
};

window.LinkedInFilter.extractActorFromV1Post = function(postRoot) {
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
};
