window.LinkedInFilter = window.LinkedInFilter || {};

window.LinkedInFilter.updateOverlayPendingState = function(postElement, isPending) {
  const overlay = postElement.querySelector('.linkedin-filter-overlay');
  if (overlay) {
    overlay.setAttribute('data-pending', isPending ? 'true' : 'false');
  }
};

window.LinkedInFilter.updateOverlayLabel = function(postElement, label) {
  const overlay = postElement.querySelector('.linkedin-filter-overlay');
  if (overlay) {
    const subtitle = overlay.querySelector('.linkedin-filter-subtitle');
    if (subtitle) {
      subtitle.textContent = label;
    }
  }
};

window.LinkedInFilter.updateOverlayStyle = function(postElement, opaqueMode = false, hideRevealButton = false, showPosterInfo = true) {
  const overlay = postElement.querySelector('.linkedin-filter-overlay');
  if (!overlay) return;

  let currentLabel = 'Uncategorized';
  const classification = postElement.currentClassification;
  const labels = window.LinkedInFilter.classificationLabels || {};
  if (classification && labels[classification]) {
    currentLabel = labels[classification];
  }

  if (opaqueMode) {
    overlay.classList.add('linkedin-filter-overlay-opaque');
  } else {
    overlay.classList.remove('linkedin-filter-overlay-opaque');
  }

  const storedActorInfo = postElement._slopBlockActorInfo;
  postElement._slopBlockShowPosterInfo = showPosterInfo;
  const posterHtml = (window.LinkedInFilter.getPosterHtml || (() => ''))(storedActorInfo, showPosterInfo);
  const revealButtonHtml = hideRevealButton ? '' : '<button class="linkedin-filter-reveal-button">Reveal Post</button>';
  const message = overlay.querySelector('.linkedin-filter-message');
  if (message) {
    message.innerHTML = `
      ${posterHtml}
      <p class="linkedin-filter-subtitle">${(window.LinkedInFilter.escapeHtml || ((text) => text))(currentLabel)}</p>
      ${revealButtonHtml}
    `;

    const revealButton = message.querySelector('.linkedin-filter-reveal-button');
    if (revealButton) {
      revealButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.LinkedInFilter.unblurPost(postElement);
      });
    }
  }
};
