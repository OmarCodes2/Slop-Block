/**
 * Popup Script for Slop Block Extension
 * 
 * Handles toggle state management and storage
 */

// Default settings
// Categories marked "HIDE" are set to false (hidden by default)
// Categories marked "ALLOW" or "OPTIONAL" are set to true (shown by default)
const DEFAULT_SETTINGS = {
  showHiringPosts: true, // ALLOW - only default enabled toggle
  showJobAnnouncements: false, // HIDE
  showGrindset: false, // HIDE
  showAiDoomer: false, // HIDE
  showChildProdigy: false, // HIDE
  showSponsored: false, // HIDE
  showSalesPitch: false, // HIDE
  showJobSeeking: false, // HIDE
  showEvents: false, // HIDE
  showEngagementBait: false, // HIDE
  showEducational: false, // HIDE
  showProjectLaunch: false, // HIDE
  showCongrats: false, // HIDE
  showOther: false // HIDE
};

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([
      'showHiringPosts', 'showJobAnnouncements', 'showGrindset', 'showAiDoomer', 'showChildProdigy',
      'showSponsored', 'showSalesPitch', 'showJobSeeking', 'showEvents', 'showEngagementBait',
      'showEducational', 'showProjectLaunch', 'showCongrats', 'showOther'
    ]);
    return {
      showHiringPosts: result.showHiringPosts !== undefined ? result.showHiringPosts : DEFAULT_SETTINGS.showHiringPosts,
      showJobAnnouncements: result.showJobAnnouncements !== undefined ? result.showJobAnnouncements : DEFAULT_SETTINGS.showJobAnnouncements,
      showGrindset: result.showGrindset !== undefined ? result.showGrindset : DEFAULT_SETTINGS.showGrindset,
      showAiDoomer: result.showAiDoomer !== undefined ? result.showAiDoomer : DEFAULT_SETTINGS.showAiDoomer,
      showChildProdigy: result.showChildProdigy !== undefined ? result.showChildProdigy : DEFAULT_SETTINGS.showChildProdigy,
      showSponsored: result.showSponsored !== undefined ? result.showSponsored : DEFAULT_SETTINGS.showSponsored,
      showSalesPitch: result.showSalesPitch !== undefined ? result.showSalesPitch : DEFAULT_SETTINGS.showSalesPitch,
      showJobSeeking: result.showJobSeeking !== undefined ? result.showJobSeeking : DEFAULT_SETTINGS.showJobSeeking,
      showEvents: result.showEvents !== undefined ? result.showEvents : DEFAULT_SETTINGS.showEvents,
      showEngagementBait: result.showEngagementBait !== undefined ? result.showEngagementBait : DEFAULT_SETTINGS.showEngagementBait,
      showEducational: result.showEducational !== undefined ? result.showEducational : DEFAULT_SETTINGS.showEducational,
      showProjectLaunch: result.showProjectLaunch !== undefined ? result.showProjectLaunch : DEFAULT_SETTINGS.showProjectLaunch,
      showCongrats: result.showCongrats !== undefined ? result.showCongrats : DEFAULT_SETTINGS.showCongrats,
      showOther: result.showOther !== undefined ? result.showOther : DEFAULT_SETTINGS.showOther
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

// Helper function to get all toggle values
function getAllToggleValues() {
  return {
    showHiringPosts: document.getElementById('toggle-hiring-posts').checked,
    showJobAnnouncements: document.getElementById('toggle-job-announcements').checked,
    showGrindset: document.getElementById('toggle-grindset').checked,
    showAiDoomer: document.getElementById('toggle-ai-doomer').checked,
    showChildProdigy: document.getElementById('toggle-child-prodigy').checked,
    showSponsored: document.getElementById('toggle-sponsored').checked,
    showSalesPitch: document.getElementById('toggle-sales-pitch').checked,
    showJobSeeking: document.getElementById('toggle-job-seeking').checked,
    showEvents: document.getElementById('toggle-events').checked,
    showEngagementBait: document.getElementById('toggle-engagement-bait').checked,
    showEducational: document.getElementById('toggle-educational').checked,
    showProjectLaunch: document.getElementById('toggle-project-launch').checked,
    showCongrats: document.getElementById('toggle-congrats').checked,
    showOther: document.getElementById('toggle-other').checked
  };
}

// Helper function to add toggle event listener
function addToggleListener(toggleId) {
  const toggle = document.getElementById(toggleId);
  toggle.addEventListener('change', async (e) => {
    const newSettings = getAllToggleValues();
    await saveSettings(newSettings);
  });
}

// Initialize popup
async function initializePopup() {
  const settings = await loadSettings();
  
  // Set toggle states
  document.getElementById('toggle-hiring-posts').checked = settings.showHiringPosts;
  document.getElementById('toggle-job-announcements').checked = settings.showJobAnnouncements;
  document.getElementById('toggle-grindset').checked = settings.showGrindset;
  document.getElementById('toggle-ai-doomer').checked = settings.showAiDoomer;
  document.getElementById('toggle-child-prodigy').checked = settings.showChildProdigy;
  document.getElementById('toggle-sponsored').checked = settings.showSponsored;
  document.getElementById('toggle-sales-pitch').checked = settings.showSalesPitch;
  document.getElementById('toggle-job-seeking').checked = settings.showJobSeeking;
  document.getElementById('toggle-events').checked = settings.showEvents;
  document.getElementById('toggle-engagement-bait').checked = settings.showEngagementBait;
  document.getElementById('toggle-educational').checked = settings.showEducational;
  document.getElementById('toggle-project-launch').checked = settings.showProjectLaunch;
  document.getElementById('toggle-congrats').checked = settings.showCongrats;
  document.getElementById('toggle-other').checked = settings.showOther;
  
  // Add event listeners for all toggles
  addToggleListener('toggle-hiring-posts');
  addToggleListener('toggle-job-announcements');
  addToggleListener('toggle-grindset');
  addToggleListener('toggle-ai-doomer');
  addToggleListener('toggle-child-prodigy');
  addToggleListener('toggle-sponsored');
  addToggleListener('toggle-sales-pitch');
  addToggleListener('toggle-job-seeking');
  addToggleListener('toggle-events');
  addToggleListener('toggle-engagement-bait');
  addToggleListener('toggle-educational');
  addToggleListener('toggle-project-launch');
  addToggleListener('toggle-congrats');
  addToggleListener('toggle-other');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}
