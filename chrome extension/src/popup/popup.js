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
  showPosterInfo: true,
  experimentalFilters: false
};
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([
      'extensionEnabled', 'showHiringPosts', 'showJobAnnouncements', 'showGrindset',
      'showSponsored', 'showSalesPitch', 'showJobSeeking', 'showEvents',
      'showEducational', 'showProjectLaunch', 'showCongrats', 'showOther', 'aiEnabled', 'opaqueOverlay', 'hideRevealButton', 'showPosterInfo', 'experimentalFilters'
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
      showPosterInfo: result.showPosterInfo !== undefined ? result.showPosterInfo : DEFAULT_SETTINGS.showPosterInfo,
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
  function getCheckboxValue(id, key) {
    const el = document.getElementById(id);
    if (!el) return DEFAULT_SETTINGS[key];
    return !!el.checked;
  }

  return {
    extensionEnabled: getCheckboxValue('toggle-extension-enabled', 'extensionEnabled'),
    showHiringPosts: getCheckboxValue('toggle-hiring-posts', 'showHiringPosts'),
    showJobAnnouncements: getCheckboxValue('toggle-job-announcements', 'showJobAnnouncements'),
    showGrindset: getCheckboxValue('toggle-grindset', 'showGrindset'),
    showSponsored: getCheckboxValue('toggle-sponsored', 'showSponsored'),
    showSalesPitch: getCheckboxValue('toggle-sales-pitch', 'showSalesPitch'),
    showJobSeeking: getCheckboxValue('toggle-job-seeking', 'showJobSeeking'),
    showEvents: getCheckboxValue('toggle-events', 'showEvents'),
    showEducational: getCheckboxValue('toggle-educational', 'showEducational'),
    showProjectLaunch: getCheckboxValue('toggle-project-launch', 'showProjectLaunch'),
    showCongrats: getCheckboxValue('toggle-congrats', 'showCongrats'),
    showOther: getCheckboxValue('toggle-other', 'showOther'),
    aiEnabled: getCheckboxValue('toggle-ai-enabled', 'aiEnabled'),
    opaqueOverlay: getCheckboxValue('toggle-opaque-overlay', 'opaqueOverlay'),
    hideRevealButton: getCheckboxValue('toggle-hide-reveal-button', 'hideRevealButton'),
    showPosterInfo: DEFAULT_SETTINGS.showPosterInfo,
    experimentalFilters: getCheckboxValue('toggle-experimental-filters', 'experimentalFilters')
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
  if (!toggle) {
    console.warn('[Slop Block] Toggle not found:', toggleId);
    return;
  }

  toggle.addEventListener('change', async (e) => {
    const newSettings = getAllToggleValues();
    await saveSettings(newSettings);
    if (toggleId === 'toggle-experimental-filters') {
      updateExperimentalFiltersVisibility(newSettings.experimentalFilters);
    }
  });
}

async function checkAIAvailability() {
  // TESTING: Force unavailable to test UI
  return "unavailable";

  // try {
  //   const response = await chrome.runtime.sendMessage({ action: 'checkAIAvailability' });
  //   return response.availability || "unavailable";
  // } catch (err) {
  //   console.error('[Slop Block] Error checking AI availability:', err);
  //   return "unavailable";
  // }
}

async function initializePopup() {
  const settings = await loadSettings();

  function setCheckedIfPresent(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = value;
  }

  setCheckedIfPresent('toggle-extension-enabled', settings.extensionEnabled);
  setCheckedIfPresent('toggle-hiring-posts', settings.showHiringPosts);
  setCheckedIfPresent('toggle-job-announcements', settings.showJobAnnouncements);
  setCheckedIfPresent('toggle-grindset', settings.showGrindset);
  setCheckedIfPresent('toggle-sponsored', settings.showSponsored);
  setCheckedIfPresent('toggle-sales-pitch', settings.showSalesPitch);
  setCheckedIfPresent('toggle-job-seeking', settings.showJobSeeking);
  setCheckedIfPresent('toggle-events', settings.showEvents);
  setCheckedIfPresent('toggle-educational', settings.showEducational);
  setCheckedIfPresent('toggle-project-launch', settings.showProjectLaunch);
  setCheckedIfPresent('toggle-congrats', settings.showCongrats);
  setCheckedIfPresent('toggle-other', settings.showOther);
  setCheckedIfPresent('toggle-ai-enabled', settings.aiEnabled);
  setCheckedIfPresent('toggle-opaque-overlay', settings.opaqueOverlay);
  setCheckedIfPresent('toggle-hide-reveal-button', settings.hideRevealButton);
  setCheckedIfPresent('toggle-experimental-filters', settings.experimentalFilters);

  const aiAvailability = await checkAIAvailability();
  const aiToggle = document.getElementById('toggle-ai-enabled');
  const aiDescription = document.getElementById('ai-description');

  if (aiAvailability === "unavailable" || aiAvailability === "downloadable") {
    if (aiToggle) {
      aiToggle.disabled = true;
      aiToggle.checked = false;
      if (aiToggle.parentElement) {
        aiToggle.parentElement.style.opacity = "0.5";
        aiToggle.parentElement.style.cursor = "not-allowed";
      }
    }

    if (aiDescription) {
      if (aiAvailability === "unavailable") {
        aiDescription.innerHTML = "Enable or disable AI to categorize a post. Chrome AI not available - requires Chrome 127+. <a href='https://huggingface.co/blog/Xenova/run-gemini-nano-in-your-browser' target='_blank'>Installation guide</a>";
      } else {
        aiDescription.innerHTML = "Enable or disable AI to categorize a post. Model not downloaded - requires Chrome 127+. <a href='https://huggingface.co/blog/Xenova/run-gemini-nano-in-your-browser' target='_blank'>Installation guide</a>";
      }
    }
  } else if (aiAvailability === "downloading") {
    if (aiToggle) {
      aiToggle.disabled = true;
      aiToggle.checked = false;
      if (aiToggle.parentElement) {
        aiToggle.parentElement.style.opacity = "0.5";
        aiToggle.parentElement.style.cursor = "not-allowed";
      }
    }
    if (aiDescription) aiDescription.textContent = "Enable or disable AI to categorize a post. Model downloading - reload this page once complete";
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
}

function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');

  if (tabButtons.length === 0 || tabPanels.length === 0) {
    console.warn('[Slop Block] Tab elements not found in DOM');
    return;
  }

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));

      button.classList.add('active');
      const targetPanel = document.getElementById(`${targetTab}-tab`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTabNavigation);
} else {
  setupTabNavigation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}
