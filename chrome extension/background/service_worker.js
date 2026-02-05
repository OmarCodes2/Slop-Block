import { callGeminiLLM, checkAvailability } from "./geminiClient.js";

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
  
  if (message.action === 'checkAIAvailability') {
    (async () => {
      try {
        const availability = await checkAvailability();
        sendResponse({ availability });
      } catch (err) {
        sendResponse({ availability: "unavailable" });
      }
    })();
    return true;
  }
});
