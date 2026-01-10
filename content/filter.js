/**
 * Filtering Logic for LinkedIn Feed Filter
 *
 * Classification logic that decides what label to show and whether to auto-hide or allow.
 */

// Create namespace for filtering logic
window.LinkedInFilter = window.LinkedInFilter || {};

// Phrase lists for classification
const GUARANTEED_HIRING_PHRASES = [
  // "we are hiring" variations
  "we are hiring",
  "we're hiring",
  "we are currently hiring",
  "we're currently hiring",
  "we are actively hiring",
  "we're actively hiring",
  "we are now hiring",
  "we're now hiring",
  // "now hiring" variations
  "now hiring",
  "hiring now",
  "currently hiring",
  "hiring today",
  "hiring asap",
  "hiring urgently",
  // "hiring immediately" variations
  "hiring immediately",
  "hiring right now",
  "hiring asap",
  "hiring urgently",
  // "actively hiring" variations
  "actively hiring",
  "actively recruiting",
  "actively seeking",
  "actively looking",
  // "currently hiring" variations
  "currently hiring",
  "currently recruiting",
  "currently seeking",
  "currently looking",
  // "open roles" variations
  "open roles",
  "open role",
  "roles available",
  "role available",
  "roles open",
  "role open",
  "positions open",
  "position open",
  // "open positions" variations
  "open positions",
  "open position",
  "positions available",
  "position available",
  "positions open",
  "position open",
  // "job openings" variations
  "job openings",
  "job opening",
  "openings available",
  "opening available",
  "jobs available",
  "job available",
  // "vacancies available" variations
  "vacancies available",
  "vacancy available",
  "vacancies",
  "vacancy",
  "open vacancies",
  "open vacancy",
  // "apply here" variations
  "apply here",
  "apply at",
  "apply via",
  "apply through",
  "apply on",
  // "apply now" variations
  "apply now",
  "apply today",
  "apply immediately",
  "apply asap",
  // "apply below" variations
  "apply below",
  "apply above",
  "apply in comments",
  "apply in the comments",
  // "submit your application" variations
  "submit your application",
  "submit application",
  "send application",
  "send your application",
  "submit an application",
  "send an application",
  // "send your resume" variations
  "send your resume",
  "send resume",
  "send your cv",
  "send cv",
  "share your resume",
  "share resume",
  "share your cv",
  "share cv",
  "forward your resume",
  "forward resume",
  // "send your cv" variations
  "send your cv",
  "send cv",
  "send your resume",
  "share your cv",
  "share cv",
  // "drop your resume" variations
  "drop your resume",
  "drop resume",
  "drop your cv",
  "drop cv",
  "share your resume",
  // "dm me your resume" variations
  "dm me your resume",
  "dm your resume",
  "message me your resume",
  "send me your resume",
  "dm me resume",
  "message me resume",
  "dm me your cv",
  "message me your cv",
  // "email your resume" variations
  "email your resume",
  "email resume",
  "email your cv",
  "email cv",
  "send email with resume",
  "send email with cv",
  // "link to apply" variations
  "link to apply",
  "application link",
  "apply link",
  "link for application",
  "link for apply",
  "application url",
  "apply url",
  // "application link" variations
  "application link",
  "apply link",
  "link to apply",
  "link for application",
  // "join our team" variations
  "join our team",
  "join us",
  "become part of our team",
  "join the team",
  "come join our team",
  "come join us",
  "we want you to join",
  "we'd love you to join",
  // "hiring a" variations
  "hiring a",
  "hiring an",
  "looking to hire a",
  "looking to hire an",
  "seeking to hire a",
  "seeking to hire an",
  // "looking for a" variations
  "looking for a",
  "looking for an",
  "seeking a",
  "seeking an",
  "in search of a",
  "in search of an",
  "searching for a",
  "searching for an",
  // "seeking a" variations
  "seeking a",
  "seeking an",
  "looking for a",
  "looking for an",
  // "recruiting for" variations
  "recruiting for",
  "recruiting a",
  "recruiting an",
  "hiring for",
  "looking to recruit",
  "seeking to recruit",
  // "we're adding a" variations
  "we're adding a",
  "we are adding a",
  "adding a",
  "adding an",
  "we're adding an",
  "we are adding an",
  "we're looking to add a",
  "we are looking to add a",
  "we're looking to add an",
  "we are looking to add an"
];

