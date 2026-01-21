const DEFAULT_SETTINGS = {
  showHiringPosts: true,
  showJobAnnouncements: false,
  showGrindset: false,
  showAiDoomer: false,
  showChildProdigy: false,
  showSponsored: false,
  showSalesPitch: false,
  showJobSeeking: false,
  showEvents: false,
  showEngagementBait: false,
  showEducational: false,
  showProjectLaunch: false,
  showCongrats: false,
  showOther: false,
  aiEnabled: true
};
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([
      'showHiringPosts', 'showJobAnnouncements', 'showGrindset', 'showAiDoomer', 'showChildProdigy',
      'showSponsored', 'showSalesPitch', 'showJobSeeking', 'showEvents', 'showEngagementBait',
      'showEducational', 'showProjectLaunch', 'showCongrats', 'showOther', 'aiEnabled'
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
      showOther: result.showOther !== undefined ? result.showOther : DEFAULT_SETTINGS.showOther,
      aiEnabled: result.aiEnabled !== undefined ? result.aiEnabled : DEFAULT_SETTINGS.aiEnabled
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
    showOther: document.getElementById('toggle-other').checked,
    aiEnabled: document.getElementById('toggle-ai-enabled').checked
  };
}

function addToggleListener(toggleId) {
  const toggle = document.getElementById(toggleId);
  toggle.addEventListener('change', async (e) => {
    const newSettings = getAllToggleValues();
    await saveSettings(newSettings);
  });
}

async function initializePopup() {
  const settings = await loadSettings();
  
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
  document.getElementById('toggle-ai-enabled').checked = settings.aiEnabled;
  
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
  addToggleListener('toggle-ai-enabled');

  const moreBtn = document.querySelector('.more-toggle');
  const moreContainer = document.getElementById('more-filters');
  if (moreBtn && moreContainer) {
    moreBtn.addEventListener('click', () => {
      const open = moreContainer.classList.toggle('open');
      moreBtn.setAttribute('aria-expanded', String(open));
      moreContainer.setAttribute('aria-hidden', String(!open));
      moreBtn.textContent = open ? 'More filters ▴' : 'More filters ▾';
    });
  }

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
