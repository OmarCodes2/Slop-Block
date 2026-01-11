// geminiClient.js
// Single-responsibility Gemini / LanguageModel client

let lmSession = null;

/**
 * Locate the LanguageModel API in Chrome
 */
function getLanguageModelAPI(scope = globalThis) {
  if (typeof scope.LanguageModel !== "undefined") return scope.LanguageModel;
  if (scope.ai && scope.ai.LanguageModel) return scope.ai.LanguageModel;
  return null;
}

/**
 * Get or create a cached session
 */
async function getSession() {
  const LM = getLanguageModelAPI();
  if (!LM) {
    throw new Error("LanguageModel API not available (Chrome built-in AI disabled)");
  }

  if (!lmSession) {
    // outputLanguage is ONLY allowed here
    lmSession = await LM.create({ outputLanguage: "en" });
  }

  return lmSession;
}

/**
 * 🔑 MAIN FUNCTION YOU CALL
 *
 * @param {string} text - prompt to send to Gemini
 * @returns {Promise<string>} model response
 */
export async function callGeminiLLM(text) {
  if (!text || !text.trim()) {
    throw new Error("Prompt text is empty");
  }

  const session = await getSession();

  // prompt() takes only the text
  return await session.prompt(text);
}

/**
 * Warm up / initialize the LM session ahead of requests.
 * Call this from the service worker to pre-create the session so
 * the first real request is fast.
 */
export async function warmupSession() {
  await getSession();
  return true;
}
