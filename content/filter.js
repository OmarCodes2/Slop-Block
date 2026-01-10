/**
 * Filtering Logic for LinkedIn Feed Filter
 *
 * Contains all logic for determining what posts to block:
 * - Signal definitions (positive/negative keywords)
 * - Local heuristics classification
 * - AI classification coordination
 */

// Create namespace for filtering logic
window.LinkedInFilter = window.LinkedInFilter || {};

// Positive signal categories for local heuristics
window.LinkedInFilter.POSITIVE_SIGNALS = {
  RECRUITER_IDENTITY: [
    "recruiter",
    "technical recruiter",
    "talent partner",
    "talent acquisition",
    "hiring manager",
    "staffing",
    "people team",
    "people & culture",
    "hr team",
    "we are hiring",
    "we're hiring",
    "we are actively hiring",
    "we're growing the team",
  ],
  CALL_TO_ACTION: [
    "apply here",
    "apply now",
    "apply below",
    "link to apply",
    "drop your resume",
    "send your resume",
    "dm me your resume",
    "reach out if interested",
    "reach out to me",
    "message me directly",
    "feel free to dm",
    "happy to chat",
  ],
  ROLE_LISTING: [
    "open role",
    "open roles",
    "open position",
    "open positions",
    "hiring for",
    "looking for a",
    "seeking a",
    "we're looking for",
    "join our team",
    "join the team",
  ],
  STRUCTURAL: [
    // These will be detected via pattern matching (bullet points, tech stacks, etc.)
    "compensation",
    "salary",
    "remote",
    "hybrid",
    "visa sponsorship",
    "visa",
    "relocation",
  ],
};

// Negative signals (any of these = confident hide)
window.LinkedInFilter.NEGATIVE_SIGNALS = [
  // Job announcement / offer posts
  "i'm excited to announce",
  "i am excited to share",
  "thrilled to announce",
  "happy to announce",
  "grateful to announce",
  "proud to announce",
  // Acceptance / offer signals
  "accepted an offer",
  "accepted my offer",
  "signed an offer",
  "offer from",
  "joining as",
  "starting as",
  "will be joining",
  "excited to start",
  "next chapter",
  // Brag / outcome posts
  "after months of grinding",
  "hard work pays off",
  "dream company",
  "dream role",
  "blessed",
  "humbled",
  "manifested",
  "finally made it",
  "from rejection to offer",
  "offers from",
  // Thank-you posts
  "thankful for the opportunity",
  "thanks to my mentors",
  "couldn't have done this without",
  "shoutout to",
];

/**
 * Count positive signal categories present in text
 *
 * @param {string} text - The text to analyze
 * @returns {number} Number of positive signal categories (0-4)
 */
window.LinkedInFilter.countPositiveCategories = function (text) {
  const lowerText = text.toLowerCase();
  let categoryCount = 0;

  // Check recruiter identity signals
  if (
    window.LinkedInFilter.POSITIVE_SIGNALS.RECRUITER_IDENTITY.some((signal) =>
      lowerText.includes(signal)
    )
  ) {
    categoryCount++;
  }

  // Check call-to-action signals
  if (
    window.LinkedInFilter.POSITIVE_SIGNALS.CALL_TO_ACTION.some((signal) =>
      lowerText.includes(signal)
    )
  ) {
    categoryCount++;
  }

  // Check role listing signals
  if (
    window.LinkedInFilter.POSITIVE_SIGNALS.ROLE_LISTING.some((signal) =>
      lowerText.includes(signal)
    )
  ) {
    categoryCount++;
  }

  // Check structural signals (bullet points, tech stacks, compensation, etc.)
  const hasBulletPoints = /[•·▪▫◦‣⁃]\s/.test(text) || /^\s*[-*+]\s/m.test(text);
  const hasTechStack =
    /\b(react|node|python|java|javascript|typescript|aws|azure|gcp|docker|kubernetes)\b/i.test(
      text
    );
  const hasCompensation =
    window.LinkedInFilter.POSITIVE_SIGNALS.STRUCTURAL.some((signal) =>
      lowerText.includes(signal)
    );

  if (hasBulletPoints || hasTechStack || hasCompensation) {
    categoryCount++;
  }

  return categoryCount;
};

/**
 * Apply local heuristics to classify a post
 *
 * Decision logic (default blur behavior):
 * - 2+ positive categories → CONFIDENT RECRUITER-HIRING → UNBLUR (SHOW)
 * - Any negative signal → CONFIDENT NOT RECRUITER-HIRING → KEEP BLURRED (HIDE)
 * - Mixed/uncertain → UNCERTAIN → BLUR + Send to AI
 *
 * @param {string} text - The post text
 * @returns {'keep'|'hide'|'uncertain'} Classification decision
 */
window.LinkedInFilter.applyLocalHeuristics = function (text) {
  const lowerText = text.toLowerCase();

  // Check for strong negative signals first
  // If ANY negative signal appears → CONFIDENT HIDE
  for (const signal of window.LinkedInFilter.NEGATIVE_SIGNALS) {
    if (lowerText.includes(signal)) {
      return "hide";
    }
  }

  // Count positive signal categories
  const positiveCategoryCount =
    window.LinkedInFilter.countPositiveCategories(text);

  // If 2+ positive categories → CONFIDENT RECRUITER-HIRING → KEEP (unblur)
  if (positiveCategoryCount >= 1) {
    return "keep";
  }

  // Mixed/uncertain → send to AI
  return "uncertain";
};

/**
 * Send post to AI for classification
 *
 * @param {Element} postElement - The post DOM element
 * @param {string} postText - The post text
 * @param {string} postKey - Unique identifier for the post
 * @param {Map} pendingClassifications - Map tracking pending AI classifications
 * @param {Function} onClassificationResult - Callback when classification completes
 *   Called with (postElement, postKey, result) where result is {decision, confidence, reason}
 */
window.LinkedInFilter.classifyWithAI = function (
  postElement,
  postText,
  postKey,
  pendingClassifications,
  onClassificationResult
) {
  // Check if already classifying this postKey
  if (pendingClassifications.has(postKey)) {
    return;
  }

  // Store reference for async result safety
  const classificationPromise = new Promise((resolve) => {
    pendingClassifications.set(postKey, { node: postElement, resolve });
  });

  // Send to background service worker
  chrome.runtime.sendMessage(
    {
      action: "classify",
      postText: postText.substring(0, 1200), // Limit to 1200 chars
      postKey,
    },
    (response) => {
      // Handle response
      if (chrome.runtime.lastError) {
        console.warn(
          "[LinkedIn Filter] Message error:",
          chrome.runtime.lastError
        );
        // Keep blurred on error (safe default)
        return;
      }

      if (response.error) {
        console.warn("[LinkedIn Filter] Classification error:", response.error);
        // Keep blurred on error (safe default)
        return;
      }

      // Async result safety: verify postKey matches and node still exists
      const pending = pendingClassifications.get(postKey);
      if (!pending || pending.node !== postElement) {
        // Node was recycled or removed, ignore result
        return;
      }

      // Verify currentPostKey still matches (handles DOM recycling)
      if (postElement.currentPostKey !== postKey) {
        // Post element was recycled for a different post, ignore result
        return;
      }

      // Call the result handler
      onClassificationResult(postElement, postKey, response);

      // Clean up
      pendingClassifications.delete(postKey);
    }
  );
};
