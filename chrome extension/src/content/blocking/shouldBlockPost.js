window.LinkedInFilter = window.LinkedInFilter || {};

window.LinkedInFilter.shouldBlockByClassification = function(classification) {
  const settings = window.LinkedInFilter.filterSettings || {};
  if (classification === "hiring") return !settings.showHiringPosts;
  if (classification === "hired_announcement") return !settings.showJobAnnouncements;
  if (classification === "grindset") return !settings.showGrindset;
  if (classification === "sponsored") return !settings.showSponsored;
  if (classification === "sales_pitch") return !settings.showSalesPitch;
  if (classification === "job_seeking") return !settings.showJobSeeking;
  if (classification === "events") return !settings.showEvents;
  if (classification === "educational") return !settings.showEducational;
  if (classification === "project_launch") return !settings.showProjectLaunch;
  if (classification === "congrats") return !settings.showCongrats;
  if (classification === "other") return !settings.showOther;
  return true;
};
