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
        <svg class="linkedin-filter-lock-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1a5 5 0 0 0-5 5v4H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v4H9V6a3 3 0 0 1 3-3z"/>
        </svg>
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
  
  // Get the current label from the stored classification
  let currentLabel = 'Other';
  const classification = postElement.currentClassification;
  
  if (classification === "hiring") {
    currentLabel = "Hiring";
  } else if (classification === "hired_announcement") {
    currentLabel = "Hired announcement";
  } else if (classification === "grindset") {
    currentLabel = "LinkedIn Grindset Final Boss";
  } else if (classification === "ai_doomer") {
    currentLabel = "AI Doomer";
  } else if (classification === "child_prodigy") {
    currentLabel = "Child Prodigy Flex";
  } else if (classification === "sponsored") {
    currentLabel = "Sponsored/Ad";
  } else if (classification === "sales_pitch") {
    currentLabel = "Sales Pitch";
  } else if (classification === "job_seeking") {
    currentLabel = "Job Seeking";
  } else if (classification === "events") {
    currentLabel = "Event/Webinar";
  } else if (classification === "engagement_bait") {
    currentLabel = "Engagement Bait";
  } else if (classification === "educational") {
    currentLabel = "Educational/Tips";
  } else if (classification === "project_launch") {
    currentLabel = "Project Launch";
  } else if (classification === "congrats") {
    currentLabel = "Congrats/Cert";
  } else if (classification === "other") {
    currentLabel = "Other";
  }
  
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
        <svg class="linkedin-filter-lock-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1a5 5 0 0 0-5 5v4H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v4H9V6a3 3 0 0 1 3-3z"/>
        </svg>
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
