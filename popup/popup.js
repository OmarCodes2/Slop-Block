/**
 * Popup Script for Slop Block Extension
 * 
 * Handles toggle state management and storage
 */

// Default settings
const DEFAULT_SETTINGS = {
  showHiringPosts: true,
  showJobAnnouncements: true,
  showGrindset: true,
  showAiDoomer: true,
  showChildProdigy: true
};

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['showHiringPosts', 'showJobAnnouncements', 'showGrindset', 'showAiDoomer', 'showChildProdigy']);
    return {
      showHiringPosts: result.showHiringPosts !== undefined ? result.showHiringPosts : DEFAULT_SETTINGS.showHiringPosts,
      showJobAnnouncements: result.showJobAnnouncements !== undefined ? result.showJobAnnouncements : DEFAULT_SETTINGS.showJobAnnouncements,
      showGrindset: result.showGrindset !== undefined ? result.showGrindset : DEFAULT_SETTINGS.showGrindset,
      showAiDoomer: result.showAiDoomer !== undefined ? result.showAiDoomer : DEFAULT_SETTINGS.showAiDoomer,
      showChildProdigy: result.showChildProdigy !== undefined ? result.showChildProdigy : DEFAULT_SETTINGS.showChildProdigy
    };
  } catch (error) {
    console.error('[Slop Block] Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Save settings to storage
async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set(settings);
    // Notify content script of settings change
    notifyContentScript(settings);
  } catch (error) {
    console.error('[Slop Block] Error saving settings:', error);
  }
}

// Notify content script of settings change
function notifyContentScript(settings) {
  // Get the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('linkedin.com')) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'settingsChanged',
        settings: settings
      }).catch(() => {
        // Content script might not be ready, that's okay
      });
    }
  });
}

// Initialize popup
async function initializePopup() {
  const settings = await loadSettings();
  
  // Set toggle states
  const hiringPostsToggle = document.getElementById('toggle-hiring-posts');
  const jobAnnouncementsToggle = document.getElementById('toggle-job-announcements');
  const grindsetToggle = document.getElementById('toggle-grindset');
  const aiDoomerToggle = document.getElementById('toggle-ai-doomer');
  const childProdigyToggle = document.getElementById('toggle-child-prodigy');
  
  hiringPostsToggle.checked = settings.showHiringPosts;
  jobAnnouncementsToggle.checked = settings.showJobAnnouncements;
  grindsetToggle.checked = settings.showGrindset;
  aiDoomerToggle.checked = settings.showAiDoomer;
  childProdigyToggle.checked = settings.showChildProdigy;
  
  // Add event listeners
  hiringPostsToggle.addEventListener('change', async (e) => {
    const newSettings = {
      showHiringPosts: e.target.checked,
      showJobAnnouncements: jobAnnouncementsToggle.checked,
      showGrindset: grindsetToggle.checked,
      showAiDoomer: aiDoomerToggle.checked,
      showChildProdigy: childProdigyToggle.checked
    };
    await saveSettings(newSettings);
  });
  
  jobAnnouncementsToggle.addEventListener('change', async (e) => {
    const newSettings = {
      showHiringPosts: hiringPostsToggle.checked,
      showJobAnnouncements: e.target.checked,
      showGrindset: grindsetToggle.checked,
      showAiDoomer: aiDoomerToggle.checked,
      showChildProdigy: childProdigyToggle.checked
    };
    await saveSettings(newSettings);
  });
  
  grindsetToggle.addEventListener('change', async (e) => {
    const newSettings = {
      showHiringPosts: hiringPostsToggle.checked,
      showJobAnnouncements: jobAnnouncementsToggle.checked,
      showGrindset: e.target.checked,
      showAiDoomer: aiDoomerToggle.checked,
      showChildProdigy: childProdigyToggle.checked
    };
    await saveSettings(newSettings);
  });
  
  aiDoomerToggle.addEventListener('change', async (e) => {
    const newSettings = {
      showHiringPosts: hiringPostsToggle.checked,
      showJobAnnouncements: jobAnnouncementsToggle.checked,
      showGrindset: grindsetToggle.checked,
      showAiDoomer: e.target.checked,
      showChildProdigy: childProdigyToggle.checked
    };
    await saveSettings(newSettings);
  });
  
  childProdigyToggle.addEventListener('change', async (e) => {
    const newSettings = {
      showHiringPosts: hiringPostsToggle.checked,
      showJobAnnouncements: jobAnnouncementsToggle.checked,
      showGrindset: grindsetToggle.checked,
      showAiDoomer: aiDoomerToggle.checked,
      showChildProdigy: e.target.checked
    };
    await saveSettings(newSettings);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}
