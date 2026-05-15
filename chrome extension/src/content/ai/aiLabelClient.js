window.LinkedInFilter = window.LinkedInFilter || {};

window.LinkedInFilter.categorizePostWithAI = async function(postElement, urn) {
  const settings = window.LinkedInFilter.filterSettings || {};
  if (!settings.aiEnabled) {
    console.log('[LinkedIn Filter] AI processing disabled, keeping "Uncategorized" label');
    return;
  }

  const postText = window.LinkedInFilter.extractPostText(postElement);

  if (!postText || !postText.trim()) {
    console.log('[LinkedIn Filter] No text found for post:', urn);
    return;
  }

  window.LinkedInFilter.updateOverlayLabel(postElement, "Processing...");

  const prompt = `Categorize this LinkedIn post in exactly 1-3 words only. Return ONLY the category name with no markdown, stars, asterisks, or formatting. Just the words. Post: "${postText.substring(0, 1000)}"`;

  try {
    const response = await chrome.runtime.sendMessage({
      action: "llm",
      text: prompt
    });

    if (response.error) {
      console.error('[LinkedIn Filter] AI categorization error:', response.error);
      window.LinkedInFilter.updateOverlayLabel(postElement, "Uncategorized");
    } else {
      console.log('[LinkedIn Filter] AI categorization for post', urn, ':', response.result);

      let aiLabel = response.result
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#/g, '')
        .replace(/\[|\]/g, '')
        .trim();

      const words = aiLabel.split(/\s+/).slice(0, 3);
      aiLabel = words.join(' ');

      if (!aiLabel || aiLabel.length === 0) {
        aiLabel = "Uncategorized";
      }

      window.LinkedInFilter.updateOverlayLabel(postElement, aiLabel);
    }
  } catch (error) {
    console.error('[LinkedIn Filter] Failed to categorize post with AI:', error);
    window.LinkedInFilter.updateOverlayLabel(postElement, "Uncategorized");
  }
};
