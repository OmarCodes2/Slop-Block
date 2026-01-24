# Copilot Instructions for Slop Block

## Project Overview

**Slop Block** is a Chrome extension that filters LinkedIn posts using a hybrid classification system:
- **Heuristics-first approach**: Fast keyword/regex patterns run immediately on post text
- **AI fallback**: Chrome's built-in LanguageModel API (Gemini Nano) processes ambiguous posts only
- **Local-only**: All processing happens in-browser; no data sent to external servers

## Architecture & Data Flow

### Component Isolation (MV3 Manifest)

```
Content Scripts (LinkedIn DOM)           Background Service Worker (AI)      Storage/Popup
├─ content_script.js (orchestrator)      └─ geminiClient.js (AI wrapper)    ├─ chrome.storage.sync
├─ filter.js (heuristics engine)            service_worker.js (message    └─ popup.js (settings)
└─ ui.js (overlay/reveal UI)                router)
```

### Critical Design Pattern: URN-Based Deduplication

Posts are identified by LinkedIn's unique activity URNs (`data-urn="urn:li:activity:123456"`). A `Set` called `processedUrns` prevents duplicate processing:

```javascript
// content_script.js lines ~95
if (processedUrns.has(urn)) continue;  // Skip already-processed posts
processedUrns.add(urn);  // Mark for processing
```

This is essential because LinkedIn's virtualized feed re-renders posts, and the DOM observer may see the same post multiple times. **Never bypass this check** when modifying post processing logic.

### Classification Flow

1. **Heuristics classification** (`filter.js` → `LinkedInFilter.classifyPost()`)
   - Returns one of 14 categories: `"hiring"`, `"grindset"`, `"ai_doomer"`, etc.
   - Guaranteed categories have phrase lists + regex patterns checked in order
   
2. **User preference check** (`content_script.js` lines ~130-160)
   - If heuristics return "other", query user settings
   - If `aiEnabled` is true AND classification is "other", send to background AI

3. **AI fallback** (message passing to `service_worker.js`)
   - Content script sends post text via `chrome.runtime.sendMessage()`
   - Background worker awaits `callGeminiLLM()` and returns result
   - Content script updates overlay with AI classification

### Settings Architecture

Settings stored in `chrome.storage.sync` (14 category toggles + 2 flags):
- All toggles are **show/display toggles**, not hide toggles
- `showHiringPosts: true` means hiring posts are **visible** (not blocked)
- Default: only `showHiringPosts: true` (all other content blocked)

**Critical for new toggles**: Maintain consistency across:
- `DEFAULT_SETTINGS` in `popup.js`
- `filterSettings` initialization in `content_script.js`
- All three storage.sync.get() calls (they duplicate the key lists)

## Key Files & Their Responsibilities

| File | Purpose | Lines | Pattern |
|------|---------|-------|---------|
| [content/content_script.js](chrome%20extension/content/content_script.js) | Orchestrates DOM scanning, classification, blocking decisions; loads settings; listens for storage changes | ~624 | DOM mutation observer + MutationObserver batch processing |
| [content/filter.js](chrome%20extension/content/filter.js) | Pure heuristics classification engine with phrase lists and regex | ~362 | Order-dependent classification; guarantees checked first, then looser patterns |
| [content/ui.js](chrome%20extension/content/ui.js) | Creates blur overlays, reveal buttons, pending states | ~127 | DOM manipulation utilities, event delegation |
| [background/geminiClient.js](chrome%20extension/background/geminiClient.js) | Wraps Chrome LanguageModel API; maintains singleton session | ~30 | Single persistent session reuse for performance |
| [background/service_worker.js](chrome%20extension/background/service_worker.js) | Message router between content script and Gemini | ~13 | Async message handler with sendResponse pattern |
| [popup/popup.js](chrome%20extension/popup/popup.js) | UI state management and chrome.storage.sync persistence | ~172 | Matches DEFAULT_SETTINGS exactly; notifies active tab on changes |

## Developer Workflows

### Adding a New Post Category

1. **Define the heuristics** in `filter.js`:
   - Add phrase list: `const GUARANTEED_<CATEGORY>_PHRASES = [...]`
   - Add regex patterns: `const GUARANTEED_<CATEGORY>_REGEX = [...]`
   - Add to `classifyPost()` check with its own if-else branch

2. **Add toggle to UI**:
   - Add HTML toggle in `popup/popup.html`
   - Add to `DEFAULT_SETTINGS` object in `popup.js` (camelCase: `show<Category>`)
   - Add ID to `getAllToggleValues()` function

3. **Wire in content script**:
   - Add key to `loadFilterSettings()` storage.sync.get() call
   - Add to initial `filterSettings` object
   - Add matching else-if in post-processing logic (~line 130-160)

4. **Testing**: Manually verify on LinkedIn; watch DevTools for classification logs

### Debugging Post Classification

Enable logging in `filter.js` by checking console in DevTools:
- `content_script.js` logs: `[LinkedIn Filter] ...`
- Classification happens in `LinkedInFilter.classifyPost()` 
- Check both heuristic result and actual boolean logic applied

### Performance Considerations

- **Batching**: `scanForPostArticles()` uses single `querySelectorAll` (efficient)
- **AI gating**: Only ambiguous posts hit LLM; cached session reused
- **requestIdleCallback** pattern: Posts processed when browser is idle to avoid jank
- **Set deduplication**: Critical to prevent re-classifying same URN

## Cross-File Communication Patterns

**Content Script ↔ Background Worker** (message passing):
```javascript
// Send message (content_script.js)
chrome.runtime.sendMessage({ action: 'llm', text: postText }, (response) => {
  if (response.result) { /* handle AI classification */ }
});

// Receive & respond (service_worker.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'llm') {
    callGeminiLLM(message.text).then(result => sendResponse({ result }));
    return true;  // Keep channel open for async response
  }
});
```

**Popup ↔ Content Script** (settings broadcast):
```javascript
// Popup saves settings
chrome.storage.sync.set(settings);
chrome.tabs.sendMessage(tabId, { action: 'settingsChanged', settings });

// Content script listens (in content_script.js)
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'settingsChanged') {
    filterSettings = message.settings;
    // Re-evaluate visible posts...
  }
});
```

## Common Pitfalls

1. **URN deduplication**: Always check `processedUrns` before processing; skipping wastes AI quota
2. **Settings sync mismatch**: Duplicate object definitions across files create hard-to-spot bugs
3. **Toggle naming**: All post category toggles must be `show<Category>` (show = visible/not blocked)
4. **Missing storage.sync keys**: Adding a toggle without updating all three `get()` calls breaks persistence
5. **Async AI calls**: Remember `return true` in `onMessage` listener to keep response channel open
6. **Manifest permissions**: Extension runs only on `https://www.linkedin.com/*`; test on actual LinkedIn

## Chrome AI API Setup

- Requires Chrome Canary/Beta 127+
- Flags: `#prompt-api-for-gemini-nano`, `#optimization-guide-on-device-model`
- Session lazy-loads on first AI call (first post may be slow; subsequent calls faster)
- `geminiClient.js` handles session initialization and caching