const GUARANTEED_HIRED_ANNOUNCEMENT_PHRASES = [
  // "i'm excited to announce" variations
  "i'm excited to announce",
  "i am excited to announce",
  "excited to announce",
  "i'm thrilled to announce",
  "i am thrilled to announce",
  "thrilled to announce",
  "i'm happy to announce",
  "i am happy to announce",
  "happy to announce",
  "i'm pleased to announce",
  "i am pleased to announce",
  "pleased to announce",
  "i'm delighted to announce",
  "i am delighted to announce",
  "delighted to announce",
  // "thrilled to announce" variations
  "thrilled to announce",
  "excited to announce",
  "happy to announce",
  "pleased to announce",
  "delighted to announce",
  // "happy to announce" variations
  "happy to announce",
  "excited to announce",
  "thrilled to announce",
  "pleased to announce",
  "glad to announce",
  // "excited to share that i" variations
  "excited to share that i",
  "thrilled to share that i",
  "happy to share that i",
  "proud to share that i",
  "pleased to share that i",
  "excited to share",
  "thrilled to share",
  "happy to share",
  // "i'm happy to share" variations
  "i'm happy to share",
  "i am happy to share",
  "i'm excited to share",
  "i am excited to share",
  "i'm thrilled to share",
  "i am thrilled to share",
  "happy to share",
  "excited to share",
  "thrilled to share",
  // "grateful to accept" variations
  "grateful to accept",
  "honored to accept",
  "excited to accept",
  "thrilled to accept",
  "happy to accept",
  "pleased to accept",
  // "proud to announce that i" variations
  "proud to announce that i",
  "excited to announce that i",
  "thrilled to announce that i",
  "happy to announce that i",
  "pleased to announce that i",
  "proud to announce",
  // "pleased to announce that i" variations
  "pleased to announce that i",
  "excited to announce that i",
  "happy to announce that i",
  "thrilled to announce that i",
  "pleased to announce",
  // "i've accepted an offer" variations
  "i've accepted an offer",
  "i have accepted an offer",
  "accepted an offer",
  "i've taken an offer",
  "i have taken an offer",
  "took an offer",
  "i've received an offer",
  "i have received an offer",
  "received an offer",
  // "i have accepted an offer" variations
  "i have accepted an offer",
  "i've accepted an offer",
  "accepted an offer",
  "i have taken an offer",
  "i've taken an offer",
  // "accepted an offer at" variations
  "accepted an offer at",
  "accepted an offer from",
  "took an offer at",
  "took an offer from",
  "accepted offer at",
  "accepted offer from",
  // "starting a new role at" variations
  "starting a new role at",
  "starting new role at",
  "beginning a new role at",
  "beginning new role at",
  "starting my new role at",
  "beginning my new role at",
  "starting a new position at",
  "beginning a new position at",
  // "joining the team at" variations
  "joining the team at",
  "joining team at",
  "joining the team of",
  "joining team of",
  "joining a team at",
  "joining a team of",
  // "i'm joining" variations
  "i'm joining",
  "i am joining",
  "joining",
  "will be joining",
  "i'm going to join",
  "i am going to join",
  "i'll be joining",
  "i will be joining",
  // "i am joining" variations
  "i am joining",
  "i'm joining",
  "joining",
  "will be joining",
  // "officially starting at" variations
  "officially starting at",
  "starting at",
  "beginning at",
  "officially beginning at",
  "officially starting",
  // "i'll be starting at" variations
  "i'll be starting at",
  "i will be starting at",
  "starting at",
  "beginning at",
  "i'll be beginning at",
  "i will be beginning at",
  // "i will be starting at" variations
  "i will be starting at",
  "i'll be starting at",
  "starting at",
  "beginning at",
  // "excited to start at" variations
  "excited to start at",
  "thrilled to start at",
  "happy to start at",
  "proud to start at",
  "pleased to start at",
  "excited to begin at",
  "thrilled to begin at",
  // "thrilled to start at" variations
  "thrilled to start at",
  "excited to start at",
  "happy to start at",
  "proud to start at",
  // "beginning my journey at" variations
  "beginning my journey at",
  "starting my journey at",
  "beginning journey at",
  "starting journey at",
  "beginning a new journey at",
  "starting a new journey at",
  // "will be joining" variations
  "will be joining",
  "joining",
  "will join",
  "am joining",
  "i'm joining",
  "i am joining",
  "i'll be joining",
  "i will be joining",
  // Additional common variations
  "new role",
  "new position",
  "new job",
  "starting my new job",
  "beginning my new job",
  "accepted a position",
  "accepted a role",
  "took a position",
  "took a role",
  "starting my career at",
  "beginning my career at",
  "excited to join",
  "thrilled to join",
  "happy to join",
  "proud to join"
];

