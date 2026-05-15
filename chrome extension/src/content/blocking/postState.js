window.LinkedInFilter = window.LinkedInFilter || {};

window.LinkedInFilter.processedUrns = window.LinkedInFilter.processedUrns || new Set();
window.LinkedInFilter.blockedUrns = window.LinkedInFilter.blockedUrns || new Set();
window.LinkedInFilter.userRevealed = window.LinkedInFilter.userRevealed || new Set();
window.LinkedInFilter.newDomIdCounter = window.LinkedInFilter.newDomIdCounter || 0;
window.LinkedInFilter.feedObservers = window.LinkedInFilter.feedObservers || [];
window.LinkedInFilter.isInitialized = window.LinkedInFilter.isInitialized || false;
window.LinkedInFilter.pendingScanWork = window.LinkedInFilter.pendingScanWork || null;
window.LinkedInFilter.filterSettings = window.LinkedInFilter.filterSettings || {
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
  experimentalFilters: false,
  aiEnabled: true,
  opaqueOverlay: false,
  hideRevealButton: false,
  showPosterInfo: true
};

window.LinkedInFilter.loadFilterSettings = async function() {
  try {
    const result = await chrome.storage.sync.get([
      'extensionEnabled', 'showHiringPosts', 'showJobAnnouncements', 'showGrindset',
      'showSponsored', 'showSalesPitch', 'showJobSeeking', 'showEvents',
      'showEducational', 'showProjectLaunch', 'showCongrats', 'showOther', 'experimentalFilters', 'aiEnabled', 'opaqueOverlay', 'hideRevealButton', 'showPosterInfo'
    ]);
    window.LinkedInFilter.filterSettings = {
      extensionEnabled: result.extensionEnabled !== undefined ? result.extensionEnabled : true,
      showHiringPosts: result.showHiringPosts !== undefined ? result.showHiringPosts : true,
      showJobAnnouncements: result.showJobAnnouncements !== undefined ? result.showJobAnnouncements : false,
      showGrindset: result.showGrindset !== undefined ? result.showGrindset : false,
      showSponsored: result.showSponsored !== undefined ? result.showSponsored : false,
      showSalesPitch: result.showSalesPitch !== undefined ? result.showSalesPitch : false,
      showJobSeeking: result.showJobSeeking !== undefined ? result.showJobSeeking : false,
      showEvents: result.showEvents !== undefined ? result.showEvents : false,
      showEducational: result.showEducational !== undefined ? result.showEducational : false,
      showProjectLaunch: result.showProjectLaunch !== undefined ? result.showProjectLaunch : false,
      showCongrats: result.showCongrats !== undefined ? result.showCongrats : false,
      showOther: result.showOther !== undefined ? result.showOther : false,
      experimentalFilters: result.experimentalFilters !== undefined ? result.experimentalFilters : false,
      aiEnabled: result.aiEnabled !== undefined ? result.aiEnabled : true,
      opaqueOverlay: result.opaqueOverlay !== undefined ? result.opaqueOverlay : false,
      hideRevealButton: result.hideRevealButton !== undefined ? result.hideRevealButton : false,
      showPosterInfo: true
    };
  } catch (error) {
    console.error('[LinkedIn Filter] Error loading settings:', error);
    window.LinkedInFilter.filterSettings = {
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
      experimentalFilters: false,
      aiEnabled: true,
      opaqueOverlay: false,
      hideRevealButton: false,
      showPosterInfo: true
    };
  }
};
