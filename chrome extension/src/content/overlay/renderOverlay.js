window.LinkedInFilter = window.LinkedInFilter || {};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.LinkedInFilter.escapeHtml = escapeHtml;

function getPosterHtml(actorInfo, showPosterInfo = true) {
  if (!showPosterInfo) return '';
  const name = (actorInfo && actorInfo.actorName && String(actorInfo.actorName).trim()) || null;
  const pfpUrl = (actorInfo && actorInfo.actorPfpUrl && String(actorInfo.actorPfpUrl).trim()) || null;
  if (!name && !pfpUrl) return '';
  const avatarHtml = pfpUrl && pfpUrl.startsWith('http')
    ? `<img class="linkedin-filter-poster-avatar" src="${escapeHtml(pfpUrl)}" alt="" />`
    : '';
  const nameHtml = name ? `<p class="linkedin-filter-poster">${escapeHtml(name)}</p>` : '';
  return `<div class="linkedin-filter-poster-wrap">${avatarHtml}${nameHtml}</div>`;
}

window.LinkedInFilter.getPosterHtml = getPosterHtml;

window.LinkedInFilter.blurPost = function(postElement, isPending = false, label = "Unsure", opaqueMode = false, hideRevealButton = false, showPosterInfo = true, actorInfo = null) {
  if (postElement.classList.contains('linkedin-filter-blurred')) {
    return;
  }

  const computedStyle = window.getComputedStyle(postElement);
  if (computedStyle.position === 'static') {
    postElement.style.position = 'relative';
  }

  postElement._slopBlockActorInfo = actorInfo;
  postElement._slopBlockShowPosterInfo = showPosterInfo;

  const overlay = document.createElement('div');
  overlay.className = 'linkedin-filter-overlay' + (opaqueMode ? ' linkedin-filter-overlay-opaque' : '');
  overlay.setAttribute('data-pending', isPending ? 'true' : 'false');

  const revealButtonHtml = hideRevealButton ? '' : '<button class="linkedin-filter-reveal-button">Reveal Post</button>';
  const posterHtml = getPosterHtml(actorInfo, showPosterInfo);
  overlay.innerHTML = `
    <div class="linkedin-filter-message">
      ${posterHtml}
      <p class="linkedin-filter-subtitle">${escapeHtml(label)}</p>
      ${revealButtonHtml}
    </div>
  `;

  const revealButton = overlay.querySelector('.linkedin-filter-reveal-button');
  if (revealButton) {
    revealButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.LinkedInFilter.unblurPost(postElement);
    });
  }

  postElement.classList.add('linkedin-filter-blurred');
  postElement.appendChild(overlay);
};
