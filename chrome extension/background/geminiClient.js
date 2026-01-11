let lmSession = null;

function getLanguageModelAPI(scope = globalThis) {
  if (typeof scope.LanguageModel !== "undefined") return scope.LanguageModel;
  if (scope.ai && scope.ai.LanguageModel) return scope.ai.LanguageModel;
  return null;
}

async function getSession() {
  const LM = getLanguageModelAPI();
  if (!LM) {
    throw new Error("LanguageModel API not available (Chrome built-in AI disabled)");
  }

  if (!lmSession) {
    lmSession = await LM.create({ outputLanguage: "en" });
  }

  return lmSession;
}

export async function callGeminiLLM(text) {
  if (!text || !text.trim()) {
    throw new Error("Prompt text is empty");
  }

  const session = await getSession();
  return await session.prompt(text);
}
