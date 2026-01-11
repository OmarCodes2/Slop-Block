/**
 * Background Service Worker for LinkedIn Feed Filter
 * 
 * Handles AI categorization requests via Gemini LLM.
 */

import { callGeminiLLM, warmupSession } from "./geminiClient.js";

/**
 * Message listener for content script communication
 * Handles 'llm' action
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

  if (message.action === 'llm_warmup') {
    // Pre-create or warm-up the LM session to avoid first-request latency
    (async () => {
      try {
        await warmupSession();
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true; // async
  }
});
