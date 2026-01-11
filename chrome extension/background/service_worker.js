import { callGeminiLLM } from "./geminiClient.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'llm') {
    (async () => {
      try {
        const result = await callGeminiLLM(message.text);
        sendResponse({ result });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true;
  }
});
