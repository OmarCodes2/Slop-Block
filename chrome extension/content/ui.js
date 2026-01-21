window.LinkedInFilter = window.LinkedInFilter || {};

window.LinkedInFilter.userRevealed = new Set();

window.LinkedInFilter.blurPost = function(postElement, isPending = false, label = "Unsure", opaqueMode = false) {
  if (postElement.classList.contains('linkedin-filter-blurred')) {
    return;
  }

  const computedStyle = window.getComputedStyle(postElement);
  if (computedStyle.position === 'static') {
    postElement.style.position = 'relative';
  }

  const overlay = document.createElement('div');
  overlay.className = 'linkedin-filter-overlay' + (opaqueMode ? ' linkedin-filter-overlay-opaque' : '');
  overlay.setAttribute('data-pending', isPending ? 'true' : 'false');

  if (opaqueMode) {
    overlay.innerHTML = `
      <div class="linkedin-filter-message">
        <h3 class="linkedin-filter-title">Post Blocked</h3>
      </div>
    `;
  } else {
    overlay.innerHTML = `
      <div class="linkedin-filter-message">
        <h3 class="linkedin-filter-title">Post Blocked</h3>
        <p class="linkedin-filter-subtitle">${label}</p>
        <button class="linkedin-filter-reveal-button">Reveal Post</button>
      </div>
    `;
  }

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

window.LinkedInFilter.updateOverlayStyle = function(postElement, opaqueMode = false) {
  const overlay = postElement.querySelector('.linkedin-filter-overlay');
  if (!overlay) return;
  
  const subtitle = overlay.querySelector('.linkedin-filter-subtitle');
  const currentLabel = subtitle ? subtitle.textContent : 'Other';
  
  // Toggle the opaque class
  if (opaqueMode) {
    overlay.classList.add('linkedin-filter-overlay-opaque');
  } else {
    overlay.classList.remove('linkedin-filter-overlay-opaque');
  }
  
  // Update the overlay content based on mode
  const message = overlay.querySelector('.linkedin-filter-message');
  if (message) {
    if (opaqueMode) {
      message.innerHTML = `
        <h3 class="linkedin-filter-title">Post Blocked</h3>
      `;
    } else {
      message.innerHTML = `
        <h3 class="linkedin-filter-title">Post Blocked</h3>
        <p class="linkedin-filter-subtitle">${currentLabel}</p>
        <button class="linkedin-filter-reveal-button">Reveal Post</button>
      `;
      
      // Re-attach event listener for the new button
      const revealButton = message.querySelector('.linkedin-filter-reveal-button');
      if (revealButton) {
        revealButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.LinkedInFilter.unblurPost(postElement);
        });
      }
    }
  }
};
