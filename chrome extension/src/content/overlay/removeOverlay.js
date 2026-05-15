window.LinkedInFilter = window.LinkedInFilter || {};

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
