const DEFAULT_SETTINGS = {
  extensionEnabled: true,
  showHiringPosts: true,
  showJobAnnouncements: false,
  showGrindset: false,
  showSponsored: false,
  showSalesPitch: false,
  showJobSeeking: false,
  showEvents: false,
  showEducational: false,
  showProjectLaunch: false,
  showCongrats: false,
  showOther: false,
  aiEnabled: true,
  opaqueOverlay: false,
  hideRevealButton: false,
  experimentalFilters: false
};
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([
      'extensionEnabled', 'showHiringPosts', 'showJobAnnouncements', 'showGrindset',
      'showSponsored', 'showSalesPitch', 'showJobSeeking', 'showEvents',
      'showEducational', 'showProjectLaunch', 'showCongrats', 'showOther', 'aiEnabled', 'opaqueOverlay', 'hideRevealButton', 'experimentalFilters'
    ]);
    return {
      extensionEnabled: result.extensionEnabled !== undefined ? result.extensionEnabled : DEFAULT_SETTINGS.extensionEnabled,
      showHiringPosts: result.showHiringPosts !== undefined ? result.showHiringPosts : DEFAULT_SETTINGS.showHiringPosts,
      showJobAnnouncements: result.showJobAnnouncements !== undefined ? result.showJobAnnouncements : DEFAULT_SETTINGS.showJobAnnouncements,
      showGrindset: result.showGrindset !== undefined ? result.showGrindset : DEFAULT_SETTINGS.showGrindset,
      showSponsored: result.showSponsored !== undefined ? result.showSponsored : DEFAULT_SETTINGS.showSponsored,
      showSalesPitch: result.showSalesPitch !== undefined ? result.showSalesPitch : DEFAULT_SETTINGS.showSalesPitch,
      showJobSeeking: result.showJobSeeking !== undefined ? result.showJobSeeking : DEFAULT_SETTINGS.showJobSeeking,
      showEvents: result.showEvents !== undefined ? result.showEvents : DEFAULT_SETTINGS.showEvents,
      showEducational: result.showEducational !== undefined ? result.showEducational : DEFAULT_SETTINGS.showEducational,
      showProjectLaunch: result.showProjectLaunch !== undefined ? result.showProjectLaunch : DEFAULT_SETTINGS.showProjectLaunch,
      showCongrats: result.showCongrats !== undefined ? result.showCongrats : DEFAULT_SETTINGS.showCongrats,
      showOther: result.showOther !== undefined ? result.showOther : DEFAULT_SETTINGS.showOther,
      aiEnabled: result.aiEnabled !== undefined ? result.aiEnabled : DEFAULT_SETTINGS.aiEnabled,
      opaqueOverlay: result.opaqueOverlay !== undefined ? result.opaqueOverlay : DEFAULT_SETTINGS.opaqueOverlay,
      hideRevealButton: result.hideRevealButton !== undefined ? result.hideRevealButton : DEFAULT_SETTINGS.hideRevealButton,
      experimentalFilters: result.experimentalFilters !== undefined ? result.experimentalFilters : DEFAULT_SETTINGS.experimentalFilters
    };
  } catch (error) {
    console.error('[Slop Block] Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set(settings);
    notifyContentScript(settings);
  } catch (error) {
    console.error('[Slop Block] Error saving settings:', error);
  }
}

function notifyContentScript(settings) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('linkedin.com')) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'settingsChanged',
        settings: settings
      }).catch(() => {
      });
    }
  });
}

function getAllToggleValues() {
  return {
    extensionEnabled: document.getElementById('toggle-extension-enabled').checked,
    showHiringPosts: document.getElementById('toggle-hiring-posts').checked,
    showJobAnnouncements: document.getElementById('toggle-job-announcements').checked,
    showGrindset: document.getElementById('toggle-grindset').checked,
    showSponsored: document.getElementById('toggle-sponsored').checked,
    showSalesPitch: document.getElementById('toggle-sales-pitch').checked,
    showJobSeeking: document.getElementById('toggle-job-seeking').checked,
    showEvents: document.getElementById('toggle-events').checked,
    showEducational: document.getElementById('toggle-educational').checked,
    showProjectLaunch: document.getElementById('toggle-project-launch').checked,
    showCongrats: document.getElementById('toggle-congrats').checked,
    showOther: document.getElementById('toggle-other').checked,
    aiEnabled: document.getElementById('toggle-ai-enabled').checked,
    opaqueOverlay: document.getElementById('toggle-opaque-overlay').checked,
    hideRevealButton: document.getElementById('toggle-hide-reveal-button').checked,
    experimentalFilters: document.getElementById('toggle-experimental-filters').checked
  };
}

