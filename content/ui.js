/**
 * UI Logic for LinkedIn Feed Filter
 * 
 * Contains all logic for manipulating the UI:
 * - Blurring/unblurring posts
 * - Overlay creation and management
 * - User reveal state tracking
 */

// Create namespace for UI logic
window.LinkedInFilter = window.LinkedInFilter || {};

// Session state: track revealed posts
window.LinkedInFilter.userRevealed = new Set(); // URNs (postKeys) that user has manually revealed

/**
 * Apply blur overlay to a post element
 * 
 * @param {Element} postElement - The post DOM element
 * @param {boolean} isPending - Whether this is a pending (AI-classifying) post
 * @param {string} label - The label to display: "Hired announcement" or "Unsure"
 */
window.LinkedInFilter.blurPost = function(postElement, isPending = false, label = "Unsure") {
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
      <h3 class="linkedin-filter-title">Post Blocked</h3>
      <p class="linkedin-filter-subtitle">${label}</p>
      <button class="linkedin-filter-reveal-button">Reveal Post</button>
    </div>
  `;

  // Add reveal button click handler
  const revealButton = overlay.querySelector('.linkedin-filter-reveal-button');
  revealButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.LinkedInFilter.unblurPost(postElement);
  });

  // Add blur class and overlay
  postElement.classList.add('linkedin-filter-blurred');
  postElement.appendChild(overlay);
};

/**
 * Remove blur overlay from a post element
 * 
 * @param {Element} postElement - The post DOM element
 */
window.LinkedInFilter.unblurPost = function(postElement) {
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

  // Mark as user-revealed using the URN (postKey) stored on the element
  const postKey = postElement.currentPostKey;
  if (postKey) {
    window.LinkedInFilter.userRevealed.add(postKey);
    // Remove from blocked set since user has revealed it
    // (This ensures state consistency, though userRevealed check takes precedence)
  }
};

/**
 * Update overlay to remove pending state
 * 
 * @param {Element} postElement - The post DOM element
 */
window.LinkedInFilter.updateOverlayPendingState = function(postElement, isPending) {
  const overlay = postElement.querySelector('.linkedin-filter-overlay');
  if (overlay) {
    overlay.setAttribute('data-pending', isPending ? 'true' : 'false');
  }
};