const GUARANTEED_GRINDSET_PHRASES = [
  "while you were sleeping",
  "while you slept",
  "4am wakeup",
  "4 am wakeup",
  "4:00am wakeup",
  "4:00 am wakeup",
  "5am wakeup",
  "5 am wakeup",
  "5:00am wakeup",
  "5:00 am wakeup",
  "wake up at 4am",
  "wake up at 4 am",
  "wake up at 5am",
  "wake up at 5 am",
  "4am club",
  "4 am club",
  "5am club",
  "5 am club",
  "cold shower",
  "cold showers",
  "no weekends",
  "no days off",
  "grind never stops",
  "hustle never stops",
  "sleep is for the weak",
  "wake up while you sleep",
  "while you were sleeping i was",
  "no days off grind",
  "no weekend grind"
];

const GUARANTEED_AI_DOOMER_PHRASES = [
  "swe is dead",
  "software engineering is dead",
  "stop learning to code",
  "don't learn to code",
  "do not learn to code",
  "coding is dead",
  "programming is dead",
  "developers are obsolete",
  "engineers are obsolete",
  "programmers are obsolete",
  "ai will replace all developers",
  "ai will replace all engineers",
  "ai will replace all programmers",
  "ai will replace every developer",
  "ai will replace every engineer",
  "ai will replace every programmer",
  "coding is pointless",
  "learning to code is pointless",
  "all developers will be replaced",
  "all engineers will be replaced",
  "all programmers will be replaced",
  "every developer will be replaced",
  "every engineer will be replaced",
  "every programmer will be replaced",
  "developers are finished",
  "engineers are finished",
  "programmers are finished",
  "software engineering is over",
  "coding is over",
  "programming is over"
];

const GUARANTEED_CHILD_PRODIGY_PHRASES = [
  "high schooler built",
  "high schooler created",
  "high schooler founded",
  "high schooler launched",
  "high schooler started",
  "high schooler developed",
  "high schooler raised",
  "high schooler sold",
  "high schooler built a",
  "high schooler created a",
  "high schooler founded a",
  "high schooler launched a",
  "high schooler started a",
  "high schooler developed a",
  "middle schooler built",
  "middle schooler created",
  "middle schooler founded",
  "middle schooler launched",
  "middle schooler started",
  "middle schooler developed",
  "middle schooler built a",
  "middle schooler created a",
  "middle schooler founded a",
  "middle schooler launched a",
  "middle schooler started a",
  "middle schooler developed a",
  "teenager built",
  "teenager created",
  "teenager founded",
  "teenager launched",
  "teenager started",
  "teenager developed",
  "teenager raised",
  "teenager sold",
  "teenager built a",
  "teenager created a",
  "teenager founded a",
  "teenager launched a",
  "teenager started a",
  "teenager developed a",
  "high school founder",
  "high school ceo",
  "high school entrepreneur",
  "middle school founder",
  "middle school ceo",
  "middle school entrepreneur",
  "teenage founder",
  "teenage ceo",
  "teenage entrepreneur"
];

