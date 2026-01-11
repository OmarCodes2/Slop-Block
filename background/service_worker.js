/**
 * Background Service Worker for LinkedIn Feed Filter
 * 
 * Handles AI classification requests via Chrome's LanguageModel API.
 * Implements queue management and graceful fallback if API is unavailable.
 * 
 * Performance choices:
 * - Queue limits prevent overwhelming the API and reduce memory usage
 * - Deduplication avoids redundant classifications for the same post
 * - Async message handling allows non-blocking background processing
 */

import { callGeminiLLM } from "./geminiClient.js";

// Queue management: max 1-2 inflight AI calls, dedupe by postKey
const aiQueue = {
  inflight: new Set(), // Track postKeys currently being classified
  maxInflight: 2,
  pending: [] // Queue of {postKey, postText, resolve, reject}
};

// Cache for API availability check
let apiAvailable = null;

/**
 * Check if LanguageModel API is available
 * Note: This API is gated (origin trial/flag required)
 * Returns cached result to avoid repeated checks
 */
async function checkAPIAvailability() {
  if (apiAvailable !== null) {
    return apiAvailable;
  }

  try {
    // Chrome LanguageModel API - may require origin trial token
    // Fallback gracefully if unavailable
    if (typeof chrome.languageModel !== 'undefined' && chrome.languageModel) {
      // Try to access the API to verify it's actually available
      const model = await chrome.languageModel.getModel();
      apiAvailable = model !== null && model !== undefined;
    } else {
      apiAvailable = false;
    }
  } catch (error) {
    console.warn('[LinkedIn Filter] LanguageModel API unavailable:', error.message);
    apiAvailable = false;
  }

  return apiAvailable;
}

/**
 * Process the AI classification queue
 * Maintains max 1-2 inflight requests and processes pending items
 */
async function processQueue() {
  // Don't process if queue is full or no pending items
  if (aiQueue.inflight.size >= aiQueue.maxInflight || aiQueue.pending.length === 0) {
    return;
  }

  // Get next item from queue
  const item = aiQueue.pending.shift();
  if (!item) return;

  const { postKey, postText, resolve, reject } = item;

  // Skip if already inflight (deduplication)
  if (aiQueue.inflight.has(postKey)) {
    // Resolve with existing promise if possible, or reject
    processQueue(); // Continue processing queue
    return;
  }

  aiQueue.inflight.add(postKey);

  try {
    const result = await classifyPostWithAI(postText, postKey);
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    aiQueue.inflight.delete(postKey);
    // Process next item in queue
    processQueue();
  }
}

/**
 * Classify a post using Chrome's LanguageModel API
 * 
 * @param {string} postText - The post text to classify (max 1200 chars)
 * @param {string} postKey - Unique identifier for the post
 * @returns {Promise<{decision: string, confidence: number, reason: string}>}
 */
async function classifyPostWithAI(postText, postKey) {
  // Check API availability first
  const available = await checkAPIAvailability();
  if (!available) {
    // Default to HIDE (keep blurred) if API unavailable
    return {
      decision: 'job_announcement_or_other',
      confidence: 0.5,
      reason: 'LanguageModel API unavailable - defaulting to hide'
    };
  }

  try {
    // Clean and limit post text to 1200 chars
    const cleanedText = postText.trim().substring(0, 1200);

    // Strict prompt as specified
    const prompt = `Classify this LinkedIn post.
Return JSON ONLY with:
{
  decision: 'recruiter_hiring_post' | 'job_announcement_or_other',
  confidence: number between 0 and 1,
  reason: short string
}
A recruiter hiring post is written by a recruiter or hiring manager and invites candidates to apply.
A job announcement post is someone announcing they got a job or an offer.

Post: "${cleanedText}"`;

    const model = await chrome.languageModel.getModel();
    const response = await model.generate(prompt);

    // Parse JSON response
    let result;
    try {
      // Extract JSON from response (may have extra text)
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('[LinkedIn Filter] Failed to parse AI response:', parseError);
      // Default to HIDE on parsing failure (safe bias)
      return {
        decision: 'job_announcement_or_other',
        confidence: 0.5,
        reason: 'Failed to parse AI response - defaulting to hide'
      };
    }

    // Validate result structure
    if (!result.decision || !['recruiter_hiring_post', 'job_announcement_or_other'].includes(result.decision)) {
      return {
        decision: 'job_announcement_or_other',
        confidence: result.confidence || 0.5,
        reason: result.reason || 'Invalid AI response format'
      };
    }

    return {
      decision: result.decision,
      confidence: result.confidence || 0.5,
      reason: result.reason || 'AI classification'
    };

  } catch (error) {
    console.error('[LinkedIn Filter] AI classification error:', error);
    // Default to HIDE on error (safe bias)
    return {
      decision: 'job_announcement_or_other',
      confidence: 0.5,
      reason: `Classification error: ${error.message}`
    };
  }
}

/**
 * Message listener for content script communication
 * Handles 'availability', 'classify', and 'llm' actions
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'availability') {
    // Check if LanguageModel API is available
    checkAPIAvailability().then(available => {
      sendResponse({ available });
    }).catch(() => {
      sendResponse({ available: false });
    });
    return true; // Indicates asynchronous response
  }

  if (message.action === 'llm') {
    // Handle LLM categorization requests
    (async () => {
      try {
        const result = await callGeminiLLM(message.text);
        sendResponse({ result });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true; // async
  }

  if (message.action === 'classify') {
    const { postText, postKey } = message;

    if (!postText || !postKey) {
      sendResponse({
        error: 'Missing postText or postKey'
      });
      return;
    }

    // Check if already inflight (deduplication)
    if (aiQueue.inflight.has(postKey)) {
      // Return a promise that resolves when the existing classification completes
      // This is a simplified approach - in practice, we'd need to track promises
      sendResponse({
        decision: 'job_announcement_or_other',
        confidence: 0.5,
        reason: 'Already classifying this post'
      });
      return;
    }

    // Queue the classification request
    const promise = new Promise((resolve, reject) => {
      aiQueue.pending.push({ postKey, postText, resolve, reject });
      processQueue();
    });

    promise.then(result => {
      sendResponse({ ...result, postKey });
    }).catch(error => {
      sendResponse({
        error: error.message,
        decision: 'job_announcement_or_other',
        confidence: 0.5,
        postKey
      });
    });

    return true; // Indicates asynchronous response
  }
});