function updateExperimentalFiltersVisibility(enabled) {
  const block = document.getElementById('experimental-filters-block');
  if (block) {
    block.style.display = enabled ? 'flex' : 'none';
    block.setAttribute('aria-hidden', String(!enabled));
  }
}

function addToggleListener(toggleId) {
  const toggle = document.getElementById(toggleId);
  toggle.addEventListener('change', async (e) => {
    const newSettings = getAllToggleValues();
    await saveSettings(newSettings);
    if (toggleId === 'toggle-experimental-filters') {
      updateExperimentalFiltersVisibility(newSettings.experimentalFilters);
    }
  });
}

async function checkAIAvailability() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAIAvailability' });
    return response.availability || "unavailable";
  } catch (err) {
    console.error('[Slop Block] Error checking AI availability:', err);
    return "unavailable";
  }
}

async function initializePopup() {
  const settings = await loadSettings();
  
  document.getElementById('toggle-extension-enabled').checked = settings.extensionEnabled;
  document.getElementById('toggle-hiring-posts').checked = settings.showHiringPosts;
  document.getElementById('toggle-job-announcements').checked = settings.showJobAnnouncements;
  document.getElementById('toggle-grindset').checked = settings.showGrindset;
  document.getElementById('toggle-sponsored').checked = settings.showSponsored;
  document.getElementById('toggle-sales-pitch').checked = settings.showSalesPitch;
  document.getElementById('toggle-job-seeking').checked = settings.showJobSeeking;
  document.getElementById('toggle-events').checked = settings.showEvents;
  document.getElementById('toggle-educational').checked = settings.showEducational;
  document.getElementById('toggle-project-launch').checked = settings.showProjectLaunch;
  document.getElementById('toggle-congrats').checked = settings.showCongrats;
  document.getElementById('toggle-other').checked = settings.showOther;
  document.getElementById('toggle-ai-enabled').checked = settings.aiEnabled;
  document.getElementById('toggle-opaque-overlay').checked = settings.opaqueOverlay;
  document.getElementById('toggle-hide-reveal-button').checked = settings.hideRevealButton;
  document.getElementById('toggle-experimental-filters').checked = settings.experimentalFilters;
  
  // Check AI availability and update UI
  const aiAvailability = await checkAIAvailability();
  const aiToggle = document.getElementById('toggle-ai-enabled');
  const aiDescription = document.getElementById('ai-description');
  const aiToggleItem = document.getElementById('ai-toggle-item');
  
  if (aiAvailability === "unavailable" || aiAvailability === "downloadable") {
    aiToggle.disabled = true;
    aiToggle.checked = false;
    aiToggleItem.style.opacity = "0.5";
    aiToggleItem.style.cursor = "not-allowed";
    
    if (aiAvailability === "unavailable") {
      aiDescription.innerHTML = "Enable or disable AI to categorize a post. Chrome AI not available - requires Chrome 127+. <a href='https://huggingface.co/blog/Xenova/run-gemini-nano-in-your-browser' target='_blank'>Installation guide</a>";
    } else {
      aiDescription.innerHTML = "Enable or disable AI to categorize a post. Model not downloaded - requires Chrome 127+. <a href='https://huggingface.co/blog/Xenova/run-gemini-nano-in-your-browser' target='_blank'>Installation guide</a>";
    }
  } else if (aiAvailability === "downloading") {
    aiToggle.disabled = true;
    aiToggle.checked = false;
    aiToggleItem.style.opacity = "0.5";
    aiDescription.textContent = "Enable or disable AI to categorize a post. Model downloading - reload this page once complete";
  }

  updateExperimentalFiltersVisibility(settings.experimentalFilters);
  
  addToggleListener('toggle-extension-enabled');
  addToggleListener('toggle-hiring-posts');
  addToggleListener('toggle-job-announcements');
  addToggleListener('toggle-grindset');
  addToggleListener('toggle-sponsored');
  addToggleListener('toggle-sales-pitch');
  addToggleListener('toggle-job-seeking');
  addToggleListener('toggle-events');
  addToggleListener('toggle-educational');
  addToggleListener('toggle-project-launch');
  addToggleListener('toggle-congrats');
  addToggleListener('toggle-other');
  addToggleListener('toggle-ai-enabled');
  addToggleListener('toggle-opaque-overlay');
  addToggleListener('toggle-hide-reveal-button');
  addToggleListener('toggle-experimental-filters');

  // Tab navigation
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Remove active class from all buttons and panels
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));
      
      // Add active class to clicked button and corresponding panel
      button.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}
