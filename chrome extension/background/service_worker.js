/**
 * Background Service Worker for LinkedIn Feed Filter
 * 
 * Handles AI categorization requests via Gemini LLM.
 */

import { callGeminiLLM } from "./geminiClient.js";

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
});
