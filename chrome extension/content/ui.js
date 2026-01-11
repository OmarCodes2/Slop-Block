window.LinkedInFilter = window.LinkedInFilter || {};

window.LinkedInFilter.userRevealed = new Set();

window.LinkedInFilter.blurPost = function(postElement, isPending = false, label = "Unsure") {
  if (postElement.classList.contains('linkedin-filter-blurred')) {
    return;
  }

  const computedStyle = window.getComputedStyle(postElement);
  if (computedStyle.position === 'static') {
    postElement.style.position = 'relative';
  }

  const overlay = document.createElement('div');
  overlay.className = 'linkedin-filter-overlay';
  overlay.setAttribute('data-pending', isPending ? 'true' : 'false');

  overlay.innerHTML = `
    <div class="linkedin-filter-message">
      <h3 class="linkedin-filter-title">Post Blocked</h3>
      <p class="linkedin-filter-subtitle">${label}</p>
      <button class="linkedin-filter-reveal-button">Reveal Post</button>
    </div>
  `;

  const revealButton = overlay.querySelector('.linkedin-filter-reveal-button');
  revealButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.LinkedInFilter.unblurPost(postElement);
  });

  postElement.classList.add('linkedin-filter-blurred');
  postElement.appendChild(overlay);
};

window.LinkedInFilter.unblurPost = function(postElement) {
  const overlays = postElement.querySelectorAll('.linkedin-filter-overlay');
  overlays.forEach(overlay => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });
  
  postElement.classList.remove('linkedin-filter-blurred');

  const postKey = postElement.currentPostKey;
  if (postKey) {
    window.LinkedInFilter.userRevealed.add(postKey);
  }
};

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