/**
 * Normalize text for matching
 * - Convert to lowercase
 * - Collapse whitespace
 * 
 * @param {string} text - The text to normalize
 * @returns {string} - Normalized text
 */
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Extract visible text content from a LinkedIn post element
 * Includes expanded "see more" content if already expanded
 * 
 * @param {Element} postElement - The post article element
 * @returns {string} - The extracted text content
 */
function extractPostText(postElement) {
  if (!postElement) return '';
  
  // Try multiple selectors to find the post text content
  // LinkedIn uses various classes for post text
  const textSelectors = [
    '.feed-shared-update-v2__description',
    '.feed-shared-text-view',
    '.feed-shared-text',
    '[data-test-id="main-feed-activity-card__commentary"]',
    '.update-components-text',
    '.feed-shared-inline-show-more-text',
    '.feed-shared-text__text-view'
  ];
  
  let textContent = '';
  
  // Try each selector
  for (const selector of textSelectors) {
    const element = postElement.querySelector(selector);
    if (element) {
      // Get all text content, including from nested elements
      textContent = element.innerText || element.textContent || '';
      if (textContent.trim()) {
        break;
      }
    }
  }
  
  // Fallback: get all text from the post element if no specific selector worked
  if (!textContent.trim()) {
    // Clone to avoid modifying the original
    const clone = postElement.cloneNode(true);
    // Remove overlay and other UI elements
    const overlays = clone.querySelectorAll('.linkedin-filter-overlay, button, .feed-shared-social-action-bar');
    overlays.forEach(el => el.remove());
    textContent = clone.innerText || clone.textContent || '';
  }
  
  return textContent;
}

/**
 * Classify a post based on phrase matching
 * 
 * Precedence:
 * 1) If matches hiring phrases → return "allow"
 * 2) Else if matches hired announcement phrases → return "hired_announcement"
 * 3) Else if matches grindset phrases → return "grindset"
 * 4) Else if matches AI doomer phrases → return "ai_doomer"
 * 5) Else if matches child prodigy phrases → return "child_prodigy"
 * 6) Else → return "unsure"
 * 
 * @param {Element} postElement - The post article element
 * @returns {string} - Classification result: "allow", "hired_announcement", "grindset", "ai_doomer", "child_prodigy", or "unsure"
 */
window.LinkedInFilter.classifyPost = function(postElement) {
  // Extract post text
  const postText = extractPostText(postElement);
  const normalizedText = normalizeText(postText);
  
  // Check hiring phrases first (highest precedence)
  for (const phrase of GUARANTEED_HIRING_PHRASES) {
    if (normalizedText.includes(phrase.toLowerCase())) {
      // Debug: log the match
      console.log('[LinkedIn Filter] GUARANTEED_HIRING_PHRASES match:', phrase);
      console.log('[LinkedIn Filter] Matched text context:', 
        normalizedText.substring(
          Math.max(0, normalizedText.indexOf(phrase.toLowerCase()) - 50),
          Math.min(normalizedText.length, normalizedText.indexOf(phrase.toLowerCase()) + phrase.length + 50)
        ));
      return "allow";
    }
  }
  
  // Check hired announcement phrases
  for (const phrase of GUARANTEED_HIRED_ANNOUNCEMENT_PHRASES) {
    if (normalizedText.includes(phrase.toLowerCase())) {
      return "hired_announcement";
    }
  }
  
  // Check grindset phrases
  for (const phrase of GUARANTEED_GRINDSET_PHRASES) {
    if (normalizedText.includes(phrase.toLowerCase())) {
      return "grindset";
    }
  }
  
  // Check AI doomer phrases
  for (const phrase of GUARANTEED_AI_DOOMER_PHRASES) {
    if (normalizedText.includes(phrase.toLowerCase())) {
      return "ai_doomer";
    }
  }
  
  // Check child prodigy phrases
  for (const phrase of GUARANTEED_CHILD_PRODIGY_PHRASES) {
    if (normalizedText.includes(phrase.toLowerCase())) {
      return "child_prodigy";
    }
  }
  
  // Default: unsure
  return "unsure";
};
